-- Aplicar correção da função recalculate_time_record_hours
-- Esta versão NUNCA zera dados existentes

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
  v_entrada_existente time;
  v_saida_existente time;
  v_entrada_almoco_existente time;
  v_saida_almoco_existente time;
  v_entrada_extra1_existente time;
  v_saida_extra1_existente time;
BEGIN
  -- CORREÇÃO CRÍTICA: Buscar dados EXISTENTES na tabela time_records PRIMEIRO
  SELECT 
    tr.employee_id, 
    tr.company_id, 
    tr.data_registro, 
    tr.horas_faltas,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.entrada_extra1,
    tr.saida_extra1,
    COALESCE(e.requer_registro_ponto, true)
  INTO 
    v_employee_id, 
    v_company_id, 
    v_date, 
    v_horas_faltas,
    v_entrada_existente,
    v_saida_existente,
    v_entrada_almoco_existente,
    v_saida_almoco_existente,
    v_entrada_extra1_existente,
    v_saida_extra1_existente,
    v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- CORREÇÃO CRÍTICA: Usar dados existentes como base
  v_entrada := v_entrada_existente;
  v_saida := v_saida_existente;
  v_entrada_almoco := v_entrada_almoco_existente;
  v_saida_almoco := v_saida_almoco_existente;
  v_entrada_extra1 := v_entrada_extra1_existente;
  v_saida_extra1 := v_saida_extra1_existente;

  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

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

  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT e.work_shift_id, ws.horas_diarias
    INTO v_work_shift_id, v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = v_employee_id
      AND e.company_id = v_company_id;
  END IF;

  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias
    INTO v_horas_diarias
    FROM rh.work_shifts
    WHERE id = v_work_shift_id;
  END IF;

  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  -- CORREÇÃO CRÍTICA: Buscar eventos APENAS se dados não existirem
  IF v_entrada IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_entrada
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_saida
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_almoco IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_entrada_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_almoco IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_saida_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_extra1 IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_entrada_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_extra1 IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_saida_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  SELECT (event_at AT TIME ZONE 'UTC')::time, event_type
  INTO v_ultimo_evento_time, v_ultimo_evento_type
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calcular horas trabalhadas
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSIF v_entrada IS NOT NULL AND v_ultimo_evento_time IS NOT NULL AND v_saida IS NULL THEN
    IF v_ultimo_evento_type = 'saida_almoco' AND v_saida_almoco IS NOT NULL THEN
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_saida_almoco) - (v_date + v_entrada))) / 3600
        - COALESCE(EXTRACT(EPOCH FROM (
            CASE WHEN v_entrada_almoco IS NOT NULL
                 THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
                 ELSE INTERVAL '0 minute' END
          )) / 3600, 0), 2
      );
    ELSIF v_ultimo_evento_type = 'entrada_almoco' AND v_entrada_almoco IS NOT NULL THEN
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_entrada_almoco) - (v_date + v_entrada))) / 3600, 2
      );
    ELSIF v_ultimo_evento_type = 'entrada' AND v_ultimo_evento_time = v_entrada THEN
      v_horas_trabalhadas := 0;
    ELSIF v_ultimo_evento_time != v_entrada THEN
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_ultimo_evento_time) - (v_date + v_entrada))) / 3600
        - COALESCE(EXTRACT(EPOCH FROM (
            CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
                 THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
                 ELSE INTERVAL '0 minute' END
          )) / 3600, 0), 2
      );
    END IF;
    IF v_horas_trabalhadas < 0 THEN
      v_horas_trabalhadas := 0;
    END IF;
  ELSIF v_entrada IS NULL AND v_saida IS NULL THEN
    -- CORREÇÃO CRÍTICA: Preservar horas_trabalhadas existente
    SELECT horas_trabalhadas INTO v_horas_trabalhadas
    FROM rh.time_records
    WHERE id = p_time_record_id;
    IF v_horas_trabalhadas IS NULL THEN
      v_horas_trabalhadas := 0;
    END IF;
  END IF;

  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  END IF;

  IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
    v_horas_noturnas := rh.calculate_night_hours(
      v_entrada, 
      COALESCE(v_saida, v_ultimo_evento_time), 
      v_date
    );
  ELSE
    -- CORREÇÃO CRÍTICA: Preservar horas_noturnas existente
    SELECT horas_noturnas INTO v_horas_noturnas
    FROM rh.time_records
    WHERE id = p_time_record_id;
    IF v_horas_noturnas IS NULL THEN
      v_horas_noturnas := 0;
    END IF;
  END IF;

  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  IF v_requer_registro_ponto THEN
    IF v_diferenca_horas > 0 THEN
      v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      v_horas_negativas := 0;
    ELSIF v_diferenca_horas < 0 THEN
      IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
        v_horas_negativas := round(ABS(v_diferenca_horas), 2);
        v_horas_extras := round(v_horas_extra_window, 2);
      ELSE
        v_horas_negativas := 0;
        v_horas_extras := 0;
        IF v_horas_faltas IS NULL OR v_horas_faltas = 0 THEN
          v_horas_faltas := v_horas_diarias;
        END IF;
      END IF;
    ELSE
      v_horas_extras := round(v_horas_extra_window, 2);
      v_horas_negativas := 0;
    END IF;
  ELSE
    IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
      IF v_diferenca_horas > 0 THEN
        v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      ELSE
        v_horas_extras := round(v_horas_extra_window, 2);
      END IF;
      v_horas_negativas := 0;
    ELSE
      v_horas_extras := 0;
      v_horas_negativas := 0;
    END IF;
  END IF;

  v_horas_faltas := COALESCE(v_horas_faltas, 0);

  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  IF v_last_event_at IS NULL THEN
    v_last_event_at := now();
  END IF;

  -- CORREÇÃO CRÍTICA: Usar COALESCE para preservar dados existentes
  UPDATE rh.time_records
  SET 
    entrada = COALESCE(v_entrada, entrada),
    saida = COALESCE(v_saida, saida),
    entrada_almoco = COALESCE(v_entrada_almoco, entrada_almoco),
    saida_almoco = COALESCE(v_saida_almoco, saida_almoco),
    entrada_extra1 = COALESCE(v_entrada_extra1, entrada_extra1),
    saida_extra1 = COALESCE(v_saida_extra1, saida_extra1),
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = CASE 
      WHEN v_horas_negativas > 0 THEN -v_horas_negativas
      ELSE v_horas_extras
    END,
    horas_negativas = v_horas_negativas,
    horas_noturnas = v_horas_noturnas,
    horas_faltas = v_horas_faltas,
    updated_at = v_last_event_at
  WHERE id = p_time_record_id;

  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. 
CORREÇÃO CRÍTICA: NUNCA zera dados existentes na tabela time_records.
Usa dados existentes (entrada, saida, etc) como fonte primária.
Só busca de eventos se dados não existirem.
Preserva todos os dados existentes ao recalcular.';

