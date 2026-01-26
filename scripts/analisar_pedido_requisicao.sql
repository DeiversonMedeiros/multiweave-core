-- Script para analisar a relação entre pedido e requisição
-- Pedido ID: 218fe45e-5b10-4f70-a563-be5392c2ce74

-- 1. Verificar dados do pedido
SELECT 
    id,
    numero_pedido,
    cotacao_id,
    cotacao_ciclo_id,
    observacoes,
    created_at
FROM compras.pedidos_compra 
WHERE id = '218fe45e-5b10-4f70-a563-be5392c2ce74';

-- 2. Verificar itens do pedido e tentar encontrar requisição através deles
SELECT 
    pi.id as pedido_item_id,
    pi.pedido_id,
    pi.material_id,
    ri.id as requisicao_item_id,
    ri.requisicao_id,
    rc.numero_requisicao,
    rc.centro_custo_id,
    rc.projeto_id
FROM compras.pedido_itens pi
LEFT JOIN compras.requisicao_itens ri ON ri.material_id = pi.material_id
LEFT JOIN compras.requisicoes_compra rc ON rc.id = ri.requisicao_id
WHERE pi.pedido_id = '218fe45e-5b10-4f70-a563-be5392c2ce74'
LIMIT 10;

-- 3. Verificar se há cotacao_ciclos relacionadas a este pedido através de observações
SELECT 
    cc.id as cotacao_ciclo_id,
    cc.numero_cotacao,
    cc.requisicao_id,
    rc.numero_requisicao,
    rc.centro_custo_id,
    rc.projeto_id
FROM compras.cotacao_ciclos cc
JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id
WHERE cc.numero_cotacao IN (
    SELECT 
        CASE 
            WHEN observacoes LIKE '%cotação%' THEN 
                TRIM(SUBSTRING(observacoes FROM 'cotação[:\s]+([A-Z0-9-]+)'))
            ELSE NULL
        END
    FROM compras.pedidos_compra
    WHERE id = '218fe45e-5b10-4f70-a563-be5392c2ce74'
)
LIMIT 5;

-- 4. Verificar todas as requisições que têm itens com os mesmos material_id do pedido
SELECT DISTINCT
    rc.id as requisicao_id,
    rc.numero_requisicao,
    rc.centro_custo_id,
    rc.projeto_id,
    COUNT(DISTINCT pi.material_id) as materiais_comuns
FROM compras.requisicoes_compra rc
JOIN compras.requisicao_itens ri ON ri.requisicao_id = rc.id
JOIN compras.pedido_itens pi ON pi.material_id = ri.material_id
WHERE pi.pedido_id = '218fe45e-5b10-4f70-a563-be5392c2ce74'
GROUP BY rc.id, rc.numero_requisicao, rc.centro_custo_id, rc.projeto_id
ORDER BY materiais_comuns DESC
LIMIT 5;
