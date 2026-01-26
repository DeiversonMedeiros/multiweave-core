-- =====================================================
-- APROVAÇÃO AUTOMÁTICA QUANDO NÃO HÁ CONFIGURAÇÃO COMPATÍVEL
-- Sistema ERP MultiWeave Core
-- Data: 2026-01-24
-- Descrição: Modifica create_approvals_for_process para aprovar automaticamente
--            processos que não atendem a nenhum critério de aprovação configurado
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR FUNÇÃO create_approvals_for_process
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_approvals_for_process(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approver_record RECORD;
    approval_created BOOLEAN := false;
    processo_valor DECIMAL(15,2) := 0;
    processo_centro_custo_id UUID;
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    processo_data_necessidade DATE;
    processo_data_solicitacao DATE;
BEGIN
    -- Limpar aprovações existentes para este processo
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id;

    -- Criar novas aprovações baseadas nas configurações
    FOR approver_record IN
        SELECT * FROM public.get_required_approvers(p_processo_tipo, p_processo_id, p_company_id)
        WHERE nivel IS NOT NULL AND aprovador_id IS NOT NULL  -- Filtrar NULLs na query
        ORDER BY nivel, ordem
    LOOP
        -- Validação adicional (redundante mas segura)
        IF approver_record.nivel IS NOT NULL AND approver_record.aprovador_id IS NOT NULL THEN
            INSERT INTO public.aprovacoes_unificada (
                company_id,
                processo_tipo,
                processo_id,
                nivel_aprovacao,
                aprovador_id,
                aprovador_original_id,
                status
            ) VALUES (
                p_company_id,
                p_processo_tipo,
                p_processo_id,
                approver_record.nivel,
                approver_record.aprovador_id,
                approver_record.aprovador_id,
                'pendente'
            );
            
            approval_created := true;
        END IF;
    END LOOP;

    -- =====================================================
    -- NOVA FUNCIONALIDADE: APROVAÇÃO AUTOMÁTICA
    -- Se nenhuma aprovação foi criada, significa que não há
    -- configuração compatível. Nesse caso, aprovar automaticamente.
    -- =====================================================
    IF NOT approval_created THEN
        RAISE NOTICE '[create_approvals_for_process] ⚠️ Nenhuma configuração de aprovação compatível encontrada para processo_tipo=%, processo_id=%. Aprovando automaticamente...', 
            p_processo_tipo, p_processo_id;
        
        -- Obter dados do processo para atualização
        CASE p_processo_tipo
            WHEN 'conta_pagar' THEN
                SELECT valor_original, centro_custo_id, created_by
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id
                FROM financeiro.contas_pagar
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                -- Aprovar automaticamente
                UPDATE financeiro.contas_pagar
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    aprovado_por = COALESCE(processo_usuario_id, (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Conta a pagar aprovada automaticamente: id=%', p_processo_id;
                
            WHEN 'requisicao_compra' THEN
                SELECT valor_total_estimado, centro_custo_id, solicitante_id, data_necessidade, data_solicitacao
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id, processo_data_necessidade, processo_data_solicitacao
                FROM compras.requisicoes_compra
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                -- Ajustar data_necessidade se necessário (evitar violação de constraint)
                IF processo_data_necessidade IS NOT NULL 
                   AND processo_data_solicitacao IS NOT NULL
                   AND processo_data_necessidade < processo_data_solicitacao THEN
                    processo_data_necessidade := processo_data_solicitacao;
                END IF;
                
                -- Aprovar automaticamente e mover para cotação
                UPDATE compras.requisicoes_compra
                SET status = 'aprovada'::compras.status_requisicao,
                    workflow_state = 'em_cotacao',
                    data_necessidade = COALESCE(processo_data_necessidade, processo_data_solicitacao),
                    data_aprovacao = NOW(),
                    aprovado_por = COALESCE(processo_usuario_id, (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Requisição de compra aprovada automaticamente: id=%, workflow_state=em_cotacao', p_processo_id;
                
            WHEN 'cotacao_compra' THEN
                SELECT valor_total, centro_custo_id
                INTO processo_valor, processo_centro_custo_id
                FROM compras.cotacoes
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                -- Aprovar automaticamente
                UPDATE compras.cotacoes
                SET status = 'aprovada'::compras.status_cotacao,
                    data_aprovacao = NOW(),
                    aprovado_por = COALESCE((SELECT created_by FROM compras.cotacoes WHERE id = p_processo_id), 
                                           (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Cotação aprovada automaticamente: id=%', p_processo_id;
                
            WHEN 'solicitacao_saida_material' THEN
                SELECT valor_total, centro_custo_id, funcionario_solicitante_id
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id
                FROM public.solicitacoes_saida_materiais
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                -- Aprovar automaticamente
                UPDATE public.solicitacoes_saida_materiais
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Solicitação de saída de material aprovada automaticamente: id=%', p_processo_id;
                
            WHEN 'solicitacao_transferencia_material' THEN
                SELECT valor_total, centro_custo_id
                INTO processo_valor, processo_centro_custo_id
                FROM almoxarifado.transferencias
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                -- Aprovar automaticamente
                UPDATE almoxarifado.transferencias
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    aprovador_id = COALESCE((SELECT created_by FROM almoxarifado.transferencias WHERE id = p_processo_id), 
                                          (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Solicitação de transferência de material aprovada automaticamente: id=%', p_processo_id;
                
            WHEN 'logistica' THEN
                -- Logística usa trigger específico, mas podemos atualizar diretamente também
                UPDATE logistica.logistics_requests
                SET status = 'aprovado',
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Solicitação de logística aprovada automaticamente: id=%', p_processo_id;
                
            WHEN 'combustivel' THEN
                -- Combustível usa trigger específico, mas podemos atualizar diretamente também
                UPDATE combustivel.refuel_requests
                SET status = 'aprovada',
                    aprovado_por = COALESCE((SELECT solicitado_por FROM combustivel.refuel_requests WHERE id = p_processo_id), 
                                          (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    aprovado_em = NOW(),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                RAISE NOTICE '[create_approvals_for_process] ✅ Solicitação de combustível aprovada automaticamente: id=%', p_processo_id;
                
            ELSE
                RAISE WARNING '[create_approvals_for_process] ⚠️ Tipo de processo não suportado para aprovação automática: %', p_processo_tipo;
        END CASE;
    END IF;

    RETURN approval_created;
END;
$$;

COMMENT ON FUNCTION public.create_approvals_for_process IS 
'Cria aprovações automáticas para um processo, validando que nivel_aprovacao e aprovador_id não sejam NULL.
Se nenhuma configuração de aprovação compatível for encontrada, aprova automaticamente o processo.';
