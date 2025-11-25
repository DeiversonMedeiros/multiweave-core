-- =====================================================
-- FUNÇÃO WRAPPER NO SCHEMA PUBLIC PARA get_time_record_settings
-- =====================================================
-- Data: 2025-11-18
-- Descrição: Cria função wrapper no schema public para que o Supabase REST API possa acessar
-- IMPORTANTE: Esta é apenas uma camada de acesso. A lógica real está em rh.get_time_record_settings
-- Seguindo o padrão: funções do RH ficam no schema rh, wrappers no public apenas para acesso REST API
-- =====================================================

-- Função wrapper no schema public
CREATE OR REPLACE FUNCTION public.get_time_record_settings(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    janela_tempo_marcacoes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM rh.get_time_record_settings(p_company_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_time_record_settings(UUID) TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.get_time_record_settings IS 'Wrapper para rh.get_time_record_settings - permite acesso via REST API';

