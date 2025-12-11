-- =====================================================
-- CORREÇÃO: process_approval para usar valores corretos do ENUM status_requisicao
-- Data: 2025-12-10
-- Descrição: Corrige o mapeamento de status na função process_approval
--   - status_requisicao usa 'aprovada' (não 'aprovado')
--   - status_requisicao usa 'cancelada' (não 'cancelado')
--   - Não existe 'rejeitado' no ENUM status_requisicao
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_approval(
    p_aprovacao_id UUID,
    p_status VARCHAR(20), -- 'aprovado', 'rejeitado', 'cancelado'
    p_observacoes TEXT,
    p_aprovador_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approval_record RECORD;
    all_approved BOOLEAN := false;
    entity_company_id UUID;
BEGIN
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status da aprovação
    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    -- Se foi aprovado, verificar se todas as aprovações foram concluídas
    IF p_status = 'aprovado' THEN
        -- Verificar se todas as aprovações foram aprovadas
        SELECT NOT EXISTS(
            SELECT 1 FROM public.aprovacoes_unificada
            WHERE processo_tipo = approval_record.processo_tipo
            AND processo_id = approval_record.processo_id
            AND company_id = approval_record.company_id
            AND status = 'pendente'
        ) INTO all_approved;
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            -- Atualizar status da entidade baseado no tipo
            CASE approval_record.processo_tipo
                WHEN 'conta_pagar' THEN
                    UPDATE financeiro.contas_pagar
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'requisicao_compra' THEN
                    -- status_requisicao usa 'aprovada' (feminino)
                    -- workflow_state deve ir direto para 'em_cotacao' após aprovação completa
                    -- conforme regra de negócio: após aprovação, vai para cotação
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada'::compras.status_requisicao,
                        workflow_state = 'em_cotacao',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'cotacao_compra' THEN
                    -- status_cotacao usa 'aprovada' (feminino)
                    UPDATE compras.cotacoes
                    SET status = 'aprovada'::compras.status_cotacao,
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'solicitacao_saida_material' THEN
                    UPDATE public.solicitacoes_saida_materiais
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'solicitacao_transferencia_material' THEN
                    UPDATE almoxarifado.transferencias
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovador_id = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
            END CASE;
        END IF;
    END IF;
    
    -- Se foi rejeitado ou cancelado, atualizar status da entidade
    IF p_status IN ('rejeitado', 'cancelado') THEN
        CASE approval_record.processo_tipo
            WHEN 'conta_pagar' THEN
                UPDATE financeiro.contas_pagar
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'requisicao_compra' THEN
                -- status_requisicao não tem 'rejeitado', apenas 'cancelada'
                -- workflow_state também deve ser atualizado
                UPDATE compras.requisicoes_compra
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'cancelada'::compras.status_requisicao
                    ELSE 'cancelada'::compras.status_requisicao  -- 'cancelado' -> 'cancelada'
                END,
                    workflow_state = CASE 
                    WHEN p_status = 'rejeitado' THEN 'reprovada'
                    ELSE 'cancelada'  -- 'cancelado' -> 'cancelada'
                END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'cotacao_compra' THEN
                -- status_cotacao tem 'rejeitada' (feminino), mas não tem 'cancelada'
                -- Para cancelado, usar 'rejeitada' como fallback
                UPDATE compras.cotacoes
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'rejeitada'::compras.status_cotacao
                    ELSE 'rejeitada'::compras.status_cotacao  -- 'cancelado' -> 'rejeitada' (não existe 'cancelada' em status_cotacao)
                END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'solicitacao_saida_material' THEN
                UPDATE public.solicitacoes_saida_materiais
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'solicitacao_transferencia_material' THEN
                UPDATE almoxarifado.transferencias
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
        END CASE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Corrigir função can_edit_solicitation para verificar status correto
CREATE OR REPLACE FUNCTION public.can_edit_solicitation(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    entity_status VARCHAR(20);
BEGIN
    -- Verificar status da entidade baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT status INTO entity_status
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id;
            
        WHEN 'requisicao_compra' THEN
            SELECT status INTO entity_status
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id;
            
        WHEN 'cotacao_compra' THEN
            SELECT status INTO entity_status
            FROM compras.cotacoes
            WHERE id = p_processo_id;
            
        WHEN 'solicitacao_saida_material' THEN
            SELECT status INTO entity_status
            FROM public.solicitacoes_saida_materiais
            WHERE id = p_processo_id;
            
        WHEN 'solicitacao_transferencia_material' THEN
            SELECT status INTO entity_status
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id;
    END CASE;
    
    -- Retorna true se não estiver cancelado/cancelada
    -- status_requisicao usa 'cancelada' (feminino)
    -- status_cotacao não tem 'cancelada', apenas 'rejeitada' (que não impede edição)
    RETURN entity_status IS NOT NULL 
        AND entity_status != 'cancelado' 
        AND entity_status != 'cancelada';
END;
$$;

