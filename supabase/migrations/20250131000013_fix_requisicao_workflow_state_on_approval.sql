-- =====================================================
-- CORREÇÃO: Atualizar workflow_state para 'em_cotacao' quando requisição é totalmente aprovada
-- Data: 2025-01-31
-- Descrição:
--   - Quando uma requisição é totalmente aprovada, o workflow_state deve ser atualizado para 'em_cotacao'
--   - Isso garante que a requisição apareça no modo agrupado (macro) na tela de Requisições Disponíveis
--   - A requisição deve aparecer como "completa" (todos os itens aprovados) no modo agrupado
-- =====================================================

-- Recriar função process_approval para atualizar workflow_state quando requisição é totalmente aprovada
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
    v_requisicao_id UUID;
    v_requisicao_numero VARCHAR(50);
    v_requisicao_status_atual compras.status_requisicao;
    v_requisicao_data_necessidade DATE;
    v_requisicao_data_solicitacao DATE;
BEGIN
    RAISE NOTICE '[process_approval] INÍCIO - Parâmetros: aprovacao_id=%, status=%, aprovador_id=%', 
        p_aprovacao_id, p_status, p_aprovador_id;
    
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RAISE NOTICE '[process_approval] AVISO: Aprovação não encontrada ou não está pendente. aprovacao_id=%', p_aprovacao_id;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE '[process_approval] Aprovação encontrada: processo_tipo=%, processo_id=%, company_id=%', 
        approval_record.processo_tipo, approval_record.processo_id, approval_record.company_id;
    
    -- IMPORTANTE: Definir app.current_user_id antes de fazer UPDATEs
    -- Isso é necessário para que o trigger record_edit_and_reset_approvals possa obter o usuario_editor_id
    PERFORM set_config('app.current_user_id', p_aprovador_id::TEXT, false);
    RAISE NOTICE '[process_approval] app.current_user_id definido: %', p_aprovador_id;
    
    -- Atualizar status da aprovação
    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    RAISE NOTICE '[process_approval] Status da aprovação atualizado para: %', p_status;
    
    -- Se foi aprovado, verificar se todas as aprovações foram concluídas
    -- IMPORTANTE: Verificar DEPOIS de atualizar o status da aprovação atual
    -- para garantir que a contagem de pendentes está correta
    IF p_status = 'aprovado' THEN
        -- Verificar se todas as aprovações foram aprovadas
        -- Esta verificação deve ser feita DEPOIS do UPDATE acima para incluir a aprovação atual
        SELECT NOT EXISTS(
            SELECT 1 FROM public.aprovacoes_unificada
            WHERE processo_tipo = approval_record.processo_tipo
            AND processo_id = approval_record.processo_id
            AND company_id = approval_record.company_id
            AND status = 'pendente'
        ) INTO all_approved;
        
        RAISE NOTICE '[process_approval] Verificação de aprovações completas (DEPOIS do UPDATE): all_approved=%, processo_tipo=%', 
            all_approved, approval_record.processo_tipo;
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            RAISE NOTICE '[process_approval] ✅ Todas as aprovações foram concluídas! Atualizando status da entidade...';
            
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
                    -- Obter informações da requisição para logs ANTES do UPDATE
                    SELECT 
                        id, 
                        numero_requisicao,
                        status,
                        data_necessidade,
                        data_solicitacao
                    INTO 
                        v_requisicao_id, 
                        v_requisicao_numero,
                        v_requisicao_status_atual,
                        v_requisicao_data_necessidade,
                        v_requisicao_data_solicitacao
                    FROM compras.requisicoes_compra
                    WHERE id = approval_record.processo_id;
                    
                    RAISE NOTICE '[process_approval] 🛒 REQUISIÇÃO DE COMPRA: Dados ANTES do UPDATE';
                    RAISE NOTICE '[process_approval] 🛒 requisicao_id=%, numero_requisicao=%', 
                        v_requisicao_id, v_requisicao_numero;
                    RAISE NOTICE '[process_approval] 🛒 status_atual=%, status_novo=''aprovada''', 
                        v_requisicao_status_atual;
                    RAISE NOTICE '[process_approval] 🛒 data_necessidade=%, data_solicitacao=%', 
                        v_requisicao_data_necessidade, v_requisicao_data_solicitacao;
                    
                    -- CORREÇÃO: Se data_necessidade está no passado em relação a data_solicitacao,
                    -- ajustar para data_solicitacao para evitar violação de constraint
                    IF v_requisicao_data_necessidade IS NOT NULL 
                       AND v_requisicao_data_solicitacao IS NOT NULL
                       AND v_requisicao_data_necessidade < v_requisicao_data_solicitacao THEN
                        RAISE NOTICE '[process_approval] 🛒 ⚠️ AVISO: data_necessidade (%) está no passado em relação a data_solicitacao (%). Ajustando para data_solicitacao...', 
                            v_requisicao_data_necessidade, v_requisicao_data_solicitacao;
                        v_requisicao_data_necessidade := v_requisicao_data_solicitacao;
                    END IF;
                    
                    RAISE NOTICE '[process_approval] 🛒 Executando UPDATE: SET status=''aprovada'', workflow_state=''em_cotacao'', data_necessidade=%...', 
                        v_requisicao_data_necessidade;
                    RAISE NOTICE '[process_approval] 🛒 ✅ IMPORTANTE: workflow_state será atualizado para ''em_cotacao'' para que a requisição apareça no modo agrupado!';
                    
                    BEGIN
                        -- CORREÇÃO: Atualizar workflow_state para 'em_cotacao' quando requisição é totalmente aprovada
                        -- Isso garante que a requisição apareça no modo agrupado (macro) na tela de Requisições Disponíveis
                        UPDATE compras.requisicoes_compra
                        SET status = 'aprovada'::compras.status_requisicao,
                            workflow_state = 'em_cotacao', -- ✅ IMPORTANTE: Atualizar workflow_state para aparecer no modo agrupado
                            data_necessidade = v_requisicao_data_necessidade,
                            data_aprovacao = NOW(),
                            aprovado_por = p_aprovador_id,
                            updated_at = NOW()
                        WHERE id = approval_record.processo_id;
                        
                        RAISE NOTICE '[process_approval] ✅ Requisição atualizada com sucesso! Status=''aprovada'', workflow_state=''em_cotacao''. A requisição aparecerá no modo agrupado!';
                    EXCEPTION
                        WHEN check_violation THEN
                            RAISE NOTICE '[process_approval] ❌ ERRO DE CONSTRAINT! Violação de check constraint requisicoes_compra_check';
                            RAISE;
                    END;
                    
                WHEN 'cotacao_compra' THEN
                    -- ATUALIZAÇÃO: Usar cotacao_ciclos ao invés de cotacoes
                    RAISE NOTICE '[process_approval] 💰 COTAÇÃO DE COMPRA: Atualizando cotacao_ciclos (id=%)', approval_record.processo_id;
                    
                    UPDATE compras.cotacao_ciclos
                    SET status = 'aprovada',
                        workflow_state = 'aprovada',
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                    RAISE NOTICE '[process_approval] ✅ Cotação atualizada com sucesso! Status=''aprovada'', workflow_state=''aprovada''.';
                    
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
            RAISE NOTICE '[process_approval] ⏳ Ainda há aprovações pendentes. Aguardando aprovações restantes...';
        END IF;
    END IF;
    
    -- Se foi rejeitado ou cancelado, atualizar status da entidade
    IF p_status IN ('rejeitado', 'cancelado') THEN
        RAISE NOTICE '[process_approval] ❌ Status de rejeição/cancelamento. Atualizando entidade...';
        CASE approval_record.processo_tipo
            WHEN 'conta_pagar' THEN
                UPDATE financeiro.contas_pagar
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'requisicao_compra' THEN
                RAISE NOTICE '[process_approval] 🛒 REQUISIÇÃO DE COMPRA: Rejeitada/Cancelada. requisicao_id=%', approval_record.processo_id;
                UPDATE compras.requisicoes_compra
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'cancelada'::compras.status_requisicao
                    ELSE 'cancelada'::compras.status_requisicao
                END,
                    workflow_state = CASE 
                    WHEN p_status = 'rejeitado' THEN 'reprovada'
                    ELSE 'cancelada'
                END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'cotacao_compra' THEN
                -- ATUALIZAÇÃO: Usar cotacao_ciclos ao invés de cotacoes
                RAISE NOTICE '[process_approval] 💰 COTAÇÃO DE COMPRA: Rejeitada/Cancelada. cotacao_id=%', approval_record.processo_id;
                
                UPDATE compras.cotacao_ciclos
                SET status = 'reprovada',
                    workflow_state = 'reprovada',
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
                RAISE NOTICE '[process_approval] ✅ Cotação atualizada para reprovada';
                
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
    
    RAISE NOTICE '[process_approval] ✅ FIM - Retornando TRUE';
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.process_approval IS 
'Processa aprovação unificada. CORRIGIDO: Quando uma requisição é totalmente aprovada, o workflow_state é atualizado para ''em_cotacao'' para que apareça no modo agrupado (macro) na tela de Requisições Disponíveis.';

-- Atualizar requisições que já foram aprovadas mas não têm workflow_state = 'em_cotacao'
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE compras.requisicoes_compra
    SET workflow_state = 'em_cotacao',
        updated_at = NOW()
    WHERE status = 'aprovada'
      AND (workflow_state IS NULL OR workflow_state != 'em_cotacao');
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Requisições já aprovadas atualizadas para workflow_state = ''em_cotacao'': % registros', v_updated_count;
END $$;
