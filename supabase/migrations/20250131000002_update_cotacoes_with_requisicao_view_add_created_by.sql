-- =====================================================
-- ATUALIZAR VIEW: Adicionar created_by da requisição
-- Data: 2025-01-31
-- Descrição: Adiciona campo requisicao_created_by na view
--            para permitir exibir o nome do comprador no grid
-- =====================================================

CREATE OR REPLACE VIEW compras.cotacoes_with_requisicao AS
SELECT 
    cc.id,
    cc.company_id,
    cc.requisicao_id,
    cc.numero_cotacao,
    cc.status,
    cc.prazo_resposta,
    cc.observacoes,
    cc.workflow_state,
    cc.created_at,
    cc.updated_at,
    rc.numero_requisicao,
    rc.data_solicitacao,
    rc.data_necessidade,
    rc.status AS requisicao_status,
    rc.workflow_state AS requisicao_workflow_state,
    rc.created_by AS requisicao_created_by
FROM compras.cotacao_ciclos cc
LEFT JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id;

COMMENT ON VIEW compras.cotacoes_with_requisicao IS 
'View que une cotacao_ciclos com requisicoes_compra, incluindo numero_requisicao e created_by para facilitar consultas na interface';

