-- =====================================================
-- CORREÇÃO: Criar função wrapper generate_titulo_number_parcela no schema public
-- Data: 2025-12-20
-- Descrição: Cria função wrapper no schema public para acesso via RPC
--            A função existe no schema financeiro, mas precisa estar no public para RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_titulo_number_parcela(
    p_conta_pagar_id UUID,
    p_numero_parcela INTEGER
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN financeiro.generate_titulo_number_parcela(p_conta_pagar_id, p_numero_parcela);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_titulo_number_parcela(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_titulo_number_parcela(UUID, INTEGER) TO anon;

COMMENT ON FUNCTION public.generate_titulo_number_parcela(UUID, INTEGER) IS 
'Função wrapper no schema public para acesso via RPC. Chama financeiro.generate_titulo_number_parcela.';

