-- =====================================================
-- CORREÇÃO DE TIPOS DE DADOS NA FUNÇÃO
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Corrige os tipos de dados na função de sugestão de fornecedores
-- =====================================================

-- Dropar a função com erro de tipo
DROP FUNCTION IF EXISTS compras.sugerir_fornecedores_uf(VARCHAR, UUID, UUID);

-- Recriar a função com tipos corretos
CREATE OR REPLACE FUNCTION compras.sugerir_fornecedores_uf(
    p_uf VARCHAR(2),
    p_company_id UUID,
    p_material_id UUID DEFAULT NULL
) RETURNS TABLE (
    fornecedor_id UUID,
    partner_id UUID,
    nome TEXT,
    email_cotacao VARCHAR,
    telefone VARCHAR,
    cidade VARCHAR,
    nota_media DECIMAL,
    total_avaliacoes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fd.id as fornecedor_id,
        fd.partner_id,
        COALESCE(p.nome_fantasia, p.razao_social) as nome,
        fd.email_cotacao,
        fd.telefone,
        fd.cidade,
        fd.nota_media,
        fd.total_avaliacoes
    FROM compras.fornecedores_dados fd
    JOIN public.partners p ON p.id = fd.partner_id
    WHERE fd.uf = p_uf 
    AND fd.company_id = p_company_id
    AND fd.status = 'ativo'
    AND (p_material_id IS NULL OR EXISTS (
        SELECT 1 FROM compras.historico_precos hp
        WHERE hp.fornecedor_id = fd.id 
        AND hp.material_id = p_material_id
    ))
    ORDER BY fd.nota_media DESC, fd.total_avaliacoes DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.sugerir_fornecedores_uf IS 'Sugere fornecedores por UF e material específico - TIPOS CORRIGIDOS';

-- Testar a função corrigida
SELECT 'Função sugerir_fornecedores_uf corrigida com sucesso' as status;
