-- Análise Completa da Cotação COT-000048
-- Verificar TODOS os campos de frete e desconto: item, fornecedor e geral

-- 1. Dados do CICLO de cotação (frete/desconto GERAL)
SELECT 
    cc.id as cotacao_id,
    cc.numero_cotacao,
    cc.status,
    cc.valor_frete as frete_geral,
    cc.desconto_percentual as desconto_percentual_geral,
    cc.desconto_valor as desconto_valor_geral,
    cc.created_at,
    cc.updated_at
FROM compras.cotacao_ciclos cc
WHERE cc.numero_cotacao = 'COT-000048';

-- 2. Dados dos FORNECEDORES (frete/desconto POR FORNECEDOR)
SELECT 
    cf.id as fornecedor_id,
    cf.fornecedor_id,
    cf.valor_frete as frete_fornecedor,
    cf.valor_imposto as imposto_fornecedor,
    cf.desconto_percentual as desconto_percentual_fornecedor,
    cf.desconto_valor as desconto_valor_fornecedor,
    cf.status,
    cf.preco_total,
    cf.created_at,
    cf.updated_at,
    p.nome_fantasia,
    p.razao_social
FROM compras.cotacao_fornecedores cf
LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
LEFT JOIN public.partners p ON p.id = fd.partner_id
WHERE cf.cotacao_id = (
    SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000048' LIMIT 1
)
ORDER BY cf.created_at;

-- 3. Dados dos ITENS (frete/desconto POR ITEM)
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
    me.nome as material_nome,
    cif.created_at,
    cif.updated_at
FROM compras.cotacao_item_fornecedor cif
INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
LEFT JOIN almoxarifado.materiais_equipamentos me ON me.id = cif.material_id
WHERE cf.cotacao_id = (
    SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000048' LIMIT 1
)
ORDER BY cif.cotacao_fornecedor_id, cif.material_id;

-- 4. Resumo COMPLETO: Todos os níveis de frete e desconto
SELECT 
    'GERAL' as nivel,
    cc.numero_cotacao,
    NULL::uuid as fornecedor_id,
    NULL::text as fornecedor_nome,
    NULL::uuid as item_id,
    NULL::text as material_nome,
    cc.valor_frete as frete,
    NULL::numeric as imposto,
    cc.desconto_percentual as desconto_percentual,
    cc.desconto_valor as desconto_valor
FROM compras.cotacao_ciclos cc
WHERE cc.numero_cotacao = 'COT-000048'

UNION ALL

SELECT 
    'FORNECEDOR' as nivel,
    cc.numero_cotacao,
    cf.id as fornecedor_id,
    COALESCE(p.nome_fantasia, p.razao_social, 'Fornecedor não encontrado') as fornecedor_nome,
    NULL::uuid as item_id,
    NULL::text as material_nome,
    cf.valor_frete as frete,
    cf.valor_imposto as imposto,
    cf.desconto_percentual as desconto_percentual,
    cf.desconto_valor as desconto_valor
FROM compras.cotacao_ciclos cc
INNER JOIN compras.cotacao_fornecedores cf ON cf.cotacao_id = cc.id
LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
LEFT JOIN public.partners p ON p.id = fd.partner_id
WHERE cc.numero_cotacao = 'COT-000048'

UNION ALL

SELECT 
    'ITEM' as nivel,
    cc.numero_cotacao,
    cf.id as fornecedor_id,
    COALESCE(p.nome_fantasia, p.razao_social, 'Fornecedor não encontrado') as fornecedor_nome,
    cif.id as item_id,
    me.nome as material_nome,
    cif.valor_frete as frete,
    NULL::numeric as imposto,
    cif.desconto_percentual as desconto_percentual,
    cif.desconto_valor as desconto_valor
FROM compras.cotacao_ciclos cc
INNER JOIN compras.cotacao_fornecedores cf ON cf.cotacao_id = cc.id
INNER JOIN compras.cotacao_item_fornecedor cif ON cif.cotacao_fornecedor_id = cf.id
LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
LEFT JOIN public.partners p ON p.id = fd.partner_id
LEFT JOIN almoxarifado.materiais_equipamentos me ON me.id = cif.material_id
WHERE cc.numero_cotacao = 'COT-000048'
ORDER BY nivel, fornecedor_nome, material_nome;

-- 5. Resumo por fornecedor vencedor com totais de TODOS os níveis
SELECT 
    cf.id as fornecedor_id,
    COALESCE(p.nome_fantasia, p.razao_social, 'Fornecedor não encontrado') as fornecedor_nome,
    -- Frete/Desconto do FORNECEDOR
    cf.valor_frete as frete_fornecedor,
    cf.valor_imposto as imposto_fornecedor,
    cf.desconto_percentual as desconto_percentual_fornecedor,
    cf.desconto_valor as desconto_valor_fornecedor,
    -- Totais dos ITENS
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
