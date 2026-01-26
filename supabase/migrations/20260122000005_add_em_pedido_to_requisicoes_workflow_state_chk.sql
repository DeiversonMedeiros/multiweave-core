-- =====================================================
-- FIX: requisicoes_compra_workflow_state_chk não permite 'em_pedido'
-- Data: 2026-01-22
-- Descrição: A função criar_pedido_apos_aprovacao_cotacao_ciclos atualiza
--            requisicoes_compra com workflow_state = 'em_pedido' quando a
--            cotação é aprovada e os pedidos são criados. A constraint atual
--            só permite: criada, pendente_aprovacao, aprovada, reprovada,
--            encaminhada, em_cotacao, finalizada, cancelada.
-- Erro: 23514 - new row violates "requisicoes_compra_workflow_state_chk"
-- =====================================================

-- Remover constraint antiga
ALTER TABLE compras.requisicoes_compra
DROP CONSTRAINT IF EXISTS requisicoes_compra_workflow_state_chk;

-- Recriar incluindo 'em_pedido'
ALTER TABLE compras.requisicoes_compra
ADD CONSTRAINT requisicoes_compra_workflow_state_chk
CHECK (
    workflow_state = ANY(ARRAY[
        'criada',
        'pendente_aprovacao',
        'aprovada',
        'reprovada',
        'encaminhada',
        'em_cotacao',
        'em_pedido',
        'finalizada',
        'cancelada'
    ])
);

COMMENT ON CONSTRAINT requisicoes_compra_workflow_state_chk ON compras.requisicoes_compra IS 
'Workflow da requisição. em_pedido: pedidos gerados após aprovação da cotação.';
