-- =====================================================
-- CORREÇÃO: Feriados - Todas as Horas Trabalhadas a 100%
-- =====================================================
-- Problemas identificados:
-- 1. Apenas o excedente (horas acima do turno) era considerado como extras 100% em feriados
-- 2. Todas as escalas devem considerar feriados para extras 100%
-- 
-- CORREÇÃO:
-- Em feriados, TODAS as horas trabalhadas devem ser consideradas como extras 100%,
-- não apenas o excedente. Isso inclui o turno normal + horas extras.
-- =====================================================

CREATE OR REPLACE FUNCTION rh.calculate_overtime_by_scale(
  p_time_record_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_diarias DECIMAL(4,2);
  v_tipo_escala VARCHAR(50);
  v_is_feriado BOOLEAN;
  v_is_domingo BOOLEAN;
  v_is_dia_folga BOOLEAN;
  v_horas_extras_50 DECIMAL(4,2) := 0;
  v_horas_extras_100 DECIMAL(4,2) := 0;
  v_horas_para_banco DECIMAL(4,2) := 0;
  v_horas_para_pagamento DECIMAL(4,2) := 0;
  v_horas_negativas DECIMAL(4,2) := 0;
  v_horas_noturnas DECIMAL(4,2) := 0;
  v_excedente DECIMAL(4,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_tem_todas_marcacoes BOOLEAN := false;
  v_debug_info TEXT;
BEGIN
  -- Buscar dados do registro
  SELECT 
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.horas_trabalhadas,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco
  INTO 
    v_employee_id,
    v_company_id,
    v_date,
    v_horas_trabalhadas,
    v_entrada,
    v_saida,
    v_entrada_almoco,
    v_saida_almoco
  FROM rh.time_records tr
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- VALIDAÇÃO CRÍTICA: Verificar se tem todas as marcações principais
  v_tem_todas_marcacoes := (v_entrada IS NOT NULL AND v_saida IS NOT NULL);

  -- Calcular dia da semana (1=Segunda, 7=Domingo)
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- CORREÇÃO CRÍTICA: Buscar turno primeiro via employee_shifts (permite histórico)
  -- Se não encontrar, buscar via employees.work_shift_id (turno direto)
  -- IMPORTANTE: Garantir que v_horas_diarias nunca seja NULL se há turno válido
  SELECT 
    rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
    es.turno_id,
    ws.horas_diarias
  INTO 
    v_tipo_escala,
    v_work_shift_id,
    v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- CORREÇÃO: Se não encontrou via employee_shifts, buscar via employees.work_shift_id
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT 
      rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
      e.work_shift_id,
      ws.horas_diarias
    INTO 
      v_tipo_escala,
      v_work_shift_id,
      v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = v_employee_id
      AND e.company_id = v_company_id;
  END IF;

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  -- CORREÇÃO CRÍTICA: Se ainda não encontrou horas_diarias, tentar buscar do turno diretamente
  -- Isso garante que nunca use 8.0h como padrão se há um turno válido
  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias
    INTO v_horas_diarias
    FROM rh.work_shifts
    WHERE id = v_work_shift_id;
  END IF;

  -- Se não encontrou turno, usar padrão (último recurso)
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
    -- Log para debug (pode ser removido em produção)
    v_debug_info := format('AVISO: Usando padrão 8.0h para funcionário %s em %s (turno não encontrado)', 
                          v_employee_id, v_date);
    RAISE WARNING '%', v_debug_info;
  END IF;
  
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  -- Verificar se é feriado, domingo ou dia de folga
  -- CORREÇÃO: Garantir que is_feriado seja atualizado corretamente
  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  -- Calcular horas noturnas
  v_horas_noturnas := rh.calculate_night_hours(v_entrada, v_saida, v_date);

  -- Calcular excedente (pode ser positivo ou negativo)
  -- Se positivo = horas extras, se negativo = horas negativas
  v_excedente := v_horas_trabalhadas - v_horas_diarias;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: LÓGICA DE FERIADOS
  -- =====================================================
  -- Em feriados, TODAS as horas trabalhadas devem ser consideradas como extras 100%,
  -- não apenas o excedente. Isso inclui o turno normal + horas extras.
  -- =====================================================
  
  IF v_is_feriado AND v_horas_trabalhadas > 0 THEN
    -- FERIADO: Todas as horas trabalhadas são extras 100%
    -- Não importa a escala, feriado sempre paga 100% de todas as horas
    v_horas_extras_100 := v_horas_trabalhadas;
    v_horas_para_pagamento := v_horas_trabalhadas;
    v_horas_extras_50 := 0;
    v_horas_para_banco := 0;
    v_horas_negativas := 0;
    
  ELSIF v_excedente > 0 THEN
    -- Trabalhou MAIS que o esperado: calcular horas extras
    -- Aplicar regras por tipo de escala (apenas se NÃO for feriado)
    IF v_tipo_escala = 'escala_12x36' THEN
      -- ESCALA 12x36: Só existe excedente se romper 12h
      IF v_horas_trabalhadas > 12 THEN
        v_excedente := v_horas_trabalhadas - 12;
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
      
    ELSIF v_tipo_escala = 'flexivel_6x1' THEN
      -- ESCALA 6x1: Dia de folga = 100%
      IF v_is_dia_folga THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
      
    ELSE
      -- ESCALA 5x2 (fixa) ou outras: Domingo = 100%
      IF v_is_domingo THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Sábado em escala 5x2: vai para banco (50%)
        -- Horas extras normais: vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
    END IF;
    -- Zerar horas negativas quando há horas extras
    v_horas_negativas := 0;
    
  ELSIF v_excedente < 0 THEN
    -- Trabalhou MENOS que o esperado
    -- CORREÇÃO: Só calcular horas negativas se tem todas as marcações
    -- Se não tem todas as marcações, é falta não registrada (não horas negativas)
    IF v_tem_todas_marcacoes THEN
      -- Tem todas as marcações e trabalhou menos: calcular horas negativas
      v_horas_negativas := ROUND(ABS(v_excedente), 2);
    ELSE
      -- Não tem todas as marcações: não calcular horas negativas
      -- (será tratado como falta não registrada)
      v_horas_negativas := 0;
    END IF;
    -- Zerar horas extras quando há horas negativas
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    
  ELSE
    -- Exatamente igual ao esperado
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    v_horas_negativas := 0;
  END IF;

  -- Atualizar registro
  -- horas_extras é a soma de horas_extras_50 + horas_extras_100 (para compatibilidade)
  UPDATE rh.time_records
  SET 
    horas_extras_50 = ROUND(v_horas_extras_50, 2),
    horas_extras_100 = ROUND(v_horas_extras_100, 2),
    horas_extras = ROUND(v_horas_extras_50 + v_horas_extras_100, 2),
    horas_para_banco = ROUND(v_horas_para_banco, 2),
    horas_para_pagamento = ROUND(v_horas_para_pagamento, 2),
    horas_negativas = ROUND(v_horas_negativas, 2),
    horas_noturnas = ROUND(v_horas_noturnas, 2),
    is_feriado = v_is_feriado,
    is_domingo = v_is_domingo,
    is_dia_folga = v_is_dia_folga
  WHERE id = p_time_record_id;

END;
$$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Calcula horas extras conforme tipo de escala e regras CLT.
   CORREÇÃO: Em feriados, TODAS as horas trabalhadas são consideradas como extras 100%,
   não apenas o excedente. Isso inclui o turno normal + horas extras.
   Todas as escalas consideram feriados para extras 100%.
   Garante que sempre use horas_diarias corretas do turno (nunca usa 8.0h como padrão se há turno válido).
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   Calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações.
   Calcula horas noturnas (22h às 5h).';

-- RECALCULAR REGISTROS DE FERIADOS PARA APLICAR NOVA LÓGICA
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando recálculo de registros de feriados...';
  
  -- Recalcular todos os registros de feriados
  FOR v_record IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.is_feriado = true
      AND tr.horas_trabalhadas > 0
      AND tr.data_registro >= CURRENT_DATE - INTERVAL '90 days'
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      PERFORM rh.calculate_overtime_by_scale(v_record.id);
      v_count := v_count + 1;
      
      IF v_count % 10 = 0 THEN
        RAISE NOTICE 'Recalculados % registros de feriados...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros de feriados recalculados: %', v_count;
END $$;

