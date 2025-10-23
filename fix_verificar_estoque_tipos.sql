-- =====================================================
-- CORREÇÃO DOS TIPOS DA FUNÇÃO VERIFICAR ESTOQUE
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Corrige os tipos de retorno da função de verificação de estoque mínimo
-- =====================================================

-- Dropar função com erro de tipos
DROP FUNCTION IF EXISTS compras.verificar_todos_estoques_minimos(uuid);

-- Recriar função com tipos corretos
CREATE OR REPLACE FUNCTION compras.verificar_todos_estoques_minimos(p_company_id UUID DEFAULT NULL)
RETURNS TABLE(
    material_id UUID,
    material_nome TEXT,
    almoxarifado_id UUID,
    almoxarifado_nome TEXT,
    quantidade_atual INTEGER,
    estoque_minimo INTEGER,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ea.material_equipamento_id as material_id,
        me.descricao::TEXT as material_nome,
        ea.almoxarifado_id,
        a.nome::TEXT as almoxarifado_nome,
        ea.quantidade_atual,
        me.estoque_minimo,
        CASE
            WHEN ea.quantidade_atual <= me.estoque_minimo THEN 'CRITICO'::TEXT
            WHEN ea.quantidade_atual <= (me.estoque_minimo * 1.5) THEN 'ATENCAO'::TEXT
            ELSE 'NORMAL'::TEXT
        END as status
    FROM almoxarifado.estoque_atual ea
    JOIN almoxarifado.materiais_equipamentos me ON me.id = ea.material_equipamento_id
    JOIN almoxarifado.almoxarifados a ON a.id = ea.almoxarifado_id
    WHERE (p_company_id IS NULL OR ea.company_id = p_company_id)
    AND me.estoque_minimo IS NOT NULL
    AND me.estoque_minimo > 0
    ORDER BY
        CASE
            WHEN ea.quantidade_atual <= me.estoque_minimo THEN 1
            WHEN ea.quantidade_atual <= (me.estoque_minimo * 1.5) THEN 2
            ELSE 3
        END,
        ea.quantidade_atual::numeric / me.estoque_minimo;
END;
$$;

COMMENT ON FUNCTION compras.verificar_todos_estoques_minimos(uuid) IS 'Verifica todos os estoques que estao abaixo do minimo';

-- Testar a função
SELECT 'Funcao verificar_todos_estoques_minimos corrigida com tipos corretos' as status;
