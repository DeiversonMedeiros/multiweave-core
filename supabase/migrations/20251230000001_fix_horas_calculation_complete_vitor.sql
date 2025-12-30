-- =====================================================
-- CORREÇÃO COMPLETA: Cálculo de Horas - VITOR ALVES e Outros
-- =====================================================
-- Problemas identificados:
-- 1. Função calculate_overtime_by_scale usando 8.0h como padrão ao invés de horas_diarias do turno
-- 2. Feriados não sendo considerados corretamente para extras 100% na escala 6x1
-- 3. Horas noturnas não implementadas
-- =====================================================

-- 1. ADICIONAR CAMPO horas_noturnas
ALTER TABLE rh.time_records 
ADD COLUMN IF NOT EXISTS horas_noturnas DECIMAL(4,2) DEFAULT 0;

COMMENT ON COLUMN rh.time_records.horas_noturnas IS 
  'Horas trabalhadas no período noturno (22h às 5h do dia seguinte). 
   Conforme CLT, trabalho noturno tem adicional de 20% sobre a hora normal.';

-- 2. FUNÇÃO PARA CALCULAR HORAS NOTURNAS
CREATE OR REPLACE FUNCTION rh.calculate_night_hours(
  p_entrada TIME,
  p_saida TIME,
  p_data_registro DATE
)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_horas_noturnas DECIMAL(4,2) := 0;
  v_entrada_timestamp TIMESTAMP;
  v_saida_timestamp TIMESTAMP;
  v_periodo_noturno_inicio TIME := '22:00:00';
  v_periodo_noturno_fim TIME := '05:00:00';
  v_inicio_noturno TIMESTAMP;
  v_fim_noturno TIMESTAMP;
  v_intersecao_inicio TIMESTAMP;
  v_intersecao_fim TIMESTAMP;
BEGIN
  -- Se não tem entrada ou saída, retornar 0
  IF p_entrada IS NULL OR p_saida IS NULL THEN
    RETURN 0;
  END IF;

  -- Criar timestamps completos
  v_entrada_timestamp := (p_data_registro + p_entrada)::TIMESTAMP;
  
  -- Se saída é antes da entrada, assumir que é no dia seguinte
  IF p_saida < p_entrada THEN
    v_saida_timestamp := ((p_data_registro + INTERVAL '1 day') + p_saida)::TIMESTAMP;
  ELSE
    v_saida_timestamp := (p_data_registro + p_saida)::TIMESTAMP;
  END IF;

  -- Período noturno do dia atual (22h até 23:59:59)
  v_inicio_noturno := (p_data_registro + v_periodo_noturno_inicio)::TIMESTAMP;
  v_fim_noturno := ((p_data_registro + INTERVAL '1 day') + v_periodo_noturno_fim)::TIMESTAMP;

  -- Calcular interseção entre período trabalhado e período noturno
  v_intersecao_inicio := GREATEST(v_entrada_timestamp, v_inicio_noturno);
  v_intersecao_fim := LEAST(v_saida_timestamp, v_fim_noturno);

  -- Se há interseção, calcular horas
  IF v_intersecao_inicio < v_intersecao_fim THEN
    v_horas_noturnas := ROUND(
      EXTRACT(EPOCH FROM (v_intersecao_fim - v_intersecao_inicio)) / 3600,
      2
    );
  END IF;

  RETURN GREATEST(0, v_horas_noturnas);
END;
$$;

COMMENT ON FUNCTION rh.calculate_night_hours IS 
  'Calcula horas trabalhadas no período noturno (22h às 5h do dia seguinte). 
   Retorna 0 se não há interseção entre período trabalhado e período noturno.';

