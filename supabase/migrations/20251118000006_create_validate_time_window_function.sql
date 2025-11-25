-- =====================================================
-- FUNÇÃO PARA VALIDAR JANELA DE TEMPO AO REGISTRAR PONTO
-- =====================================================
-- Data: 2025-11-18
-- Descrição: Valida se a marcação está dentro da janela de tempo configurada
-- Se estiver fora, retorna a data correta para criar novo registro
-- =====================================================

CREATE OR REPLACE FUNCTION rh.validate_time_record_window(
    p_employee_id UUID,
    p_company_id UUID,
    p_current_date DATE,
    p_current_time TIME
)
RETURNS TABLE (
    valid_date DATE,
    is_new_record BOOLEAN,
    first_mark_time TIMESTAMP WITH TIME ZONE,
    hours_elapsed NUMERIC,
    window_hours INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_window_hours INTEGER := 24; -- Padrão
    v_existing_record_id UUID;
    v_first_event_at TIMESTAMP WITH TIME ZONE;
    v_current_timestamp TIMESTAMP WITH TIME ZONE;
    v_hours_elapsed NUMERIC;
    v_is_within_window BOOLEAN;
BEGIN
    -- Obter configuração da janela de tempo
    SELECT janela_tempo_marcacoes INTO v_window_hours
    FROM rh.time_record_settings
    WHERE company_id = p_company_id;
    
    -- Se não encontrar, usar padrão de 24 horas
    IF v_window_hours IS NULL THEN
        v_window_hours := 24;
    END IF;
    
    -- Criar timestamp atual combinando data e hora
    v_current_timestamp := (p_current_date + p_current_time)::TIMESTAMP WITH TIME ZONE;
    
    -- Buscar registro existente para o dia atual
    SELECT tr.id INTO v_existing_record_id
    FROM rh.time_records tr
    WHERE tr.employee_id = p_employee_id
      AND tr.company_id = p_company_id
      AND tr.data_registro = p_current_date
    LIMIT 1;
    
    -- Se não existe registro para o dia atual, é um novo registro
    IF v_existing_record_id IS NULL THEN
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            true as is_new_record,
            NULL::TIMESTAMP WITH TIME ZONE as first_mark_time,
            0::NUMERIC as hours_elapsed,
            v_window_hours as window_hours;
        RETURN;
    END IF;
    
    -- Buscar primeira marcação (entrada) do registro existente
    SELECT MIN(tre.event_at) INTO v_first_event_at
    FROM rh.time_record_events tre
    WHERE tre.time_record_id = v_existing_record_id
      AND tre.event_type = 'entrada';
    
    -- Se não encontrou primeira marcação, verificar se há entrada no registro antigo
    IF v_first_event_at IS NULL THEN
        SELECT 
            (tr.data_registro + tr.entrada)::TIMESTAMP WITH TIME ZONE
        INTO v_first_event_at
        FROM rh.time_records tr
        WHERE tr.id = v_existing_record_id
          AND tr.entrada IS NOT NULL;
    END IF;
    
    -- Se ainda não encontrou primeira marcação, considerar como novo registro
    IF v_first_event_at IS NULL THEN
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            true as is_new_record,
            NULL::TIMESTAMP WITH TIME ZONE as first_mark_time,
            0::NUMERIC as hours_elapsed,
            v_window_hours as window_hours;
        RETURN;
    END IF;
    
    -- Calcular horas decorridas desde a primeira marcação
    v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_timestamp - v_first_event_at)) / 3600;
    
    -- Verificar se está dentro da janela
    v_is_within_window := v_hours_elapsed <= v_window_hours;
    
    -- Se está dentro da janela, usar o registro existente
    IF v_is_within_window THEN
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            false as is_new_record,
            v_first_event_at as first_mark_time,
            v_hours_elapsed as hours_elapsed,
            v_window_hours as window_hours;
    ELSE
        -- Se está fora da janela, criar novo registro para o dia atual
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            true as is_new_record,
            v_first_event_at as first_mark_time,
            v_hours_elapsed as hours_elapsed,
            v_window_hours as window_hours;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION rh.validate_time_record_window(UUID, UUID, DATE, TIME) TO authenticated;

-- Comentário
COMMENT ON FUNCTION rh.validate_time_record_window IS 'Valida se a marcação está dentro da janela de tempo configurada. Retorna a data correta e se deve criar novo registro.';

