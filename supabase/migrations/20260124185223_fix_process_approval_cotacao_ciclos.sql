-- =====================================================
-- FIX: process_approval deve atualizar cotacao_ciclos ao invés de cotacoes
-- Data: 2026-01-24
-- Descrição: A função process_approval estava atualizando compras.cotacoes
--            ao invés de compras.cotacao_ciclos quando todas as aprovações
--            eram concluídas. Isso impedia que o trigger criasse o pedido,
--            pois o trigger monitora cotacao_ciclos.
--            Corrige para atualizar cotacao_ciclos.status e workflow_state
--            apenas quando TODAS as aprovações forem concluídas.
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
    v_requisicao_id UUID;
    v_requisicao_numero VARCHAR(50);
    v_requisicao_status_atual compras.status_requisicao;
    v_requisicao_data_necessidade DATE;
    v_requisicao_data_solicitacao DATE;
    v_pending_before BOOLEAN := false;
    v_pending_count INTEGER := 0;
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
    
    RAISE NOTICE '[process_approval] Aprovação encontrada: processo_tipo=%, processo_id=%, nivel_aprovacao=%, ordem=%', 
        approval_record.processo_tipo, approval_record.processo_id, approval_record.nivel_aprovacao, approval_record.ordem;
    
    -- =====================================================
    -- VALIDAÇÃO DE ORDEM HIERÁRQUICA
    -- Só permite aprovar se todas as aprovações anteriores
    -- (menor nivel_aprovacao OU mesmo nivel mas menor ordem)
    -- já foram aprovadas
    -- =====================================================
    IF p_status = 'aprovado' THEN
        -- Verificar se há aprovações pendentes ANTES desta (menor nivel OU mesmo nivel mas menor ordem)
        SELECT COUNT(*) INTO v_pending_count
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id
        AND status = 'pendente'
        AND (
            -- Aprovações de níveis anteriores
            nivel_aprovacao < approval_record.nivel_aprovacao
            OR
            -- Aprovações do mesmo nível mas com ordem anterior
            (
                nivel_aprovacao = approval_record.nivel_aprovacao
                AND ordem < COALESCE(approval_record.ordem, 0)
            )
        );
        
        IF v_pending_count > 0 THEN
            RAISE WARNING '[process_approval] ❌ ERRO: Não é possível aprovar. Existem % aprovações pendentes que devem ser aprovadas antes desta (nivel=%, ordem=%).', 
                v_pending_count, approval_record.nivel_aprovacao, approval_record.ordem;
            RAISE EXCEPTION 'Não é possível aprovar. Existem aprovações pendentes que devem ser processadas antes desta, respeitando a ordem hierárquica.';
        END IF;
        
        RAISE NOTICE '[process_approval] ✅ Validação de ordem hierárquica passou. Nenhuma aprovação anterior pendente.';
    END IF;
    
    -- Atualizar status da aprovação
    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    RAISE NOTICE '[process_approval] Status da aprovação atualizado para: %', p_status;
    
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
        
        RAISE NOTICE '[process_approval] Verificação de aprovações completas: all_approved=%, processo_tipo=%', 
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
                    
                    IF v_requisicao_data_necessidade IS NOT NULL 
                       AND v_requisicao_data_solicitacao IS NOT NULL
                       AND v_requisicao_data_necessidade < v_requisicao_data_solicitacao THEN
                        v_requisicao_data_necessidade := v_requisicao_data_solicitacao;
                    END IF;
                    
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada'::compras.status_requisicao,
                        workflow_state = 'em_cotacao',
                        data_necessidade = v_requisicao_data_necessidade,
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'cotacao_compra' THEN
                    -- ✅ FIX: Atualizar cotacao_ciclos ao invés de cotacoes
                    -- Isso permite que o trigger criar_pedido_apos_aprovacao_cotacao_ciclos
                    -- seja disparado e crie o pedido e conta a pagar
                    RAISE NOTICE '[process_approval] 💰 COTAÇÃO DE COMPRA: Todas as aprovações concluídas. Atualizando cotacao_ciclos (id=%)', approval_record.processo_id;
                    
                    UPDATE compras.cotacao_ciclos
                    SET status = 'aprovada',
                        workflow_state = 'aprovada',
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                    RAISE NOTICE '[process_approval] ✅ Cotação atualizada com sucesso! Status=''aprovada'', workflow_state=''aprovada''. O trigger criará o pedido automaticamente.';
                    
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
                    
                WHEN 'logistica' THEN
                    UPDATE logistica.logistics_requests
                    SET status = 'aprovado',
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'combustivel' THEN
                    UPDATE combustivel.refuel_requests
                    SET status = 'aprovada',
                        aprovado_por = p_aprovador_id,
                        aprovado_em = NOW(),
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
                -- ✅ FIX: Atualizar cotacao_ciclos ao invés de cotacoes
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
                
            WHEN 'logistica' THEN
                UPDATE logistica.logistics_requests
                SET status = 'rejeitado',
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'combustivel' THEN
                UPDATE combustivel.refuel_requests
                SET status = 'reprovada',
                    observacoes_aprovacao = COALESCE(p_observacoes, 'Solicitação rejeitada'),
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
        END CASE;
    END IF;
    
    RAISE NOTICE '[process_approval] ✅ FIM - Retornando TRUE';
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.process_approval IS 
'Processa aprovação respeitando ordem hierárquica. 
Valida que todas as aprovações anteriores (menor nivel_aprovacao ou mesmo nivel mas menor ordem) 
já foram aprovadas antes de permitir aprovar a atual.
Corrigido em 2026-01-24: Atualiza cotacao_ciclos ao invés de cotacoes quando todas as aprovações são concluídas, permitindo que o trigger crie o pedido automaticamente.';
