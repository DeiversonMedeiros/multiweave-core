-- =====================================================
-- CORRIGIR workflow_state de requisições aprovadas
-- =====================================================

-- Verificar quantas precisam correção
SELECT 
    COUNT(*) as total_aprovadas_com_workflow_incorreto
FROM compras.requisicoes_compra
WHERE status = 'aprovada'::compras.status_requisicao
AND (workflow_state != 'em_cotacao' OR workflow_state IS NULL);

-- CORRIGIR: Atualizar workflow_state
UPDATE compras.requisicoes_compra
SET workflow_state = 'em_cotacao',
    updated_at = NOW()
WHERE status = 'aprovada'::compras.status_requisicao
AND (workflow_state != 'em_cotacao' OR workflow_state IS NULL);

-- Verificar resultado
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao
FROM compras.requisicoes_compra
WHERE id = '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid;










