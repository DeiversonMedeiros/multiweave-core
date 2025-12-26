-- =====================================================
-- CORREÇÃO COMPLETA: Horas Negativas Incorretas
-- =====================================================
-- Problema identificado: Registros com horas_trabalhadas >= horas_esperadas
-- estão sendo marcados com horas_negativas > 0 incorretamente.
-- 
-- Exemplo: KATIA SANTOS DA SILVA trabalhou 9.04h (esperado 8.0h) 
-- mas ainda aparece com 8.00h negativas.
-- =====================================================

-- 1. CORRIGIR FUNÇÃO calculate_overtime_by_scale
-- Garantir que horas negativas só sejam calculadas quando realmente trabalhou menos
-- e validar se todas as marcações foram feitas
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
  v_excedente DECIMAL(4,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_tem_todas_marcacoes BOOLEAN := false;
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
  -- Se tem entrada E saída, consideramos que tem todas as marcações necessárias
  -- (almoço pode ser opcional dependendo do turno)
  v_tem_todas_marcacoes := (v_entrada IS NOT NULL AND v_saida IS NOT NULL);

  -- Calcular dia da semana (1=Segunda, 7=Domingo)
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- Buscar tipo de escala, turno e horas diárias
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

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  -- Se não encontrou turno, usar padrão
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  -- Verificar se é feriado, domingo ou dia de folga
  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  -- Calcular excedente (pode ser positivo ou negativo)
  -- Se positivo = horas extras, se negativo = horas negativas
  v_excedente := v_horas_trabalhadas - v_horas_diarias;

  -- CORREÇÃO CRÍTICA: Só calcular horas negativas se:
  -- 1. Trabalhou menos que o esperado (v_excedente < 0)
  -- 2. E tem todas as marcações (entrada e saída)
  -- Se não tem todas as marcações, não deve calcular horas negativas (é falta não registrada)
  -- Se trabalhou igual ou mais que o esperado, NUNCA deve ter horas negativas
  
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
    is_feriado = v_is_feriado,
    is_domingo = v_is_domingo,
    is_dia_folga = v_is_dia_folga
  WHERE id = p_time_record_id;

END;
$$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Calcula horas extras conforme tipo de escala e regras CLT.
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Agora considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   CORREÇÃO: Só calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações.
   Se trabalhou igual ou mais que o esperado, NUNCA calcula horas negativas.';

-- 2. CORRIGIR FUNÇÃO recalculate_time_record_hours
-- Garantir que não calcule horas negativas quando trabalhou igual ou mais que o esperado
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

  -- Buscar o turno de trabalho ativo do funcionário para a data do registro
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

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
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
'Recalcula horas trabalhadas e extras de um registro de ponto. Considera Artigo 62 da CLT: funcionários que não precisam registrar ponto não têm saldo negativo por ausência de registro. 
CORREÇÃO: Só calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações. Se trabalhou igual ou mais que o esperado, NUNCA calcula horas negativas.';

-- 3. RECALCULAR TODOS OS REGISTROS COM HORAS NEGATIVAS INCORRETAS
-- Recalcular registros onde horas_trabalhadas >= horas_esperadas mas tem horas_negativas > 0
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
  v_horas_esperadas NUMERIC(4,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
BEGIN
  RAISE NOTICE 'Iniciando correção de horas negativas incorretas...';
  
  -- Recalcular para TODOS os registros que têm horas negativas
  -- A função calculate_overtime_by_scale agora garante que só calcula horas negativas corretamente
  FOR v_record IN
    SELECT tr.id, tr.employee_id, tr.company_id, tr.data_registro, tr.horas_trabalhadas, tr.horas_negativas
    FROM rh.time_records tr
    WHERE tr.horas_negativas > 0
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      -- Recalcular usando a função oficial que agora está corrigida
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      v_count := v_count + 1;
      
      -- Log a cada 50 registros
      IF v_count % 50 = 0 THEN
        RAISE NOTICE 'Recalculados % registros...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Continuar mesmo se houver erro em um registro
        RAISE WARNING 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros recalculados: %', v_count;
END $$;

-- 4. VERIFICAR RESULTADO
-- Contar quantos registros ainda têm horas negativas incorretas
DO $$
DECLARE
  v_incorretos INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_incorretos
  FROM rh.time_records tr
  LEFT JOIN rh.employee_shifts es ON es.funcionario_id = tr.employee_id
    AND es.company_id = tr.company_id
    AND es.ativo = true
    AND es.data_inicio <= tr.data_registro
    AND (es.data_fim IS NULL OR es.data_fim >= tr.data_registro)
  LEFT JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE tr.horas_negativas > 0
    AND tr.horas_trabalhadas >= COALESCE(
      (rh.get_work_shift_hours_for_day(
        es.turno_id,
        CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
             ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END
      )->>'horas_diarias')::NUMERIC,
      ws.horas_diarias,
      8.0
    )
    AND tr.status IN ('aprovado', 'pendente', 'corrigido');
  
  IF v_incorretos > 0 THEN
    RAISE WARNING 'Ainda existem % registros com horas negativas incorretas após a correção!', v_incorretos;
  ELSE
    RAISE NOTICE 'Correção concluída! Não há mais registros com horas negativas incorretas.';
  END IF;
END $$;

