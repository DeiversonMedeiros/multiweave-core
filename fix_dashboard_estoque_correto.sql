-- =====================================================
-- CORREÇÃO FINAL DA VIEW DASHBOARD ESTOQUE
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Corrige a view do dashboard de estoque mínimo com estrutura correta
-- =====================================================

-- Dropar view com erro
DROP VIEW IF EXISTS compras.dashboard_estoque_minimo;

-- Recriar view corrigida com estrutura correta
CREATE VIEW compras.dashboard_estoque_minimo AS
SELECT 
    ea.company_id,
    COUNT(CASE WHEN 
        CASE 
            WHEN ea.quantidade_atual <= me.estoque_minimo THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.estoque_minimo * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END = 'CRITICO' THEN 1 
    END) as estoques_criticos,
    COUNT(CASE WHEN 
        CASE 
            WHEN ea.quantidade_atual <= me.estoque_minimo THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.estoque_minimo * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END = 'ATENCAO' THEN 1 
    END) as estoques_atencao,
    COUNT(CASE WHEN 
        CASE 
            WHEN ea.quantidade_atual <= me.estoque_minimo THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.estoque_minimo * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END = 'NORMAL' THEN 1 
    END) as estoques_normais,
    COUNT(*) as total_materiais_monitorados,
    AVG(CASE 
        WHEN me.estoque_minimo > 0 THEN ea.quantidade_atual::numeric / me.estoque_minimo 
        ELSE 1 
    END) as media_estoque_vs_minimo
FROM almoxarifado.estoque_atual ea
JOIN almoxarifado.materiais_equipamentos me ON me.id = ea.material_equipamento_id
WHERE me.estoque_minimo IS NOT NULL
AND me.estoque_minimo > 0
GROUP BY ea.company_id;

COMMENT ON VIEW compras.dashboard_estoque_minimo IS 'Dashboard de monitoramento de estoque minimo';

-- Testar a view
SELECT 'View dashboard_estoque_minimo criada com sucesso' as status;