-- 3. CORRIGIR FUNÇÃO calculate_overtime_by_scale
-- Garantir que sempre use horas_diarias corretas do turno
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

  -- CORREÇÃO CRÍTICA: Só calcular horas negativas se trabalhou menos que o esperado
  -- Se trabalhou igual ou mais, NUNCA deve ter horas negativas
  
  IF v_excedente > 0 THEN
    -- Trabalhou MAIS que o esperado: calcular horas extras
    -- Aplicar regras por tipo de escala
    IF v_tipo_escala = 'escala_12x36' THEN
      -- ESCALA 12x36: Só existe excedente se romper 12h
      IF v_horas_trabalhadas > 12 THEN
        v_excedente := v_horas_trabalhadas - 12;
        -- Se é feriado trabalhado, pagar 100%
        IF v_is_feriado THEN
          v_horas_extras_100 := v_excedente;
          v_horas_para_pagamento := v_excedente;
        ELSE
          -- Horas extras normais vão para banco (50%)
          v_horas_extras_50 := v_excedente;
          v_horas_para_banco := v_excedente;
        END IF;
      END IF;
      
    ELSIF v_tipo_escala = 'flexivel_6x1' THEN
      -- ESCALA 6x1: Dia de folga ou feriado = 100%
      -- CORREÇÃO: Garantir que feriados sejam considerados
      IF v_is_dia_folga OR v_is_feriado THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
      
    ELSE
      -- ESCALA 5x2 (fixa) ou outras: Domingo ou feriado = 100%
      IF v_is_domingo OR v_is_feriado THEN
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
   CORREÇÃO: Garante que sempre use horas_diarias corretas do turno (nunca usa 8.0h como padrão se há turno válido).
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   Calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações.
   Calcula horas noturnas (22h às 5h).
   Garante que feriados sejam considerados para extras 100% na escala 6x1.';

-- 4. ATUALIZAR FUNÇÃO recalculate_time_record_hours PARA CALCULAR HORAS NOTURNAS
CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_date date;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  v_horas_trabalhadas numeric(4,2) := 0;
  v_horas_extras numeric(4,2) := 0;
  v_horas_faltas numeric(4,2) := 0;
  v_horas_negativas numeric(4,2) := 0;
  v_horas_noturnas numeric(4,2) := 0;
  v_last_event_at timestamptz;
  v_work_shift_id uuid;
  v_horas_diarias numeric(4,2);
  v_horas_extra_window numeric(4,2) := 0;
  v_diferenca_horas numeric(4,2);
  v_requer_registro_ponto boolean := true;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
