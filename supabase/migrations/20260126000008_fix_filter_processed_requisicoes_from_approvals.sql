-- =====================================================
-- MIGRAÇÃO: Filtrar requisições processadas das aprovações
-- Data....: 2026-01-26
-- Descrição:
--   - Atualiza a função get_pending_approvals_unified_for_user
--   - Exclui aprovações de requisições que já foram processadas
--   - Filtra por status 'aprovada' E por workflow_state que indica processamento
--   - Resolve o problema onde requisições em 'em_pedido' ou 'em_cotacao' ainda apareciam
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_pending_approvals_unified_for_user(
    p_user_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    id UUID,
    processo_tipo VARCHAR(50),
    processo_id UUID,
    nivel_aprovacao INTEGER,
    status VARCHAR(20),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    aprovador_original_id UUID,
    transferido_em TIMESTAMP WITH TIME ZONE,
    transferido_por UUID,
    motivo_transferencia TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.processo_tipo,
        au.processo_id,
        au.nivel_aprovacao,
        au.status,
        au.data_aprovacao,
        au.observacoes,
        au.aprovador_original_id,
        au.transferido_em,
        au.transferido_por,
        au.motivo_transferencia,
        au.created_at
    FROM public.aprovacoes_unificada au
    LEFT JOIN financeiro.contas_pagar cp ON (
        au.processo_tipo = 'conta_pagar' 
        AND au.processo_id = cp.id
    )
    LEFT JOIN compras.requisicoes_compra rc ON (
        au.processo_tipo = 'requisicao_compra' 
        AND au.processo_id = rc.id
    )
    LEFT JOIN compras.cotacao_ciclos cc ON (
        au.processo_tipo = 'cotacao_compra' 
        AND au.processo_id = cc.id
    )
    WHERE au.aprovador_id = p_user_id
    AND au.company_id = p_company_id
    AND au.status = 'pendente'
    -- Excluir aprovações de contas a pagar que já foram pagas
    AND (
        au.processo_tipo != 'conta_pagar' 
        OR cp.status IS NULL 
        OR cp.status != 'pago'
    )
    -- Excluir aprovações de requisições de compra que já foram processadas
    -- Filtra por status 'aprovada' OU por workflow_state que indica processamento
    AND (
        au.processo_tipo != 'requisicao_compra' 
        OR rc.status IS NULL 
        OR (
            rc.status != 'aprovada'
            AND rc.workflow_state NOT IN ('em_pedido', 'em_cotacao', 'finalizada')
        )
    )
    -- Excluir aprovações de cotações que já foram processadas
    -- Filtra por status 'aprovada' OU por workflow_state que indica processamento
    AND (
        au.processo_tipo != 'cotacao_compra' 
        OR cc.status IS NULL 
        OR (
            cc.status != 'aprovada'
            AND cc.workflow_state NOT IN ('em_pedido', 'aprovada', 'finalizada')
        )
    )
    ORDER BY au.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_pending_approvals_unified_for_user(UUID, UUID) IS 
'Retorna aprovações pendentes do sistema unificado (aprovacoes_unificada) no formato Approval para CentralAprovacoesExpandida. 
Exclui aprovações de:
- Contas a pagar que já foram pagas (status = pago)
- Requisições de compra que já foram processadas (status = aprovada OU workflow_state em em_pedido/em_cotacao/finalizada)
- Cotações que já foram processadas (status = aprovada OU workflow_state em em_pedido/aprovada/finalizada)
Atualizado em 2026-01-26 para filtrar também requisições e cotações com workflow_state que indica processamento.';
