-- =====================================================
-- FIX: Corrigir ordem das aprovações da cotação COT-000049
-- Data: 2026-01-24
-- Descrição: As aprovações foram criadas com ordem incorreta (ambas com ordem=1).
--            Esta migração corrige a ordem das aprovações existentes baseada
--            na configuração de aprovação e na ordem dos aprovadores no JSONB.
-- =====================================================

-- Primeiro, vamos corrigir as aprovações existentes da COT-000049
-- baseado na configuração de aprovação
DO $$
DECLARE
    v_cotacao_ciclo_id UUID;
    v_config_record RECORD;
    v_aprovacao_record RECORD;
    v_ordem_correta INTEGER;
    v_aprovador_id UUID;
BEGIN
    -- Buscar o ID da cotação
    SELECT id INTO v_cotacao_ciclo_id
    FROM compras.cotacao_ciclos
    WHERE numero_cotacao = 'COT-000049'
    LIMIT 1;
    
    IF v_cotacao_ciclo_id IS NULL THEN
        RAISE NOTICE 'Cotação COT-000049 não encontrada.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Corrigindo aprovações para cotação COT-000049 (id: %)', v_cotacao_ciclo_id;
    
    -- Buscar a configuração de aprovação para cotacao_compra
    SELECT * INTO v_config_record
    FROM public.configuracoes_aprovacao_unificada
    WHERE processo_tipo = 'cotacao_compra'
    AND ativo = true
    ORDER BY nivel_aprovacao, valor_limite DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Configuração de aprovação não encontrada para cotacao_compra.';
        RETURN;
    END IF;
    
    -- Para cada aprovador na configuração, atualizar a ordem na tabela aprovacoes_unificada
    FOR v_aprovacao_record IN
        SELECT 
            (aprovador->>'user_id')::UUID as user_id,
            COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
        FROM jsonb_array_elements(v_config_record.aprovadores) as aprovador
        ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
    LOOP
        v_aprovador_id := v_aprovacao_record.user_id;
        v_ordem_correta := v_aprovacao_record.ordem;
        
        -- Atualizar a ordem da aprovação correspondente
        UPDATE public.aprovacoes_unificada
        SET ordem = v_ordem_correta
        WHERE processo_tipo = 'cotacao_compra'
        AND processo_id = v_cotacao_ciclo_id
        AND aprovador_id = v_aprovador_id
        AND nivel_aprovacao = v_config_record.nivel_aprovacao;
        
        RAISE NOTICE 'Atualizada ordem para aprovador %: ordem=%', v_aprovador_id, v_ordem_correta;
    END LOOP;
    
    RAISE NOTICE '✅ Ordem das aprovações corrigida para COT-000049';
END
$$;

-- Verificar se a função create_approvals_for_process está copiando corretamente a ordem
-- Vamos garantir que ela está usando a ordem do JSONB
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
        ORDER BY nivel, ordem  -- Ordenar por nível e depois por ordem
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
                ordem,  -- ✅ GARANTIR: Usar ordem do registro retornado
                status
            ) VALUES (
                p_company_id,
                p_processo_tipo,
                p_processo_id,
                approver_record.nivel,
                approver_record.aprovador_id,
                approver_record.aprovador_id,
                COALESCE(approver_record.ordem, 0),  -- ✅ FIX: Usar ordem do registro, padrão 0 se NULL
                'pendente'
            );
            
            approval_created := true;
        END IF;
    END LOOP;

    -- =====================================================
    -- APROVAÇÃO AUTOMÁTICA (se não houver configuração)
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
                
                UPDATE financeiro.contas_pagar
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    aprovado_por = COALESCE(processo_usuario_id, (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'requisicao_compra' THEN
                SELECT valor_total_estimado, centro_custo_id, solicitante_id, data_necessidade, data_solicitacao
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id, processo_data_necessidade, processo_data_solicitacao
                FROM compras.requisicoes_compra
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                IF processo_data_necessidade IS NOT NULL 
                   AND processo_data_solicitacao IS NOT NULL
                   AND processo_data_necessidade < processo_data_solicitacao THEN
                    processo_data_necessidade := processo_data_solicitacao;
                END IF;
                
                UPDATE compras.requisicoes_compra
                SET status = 'aprovada'::compras.status_requisicao,
                    workflow_state = 'em_cotacao',
                    data_necessidade = COALESCE(processo_data_necessidade, processo_data_solicitacao),
                    data_aprovacao = NOW(),
                    aprovado_por = COALESCE(processo_usuario_id, (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'cotacao_compra' THEN
                -- ✅ FIX: Atualizar cotacao_ciclos ao invés de cotacoes
                UPDATE compras.cotacao_ciclos
                SET status = 'aprovada',
                    workflow_state = 'aprovada',
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'solicitacao_saida_material' THEN
                SELECT valor_total, centro_custo_id, funcionario_solicitante_id
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id
                FROM public.solicitacoes_saida_materiais
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                UPDATE public.solicitacoes_saida_materiais
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'solicitacao_transferencia_material' THEN
                SELECT valor_total, centro_custo_id
                INTO processo_valor, processo_centro_custo_id
                FROM almoxarifado.transferencias
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                UPDATE almoxarifado.transferencias
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    aprovador_id = COALESCE((SELECT created_by FROM almoxarifado.transferencias WHERE id = p_processo_id), 
                                          (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'logistica' THEN
                UPDATE logistica.logistics_requests
                SET status = 'aprovado',
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'combustivel' THEN
                UPDATE combustivel.refuel_requests
                SET status = 'aprovada',
                    aprovado_por = COALESCE((SELECT solicitado_por FROM combustivel.refuel_requests WHERE id = p_processo_id), 
                                          (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    aprovado_em = NOW(),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
        END CASE;
    END IF;

    RETURN approval_created;
END;
$$;

COMMENT ON FUNCTION public.create_approvals_for_process IS 
'Cria aprovações para um processo baseado nas configurações. Garante que a ordem dos aprovadores seja copiada corretamente do JSONB aprovadores para a tabela aprovacoes_unificada. Corrigido em 2026-01-24 para garantir que a ordem seja preservada.';
