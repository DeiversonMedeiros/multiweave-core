-- =====================================================
-- CORREÇÃO: Definir app.current_user_id antes de UPDATEs
-- Data: 2025-01-17
-- Descrição: 
--   Corrige a função process_approval para definir app.current_user_id
--   antes de fazer UPDATEs, permitindo que o trigger record_edit_and_reset_approvals
--   consiga obter o usuario_editor_id corretamente
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
    total_approvals INTEGER := 0;
    approved_count INTEGER := 0;
    rejected_count INTEGER := 0;
    entity_company_id UUID;
BEGIN
    -- IMPORTANTE: Definir app.current_user_id para que o trigger possa obter o usuario_editor_id
    -- Isso é necessário porque quando fazemos UPDATEs, o trigger record_edit_and_reset_approvals
    -- precisa saber qual usuário está fazendo a alteração
    PERFORM set_config('app.current_user_id', p_aprovador_id::text, false);
    
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RAISE WARNING 'Aprovação não encontrada ou já processada: %', p_aprovacao_id;
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
        -- Contar total de aprovações necessárias
        SELECT COUNT(*) INTO total_approvals
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id;
        
        -- Contar aprovações aprovadas
        SELECT COUNT(*) INTO approved_count
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id
        AND status = 'aprovado';
        
        -- Contar aprovações rejeitadas/canceladas
        SELECT COUNT(*) INTO rejected_count
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id
        AND status IN ('rejeitado', 'cancelado');
        
        -- Verificar se todas foram aprovadas (todas aprovadas E nenhuma pendente)
        all_approved := (approved_count = total_approvals) AND (approved_count > 0);
        
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
                    -- Simplificar: apenas dois status: 'pendente_aprovacao' e 'aprovada'
                    -- Após aprovação completa, mudar para 'aprovada' e workflow_state para 'em_cotacao'
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada'::compras.status_requisicao,
                        workflow_state = 'em_cotacao',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                    -- Log para debug
                    RAISE NOTICE 'Requisição % aprovada. Status atualizado para aprovada, workflow_state para em_cotacao', approval_record.processo_id;
                    
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
        ELSE
            -- Log para debug quando ainda há aprovações pendentes
            RAISE NOTICE 'Ainda há aprovações pendentes. Total: %, Aprovadas: %, Rejeitadas: %', 
                total_approvals, approved_count, rejected_count;
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
                -- Se rejeitado, mudar para 'cancelada' (único status de cancelamento disponível)
                UPDATE compras.requisicoes_compra
                SET status = 'cancelada'::compras.status_requisicao,
                    workflow_state = CASE 
                        WHEN p_status = 'rejeitado' THEN 'reprovada'
                        ELSE 'cancelada'
                    END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'cotacao_compra' THEN
                -- status_cotacao tem 'rejeitada' (feminino)
                UPDATE compras.cotacoes
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'rejeitada'::compras.status_cotacao
                    ELSE 'rejeitada'::compras.status_cotacao
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

COMMENT ON FUNCTION public.process_approval IS 
'Processa aprovação unificada. Define app.current_user_id antes de fazer UPDATEs para que o trigger record_edit_and_reset_approvals possa obter o usuario_editor_id corretamente.';











