-- =====================================================
-- MIGRAÇÃO: Forçar workflow_state = 'em_cotacao' para requisições aprovadas
-- Data: 2025-12-11
-- Motivo: Requisições já aprovadas antes do ajuste não avançaram para cotação
-- =====================================================

UPDATE compras.requisicoes_compra
SET workflow_state = 'em_cotacao'
WHERE status = 'aprovada'::compras.status_requisicao
  AND (workflow_state IS NULL OR workflow_state <> 'em_cotacao');

COMMENT ON MIGRATION IS 'Força workflow_state em_cotacao para requisições já aprovadas';











