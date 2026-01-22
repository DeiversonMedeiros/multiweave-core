-- Análise da Cotação COT-000048
-- Verificar dados de frete e desconto nos fornecedores vencedores

-- 1. Buscar informações do ciclo de cotação
SELECT 
    cc.id as cotacao_id,
    cc.numero_cotacao,
    cc.status,
    cc.valor_frete as frete_geral,
    cc.desconto_percentual as desconto_percentual_geral,
    cc.desconto_valor as desconto_valor_geral,
    cc.created_at
FROM compras.cotacao_ciclos cc
WHERE cc.numero_cotacao = 'COT-000048';

-- 2. Buscar fornecedores e seus valores de frete/desconto
SELECT 
    cf.id as fornecedor_id,
    cf.fornecedor_id,
    cf.valor_frete,
    cf.valor_imposto,
    cf.desconto_percentual,
    cf.desconto_valor,
    cf.status,
    cf.preco_total,
    p.nome_fantasia,
    p.razao_social
FROM compras.cotacao_fornecedores cf
LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
LEFT JOIN public.partners p ON p.id = fd.partner_id
WHERE cf.cotacao_id = (
    SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000048' LIMIT 1
)
ORDER BY cf.created_at;

-- 3. Buscar itens vencedores de cada fornecedor
SELECT 
    cif.id as item_id,
    cif.cotacao_fornecedor_id,
    cif.material_id,
    cif.quantidade_ofertada,
    cif.valor_unitario,
    cif.valor_total_calculado,
    cif.valor_frete as frete_item,
    cif.desconto_percentual as desconto_percentual_item,
    cif.desconto_valor as desconto_valor_item,
    cif.is_vencedor,
    me.nome as material_nome
FROM compras.cotacao_item_fornecedor cif
INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
LEFT JOIN almoxarifado.materiais_equipamentos me ON me.id = cif.material_id
WHERE cf.cotacao_id = (
    SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000048' LIMIT 1
)
AND cif.is_vencedor = true
ORDER BY cif.cotacao_fornecedor_id, cif.material_id;

-- 4. Resumo por fornecedor vencedor com totais
SELECT 
    cf.id as fornecedor_id,
    COALESCE(p.nome_fantasia, p.razao_social, 'Fornecedor não encontrado') as fornecedor_nome,
    cf.valor_frete,
    cf.valor_imposto,
    cf.desconto_percentual,
    cf.desconto_valor,
    COALESCE(SUM(cif.valor_total_calculado), 0) as total_itens,
    COALESCE(SUM(cif.valor_frete), 0) as total_frete_itens,
    COALESCE(SUM(cif.desconto_percentual), 0) as total_desconto_percentual_itens,
    COALESCE(SUM(cif.desconto_valor), 0) as total_desconto_valor_itens,
    COUNT(cif.id) as quantidade_itens_vencedores
FROM compras.cotacao_fornecedores cf
INNER JOIN compras.cotacao_item_fornecedor cif ON cif.cotacao_fornecedor_id = cf.id AND cif.is_vencedor = true
LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
LEFT JOIN public.partners p ON p.id = fd.partner_id
WHERE cf.cotacao_id = (
    SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000048' LIMIT 1
)
GROUP BY cf.id, p.nome_fantasia, p.razao_social, cf.valor_frete, cf.valor_imposto, 
         cf.desconto_percentual, cf.desconto_valor
ORDER BY cf.created_at;
