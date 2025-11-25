-- =====================================================
-- FUNÇÃO WRAPPER NO SCHEMA PUBLIC PARA validate_time_record_window
-- =====================================================
-- Data: 2025-11-18
-- Descrição: Cria função wrapper no schema public para que o Supabase REST API possa acessar
-- IMPORTANTE: Esta é apenas uma camada de acesso. A lógica real está em rh.validate_time_record_window
-- Seguindo o padrão: funções do RH ficam no schema rh, wrappers no public apenas para acesso REST API
-- =====================================================

-- Função wrapper no schema public
CREATE OR REPLACE FUNCTION public.validate_time_record_window(
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
BEGIN
    RETURN QUERY
    SELECT * FROM rh.validate_time_record_window(
        p_employee_id,
        p_company_id,
        p_current_date,
        p_current_time
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_time_record_window(UUID, UUID, DATE, TIME) TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.validate_time_record_window IS 'Wrapper para rh.validate_time_record_window - permite acesso via REST API';

