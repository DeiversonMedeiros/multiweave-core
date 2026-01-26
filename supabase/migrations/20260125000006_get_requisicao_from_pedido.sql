-- =====================================================
-- FUNÇÃO: GET REQUISIÇÃO DE PEDIDO
-- Data: 2026-01-25
-- Descrição: Busca a requisição relacionada a um pedido
-- através dos itens do pedido quando não há cotacao_id ou cotacao_ciclo_id
-- =====================================================

CREATE OR REPLACE FUNCTION compras.get_requisicao_from_pedido(
    p_pedido_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_requisicao_id UUID;
    v_material_ids UUID[];
    v_best_requisicao_id UUID;
BEGIN
    -- Primeiro, tentar buscar através de cotacao_ciclo_id ou cotacao_id
    SELECT 
        COALESCE(
            (SELECT cc.requisicao_id 
             FROM compras.cotacao_ciclos cc 
             WHERE cc.id = pc.cotacao_ciclo_id),
            (SELECT cc2.requisicao_id 
             FROM compras.cotacoes c
             JOIN compras.cotacao_ciclos cc2 ON cc2.id = c.cotacao_ciclo_id
             WHERE c.id = pc.cotacao_id),
            (SELECT c2.requisicao_id 
             FROM compras.cotacoes c2
             WHERE c2.id = pc.cotacao_id AND c2.requisicao_id IS NOT NULL)
        )
    INTO v_requisicao_id
    FROM compras.pedidos_compra pc
    WHERE pc.id = p_pedido_id;
    
    -- Se encontrou, retornar
    IF v_requisicao_id IS NOT NULL THEN
        RETURN v_requisicao_id;
    END IF;
    
    -- Se não encontrou, buscar através dos itens do pedido
    -- Coletar todos os material_ids do pedido
    SELECT ARRAY_AGG(DISTINCT material_id)
    INTO v_material_ids
    FROM compras.pedido_itens
    WHERE pedido_id = p_pedido_id
    AND material_id IS NOT NULL;
    
    -- Se não há material_ids, retornar NULL
    IF v_material_ids IS NULL OR array_length(v_material_ids, 1) IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Contar quantos itens cada requisição tem em comum com o pedido
    -- Encontrar a requisição com mais itens em comum
    SELECT 
        ri.requisicao_id
    INTO v_best_requisicao_id
    FROM compras.requisicao_itens ri
    WHERE ri.material_id = ANY(v_material_ids)
    GROUP BY ri.requisicao_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Se encontrou uma requisição com itens em comum, retornar
    IF v_best_requisicao_id IS NOT NULL THEN
        RETURN v_best_requisicao_id;
    END IF;
    
    -- Se não encontrou nada, retornar NULL
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION compras.get_requisicao_from_pedido(UUID) IS 
'Busca a requisição relacionada a um pedido. Primeiro tenta através de cotacao_ciclo_id ou cotacao_id. Se não encontrar, busca através dos itens do pedido (material_id em comum)';

-- Criar função wrapper no schema public
CREATE OR REPLACE FUNCTION public.get_requisicao_from_pedido(
    p_pedido_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN compras.get_requisicao_from_pedido(p_pedido_id);
END;
$$;

COMMENT ON FUNCTION public.get_requisicao_from_pedido(UUID) IS 
'Wrapper para compras.get_requisicao_from_pedido - permite chamada via RPC do Supabase';

GRANT EXECUTE ON FUNCTION public.get_requisicao_from_pedido(UUID) TO authenticated;
