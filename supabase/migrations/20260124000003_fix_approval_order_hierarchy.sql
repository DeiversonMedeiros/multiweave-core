-- =====================================================
-- CORREÇÃO: RESPEITAR ORDEM HIERÁRQUICA DE APROVAÇÕES
-- Sistema ERP MultiWeave Core
-- Data: 2026-01-24
-- Descrição: 
--   1. Adiciona campo 'ordem' na tabela aprovacoes_unificada
--   2. Armazena a ordem ao criar aprovações
--   3. Valida ordem hierárquica antes de permitir aprovar
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPO 'ordem' NA TABELA aprovacoes_unificada
-- =====================================================

ALTER TABLE public.aprovacoes_unificada 
ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

COMMENT ON COLUMN public.aprovacoes_unificada.ordem IS 'Ordem hierárquica de aprovação dentro do mesmo nível. Aprovações devem ser processadas em ordem crescente.';

-- Criar índice para melhorar performance das consultas de ordem
CREATE INDEX IF NOT EXISTS idx_aprovacoes_unificada_ordem 
ON public.aprovacoes_unificada(processo_tipo, processo_id, company_id, nivel_aprovacao, ordem);

-- =====================================================
-- 2. ATUALIZAR FUNÇÃO create_approvals_for_process
--    para armazenar a ordem ao criar aprovações
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
                ordem,
                status
            ) VALUES (
                p_company_id,
                p_processo_tipo,
                p_processo_id,
                approver_record.nivel,
                approver_record.aprovador_id,
                approver_record.aprovador_id,
                COALESCE(approver_record.ordem, 0),  -- Usar ordem do registro, padrão 0 se NULL
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
                SELECT valor_total, centro_custo_id
                INTO processo_valor, processo_centro_custo_id
                FROM compras.cotacoes
                WHERE id = p_processo_id AND company_id = p_company_id;
                
                UPDATE compras.cotacoes
                SET status = 'aprovada'::compras.status_cotacao,
                    data_aprovacao = NOW(),
                    aprovado_por = COALESCE((SELECT created_by FROM compras.cotacoes WHERE id = p_processo_id), 
                                           (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
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

-- =====================================================
-- 3. ATUALIZAR FUNÇÃO process_approval
--    para validar ordem hierárquica antes de aprovar
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
já foram aprovadas antes de permitir aprovar a atual.';

-- =====================================================
-- 4. ATUALIZAR FUNÇÃO get_required_approvers
--    para ordenar aprovadores por ordem ao retornar
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_required_approvers(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    nivel INTEGER,
    aprovador_id UUID,
    is_primary BOOLEAN,
    ordem INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_valor DECIMAL(15,2) := 0;
    processo_centro_custo_id UUID;
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
            IF processo_classe_financeira IS NOT NULL AND trim(processo_classe_financeira) != '' THEN
                SELECT id INTO processo_classe_financeira_id
                FROM financeiro.classes_financeiras
                WHERE company_id = p_company_id
                AND (
                    (codigo || ' - ' || nome) = processo_classe_financeira
                    OR (processo_classe_financeira LIKE '%-%' AND codigo = trim(split_part(processo_classe_financeira, '-', 1)))
                    OR (processo_classe_financeira LIKE '%-%' AND nome = trim(split_part(processo_classe_financeira, '-', 2)))
                    OR (processo_classe_financeira NOT LIKE '%-%' AND (nome = processo_classe_financeira OR codigo = processo_classe_financeira))
                )
                AND is_active = true
                LIMIT 1;
            ELSE
                processo_classe_financeira_id := NULL;
            END IF;
            
        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacoes
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_saida_material' THEN
            SELECT valor_total, centro_custo_id, funcionario_solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM public.solicitacoes_saida_materiais
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_transferencia_material' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id AND company_id = p_company_id;
    END CASE;

    -- Buscar configurações de aprovação que se aplicam
    SELECT * INTO config_record
    FROM public.configuracoes_aprovacao_unificada
    WHERE company_id = p_company_id
    AND processo_tipo = p_processo_tipo
    AND ativo = true
    AND (valor_limite IS NULL OR valor_limite >= processo_valor)
    AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
    AND (
        classe_financeiras IS NULL 
        OR array_length(classe_financeiras, 1) IS NULL 
        OR processo_classe_financeira_id IS NULL
        OR processo_classe_financeira_id = ANY(classe_financeiras)
    )
    AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
    ORDER BY 
        CASE 
            WHEN centro_custo_id IS NOT NULL 
                AND classe_financeiras IS NOT NULL 
                AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_centro_custo_id IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL
                AND centro_custo_id = processo_centro_custo_id
                AND processo_classe_financeira_id = ANY(classe_financeiras)
            THEN 1 
            ELSE 2 
        END,
        CASE 
            WHEN centro_custo_id IS NOT NULL 
                AND processo_centro_custo_id IS NOT NULL
                AND centro_custo_id = processo_centro_custo_id
            THEN 1 
            ELSE 2 
        END,
        CASE 
            WHEN classe_financeiras IS NOT NULL 
                AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL
                AND processo_classe_financeira_id = ANY(classe_financeiras)
            THEN 1 
            ELSE 2 
        END,
        COALESCE(array_length(classe_financeiras, 1), 999) ASC,
        nivel_aprovacao, 
        COALESCE(valor_limite, 0) DESC
    LIMIT 1;
    
    -- Se encontrou uma configuração, processar seus aprovadores ORDENADOS POR ORDEM
    IF FOUND THEN
        -- Processar aprovadores do JSONB ORDENADOS POR ORDEM
        FOR aprovador_record IN
            SELECT 
                (aprovador->>'user_id')::UUID as user_id,
                COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
            FROM jsonb_array_elements(config_record.aprovadores) as aprovador
            ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC  -- ORDENAR POR ORDEM
        LOOP
            nivel := config_record.nivel_aprovacao;
            aprovador_id := aprovador_record.user_id;
            is_primary := aprovador_record.is_primary;
            ordem := aprovador_record.ordem;
            RETURN NEXT;
        END LOOP;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 
'Determina aprovadores necessários para um processo, retornando-os ordenados por ordem hierárquica.
Atualizada em 2026-01-24: 
- Ordena aprovadores por ordem antes de retornar
- Garante que a ordem hierárquica seja respeitada';
