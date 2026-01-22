-- Verificar dados da cotação COT-000047
-- Primeiro, encontrar o ID do ciclo de cotação
SELECT 
    id,
    numero_cotacao,
    status,
    valor_frete,
    desconto_percentual,
    desconto_valor,
    created_at,
    updated_at
FROM compras.cotacao_ciclos
WHERE numero_cotacao = 'COT-000047';

-- Verificar fornecedores desta cotação
SELECT 
    cf.id,
    cf.cotacao_id,
    cf.fornecedor_id,
    fd.nome_fantasia,
    cf.valor_frete,
    cf.valor_imposto,
    cf.desconto_percentual,
    cf.desconto_valor,
    cf.status,
    cf.preco_total,
    cf.created_at,
    cf.updated_at
FROM compras.cotacao_fornecedores cf
LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
WHERE cf.cotacao_id IN (
    SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000047'
)
ORDER BY cf.created_at;
