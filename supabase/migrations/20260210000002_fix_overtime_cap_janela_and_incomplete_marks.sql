-- =====================================================
-- CORREÇÃO: Extras 50% acima da janela de tempo e registro incompleto
-- =====================================================
-- Data: 2026-02-10
-- Problema:
--   1. Registros com apenas entrada (e eventualmente início almoço), sem saída,
--      estavam recebendo horas_extras_50 = 99,99 porque a função usava saida/saida_almoco
--      vindos da própria tabela time_records (valores antigos/incorretos) quando não
--      havia evento de saida.
--   2. Horas extras não eram limitadas pela janela de tempo da empresa (ex: 15h);
--      excedente podia gerar 99h59 mesmo com janela de 15h.
-- Solução:
--   1. Em recalculate_time_record_hours: inicializar v_horas_trabalhadas := 0;
--      após carregar da tabela, anular saida/saida_almoco/extra quando não existir
--      evento correspondente (nunca usar valor da tabela para cálculo quando falta evento).
--   2. Em calculate_overtime_by_scale: obter janela_tempo_marcacoes da empresa e
--      limitar o excedente usado para 50%/100% a no máximo essa janela (ex: 15h).
-- =====================================================

-- 1) recalculate_time_record_hours: não usar saida/almoco/extra da tabela sem evento
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
  v_horas_trabalhadas numeric(10,2) := 0;  -- Inicializar para registro incompleto
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
  v_saida_ts timestamptz;
  v_entrada_ts timestamptz;
  v_ultimo_evento_time TIME;
  v_ultimo_evento_type VARCHAR(20);
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

  -- Carregar da tabela apenas o que faltar; nunca usar saida/almoco/extra da tabela se não houver evento
  IF v_entrada IS NULL OR v_saida IS NULL THEN
    SELECT entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1
    INTO v_entrada, v_saida, v_entrada_almoco, v_saida_almoco, v_entrada_extra1, v_saida_extra1
    FROM rh.time_records WHERE id = p_time_record_id;
  END IF;
  -- CORREÇÃO: Não usar para cálculo valores da tabela quando não existe evento correspondente
  IF v_saida_event_at IS NULL THEN v_saida := NULL; END IF;
  IF v_saida_almoco_event_at IS NULL THEN v_saida_almoco := NULL; END IF;
  IF v_entrada_extra1_event_at IS NULL THEN v_entrada_extra1 := NULL; END IF;
  IF v_saida_extra1_event_at IS NULL THEN v_saida_extra1 := NULL; END IF;

  -- Último evento do dia (para horas parciais quando há 2, 4 ou 6 marcações sem saída explícita)
  SELECT (event_at AT TIME ZONE v_timezone)::time, event_type
  INTO v_ultimo_evento_time, v_ultimo_evento_type
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id
  ORDER BY event_at DESC
  LIMIT 1;

  -- Cálculo de horas trabalhadas (par completo entrada/saída OU horas parciais pelo último evento)
  IF v_entrada_event_at IS NOT NULL AND v_saida_event_at IS NOT NULL THEN
    IF v_saida IS NOT NULL AND v_entrada IS NOT NULL 
       AND v_saida < v_entrada 
       AND v_saida_date IS NOT NULL 
       AND v_entrada_date IS NOT NULL
       AND v_saida_date = v_entrada_date THEN
      v_saida_ts := ((v_saida_date + 1) + v_saida)::timestamp AT TIME ZONE v_timezone;
      v_entrada_ts := (v_entrada_date + v_entrada)::timestamp AT TIME ZONE v_timezone;
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM (v_saida_ts - v_entrada_ts)) / 3600, 2);
      IF v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL THEN
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM (v_saida_almoco_event_at - v_entrada_almoco_event_at)) / 3600, 2);
      END IF;
    ELSE
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM (v_saida_event_at - v_entrada_event_at)) / 3600, 2);
      IF v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL THEN
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM (v_saida_almoco_event_at - v_entrada_almoco_event_at)) / 3600, 2);
      END IF;
    END IF;
    IF v_entrada_extra1_event_at IS NOT NULL AND v_saida_extra1_event_at IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas + ROUND(EXTRACT(EPOCH FROM (v_saida_extra1_event_at - v_entrada_extra1_event_at)) / 3600, 2);
    END IF;
  ELSIF v_entrada_date IS NOT NULL AND v_saida_date IS NOT NULL AND v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_entrada_date_use := v_entrada_date;
    v_saida_date_use := v_saida_date;
    IF v_saida < v_entrada THEN
      v_saida_date_use := v_saida_date + 1;
    END IF;
    v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM ((v_saida_date_use + v_saida)::timestamp - (v_entrada_date_use + v_entrada)::timestamp)) / 3600, 2);
    IF v_entrada_almoco_date IS NOT NULL AND v_saida_almoco_date IS NOT NULL AND v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
      v_entrada_almoco_date_use := v_entrada_almoco_date;
      v_saida_almoco_date_use := v_saida_almoco_date;
      v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM ((v_saida_almoco_date_use + v_saida_almoco)::timestamp - (v_entrada_almoco_date_use + v_entrada_almoco)::timestamp)) / 3600, 2);
    END IF;
    IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
      v_entrada_extra1_date_use := COALESCE(v_entrada_extra1_date, v_date);
      v_saida_extra1_date_use := COALESCE(v_saida_extra1_date, v_date);
      IF v_saida_extra1 < v_entrada_extra1 AND v_saida_extra1_date IS NULL THEN
        v_saida_extra1_date_use := v_date + INTERVAL '1 day';
      END IF;
      v_horas_trabalhadas := v_horas_trabalhadas + ROUND(EXTRACT(EPOCH FROM ((v_saida_extra1_date_use + v_saida_extra1)::timestamp - (v_entrada_extra1_date_use + v_entrada_extra1)::timestamp)) / 3600, 2);
    END IF;
  ELSIF v_entrada_event_at IS NOT NULL AND v_saida_event_at IS NULL AND v_entrada IS NOT NULL AND v_ultimo_evento_time IS NOT NULL THEN
    -- Horas parciais: entrada + outro(s) evento(s) sem saída (ex.: 2 marcações = entrada + início almoço)
    IF v_ultimo_evento_type = 'entrada_almoco' AND v_entrada_almoco IS NOT NULL THEN
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM ((v_date + v_entrada_almoco)::timestamp - (v_date + v_entrada)::timestamp)) / 3600, 2);
    ELSIF v_ultimo_evento_type = 'saida_almoco' AND v_saida_almoco IS NOT NULL THEN
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM ((v_date + v_saida_almoco)::timestamp - (v_date + v_entrada)::timestamp)) / 3600, 2)
        - ROUND(EXTRACT(EPOCH FROM ((v_date + v_saida_almoco)::timestamp - (v_date + v_entrada_almoco)::timestamp)) / 3600, 2);
    ELSIF v_ultimo_evento_type = 'entrada' AND v_ultimo_evento_time = v_entrada THEN
      v_horas_trabalhadas := 0;
    ELSE
      v_horas_trabalhadas := ROUND(EXTRACT(EPOCH FROM ((v_date + v_ultimo_evento_time)::timestamp - (v_date + v_entrada)::timestamp)) / 3600, 2);
      IF v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(EXTRACT(EPOCH FROM ((v_date + v_saida_almoco)::timestamp - (v_date + v_entrada_almoco)::timestamp)) / 3600, 2);
      END IF;
    END IF;
    IF COALESCE(v_horas_trabalhadas, 0) < 0 THEN v_horas_trabalhadas := 0; END IF;
  END IF;
  -- Se não entrou em nenhum bloco acima, v_horas_trabalhadas permanece 0 (registro incompleto)

  IF v_entrada_event_at IS NOT NULL THEN v_entrada_date_for_night := (v_entrada_event_at AT TIME ZONE v_timezone)::date; ELSE v_entrada_date_for_night := COALESCE(v_entrada_date, v_date); END IF;
  IF v_saida_event_at IS NOT NULL THEN v_saida_date_for_night := (v_saida_event_at AT TIME ZONE v_timezone)::date; ELSE v_saida_date_for_night := COALESCE(v_saida_date, v_date); END IF;

  v_horas_noturnas := rh.calculate_night_hours(v_entrada, COALESCE(v_saida, v_ultimo_evento_time), v_date, v_entrada_date_for_night, v_saida_date_for_night);

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
'Recalcula horas trabalhadas, faltas e noturnas a partir dos eventos. Chama calculate_overtime_by_scale.
CORREÇÃO 2026-02-10: Inicializa v_horas_trabalhadas := 0; não usa saida/saida_almoco/extra da tabela quando não existe evento (evita 99h59 em registro incompleto).';

