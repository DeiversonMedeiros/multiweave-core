-- =====================================================
-- FUNÇÃO PARA BUSCAR REGISTRO DE PONTO CONSOLIDADO POR JANELA DE TEMPO
-- =====================================================
-- Data: 2026-01-26
-- Descrição: Busca e consolida registros de ponto considerando a janela de tempo configurada.
--            Retorna um registro consolidado com todas as marcações que pertencem ao mesmo
--            "dia de trabalho", mesmo que algumas marcações tenham data_registro do dia seguinte.
--            
--            IMPORTANTE: O banco de dados continua registrando com a data real do timestamp.
--            Esta função apenas agrupa os registros para exibição na interface.
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
  v_next_day_record_id uuid;
  v_next_day_date date;
  v_next_day_entrada time;
  v_next_day_saida time;
  v_next_day_entrada_almoco time;
  v_next_day_saida_almoco time;
  v_next_day_entrada_extra1 time;
  v_next_day_saida_extra1 time;
  v_first_mark_timestamp timestamptz;
  v_next_day_saida_timestamp timestamptz;
  v_hours_elapsed numeric;
  v_consolidated jsonb;
  v_result jsonb;
BEGIN
  -- Obter configuração da janela de tempo
  SELECT COALESCE(janela_tempo_marcacoes, 24) INTO v_window_hours
  FROM rh.time_record_settings
  WHERE company_id = p_company_id;

  -- Buscar registro do dia alvo
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
  LIMIT 1;

  -- Se não encontrou registro do dia alvo, retornar null
  IF v_target_record_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Construir resultado base com o registro do dia alvo
  SELECT row_to_json(tr.*)::jsonb INTO v_result
  FROM rh.time_records tr
  WHERE tr.id = v_target_record_id;

  -- Buscar registro do dia seguinte
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
    AND tr.data_registro = p_target_date + INTERVAL '1 day'
  LIMIT 1;

  -- Se encontrou registro do dia seguinte, verificar se está dentro da janela de tempo
  IF v_next_day_record_id IS NOT NULL AND v_target_entrada IS NOT NULL THEN
    -- Construir timestamp da primeira marcação (entrada do dia alvo)
    v_first_mark_timestamp := ((v_target_record_date + v_target_entrada)::timestamp 
                               AT TIME ZONE p_timezone)::timestamptz;

    -- Verificar cada marcação do dia seguinte para ver se está dentro da janela
    
    -- Verificar SAÍDA do dia seguinte
    IF v_next_day_saida IS NOT NULL THEN
      v_next_day_saida_timestamp := ((v_next_day_date + v_next_day_saida)::timestamp 
                                     AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_next_day_saida_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        -- Adicionar saída do dia seguinte ao resultado (com data real)
        v_result := jsonb_set(v_result, '{saida}', to_jsonb(v_next_day_saida::text));
        v_result := jsonb_set(v_result, '{saida_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar ENTRADA_ALMOCO do dia seguinte
    IF v_next_day_entrada_almoco IS NOT NULL THEN
      v_next_day_saida_timestamp := ((v_next_day_date + v_next_day_entrada_almoco)::timestamp 
                                     AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_next_day_saida_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{entrada_almoco}', to_jsonb(v_next_day_entrada_almoco::text));
        v_result := jsonb_set(v_result, '{entrada_almoco_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar SAIDA_ALMOCO do dia seguinte
    IF v_next_day_saida_almoco IS NOT NULL THEN
      v_next_day_saida_timestamp := ((v_next_day_date + v_next_day_saida_almoco)::timestamp 
                                     AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_next_day_saida_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{saida_almoco}', to_jsonb(v_next_day_saida_almoco::text));
        v_result := jsonb_set(v_result, '{saida_almoco_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar ENTRADA_EXTRA1 do dia seguinte
    IF v_next_day_entrada_extra1 IS NOT NULL THEN
      v_next_day_saida_timestamp := ((v_next_day_date + v_next_day_entrada_extra1)::timestamp 
                                     AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_next_day_saida_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{entrada_extra1}', to_jsonb(v_next_day_entrada_extra1::text));
        v_result := jsonb_set(v_result, '{entrada_extra1_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;

    -- Verificar SAIDA_EXTRA1 do dia seguinte
    IF v_next_day_saida_extra1 IS NOT NULL THEN
      v_next_day_saida_timestamp := ((v_next_day_date + v_next_day_saida_extra1)::timestamp 
                                     AT TIME ZONE p_timezone)::timestamptz;
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_next_day_saida_timestamp - v_first_mark_timestamp)) / 3600;
      
      IF v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours THEN
        v_result := jsonb_set(v_result, '{saida_extra1}', to_jsonb(v_next_day_saida_extra1::text));
        v_result := jsonb_set(v_result, '{saida_extra1_date}', to_jsonb(v_next_day_date::text));
      END IF;
    END IF;
  END IF;

  -- Adicionar campos auxiliares
  v_result := jsonb_set(v_result, '{base_date}', to_jsonb(v_target_record_date::text));
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
Retorna um registro consolidado com todas as marcações que pertencem ao mesmo "dia de trabalho",
mesmo que algumas marcações tenham data_registro do dia seguinte.
Adiciona campos *_date para indicar a data real de cada marcação quando diferente da base_date.';

GRANT EXECUTE ON FUNCTION public.get_consolidated_time_record_by_window(uuid, uuid, date, text) TO authenticated;
