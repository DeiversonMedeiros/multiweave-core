-- =====================================================
-- CORRIGIR REGISTROS DE PONTO INCORRETOS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Corrige registros de ponto que foram criados incorretamente
--            devido à falha na lógica de janela de tempo.
--            
--            Este script identifica registros que têm apenas "entrada" no dia seguinte
--            mas que deveriam estar agrupados com registros do dia anterior dentro da janela de tempo.
-- =====================================================

-- Função auxiliar para corrigir registros incorretos
CREATE OR REPLACE FUNCTION rh.fix_incorrect_time_records()
RETURNS TABLE (
  corrected_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
  v_window_hours INTEGER;
  v_previous_record_id UUID;
  v_previous_record_date DATE;
  v_previous_entrada TIME;
  v_previous_entrada_timestamp TIMESTAMPTZ;
  v_current_entrada_timestamp TIMESTAMPTZ;
  v_hours_elapsed NUMERIC;
  v_is_within_window BOOLEAN;
  v_corrected_count INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
  v_detail JSONB;
BEGIN
  -- Para cada registro que tem apenas entrada no dia seguinte
  FOR v_record IN
    SELECT 
      tr.id,
      tr.employee_id,
      tr.company_id,
      tr.data_registro,
      tr.entrada,
      tr.saida,
      tr.entrada_almoco,
      tr.saida_almoco,
      tr.entrada_extra1,
      tr.saida_extra1
    FROM rh.time_records tr
    WHERE tr.entrada IS NOT NULL
      AND tr.entrada_almoco IS NULL
      AND tr.saida_almoco IS NULL
      AND tr.saida IS NULL
      AND tr.entrada_extra1 IS NULL
      AND tr.saida_extra1 IS NULL
      -- Verificar se há registro do dia anterior
      AND EXISTS (
        SELECT 1
        FROM rh.time_records tr2
        WHERE tr2.employee_id = tr.employee_id
          AND tr2.company_id = tr.company_id
          AND tr2.data_registro = tr.data_registro - INTERVAL '1 day'
          AND tr2.entrada IS NOT NULL
      )
  LOOP
    -- Obter configuração da janela de tempo
    SELECT COALESCE(janela_tempo_marcacoes, 24) INTO v_window_hours
    FROM rh.time_record_settings
    WHERE company_id = v_record.company_id;

    -- Buscar registro do dia anterior
    SELECT 
      tr.id,
      tr.data_registro,
      tr.entrada
    INTO 
      v_previous_record_id,
      v_previous_record_date,
      v_previous_entrada
    FROM rh.time_records tr
    WHERE tr.employee_id = v_record.employee_id
      AND tr.company_id = v_record.company_id
      AND tr.data_registro = v_record.data_registro - INTERVAL '1 day'
      AND tr.entrada IS NOT NULL
    ORDER BY tr.data_registro DESC, tr.entrada DESC
    LIMIT 1;

    -- Se encontrou registro anterior, verificar se está dentro da janela
    IF v_previous_record_id IS NOT NULL AND v_previous_entrada IS NOT NULL THEN
      -- Construir timestamps
      v_previous_entrada_timestamp := ((v_previous_record_date + v_previous_entrada)::timestamp 
                                       AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
      v_current_entrada_timestamp := ((v_record.data_registro + v_record.entrada)::timestamp 
                                     AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
      
      -- Calcular horas decorridas
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_entrada_timestamp - v_previous_entrada_timestamp)) / 3600;
      
      -- Verificar se está dentro da janela
      v_is_within_window := v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours;
      
      -- Se está dentro da janela, mover o registro para o dia anterior
      IF v_is_within_window THEN
        -- Determinar qual campo atualizar no registro anterior baseado no que está preenchido
        -- Se o registro atual tem apenas entrada e o anterior tem entrada_almoco mas não saida_almoco,
        -- então a entrada atual é na verdade saida_almoco
        
        -- Verificar o estado do registro anterior
        DECLARE
          v_prev_entrada_almoco TIME;
          v_prev_saida_almoco TIME;
          v_prev_saida TIME;
        BEGIN
          SELECT entrada_almoco, saida_almoco, saida
          INTO v_prev_entrada_almoco, v_prev_saida_almoco, v_prev_saida
          FROM rh.time_records
          WHERE id = v_previous_record_id;
          
          -- Determinar qual campo atualizar baseado no estado do registro anterior
        -- Ordem de verificação: saida_almoco -> saida -> entrada_extra1 -> saida_extra1
        IF v_prev_entrada_almoco IS NOT NULL AND v_prev_saida_almoco IS NULL THEN
          -- Se tem entrada_almoco mas não saida_almoco, então a entrada atual é saida_almoco
          UPDATE rh.time_records
          SET saida_almoco = v_record.entrada
          WHERE id = v_previous_record_id;
          
          -- Deletar o registro incorreto
          DELETE FROM rh.time_records WHERE id = v_record.id;
          
          v_corrected_count := v_corrected_count + 1;
          
          v_detail := jsonb_build_object(
            'incorrect_record_id', v_record.id,
            'incorrect_date', v_record.data_registro,
            'corrected_record_id', v_previous_record_id,
            'corrected_date', v_previous_record_date,
            'field_updated', 'saida_almoco',
            'value', v_record.entrada,
            'hours_elapsed', ROUND(v_hours_elapsed, 2),
            'window_hours', v_window_hours
          );
          
          v_details := v_details || v_detail;
        ELSIF v_prev_saida_almoco IS NOT NULL AND v_prev_saida IS NULL THEN
          -- Se tem saida_almoco mas não saida, então a entrada atual é saida
          UPDATE rh.time_records
          SET saida = v_record.entrada
          WHERE id = v_previous_record_id;
          
          -- Deletar o registro incorreto
          DELETE FROM rh.time_records WHERE id = v_record.id;
          
          v_corrected_count := v_corrected_count + 1;
          
          v_detail := jsonb_build_object(
            'incorrect_record_id', v_record.id,
            'incorrect_date', v_record.data_registro,
            'corrected_record_id', v_previous_record_id,
            'corrected_date', v_previous_record_date,
            'field_updated', 'saida',
            'value', v_record.entrada,
            'hours_elapsed', ROUND(v_hours_elapsed, 2),
            'window_hours', v_window_hours
          );
          
          v_details := v_details || v_detail;
        END IF;
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_corrected_count, v_details;
END;
$$;

-- Executar a correção
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM rh.fix_incorrect_time_records();
  
  RAISE NOTICE 'Correção concluída: % registros corrigidos', v_result.corrected_count;
  RAISE NOTICE 'Detalhes: %', v_result.details;
END;
$$;

-- Remover função auxiliar após uso (opcional - comentado para permitir reexecução)
-- DROP FUNCTION IF EXISTS rh.fix_incorrect_time_records();
