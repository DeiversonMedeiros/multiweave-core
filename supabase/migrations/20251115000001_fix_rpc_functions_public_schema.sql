-- =====================================================
-- CORREÇÃO: Funções RPC no schema public
-- Data: 2025-11-15
-- Descrição: Criar funções wrapper no schema public para funções de outros schemas
-- =====================================================

-- 1. Função wrapper para generate_titulo_number (financeiro -> public)
CREATE OR REPLACE FUNCTION public.generate_titulo_number(
    p_company_id UUID,
    p_tipo VARCHAR(10)
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN financeiro.generate_titulo_number(p_company_id, p_tipo);
END;
$$;

-- Grant permissões
GRANT EXECUTE ON FUNCTION public.generate_titulo_number(UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_titulo_number(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_titulo_number(UUID, VARCHAR) TO service_role;

COMMENT ON FUNCTION public.generate_titulo_number IS 'Wrapper para financeiro.generate_titulo_number - Gera número de título automaticamente';

