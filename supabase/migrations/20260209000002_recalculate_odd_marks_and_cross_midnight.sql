-- =====================================================
-- CORREÇÃO: Cálculo com quantidade ímpar de registros e saída após meia-noite
-- =====================================================
-- Data: 2026-02-09
-- Descrição:
--   1. Quando há quantidade ímpar de marcações (ex: 5 registros com Entrada Extra
--      sem Saída Extra), calcular apenas até o último par completo (até o 4º registro).
--      Ou seja: NÃO incluir janela extra (entrada_extra1/saida_extra1) quando
--      saida_extra1 estiver ausente.
--   2. Quando o total de horas sai negativo porque a saída é após meia-noite
--      (ex: entrada 17:04, saída 00:02), interpretar a saída como dia seguinte
--      para evitar Total de horas e Negativas absurdos (-19h, -26h).
-- =====================================================

CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_faltas numeric(10,2);
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_entrada_extra1 TIME;
  v_saida_extra1 TIME;
  v_horas_trabalhadas numeric(10,2);
  v_horas_diarias numeric(10,2);
  v_horas_extra_window numeric(10,2) := 0;
  v_diferenca_horas numeric(10,2);
  v_requer_registro_ponto boolean := true;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_timezone text := 'America/Sao_Paulo';
  v_entrada_date_use date;
  v_saida_date_use date;
  v_entrada_almoco_date_use date;
  v_saida_almoco_date_use date;
  v_entrada_extra1_date_use date;
  v_saida_extra1_date_use date;
  v_entrada_event_at timestamptz;
  v_saida_event_at timestamptz;
  v_entrada_almoco_event_at timestamptz;
  v_saida_almoco_event_at timestamptz;
  v_entrada_extra1_event_at timestamptz;
  v_saida_extra1_event_at timestamptz;
  v_entrada_date date;
  v_saida_date date;
  v_entrada_almoco_date date;
  v_saida_almoco_date date;
  v_entrada_extra1_date date;
  v_saida_extra1_date date;
  v_entrada_date_for_night date;
  v_saida_date_for_night date;
  v_horas_noturnas numeric(10,2) := 0;
  v_work_shift_id UUID;
  v_tipo_escala VARCHAR(50);
  v_current_status VARCHAR(20);
  -- Correção saída após meia-noite
  v_saida_ts timestamptz;
  v_entrada_ts timestamptz;
