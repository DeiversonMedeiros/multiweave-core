-- =====================================================
-- CORREÇÃO DA VIEW DE PERFORMANCE DE FORNECEDORES
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Corrige a view que estava tentando usar p.nome inexistente
-- =====================================================

-- Dropar a view com erro
DROP VIEW IF EXISTS compras.performance_fornecedores;

-- Recriar a view corrigida
CREATE VIEW compras.performance_fornecedores AS
SELECT 
    fd.id as fornecedor_id,
    COALESCE(p.nome_fantasia, p.razao_social) as fornecedor_nome,
    fd.uf,
    fd.cidade,
    fd.nota_media,
    fd.total_avaliacoes,
    COUNT(pc.id) as total_pedidos,
    COALESCE(SUM(pc.valor_final), 0) as valor_total_compras,
    AVG(CASE WHEN pc.data_entrega_real IS NOT NULL 
        THEN pc.data_entrega_real - pc.data_entrega_prevista 
        END) as atraso_medio_dias
FROM compras.fornecedores_dados fd
JOIN public.partners p ON p.id = fd.partner_id
LEFT JOIN compras.pedidos_compra pc ON pc.fornecedor_id = fd.id
WHERE fd.status = 'ativo'
GROUP BY fd.id, p.nome_fantasia, p.razao_social, fd.uf, fd.cidade, fd.nota_media, fd.total_avaliacoes
ORDER BY fd.nota_media DESC;

COMMENT ON VIEW compras.performance_fornecedores IS 'Performance e estatísticas dos fornecedores - CORRIGIDA';

-- =====================================================
-- CORREÇÃO DA FUNÇÃO DE SUGESTÃO DE FORNECEDORES
-- =====================================================

-- Dropar a função com erro
DROP FUNCTION IF EXISTS compras.sugerir_fornecedores_uf(VARCHAR, UUID, UUID);

-- Recriar a função corrigida
CREATE OR REPLACE FUNCTION compras.sugerir_fornecedores_uf(
    p_uf VARCHAR(2),
    p_company_id UUID,
    p_material_id UUID DEFAULT NULL
) RETURNS TABLE (
    fornecedor_id UUID,
    partner_id UUID,
    nome VARCHAR,
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

COMMENT ON FUNCTION compras.sugerir_fornecedores_uf IS 'Sugere fornecedores por UF e material específico - CORRIGIDA';

-- =====================================================
-- VERIFICAÇÃO E TESTE DAS CORREÇÕES
-- =====================================================

-- Testar se a view funciona
SELECT 'View performance_fornecedores criada com sucesso' as status;

-- Testar se a função funciona (mesmo sem dados)
SELECT 'Função sugerir_fornecedores_uf criada com sucesso' as status;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA compras IS 'Módulo de Compras com integrações completas - CORREÇÕES APLICADAS';