-- 2) calculate_overtime_by_scale: limitar excedente pela janela de tempo da empresa
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
  v_excedente NUMERIC(10,2);
  v_janela_horas NUMERIC(10,2) := 24;  -- padrão 24h se não houver configuração
  v_excedente_limitado NUMERIC(10,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_tem_todas_marcacoes BOOLEAN := false;
  v_debug_info TEXT;
  v_entrada_date DATE;
  v_saida_date DATE;
  v_timezone text := 'America/Sao_Paulo';
  v_horas_extras_sum DECIMAL(4,2);
BEGIN
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

  v_tem_todas_marcacoes := (v_entrada IS NOT NULL AND v_saida IS NOT NULL);

  -- Janela de tempo da empresa (12, 15, 20, 22 ou 24): limitar horas extras a esse máximo
  SELECT COALESCE(trs.janela_tempo_marcacoes, 24) INTO v_janela_horas
  FROM rh.time_record_settings trs
  WHERE trs.company_id = v_company_id
  LIMIT 1;
  IF v_janela_horas IS NULL THEN v_janela_horas := 24; END IF;

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
    v_debug_info := format('AVISO: Usando padrão 8.0h para funcionário %s em %s (turno não encontrado)', 
                          v_employee_id, v_date);
    RAISE WARNING '%', v_debug_info;
  END IF;
  
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  SELECT 
    (MIN(CASE WHEN event_type = 'entrada' THEN event_at END) AT TIME ZONE v_timezone)::date,
    (MAX(CASE WHEN event_type = 'saida' THEN event_at END) AT TIME ZONE v_timezone)::date
  INTO 
    v_entrada_date,
    v_saida_date
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  IF v_entrada_date IS NULL THEN v_entrada_date := v_date; END IF;
  IF v_saida_date IS NULL THEN v_saida_date := v_date; END IF;

  v_horas_noturnas := rh.calculate_night_hours(
    v_entrada, v_saida, v_date, v_entrada_date, v_saida_date
  );

  v_excedente := v_horas_trabalhadas - v_horas_diarias;
  v_excedente := GREATEST(-99.99, LEAST(99.99, v_excedente));
  -- Limitar excedente usado para extras ao máximo da janela de tempo (ex: 15h)
  v_excedente_limitado := LEAST(v_excedente, v_janela_horas);

  IF v_is_feriado AND v_horas_trabalhadas > 0 THEN
    v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
    v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
    v_horas_extras_50 := 0;
    v_horas_para_banco := 0;
    v_horas_negativas := 0;
    
  ELSIF v_excedente > 0 THEN
    IF v_tipo_escala = 'escala_12x36' THEN
      IF v_horas_trabalhadas > 12 THEN
        v_excedente_limitado := LEAST(99.99, LEAST(v_janela_horas, v_horas_trabalhadas - 12));
        v_horas_extras_50 := v_excedente_limitado;
        v_horas_para_banco := v_excedente_limitado;
      END IF;
    ELSIF v_tipo_escala = 'flexivel_6x1' THEN
      IF v_is_dia_folga THEN
        v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
      END IF;
    ELSE
      IF v_is_domingo THEN
        v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
      END IF;
    END IF;
    v_horas_negativas := 0;
    
  ELSIF v_excedente < 0 THEN
    IF v_tem_todas_marcacoes THEN
      v_horas_negativas := LEAST(99.99, ROUND(ABS(v_excedente), 2));
    ELSE
      v_horas_negativas := 0;
    END IF;
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    
  ELSE
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    v_horas_negativas := 0;
  END IF;

  v_horas_extras_50 := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_extras_50, 0)));
  v_horas_extras_100 := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_extras_100, 0)));
  v_horas_para_banco := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_para_banco, 0)));
  v_horas_para_pagamento := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_para_pagamento, 0)));
  v_horas_negativas := LEAST(99.99, GREATEST(0, COALESCE(v_horas_negativas, 0)));
  v_horas_noturnas := LEAST(99.99, GREATEST(0, COALESCE(v_horas_noturnas, 0)));
  v_horas_extras_sum := LEAST(99.99, GREATEST(-99.99, v_horas_extras_50 + v_horas_extras_100));

  UPDATE rh.time_records
  SET 
    horas_extras_50 = ROUND(v_horas_extras_50, 2),
    horas_extras_100 = ROUND(v_horas_extras_100, 2),
    horas_extras = ROUND(v_horas_extras_sum, 2),
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

COMMENT ON FUNCTION rh.calculate_overtime_by_scale(UUID) IS 
'Calcula horas extras conforme tipo de escala e regras CLT.
CORREÇÃO 2026-02-10: Limita excedente usado para 50%/100% pela janela_tempo_marcacoes da empresa (ex: 15h), evitando Extras 50% acima da janela.';