BEGIN
  SELECT tr.employee_id, tr.company_id, tr.data_registro, tr.horas_faltas, tr.status,
         COALESCE(e.requer_registro_ponto, true)
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas, v_current_status, v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

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

  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias INTO v_horas_diarias FROM rh.work_shifts WHERE id = v_work_shift_id;
  END IF;

  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  SELECT MIN(event_at) INTO v_entrada_event_at FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada';
  SELECT MAX(event_at) INTO v_saida_event_at FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida';
  SELECT MIN(event_at) INTO v_entrada_almoco_event_at FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco';
  SELECT MAX(event_at) INTO v_saida_almoco_event_at FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco';
  SELECT MIN(event_at) INTO v_entrada_extra1_event_at FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio';
  SELECT MAX(event_at) INTO v_saida_extra1_event_at FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim';

  IF v_entrada_event_at IS NOT NULL THEN v_entrada_date := (v_entrada_event_at AT TIME ZONE v_timezone)::date; END IF;
  IF v_saida_event_at IS NOT NULL THEN v_saida_date := (v_saida_event_at AT TIME ZONE v_timezone)::date; END IF;
  IF v_entrada_almoco_event_at IS NOT NULL THEN v_entrada_almoco_date := (v_entrada_almoco_event_at AT TIME ZONE v_timezone)::date; END IF;
  IF v_saida_almoco_event_at IS NOT NULL THEN v_saida_almoco_date := (v_saida_almoco_event_at AT TIME ZONE v_timezone)::date; END IF;
  IF v_entrada_extra1_event_at IS NOT NULL THEN v_entrada_extra1_date := (v_entrada_extra1_event_at AT TIME ZONE v_timezone)::date; END IF;
  IF v_saida_extra1_event_at IS NOT NULL THEN v_saida_extra1_date := (v_saida_extra1_event_at AT TIME ZONE v_timezone)::date; END IF;

  IF v_entrada_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time INTO v_entrada FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada' ORDER BY event_at ASC LIMIT 1;
  END IF;
  IF v_saida_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time INTO v_saida FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida' ORDER BY event_at DESC LIMIT 1;
  END IF;
  IF v_entrada_almoco_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time INTO v_entrada_almoco FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco' ORDER BY event_at ASC LIMIT 1;
  END IF;
  IF v_saida_almoco_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time INTO v_saida_almoco FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco' ORDER BY event_at DESC LIMIT 1;
  END IF;
  IF v_entrada_extra1_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time INTO v_entrada_extra1 FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio' ORDER BY event_at ASC LIMIT 1;
  END IF;
  IF v_saida_extra1_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time INTO v_saida_extra1 FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim' ORDER BY event_at DESC LIMIT 1;
  END IF;

  IF v_entrada IS NULL OR v_saida IS NULL THEN
    SELECT entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1
    INTO v_entrada, v_saida, v_entrada_almoco, v_saida_almoco, v_entrada_extra1, v_saida_extra1
    FROM rh.time_records WHERE id = p_time_record_id;
  END IF;

  -- =====================================================
  -- Cálculo de horas trabalhadas (apenas pares completos)
  -- Regra: com quantidade ímpar de marcações, considerar só até o último par
  -- (não incluir entrada_extra1 sem saida_extra1)
  -- =====================================================
  IF v_entrada_event_at IS NOT NULL AND v_saida_event_at IS NOT NULL THEN
    -- CORREÇÃO CRÍTICA: Verificar se saída está no dia seguinte antes de calcular
    -- Se a hora da saída (local) < hora da entrada (local) E as datas locais são iguais,
    -- significa que a saída cruzou meia-noite e está no dia seguinte
    IF v_saida IS NOT NULL AND v_entrada IS NOT NULL 
       AND v_saida < v_entrada 
       AND v_saida_date IS NOT NULL 
       AND v_entrada_date IS NOT NULL
       AND v_saida_date = v_entrada_date THEN
      -- Saída cruzou meia-noite: usar saída do dia seguinte
      v_saida_ts := ((v_saida_date + 1) + v_saida)::timestamp AT TIME ZONE v_timezone;
      v_entrada_ts := (v_entrada_date + v_entrada)::timestamp AT TIME ZONE v_timezone;
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM (v_saida_ts - v_entrada_ts)) / 3600, 2);
      IF v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL THEN
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM (v_saida_almoco_event_at - v_entrada_almoco_event_at)) / 3600, 2);
      END IF;
      -- Não incluir janela extra quando incompleta (já está correto - só adiciona se ambos existem)
    ELSE
      -- Cálculo normal usando event_at diretamente
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM (v_saida_event_at - v_entrada_event_at)) / 3600, 2);
      IF v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL THEN
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM (v_saida_almoco_event_at - v_entrada_almoco_event_at)) / 3600, 2);
      END IF;
    END IF;
    
    -- Só incluir janela extra quando AMBOS extra_inicio e extra_fim existem (par completo)
    IF v_entrada_extra1_event_at IS NOT NULL AND v_saida_extra1_event_at IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas + ROUND(EXTRACT(EPOCH FROM (v_saida_extra1_event_at - v_entrada_extra1_event_at)) / 3600, 2);
    END IF;
  ELSIF v_entrada_date IS NOT NULL AND v_saida_date IS NOT NULL AND v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_entrada_date_use := v_entrada_date;
    v_saida_date_use := v_saida_date;
    -- Se saída (hora) < entrada, assumir saída no dia seguinte
    IF v_saida < v_entrada THEN
      v_saida_date_use := v_saida_date + 1;
    END IF;
    v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM ((v_saida_date_use + v_saida)::timestamp - (v_entrada_date_use + v_entrada)::timestamp)) / 3600, 2);
    IF v_entrada_almoco_date IS NOT NULL AND v_saida_almoco_date IS NOT NULL AND v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
      v_entrada_almoco_date_use := v_entrada_almoco_date;
      v_saida_almoco_date_use := v_saida_almoco_date;
      v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM ((v_saida_almoco_date_use + v_saida_almoco)::timestamp - (v_entrada_almoco_date_use + v_entrada_almoco)::timestamp)) / 3600, 2);
    END IF;
    -- Janela extra: só quando par completo
    IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
      v_entrada_extra1_date_use := COALESCE(v_entrada_extra1_date, v_date);
      v_saida_extra1_date_use := COALESCE(v_saida_extra1_date, v_date);
      IF v_saida_extra1 < v_entrada_extra1 AND v_saida_extra1_date IS NULL THEN
        v_saida_extra1_date_use := v_date + INTERVAL '1 day';
      END IF;
      v_horas_trabalhadas := v_horas_trabalhadas + ROUND(EXTRACT(EPOCH FROM ((v_saida_extra1_date_use + v_saida_extra1)::timestamp - (v_entrada_extra1_date_use + v_entrada_extra1)::timestamp)) / 3600, 2);
    END IF;
  ELSE
    IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
      SELECT public.calculate_work_hours(v_entrada, v_saida, v_entrada_almoco, v_saida_almoco) INTO v_horas_trabalhadas;
      -- Se deu negativo e saída < entrada, assumir saída no dia seguinte
      IF COALESCE(v_horas_trabalhadas, 0) < 0 AND v_saida < v_entrada THEN
        v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM ((v_date + INTERVAL '1 day' + v_saida)::timestamp - (v_date + v_entrada)::timestamp)) / 3600, 2);
        IF v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
          v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM ((v_saida_almoco - v_entrada_almoco)::interval)) / 3600, 2);
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_entrada_event_at IS NOT NULL THEN v_entrada_date_for_night := (v_entrada_event_at AT TIME ZONE v_timezone)::date; ELSE v_entrada_date_for_night := COALESCE(v_entrada_date, v_date); END IF;
  IF v_saida_event_at IS NOT NULL THEN v_saida_date_for_night := (v_saida_event_at AT TIME ZONE v_timezone)::date; ELSE v_saida_date_for_night := COALESCE(v_saida_date, v_date); END IF;

  v_horas_noturnas := rh.calculate_night_hours(v_entrada, v_saida, v_date, v_entrada_date_for_night, v_saida_date_for_night);

  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  IF v_requer_registro_ponto THEN
    IF v_diferenca_horas < 0 THEN
      v_horas_faltas := ABS(v_diferenca_horas);
    ELSE
      v_horas_faltas := 0;
    END IF;
  ELSE
    v_horas_faltas := 0;
  END IF;

  v_horas_trabalhadas := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_trabalhadas, 0)));
  v_horas_faltas := LEAST(99.99, GREATEST(0, COALESCE(v_horas_faltas, 0)));
  v_horas_noturnas := LEAST(99.99, GREATEST(0, COALESCE(v_horas_noturnas, 0)));

  UPDATE rh.time_records
  SET 
    horas_trabalhadas = ROUND(v_horas_trabalhadas, 2),
    horas_faltas = ROUND(v_horas_faltas, 2),
    horas_noturnas = ROUND(v_horas_noturnas, 2),
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1,
    status = CASE 
      WHEN v_current_status = 'rejeitado' THEN 'rejeitado'
      ELSE 'aprovado'
    END
  WHERE id = p_time_record_id;

  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto.
Regra 2026-02-09: Com quantidade ímpar de marcações (ex: 5), calcular apenas até o último par completo (até o 4º registro); não incluir entrada_extra sem saida_extra.
Quando saída é após meia-noite (ex: 00:02), interpretar saída como dia seguinte para evitar totais negativos incorretos.';
