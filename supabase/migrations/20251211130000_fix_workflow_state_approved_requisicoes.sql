-- =====================================================
-- CORREÇÃO: Atualizar workflow_state de requisições aprovadas
-- Data: 2025-12-11
-- Problema: Requisições aprovadas antes da migration 20251210220000
--           não têm workflow_state = 'em_cotacao'
-- Solução: Atualizar todas as requisições aprovadas para workflow_state correto
-- =====================================================

-- Atualizar workflow_state para 'em_cotacao' em todas as requisições aprovadas
-- que ainda não têm o workflow_state correto
UPDATE compras.requisicoes_compra
SET workflow_state = 'em_cotacao',
    updated_at = NOW()
WHERE status = 'aprovada'::compras.status_requisicao
AND (workflow_state != 'em_cotacao' OR workflow_state IS NULL);











