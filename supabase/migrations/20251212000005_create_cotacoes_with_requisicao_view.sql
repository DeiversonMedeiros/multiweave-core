-- =====================================================
-- MIGRAÇÃO: Criar view para cotações com número da requisição
-- Data: 2025-12-12
-- Descrição:
--   - Cria uma view que faz JOIN entre cotacao_ciclos e requisicoes_compra
--   - Inclui numero_requisicao diretamente na view para facilitar consultas
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
    rc.workflow_state AS requisicao_workflow_state
FROM compras.cotacao_ciclos cc
LEFT JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id;

COMMENT ON VIEW compras.cotacoes_with_requisicao IS 
'View que une cotacao_ciclos com requisicoes_compra, incluindo numero_requisicao para facilitar consultas na interface';
