-- =====================================================
-- ADICIONAR DATAS REAIS DOS EVENTOS NA FUNÇÃO get_consolidated_time_record_by_window
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Modifica a função para buscar as datas reais de cada marcação
--            usando time_record_events.event_at, garantindo que marcações
--            que ocorreram após a meia-noite mostrem a data correta.
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
BEGIN
  -- Obter configuração da janela de tempo
  SELECT COALESCE(janela_tempo_marcacoes, 24) INTO v_window_hours
  FROM rh.time_record_settings
  WHERE company_id = p_company_id;

  -- PASSO 1: Buscar registro do dia anterior primeiro (pode estar dentro da janela)
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

  -- Verificar se registro do dia anterior ainda está dentro da janela
  IF v_previous_day_record_id IS NOT NULL AND v_previous_day_entrada IS NOT NULL THEN
    -- Construir timestamp da entrada do dia anterior
    v_first_mark_timestamp := ((v_previous_day_date + v_previous_day_entrada)::timestamp 
                               AT TIME ZONE p_timezone)::timestamptz;
    
    -- Construir timestamp atual (início do dia alvo)
    v_current_timestamp := (p_target_date::timestamp AT TIME ZONE p_timezone)::timestamptz;
    
    -- Calcular horas decorridas desde a entrada até o início do dia atual
    v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_timestamp - v_first_mark_timestamp)) / 3600;
    
    -- Se ainda está dentro da janela de tempo, usar o registro do dia anterior
    IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
      v_target_record_id := v_previous_day_record_id;
      v_target_record_date := v_previous_day_date;
      v_target_entrada := v_previous_day_entrada;
      v_base_date := v_previous_day_date;
      
      RAISE NOTICE 'Registro do dia anterior ainda dentro da janela. Data: %, Horas decorridas: %, Janela: %h', 
        v_previous_day_date, ROUND(v_hours_elapsed, 2), v_window_hours;
    END IF;
  END IF;

  -- PASSO 2: Se não encontrou registro do dia anterior dentro da janela, buscar no dia alvo
  IF v_target_record_id IS NULL THEN
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
      -- Encontrou registro do dia alvo
      v_base_date := v_target_record_date;
    ELSE
      -- Não encontrou registro nem hoje nem ontem
      RETURN NULL;
    END IF;
  END IF;

  -- PASSO 3: Construir resultado base com o registro encontrado
  SELECT row_to_json(tr.*)::jsonb INTO v_result
  FROM rh.time_records tr
  WHERE tr.id = v_target_record_id;

  -- Construir timestamp da primeira marcação (entrada)
  v_first_mark_timestamp := ((v_base_date + v_target_entrada)::timestamp 
                             AT TIME ZONE p_timezone)::timestamptz;

  -- PASSO 4: Buscar datas reais dos eventos usando time_record_events
  -- Isso garante que marcações que ocorreram após a meia-noite mostrem a data correta
  
  -- Buscar data real da entrada
  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_entrada_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id
    AND event_type = 'entrada'
  ORDER BY event_at ASC
  LIMIT 1;

  -- Buscar data real da entrada_almoco
  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_entrada_almoco_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id
    AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC
  LIMIT 1;

  -- Buscar data real da saida_almoco
  -- IMPORTANTE: event_at está em UTC, converter para timezone local para obter data correta
  DECLARE
    v_saida_almoco_time_from_event time;
    v_saida_almoco_event_at timestamptz;
  BEGIN
    SELECT 
      (event_at AT TIME ZONE p_timezone)::date,
      (event_at AT TIME ZONE p_timezone)::time,
      event_at
    INTO 
      v_saida_almoco_date,
      v_saida_almoco_time_from_event,
      v_saida_almoco_event_at
    FROM rh.time_record_events
    WHERE time_record_id = v_target_record_id
      AND event_type = 'saida_almoco'
    ORDER BY event_at ASC
    LIMIT 1;
    
    -- Se encontrou o evento, verificar se precisa corrigir a data
    IF v_saida_almoco_date IS NOT NULL AND v_saida_almoco_time_from_event IS NOT NULL THEN
      -- Se o horário é entre 00:00 e 12:00, pode ser do dia seguinte
      -- Verificar se a data do evento é igual à base_date mas o horário indica dia seguinte
      IF v_saida_almoco_date = v_base_date 
         AND v_saida_almoco_time_from_event < '12:00'::time 
         AND v_saida_almoco_time_from_event >= '00:00'::time THEN
        -- Verificar se o timestamp UTC realmente indica dia seguinte
        -- Se event_at em UTC convertido para local dá data diferente, usar essa data
        DECLARE
          v_corrected_date date;
        BEGIN
          v_corrected_date := (v_saida_almoco_event_at AT TIME ZONE p_timezone)::date;
          -- Se a data corrigida é diferente da base_date, usar ela
          IF v_corrected_date != v_base_date THEN
            v_saida_almoco_date := v_corrected_date;
            RAISE NOTICE 'saida_almoco_date corrigida: % (era: %, base_date: %)', 
              v_saida_almoco_date, v_saida_almoco_date, v_base_date;
          END IF;
        END;
      END IF;
      
      RAISE NOTICE 'saida_almoco_date final: % (base_date: %, time: %)', 
        v_saida_almoco_date, v_base_date, v_saida_almoco_time_from_event;
    END IF;
  END;

  -- Buscar data real da saida
  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_saida_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id
    AND event_type = 'saida'
  ORDER BY event_at ASC
  LIMIT 1;

  -- Buscar data real da entrada_extra1
  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_entrada_extra1_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id
    AND event_type = 'extra_inicio'
  ORDER BY event_at ASC
  LIMIT 1;

  -- Buscar data real da saida_extra1
  SELECT (event_at AT TIME ZONE p_timezone)::date INTO v_saida_extra1_date
  FROM rh.time_record_events
  WHERE time_record_id = v_target_record_id
    AND event_type = 'extra_fim'
  ORDER BY event_at ASC
  LIMIT 1;

  -- Adicionar campos *_date quando a data real for diferente da base_date
  -- Isso permite que o frontend exiba a data correta mesmo quando agrupado
  IF v_entrada_date IS NOT NULL AND v_entrada_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{entrada_date}', to_jsonb(v_entrada_date::text));
  END IF;

  IF v_entrada_almoco_date IS NOT NULL AND v_entrada_almoco_date != v_base_date THEN
    v_result := jsonb_set(v_result, '{entrada_almoco_date}', to_jsonb(v_entrada_almoco_date::text));
  END IF;

  -- IMPORTANTE: Sempre adicionar saida_almoco_date se existir e for diferente
  -- Mesmo que esteja no mesmo registro, se o evento ocorreu no dia seguinte, mostrar a data correta
  IF v_saida_almoco_date IS NOT NULL THEN
    IF v_saida_almoco_date != v_base_date THEN
      v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_saida_almoco_date::text));
      RAISE NOTICE 'saida_almoco_date adicionado: % (base_date: %)', v_saida_almoco_date, v_base_date;
    ELSE
      -- Mesmo que seja igual, se o horário for após meia-noite (00:xx), pode ser do dia seguinte
      -- Verificar se o horário é menor que 12:00 (indicando possível virada de dia)
      DECLARE
        v_saida_almoco_time time;
      BEGIN
        SELECT (tre.event_at AT TIME ZONE p_timezone)::time INTO v_saida_almoco_time
        FROM rh.time_record_events tre
        WHERE tre.time_record_id = v_target_record_id
          AND tre.event_type = 'saida_almoco'
        ORDER BY tre.event_at ASC
        LIMIT 1;
        
        -- Se o horário é antes das 12:00 e a data do evento é diferente da base_date
        -- (pode ter sido calculado incorretamente), usar a data do evento
        IF v_saida_almoco_time IS NOT NULL AND v_saida_almoco_time < '12:00'::time THEN
          -- Verificar novamente a data do evento com mais precisão
          SELECT (tre.event_at AT TIME ZONE p_timezone)::date INTO v_saida_almoco_date
          FROM rh.time_record_events tre
          WHERE tre.time_record_id = v_target_record_id
            AND tre.event_type = 'saida_almoco'
          ORDER BY tre.event_at ASC
          LIMIT 1;
          
          IF v_saida_almoco_date IS NOT NULL AND v_saida_almoco_date != v_base_date THEN
            v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_saida_almoco_date::text));
            RAISE NOTICE 'saida_almoco_date corrigido: % (base_date: %, time: %)', v_saida_almoco_date, v_base_date, v_saida_almoco_time;
          END IF;
        END IF;
      END;
    END IF;
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

  -- PASSO 5: Buscar e consolidar marcações do dia seguinte (se houver)
  SELECT 
    tr.id,
    tr.data_registro
  INTO 
    v_next_day_record_id,
    v_next_day_date
  FROM rh.time_records tr
  WHERE tr.employee_id = p_employee_id
    AND tr.company_id = p_company_id
    AND tr.data_registro = v_base_date + INTERVAL '1 day'
  LIMIT 1;

  -- Se encontrou registro do dia seguinte, verificar quais marcações estão dentro da janela
  IF v_next_day_record_id IS NOT NULL THEN
    -- Para cada tipo de evento, buscar do registro do dia seguinte e verificar janela
    DECLARE
      v_next_event_date date;
      v_next_event_time time;
    BEGIN
      -- Verificar SAÍDA do dia seguinte
      SELECT 
        (tre.event_at AT TIME ZONE p_timezone)::date,
        (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id
        AND tre.event_type = 'saida'
      ORDER BY tre.event_at ASC
      LIMIT 1;

      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp 
                            AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{saida}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{saida_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Verificar ENTRADA_ALMOCO do dia seguinte
      SELECT 
        (tre.event_at AT TIME ZONE p_timezone)::date,
        (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id
        AND tre.event_type = 'entrada_almoco'
      ORDER BY tre.event_at ASC
      LIMIT 1;

      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp 
                            AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{entrada_almoco}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{entrada_almoco_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Verificar SAIDA_ALMOCO do dia seguinte
      SELECT 
        (tre.event_at AT TIME ZONE p_timezone)::date,
        (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id
        AND tre.event_type = 'saida_almoco'
      ORDER BY tre.event_at ASC
      LIMIT 1;

      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp 
                            AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{saida_almoco}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Verificar ENTRADA_EXTRA1 do dia seguinte
      SELECT 
        (tre.event_at AT TIME ZONE p_timezone)::date,
        (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id
        AND tre.event_type = 'extra_inicio'
      ORDER BY tre.event_at ASC
      LIMIT 1;

      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp 
                            AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{entrada_extra1}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{entrada_extra1_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;

      -- Verificar SAIDA_EXTRA1 do dia seguinte
      SELECT 
        (tre.event_at AT TIME ZONE p_timezone)::date,
        (tre.event_at AT TIME ZONE p_timezone)::time
      INTO v_next_event_date, v_next_event_time
      FROM rh.time_record_events tre
      WHERE tre.time_record_id = v_next_day_record_id
        AND tre.event_type = 'extra_fim'
      ORDER BY tre.event_at ASC
      LIMIT 1;

      IF v_next_event_time IS NOT NULL THEN
        v_mark_timestamp := ((v_next_event_date + v_next_event_time)::timestamp 
                            AT TIME ZONE p_timezone)::timestamptz;
        v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
        
        IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
          v_result := jsonb_set(v_result, '{saida_extra1}', to_jsonb(v_next_event_time::text));
          v_result := jsonb_set(v_result, '{saida_extra1_date}', to_jsonb(v_next_event_date::text));
        END IF;
      END IF;
    END;
  END IF;

  -- Adicionar campos auxiliares
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
'Busca e consolida registros de ponto considerando a janela de tempo configurada.
Busca bidirecionalmente: primeiro no dia alvo, depois no dia anterior se não encontrar.
Se encontrar registro do dia anterior que ainda está dentro da janela de tempo, retorna esse registro.
Também consolida marcações do dia seguinte que estão dentro da janela.
Usa time_record_events.event_at para obter a data real de cada marcação, garantindo que
marcações que ocorreram após a meia-noite mostrem a data correta na interface.
Retorna campos *_date apenas quando a data real é diferente da base_date.';

GRANT EXECUTE ON FUNCTION public.get_consolidated_time_record_by_window(uuid, uuid, date, text) TO authenticated;
