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
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END = 'CRITICO' THEN 1 
    END) as estoques_criticos,
    COUNT(CASE WHEN 
        CASE 
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END = 'ATENCAO' THEN 1 
    END) as estoques_atencao,
    COUNT(CASE WHEN 
        CASE 
            WHEN ea.quantidade_atual <= me.quantidade_minima THEN 'CRITICO'
            WHEN ea.quantidade_atual <= (me.quantidade_minima * 1.5) THEN 'ATENCAO'
            ELSE 'NORMAL'
        END = 'NORMAL' THEN 1 
    END) as estoques_normais,
    COUNT(*) as total_materiais_monitorados,
    AVG(CASE 
        WHEN me.quantidade_minima > 0 THEN ea.quantidade_atual::numeric / me.quantidade_minima 
        ELSE 1 
    END) as media_estoque_vs_minimo
FROM almoxarifado.estoque_atual ea
JOIN almoxarifado.materiais_equipamentos me ON me.id = ea.material_equipamento_id
WHERE me.quantidade_minima IS NOT NULL
AND me.quantidade_minima > 0
GROUP BY ea.company_id;

COMMENT ON VIEW compras.dashboard_estoque_minimo IS 'Dashboard de monitoramento de estoque minimo';

-- Testar a view
SELECT 'View dashboard_estoque_minimo criada com sucesso' as status;
