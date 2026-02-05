-- =====================================================
-- PRIORIZAR REGISTRO DO DIA ALVO NA get_consolidated_time_record_by_window
-- =====================================================
-- Data: 2026-01-30
-- Descrição: A função buscava primeiro o registro do DIA ANTERIOR (se dentro da janela)
--            e só depois o do dia alvo. Isso fazia com que, ao abrir registro-ponto em
--            30/01 com um registro de 30/01 (entrada 16:28) e também um registro de 29/01,
--            fosse retornado o de 29/01 e o de 30/01 nunca aparecesse na página
--            "portal-colaborador/registro-ponto" (enquanto aparecia em historico-marcacoes).
--            Esta correção inverte a ordem: primeiro busca registro do DIA ALVO (p_target_date);
--            só se não existir, busca o do dia anterior dentro da janela.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_consolidated_time_record_by_window(
  p_employee_id uuid,
  p_company_id uuid,
  p_target_date date,
  p_timezone text DEFAULT 'America/Sao_Paulo'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_hours INTEGER := 24; -- Padrão
  v_target_record_id uuid;
  v_target_record_date date;
  v_target_entrada time;
  v_previous_day_record_id uuid;
  v_previous_day_date date;
  v_previous_day_entrada time;
  v_next_day_record_id uuid;
  v_next_day_date date;
  v_first_mark_timestamp timestamptz;
  v_current_timestamp timestamptz;
  v_mark_timestamp timestamptz;
  v_hours_elapsed numeric;
  v_result jsonb;
  v_base_date date;
  -- Variáveis para datas reais dos eventos
  v_entrada_date date;
  v_entrada_almoco_date date;
  v_saida_almoco_date date;
  v_saida_date date;
  v_entrada_extra1_date date;
  v_saida_extra1_date date;
  v_event_date date;
  v_next_event_date date;
  v_next_event_time time;
BEGIN
  -- Obter configuração da janela de tempo
  SELECT COALESCE(janela_tempo_marcacoes, 24) INTO v_window_hours
  FROM rh.time_record_settings
  WHERE company_id = p_company_id;

  -- PASSO 1 (corrigido): Buscar PRIMEIRO registro do DIA ALVO (hoje)
  -- Assim, quando o usuário registra entrada em 30/01 16:28, esse registro é retornado
  -- e aparece na página registro-ponto; o dia anterior só é usado se não houver registro no dia alvo.
  SELECT 
    tr.id,
    tr.data_registro,
    tr.entrada
  INTO 
    v_target_record_id,
    v_target_record_date,
    v_target_entrada
  FROM rh.time_records tr
  WHERE tr.employee_id = p_employee_id
    AND tr.company_id = p_company_id
    AND tr.data_registro = p_target_date
    AND tr.entrada IS NOT NULL
  LIMIT 1;

  IF v_target_record_id IS NOT NULL THEN
    v_base_date := v_target_record_date;
  END IF;

  -- PASSO 2: Só se NÃO encontrou registro no dia alvo, buscar do dia anterior (dentro da janela)
  IF v_target_record_id IS NULL THEN
    SELECT 
      tr.id,
      tr.data_registro,
      tr.entrada
    INTO 
      v_previous_day_record_id,
      v_previous_day_date,
      v_previous_day_entrada
    FROM rh.time_records tr
    WHERE tr.employee_id = p_employee_id
      AND tr.company_id = p_company_id
      AND tr.data_registro = p_target_date - INTERVAL '1 day'
      AND tr.entrada IS NOT NULL
    LIMIT 1;

    IF v_previous_day_record_id IS NOT NULL AND v_previous_day_entrada IS NOT NULL THEN
      v_first_mark_timestamp := ((v_previous_day_date + v_previous_day_entrada)::timestamp 
                                 AT TIME ZONE p_timezone)::timestamptz;
      v_current_timestamp := (p_target_date::timestamp AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_timestamp - v_first_mark_timestamp)) / 3600;

      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_target_record_id := v_previous_day_record_id;
        v_target_record_date := v_previous_day_date;
        v_target_entrada := v_previous_day_entrada;
        v_base_date := v_previous_day_date;
        RAISE NOTICE 'Registro do dia anterior dentro da janela (sem registro no dia alvo). Data: %, Horas: %, Janela: %h', 
          v_previous_day_date, ROUND(v_hours_elapsed, 2), v_window_hours;
      END IF;
    END IF;
  END IF;

  IF v_target_record_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- PASSO 3: Construir resultado base com o registro encontrado
  SELECT row_to_json(tr.*)::jsonb INTO v_result
  FROM rh.time_records tr
  WHERE tr.id = v_target_record_id;

  v_first_mark_timestamp := ((v_base_date + v_target_entrada)::timestamp 
                             AT TIME ZONE p_timezone)::timestamptz;

  -- PASSO 4: Buscar datas reais dos eventos (time_record_events)
  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_entrada_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_entrada_almoco_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_saida_almoco_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_saida_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id AND event_type = 'saida'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_entrada_extra1_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_saida_extra1_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id AND event_type = 'extra_fim'
  ORDER BY event_at ASC LIMIT 1;

  IF v_entrada_date IS NOT NULL AND v_entrada_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{entrada_date}', to_jsonb(v_entrada_date::text));
  END IF;
  IF v_entrada_almoco_date IS NOT NULL AND v_entrada_almoco_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{entrada_almoco_date}', to_jsonb(v_entrada_almoco_date::text));
  END IF;
  IF v_saida_almoco_date IS NOT NULL AND v_saida_almoco_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_saida_almoco_date::text));
  END IF;
  IF v_saida_date IS NOT NULL AND v_saida_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{saida_date}', to_jsonb(v_saida_date::text));
  END IF;
  IF v_entrada_extra1_date IS NOT NULL AND v_entrada_extra1_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{entrada_extra1_date}', to_jsonb(v_entrada_extra1_date::text));
  END IF;
  IF v_saida_extra1_date IS NOT NULL AND v_saida_extra1_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{saida_extra1_date}', to_jsonb(v_saida_extra1_date::text));
  END IF;

  -- PASSO 5: Consolidar marcações do dia seguinte (dentro da janela)
  SELECT tr.id, tr.data_registro INTO v_next_day_record_id, v_next_day_date
  FROM rh.time_records tr
  WHERE tr.employee_id = p_employee_id
    AND tr.company_id = p_company_id
    AND tr.data_registro = v_base_date + INTERVAL '1 day'
  LIMIT 1;

  IF v_next_day_record_id IS NOT NULL THEN
    BEGIN
      -- Saída do dia seguinte
      SELECT (tre.event_at AT TIME ZONE p_timezone)::date, (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id AND tre.event_type = 'saida'
      ORDER BY tre.event_at ASC LIMIT 1;
      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{saida}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{saida_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Entrada almoço do dia seguinte
      SELECT (tre.event_at AT TIME ZONE p_timezone)::date, (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id AND tre.event_type = 'entrada_almoco'
      ORDER BY tre.event_at ASC LIMIT 1;
      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{entrada_almoco}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{entrada_almoco_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Saída almoço do dia seguinte
      SELECT (tre.event_at AT TIME ZONE p_timezone)::date, (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id AND tre.event_type = 'saida_almoco'
      ORDER BY tre.event_at ASC LIMIT 1;
      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{saida_almoco}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Entrada extra / Saída extra do dia seguinte
      SELECT (tre.event_at AT TIME ZONE p_timezone)::date, (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id AND tre.event_type = 'extra_inicio'
      ORDER BY tre.event_at ASC LIMIT 1;
      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{entrada_extra1}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{entrada_extra1_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      SELECT (tre.event_at AT TIME ZONE p_timezone)::date, (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id AND tre.event_type = 'extra_fim'
      ORDER BY tre.event_at ASC LIMIT 1;
      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{saida_extra1}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{saida_extra1_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;
  END;
  END IF;

  v_result := jsonb_set(v_result, '{base_date}', to_jsonb(v_base_date::text));
  v_result := jsonb_set(v_result, '{window_hours}', to_jsonb(v_window_hours));

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao buscar registro consolidado: %', SQLERRM;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_consolidated_time_record_by_window IS 
'Busca e consolida registros de ponto considerando a janela de tempo.
PRIORIDADE: 1) Registro do dia alvo (p_target_date); 2) Registro do dia anterior se ainda dentro da janela.
Assim, a entrada registrada no dia atual (ex.: 30/01 16:28) aparece na página registro-ponto.
Também consolida marcações do dia seguinte que estão dentro da janela.';

GRANT EXECUTE ON FUNCTION public.get_consolidated_time_record_by_window(uuid, uuid, date, text) TO authenticated;
