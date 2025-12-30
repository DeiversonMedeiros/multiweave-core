-- =====================================================
-- CORRIGIR CASO DE APENAS ENTRADA
-- =====================================================
-- Problema: Registros com apenas entrada ficam zerados
-- porque o último evento é a própria entrada (entrada - entrada = 0)
-- 
-- Solução: Detectar quando o último evento é a entrada e manter 0 horas
-- (registro incompleto - funcionário não completou o ponto)
-- =====================================================

-- Atualizar função recalculate_time_record_hours para tratar caso de apenas entrada
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
  v_ultimo_evento_time time;
  v_ultimo_evento_type varchar;
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

  -- NOVA LÓGICA: Buscar último evento do dia para calcular horas parciais
  SELECT (event_at AT TIME ZONE 'UTC')::time, event_type
  INTO v_ultimo_evento_time, v_ultimo_evento_type
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calculate hours worked = (saida-entrada) - (saida_almoco-entrada_almoco)
  -- CORREÇÃO: Se não houver saída explícita mas houver entrada e outros eventos,
  -- usar o último evento como referência para calcular horas parciais
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    -- Caso normal: tem entrada e saída
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSIF v_entrada IS NOT NULL AND v_ultimo_evento_time IS NOT NULL THEN
    -- CORREÇÃO: Tem entrada mas não tem saída explícita
    -- Usar último evento como referência para calcular horas parciais
    -- Se o último evento for saida_almoco, usar ele como saída
    IF v_ultimo_evento_type = 'saida_almoco' AND v_saida_almoco IS NOT NULL THEN
      -- Se o último evento foi saida_almoco, calcular até a saida_almoco
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_saida_almoco) - (v_date + v_entrada))) / 3600
        - COALESCE(EXTRACT(EPOCH FROM (
            CASE WHEN v_entrada_almoco IS NOT NULL
                 THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
                 ELSE INTERVAL '0 minute' END
          )) / 3600, 0), 2
      );
    ELSIF v_ultimo_evento_type = 'entrada_almoco' AND v_entrada_almoco IS NOT NULL THEN
      -- Se o último evento foi entrada_almoco, calcular até entrada_almoco (antes do almoço)
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_entrada_almoco) - (v_date + v_entrada))) / 3600, 2
      );
    ELSIF v_ultimo_evento_type = 'entrada' AND v_ultimo_evento_time = v_entrada THEN
      -- CORREÇÃO: Se o último evento é a própria entrada (apenas entrada registrada),
      -- não calcular horas (registro incompleto - funcionário não completou o ponto)
      -- Manter 0 horas para indicar que o registro está incompleto
      v_horas_trabalhadas := 0;
    ELSE
      -- Usar último evento como saída (horas parciais)
      -- Mas só se o último evento não for a entrada
      IF v_ultimo_evento_time != v_entrada THEN
        v_horas_trabalhadas := round(
          EXTRACT(EPOCH FROM ((v_date + v_ultimo_evento_time) - (v_date + v_entrada))) / 3600
          - COALESCE(EXTRACT(EPOCH FROM (
              CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
                   THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
                   ELSE INTERVAL '0 minute' END
            )) / 3600, 0), 2
        );
      ELSE
        -- Último evento é a entrada: registro incompleto
        v_horas_trabalhadas := 0;
      END IF;
    END IF;
    
    -- Garantir que horas trabalhadas não seja negativa
    IF v_horas_trabalhadas < 0 THEN
      v_horas_trabalhadas := 0;
    END IF;
  ELSE
    v_horas_trabalhadas := 0;
  END IF;

  -- Calculate extra hours from extra window (extra_inicio/extra_fim)
  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  END IF;

  -- Calcular horas noturnas (só se tiver entrada e saída ou último evento)
  IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
    v_horas_noturnas := rh.calculate_night_hours(
      v_entrada, 
      COALESCE(v_saida, v_ultimo_evento_time), 
      v_date
    );
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
      -- Mas só se houver registro (entrada e saída ou entrada e último evento), caso contrário é falta não registrada
      IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
        -- Tem marcações e trabalhou menos: calcular horas negativas
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
    IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
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
    saida = COALESCE(v_saida, v_ultimo_evento_time), -- Usar último evento se não houver saída
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
Calcula horas noturnas (22h às 5h).
NOVA FUNCIONALIDADE: Calcula horas parciais quando há entrada mas não saída explícita, usando o último evento do dia como referência.
CORREÇÃO: Quando há apenas entrada (último evento é a própria entrada), mantém 0 horas (registro incompleto).';

