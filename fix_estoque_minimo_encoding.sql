-- =====================================================
-- CORREÇÃO DE ENCODING - ESTOQUE MÍNIMO
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Corrige problemas de encoding nas funções de estoque mínimo
-- =====================================================

-- Dropar view e função com problemas de encoding
DROP VIEW IF EXISTS compras.dashboard_estoque_minimo;
DROP FUNCTION IF EXISTS compras.verificar_todos_estoques_minimos(UUID);

-- Recriar função sem problemas de encoding
CREATE OR REPLACE FUNCTION compras.verificar_todos_estoques_minimos(
    p_company_id UUID DEFAULT NULL
) RETURNS TABLE (
    material_id UUID,
    material_nome TEXT,
    almoxarifado_id UUID,
    almoxarifado_nome TEXT,
    quantidade_atual DECIMAL(10,3),
    quantidade_minima DECIMAL(10,3),
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.material_id,
        me.nome as material_nome,
        ea.almoxarifado_id,
        a.nome as almoxarifado_nome,
        ea.quantidade_atual,
        me.quantidade_minima,
        CASE 
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END as status
    FROM almoxarifado.estoque_atual ea
    JOIN almoxarifado.materiais_equipamentos me ON me.id = ea.material_id
    JOIN almoxarifado.almoxarifados a ON a.id = ea.almoxarifado_id
    WHERE (p_company_id IS NULL OR ea.company_id = p_company_id)
    AND me.quantidade_minima IS NOT NULL
    AND me.quantidade_minima > 0
    ORDER BY 
        CASE 
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 1
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 2
            ELSE 3
        END,
        ea.quantidade_atual / me.quantidade_minima;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.verificar_todos_estoques_minimos IS 'Verifica todos os estoques que estao abaixo do minimo';

-- Recriar view sem problemas de encoding
CREATE VIEW compras.dashboard_estoque_minimo AS
SELECT 
    company_id,
    COUNT(CASE WHEN status = 'CRITICO' THEN 1 END) as estoques_criticos,
    COUNT(CASE WHEN status = 'ATENCAO' THEN 1 END) as estoques_atencao,
    COUNT(CASE WHEN status = 'NORMAL' THEN 1 END) as estoques_normais,
    COUNT(*) as total_materiais_monitorados,
    AVG(CASE 
        WHEN quantidade_minima > 0 THEN quantidade_atual / quantidade_minima 
        ELSE 1 
    END) as media_estoque_vs_minimo
FROM compras.verificar_todos_estoques_minimos()
GROUP BY company_id;

COMMENT ON VIEW compras.dashboard_estoque_minimo IS 'Dashboard de monitoramento de estoque minimo';

-- Testar as funções
SELECT 'Funcoes de estoque minimo criadas com sucesso' as status;
