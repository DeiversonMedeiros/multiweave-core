-- =====================================================
-- CORRIGIR FUNÇÃO get_consolidated_time_record_by_window PARA BUSCAR BIDIRECIONALMENTE
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Corrige a função para buscar registros do dia anterior que ainda estão
--            dentro da janela de tempo, não apenas do dia atual e seguinte.
--            
--            Quando o usuário acessa no dia 28/01 e há um registro do dia 27/01 que
--            ainda está dentro da janela de 15h, a função deve retornar esse registro.
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
  v_previous_day_saida time;
  v_previous_day_entrada_almoco time;
  v_previous_day_saida_almoco time;
  v_previous_day_entrada_extra1 time;
  v_previous_day_saida_extra1 time;
  v_next_day_record_id uuid;
  v_next_day_date date;
  v_next_day_entrada time;
  v_next_day_saida time;
  v_next_day_entrada_almoco time;
  v_next_day_saida_almoco time;
  v_next_day_entrada_extra1 time;
  v_next_day_saida_extra1 time;
  v_first_mark_timestamp timestamptz;
  v_current_timestamp timestamptz;
  v_mark_timestamp timestamptz;
  v_hours_elapsed numeric;
  v_consolidated jsonb;
  v_result jsonb;
  v_base_date date;
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

  -- PASSO 4: Buscar e consolidar marcações do dia seguinte (se houver)
  SELECT 
    tr.id,
    tr.data_registro,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.entrada_extra1,
    tr.saida_extra1
  INTO 
    v_next_day_record_id,
    v_next_day_date,
    v_next_day_entrada,
    v_next_day_saida,
    v_next_day_entrada_almoco,
    v_next_day_saida_almoco,
    v_next_day_entrada_extra1,
    v_next_day_saida_extra1
  FROM rh.time_records tr
  WHERE tr.employee_id = p_employee_id
    AND tr.company_id = p_company_id
    AND tr.data_registro = v_base_date + INTERVAL '1 day'
  LIMIT 1;

  -- Se encontrou registro do dia seguinte, verificar quais marcações estão dentro da janela
  IF v_next_day_record_id IS NOT NULL THEN
    -- Verificar SAÍDA do dia seguinte
    IF v_next_day_saida IS NOT NULL THEN
      v_mark_timestamp := ((v_next_day_date + v_next_day_saida)::timestamp 
                          AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{saida}', to_jsonb(v_next_day_saida::text));
        v_result := jsonb_set(v_result, '{saida_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar ENTRADA_ALMOCO do dia seguinte
    IF v_next_day_entrada_almoco IS NOT NULL THEN
      v_mark_timestamp := ((v_next_day_date + v_next_day_entrada_almoco)::timestamp 
                          AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{entrada_almoco}', to_jsonb(v_next_day_entrada_almoco::text));
        v_result := jsonb_set(v_result, '{entrada_almoco_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar SAIDA_ALMOCO do dia seguinte
    IF v_next_day_saida_almoco IS NOT NULL THEN
      v_mark_timestamp := ((v_next_day_date + v_next_day_saida_almoco)::timestamp 
                          AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{saida_almoco}', to_jsonb(v_next_day_saida_almoco::text));
        v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar ENTRADA_EXTRA1 do dia seguinte
    IF v_next_day_entrada_extra1 IS NOT NULL THEN
      v_mark_timestamp := ((v_next_day_date + v_next_day_entrada_extra1)::timestamp 
                          AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{entrada_extra1}', to_jsonb(v_next_day_entrada_extra1::text));
        v_result := jsonb_set(v_result, '{entrada_extra1_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar SAIDA_EXTRA1 do dia seguinte
    IF v_next_day_saida_extra1 IS NOT NULL THEN
      v_mark_timestamp := ((v_next_day_date + v_next_day_saida_extra1)::timestamp 
                          AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_mark_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{saida_extra1}', to_jsonb(v_next_day_saida_extra1::text));
        v_result := jsonb_set(v_result, '{saida_extra1_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;
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
Retorna um registro consolidado com todas as marcações que pertencem ao mesmo "dia de trabalho",
mesmo que algumas marcações tenham data_registro do dia seguinte.
Adiciona campos *_date para indicar a data real de cada marcação quando diferente da base_date.';

GRANT EXECUTE ON FUNCTION public.get_consolidated_time_record_by_window(uuid, uuid, date, text) TO authenticated;