BEGIN
  SELECT tr.employee_id, tr.company_id, tr.data_registro, tr.horas_faltas,
         COALESCE(e.requer_registro_ponto, true)
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas, v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular dia da semana
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- CORREÇÃO: Buscar turno primeiro via employee_shifts (permite histórico)
  -- Se não encontrar, buscar via employees.work_shift_id (turno direto)
  SELECT es.turno_id, ws.horas_diarias
  INTO v_work_shift_id, v_horas_diarias
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
    SELECT e.work_shift_id, ws.horas_diarias
    INTO v_work_shift_id, v_horas_diarias
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

  -- CORREÇÃO: Se ainda não encontrou horas_diarias, tentar buscar do turno diretamente
  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias
    INTO v_horas_diarias
    FROM rh.work_shifts
    WHERE id = v_work_shift_id;
  END IF;

  -- Se não encontrar turno, usar 8.0 como padrão
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  -- Map each event_type to the first occurrence of the day
  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calculate hours worked = (saida-entrada) - (saida_almoco-entrada_almoco)
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSE
    v_horas_trabalhadas := 0;
  END IF;

  -- Calculate extra hours from extra window (extra_inicio/extra_fim)
  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  END IF;

  -- Calcular horas noturnas
  v_horas_noturnas := rh.calculate_night_hours(v_entrada, v_saida, v_date);

  -- Calcular diferença entre horas trabalhadas e horas_diarias do turno
  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  -- IMPORTANTE: Se funcionário não precisa registrar ponto (Artigo 62),
  -- não deve calcular horas negativas por ausência de registro
  IF v_requer_registro_ponto THEN
    -- Funcionário precisa registrar ponto: calcular normalmente
    -- CORREÇÃO: Só calcular horas negativas se trabalhou MENOS que o esperado
    -- Se trabalhou igual ou mais, NUNCA calcular horas negativas
    IF v_diferenca_horas > 0 THEN
      -- Horas extras do trabalho além do turno + horas extras da janela extra
      v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      v_horas_negativas := 0;
    ELSIF v_diferenca_horas < 0 THEN
      -- Horas negativas (trabalhou menos que o turno)
      -- Mas só se houver registro (entrada e saída), caso contrário é falta não registrada
      IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
        -- Tem todas as marcações e trabalhou menos: calcular horas negativas
        v_horas_negativas := round(ABS(v_diferenca_horas), 2);
        v_horas_extras := round(v_horas_extra_window, 2); -- Apenas janela extra se houver
      ELSE
        -- Sem registro de ponto: considerar como falta (horas_faltas)
        v_horas_negativas := 0;
        v_horas_extras := 0;
        v_horas_faltas := COALESCE(v_horas_faltas, 0) + v_horas_diarias;
      END IF;
    ELSE
      -- Exatamente igual ao turno
      v_horas_extras := round(v_horas_extra_window, 2);
      v_horas_negativas := 0;
    END IF;
  ELSE
    -- Funcionário NÃO precisa registrar ponto (Artigo 62): não calcular horas negativas
    -- Apenas calcular horas extras se houver registro manual
    IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
      -- Se registrou manualmente, calcular horas extras se trabalhou mais que o turno
      IF v_diferenca_horas > 0 THEN
        v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      ELSE
        v_horas_extras := round(v_horas_extra_window, 2);
      END IF;
      v_horas_negativas := 0;
    ELSE
      -- Sem registro: não calcular nada (funcionário não precisa registrar)
      v_horas_extras := 0;
      v_horas_negativas := 0;
    END IF;
  END IF;

  -- Keep faltas as-is if previously set; if NULL, default to 0
  v_horas_faltas := COALESCE(v_horas_faltas, 0);

  -- Usar o event_at mais recente como referência para updated_at
  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  -- Se não houver eventos, usar NOW() como fallback
  IF v_last_event_at IS NULL THEN
    v_last_event_at := now();
  END IF;

  -- Atualizar registro com horas trabalhadas e horas negativas
  UPDATE rh.time_records
  SET 
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1,
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = CASE 
      WHEN v_horas_negativas > 0 THEN -v_horas_negativas -- Negativo indica débito
      ELSE v_horas_extras -- Positivo indica crédito
    END,
    horas_negativas = v_horas_negativas,
    horas_noturnas = v_horas_noturnas,
    horas_faltas = v_horas_faltas,
    updated_at = v_last_event_at
  WHERE id = p_time_record_id;

  -- Chamar calculate_overtime_by_scale para calcular corretamente
  -- as horas extras/negativas por escala (considera tipo de escala, feriados, etc)
  -- Esta função agora garante que não calcula horas negativas incorretamente
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. 
CORREÇÃO: Garante que sempre use horas_diarias corretas do turno.
Considera Artigo 62 da CLT: funcionários que não precisam registrar ponto não têm saldo negativo por ausência de registro. 
Só calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações. 
Calcula horas noturnas (22h às 5h).';

-- 5. RECALCULAR REGISTROS DO FUNCIONÁRIO VITOR ALVES E OUTROS AFETADOS
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando recálculo de registros com horas incorretas...';
  
  -- Recalcular registros do VITOR ALVES especificamente
  FOR v_record IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.employee_id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0'
      AND tr.data_registro >= '2025-11-01'
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      v_count := v_count + 1;
      
      IF v_count % 10 = 0 THEN
        RAISE NOTICE 'Recalculados % registros do VITOR ALVES...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros do VITOR ALVES recalculados: %', v_count;
  
  -- Recalcular outros registros que podem ter o mesmo problema
  -- (registros com horas negativas quando deveriam ter extras, ou vice-versa)
  v_count := 0;
  FOR v_record IN
    SELECT tr.id
    FROM rh.time_records tr
    INNER JOIN rh.employee_shifts es ON es.funcionario_id = tr.employee_id
      AND es.company_id = tr.company_id
      AND es.ativo = true
      AND es.data_inicio <= tr.data_registro
      AND (es.data_fim IS NULL OR es.data_fim >= tr.data_registro)
    INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
    WHERE tr.horas_negativas > 0
      AND tr.horas_trabalhadas >= COALESCE(ws.horas_diarias, 8.0)
      AND tr.data_registro >= CURRENT_DATE - INTERVAL '90 days'
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY tr.data_registro DESC
    LIMIT 1000
  LOOP
    BEGIN
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      v_count := v_count + 1;
      
      IF v_count % 50 = 0 THEN
        RAISE NOTICE 'Recalculados % registros gerais...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros gerais recalculados: %', v_count;
END $$;

