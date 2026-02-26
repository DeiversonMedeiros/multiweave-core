-- =====================================================
-- Correção: Saída de material - schema da tabela
-- Data: 2026-02-22
-- Descrição:
--   A tabela solicitacoes_saida_materiais existe em almoxarifado (não em public).
--   As funções de aprovação ainda referenciam public.solicitacoes_saida_materiais,
--   o que faz com que get_required_approvers, create_approvals_for_process e
--   process_approval não encontrem/atualizem os registros.
--   Esta migração corrige as três funções para usar almoxarifado.solicitacoes_saida_materiais.
-- =====================================================

-- 1. get_required_approvers: SELECT deve usar almoxarifado.solicitacoes_saida_materiais
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
    processo_centro_custos UUID[] := '{}';
    processo_projeto_id UUID;
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
    cc_id UUID;
    aprovadores_ja_retornados UUID[] := '{}';
BEGIN
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, projeto_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_projeto_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;

            SELECT ARRAY_AGG(DISTINCT centro_custo_id) INTO processo_centro_custos
            FROM financeiro.contas_pagar_rateio
            WHERE conta_pagar_id = p_processo_id AND company_id = p_company_id AND centro_custo_id IS NOT NULL;

            IF processo_centro_custos IS NULL OR array_length(processo_centro_custos, 1) IS NULL THEN
                processo_centro_custos := CASE WHEN processo_centro_custo_id IS NOT NULL THEN ARRAY[processo_centro_custo_id] ELSE '{}'::uuid[] END;
            END IF;

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

            SELECT * INTO config_record
            FROM public.configuracoes_aprovacao_unificada
            WHERE company_id = p_company_id
            AND processo_tipo = 'conta_pagar'
            AND ativo = true
            AND centro_custo_id IS NULL
            AND (valor_limite IS NULL OR valor_limite >= processo_valor)
            AND (
                classe_financeiras IS NOT NULL
                AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL
                AND processo_classe_financeira_id = ANY(classe_financeiras)
            )
            AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
            ORDER BY COALESCE(array_length(classe_financeiras, 1), 999) ASC,
                     nivel_aprovacao, COALESCE(valor_limite, 0) DESC
            LIMIT 1;

            IF FOUND THEN
                FOR aprovador_record IN
                    SELECT
                        (aprovador->>'user_id')::UUID as user_id,
                        COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                        COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                    FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                    ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
                LOOP
                    nivel := config_record.nivel_aprovacao;
                    aprovador_id := aprovador_record.user_id;
                    is_primary := aprovador_record.is_primary;
                    ordem := aprovador_record.ordem;
                    RETURN NEXT;
                END LOOP;
                RETURN;
            END IF;

            IF array_length(processo_centro_custos, 1) IS NULL THEN
                FOR config_record IN
                    SELECT * FROM public.configuracoes_aprovacao_unificada
                    WHERE company_id = p_company_id
                    AND processo_tipo = 'conta_pagar'
                    AND ativo = true
                    AND centro_custo_id IS NULL
                    AND (valor_limite IS NULL OR valor_limite >= processo_valor)
                    AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
                    ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
                    LIMIT 1
                LOOP
                    FOR aprovador_record IN
                        SELECT (aprovador->>'user_id')::UUID as user_id,
                               COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                               COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                        FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                        ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
                    LOOP
                        nivel := config_record.nivel_aprovacao;
                        aprovador_id := aprovador_record.user_id;
                        is_primary := aprovador_record.is_primary;
                        ordem := aprovador_record.ordem;
                        RETURN NEXT;
                    END LOOP;
                    RETURN;
                END LOOP;
                RETURN;
            END IF;

            FOREACH cc_id IN ARRAY processo_centro_custos
            LOOP
                FOR config_record IN
                    SELECT * FROM public.configuracoes_aprovacao_unificada
                    WHERE company_id = p_company_id
                    AND processo_tipo = 'conta_pagar'
                    AND ativo = true
                    AND (valor_limite IS NULL OR valor_limite >= processo_valor)
                    AND (centro_custo_id IS NULL OR centro_custo_id = cc_id)
                    AND (
                        classe_financeiras IS NULL
                        OR array_length(classe_financeiras, 1) IS NULL
                        OR processo_classe_financeira_id IS NULL
                        OR processo_classe_financeira_id = ANY(classe_financeiras)
                    )
                    AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
                    ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
                LOOP
                    FOR aprovador_record IN
                        SELECT
                            (aprovador->>'user_id')::UUID as user_id,
                            COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                            COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                        FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                        ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
                    LOOP
                        IF aprovador_record.user_id IS NOT NULL AND NOT (aprovador_record.user_id = ANY(aprovadores_ja_retornados)) THEN
                            aprovadores_ja_retornados := array_append(aprovadores_ja_retornados, aprovador_record.user_id);
                            nivel := config_record.nivel_aprovacao;
                            aprovador_id := aprovador_record.user_id;
                            is_primary := aprovador_record.is_primary;
                            ordem := aprovador_record.ordem;
                            RETURN NEXT;
                        END IF;
                    END LOOP;
                END LOOP;
            END LOOP;
            RETURN;

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
            FROM almoxarifado.solicitacoes_saida_materiais
            WHERE id = p_processo_id AND company_id = p_company_id;

        WHEN 'solicitacao_transferencia_material' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id AND company_id = p_company_id;
    END CASE;

    IF p_processo_tipo != 'conta_pagar' THEN
        SELECT * INTO config_record
        FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
        AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
        ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
        LIMIT 1;

        IF FOUND THEN
            FOR aprovador_record IN
                SELECT
                    (aprovador->>'user_id')::UUID as user_id,
                    COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                    COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
            LOOP
                nivel := config_record.nivel_aprovacao;
                aprovador_id := aprovador_record.user_id;
                is_primary := aprovador_record.is_primary;
                ordem := aprovador_record.ordem;
                RETURN NEXT;
            END LOOP;
        END IF;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS
'Determina aprovadores. conta_pagar: suporta rateio (múltiplos CCs). Saída de material: usa almoxarifado.solicitacoes_saida_materiais. 2026-02-22.';

-- 2. create_approvals_for_process: auto-aprovação deve atualizar almoxarifado.solicitacoes_saida_materiais
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
    DELETE FROM public.aprovacoes_unificada
    WHERE processo_tipo = p_processo_tipo
    AND processo_id = p_processo_id
    AND company_id = p_company_id;

    IF p_processo_tipo = 'cotacao_compra' THEN
        FOR approver_record IN
            SELECT * FROM public.get_required_approvers_cotacao_aggregate(p_processo_id, p_company_id)
            WHERE nivel IS NOT NULL AND aprovador_id IS NOT NULL
            ORDER BY nivel, ordem
        LOOP
            INSERT INTO public.aprovacoes_unificada (
                company_id, processo_tipo, processo_id,
                nivel_aprovacao, aprovador_id, aprovador_original_id, ordem, status
            ) VALUES (
                p_company_id, p_processo_tipo, p_processo_id,
                approver_record.nivel, approver_record.aprovador_id, approver_record.aprovador_id,
                COALESCE(approver_record.ordem, 0), 'pendente'
            );
            approval_created := true;
        END LOOP;
    ELSE
        FOR approver_record IN
            SELECT * FROM public.get_required_approvers(p_processo_tipo, p_processo_id, p_company_id)
            WHERE nivel IS NOT NULL AND aprovador_id IS NOT NULL
            ORDER BY nivel, ordem
        LOOP
            INSERT INTO public.aprovacoes_unificada (
                company_id, processo_tipo, processo_id,
                nivel_aprovacao, aprovador_id, aprovador_original_id, ordem, status
            ) VALUES (
                p_company_id, p_processo_tipo, p_processo_id,
                approver_record.nivel, approver_record.aprovador_id, approver_record.aprovador_id,
                COALESCE(approver_record.ordem, 0), 'pendente'
            );
            approval_created := true;
        END LOOP;
    END IF;

    IF NOT approval_created THEN
        CASE p_processo_tipo
            WHEN 'conta_pagar' THEN
                SELECT valor_original, centro_custo_id, created_by
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id
                FROM financeiro.contas_pagar
                WHERE id = p_processo_id AND company_id = p_company_id;
                UPDATE financeiro.contas_pagar
                SET status = 'aprovado', data_aprovacao = NOW(),
                    aprovado_por = COALESCE(processo_usuario_id, (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
            WHEN 'requisicao_compra' THEN
                SELECT valor_total_estimado, centro_custo_id, solicitante_id, data_necessidade, data_solicitacao
                INTO processo_valor, processo_centro_custo_id, processo_usuario_id, processo_data_necessidade, processo_data_solicitacao
                FROM compras.requisicoes_compra
                WHERE id = p_processo_id AND company_id = p_company_id;
                IF processo_data_necessidade IS NOT NULL AND processo_data_solicitacao IS NOT NULL AND processo_data_necessidade < processo_data_solicitacao THEN
                    processo_data_necessidade := processo_data_solicitacao;
                END IF;
                UPDATE compras.requisicoes_compra
                SET status = 'aprovada'::compras.status_requisicao, workflow_state = 'em_cotacao',
                    data_necessidade = COALESCE(processo_data_necessidade, processo_data_solicitacao),
                    data_aprovacao = NOW(), aprovado_por = COALESCE(processo_usuario_id, (SELECT id FROM users WHERE company_id = p_company_id LIMIT 1)),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
            WHEN 'cotacao_compra' THEN
                UPDATE compras.cotacao_ciclos
                SET status = 'aprovada', workflow_state = 'aprovada', updated_at = NOW()
                WHERE numero_cotacao = (SELECT numero_cotacao FROM compras.cotacao_ciclos WHERE id = p_processo_id AND company_id = p_company_id)
                  AND company_id = p_company_id;
            WHEN 'solicitacao_saida_material' THEN
                UPDATE almoxarifado.solicitacoes_saida_materiais
                SET status = 'aprovado', data_aprovacao = NOW(), updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
            WHEN 'solicitacao_transferencia_material' THEN
                UPDATE almoxarifado.transferencias
                SET status = 'aprovado', data_aprovacao = NOW(), aprovador_id = (SELECT created_by FROM almoxarifado.transferencias WHERE id = p_processo_id),
                    updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
            WHEN 'logistica' THEN
                UPDATE logistica.logistics_requests SET status = 'aprovado', updated_at = NOW() WHERE id = p_processo_id AND company_id = p_company_id;
            WHEN 'combustivel' THEN
                UPDATE combustivel.refuel_requests SET status = 'aprovada', aprovado_por = (SELECT solicitado_por FROM combustivel.refuel_requests WHERE id = p_processo_id),
                    aprovado_em = NOW(), updated_at = NOW()
                WHERE id = p_processo_id AND company_id = p_company_id;
            ELSE
                NULL;
        END CASE;
    END IF;

    RETURN approval_created;
END;
$$;

-- 3. process_approval: ao aprovar/rejeitar deve atualizar almoxarifado.solicitacoes_saida_materiais
-- (A função completa é longa; aqui apenas o bloco CASE é redefinido via substituição da função inteira.
--  Fonte: 20260215000002, com public.solicitacoes_saida_materiais -> almoxarifado.solicitacoes_saida_materiais.)
CREATE OR REPLACE FUNCTION public.process_approval(
    p_aprovacao_id UUID,
    p_status VARCHAR(20),
    p_observacoes TEXT,
    p_aprovador_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approval_record RECORD;
    all_approved BOOLEAN := false;
    v_requisicao_data_necessidade DATE;
    v_requisicao_data_solicitacao DATE;
    v_pending_before BOOLEAN := false;
    v_pending_count INTEGER := 0;
    v_pending_details TEXT := '';
    v_pending_approval RECORD;
    v_numero_cotacao VARCHAR(50);
BEGIN
    RAISE NOTICE '[process_approval] INÍCIO - Parâmetros: aprovacao_id=%, status=%, aprovador_id=%',
        p_aprovacao_id, p_status, p_aprovador_id;

    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';

    IF NOT FOUND THEN
        RAISE NOTICE '[process_approval] AVISO: Aprovação não encontrada ou não está pendente. aprovacao_id=%', p_aprovacao_id;
        RETURN FALSE;
    END IF;

    IF p_status = 'aprovado' THEN
        SELECT COUNT(*) INTO v_pending_count
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id
        AND status = 'pendente'
        AND (
            nivel_aprovacao < approval_record.nivel_aprovacao
            OR (nivel_aprovacao = approval_record.nivel_aprovacao AND ordem < COALESCE(approval_record.ordem, 0))
        );

        IF v_pending_count > 0 THEN
            v_pending_details := '';
            FOR v_pending_approval IN
                SELECT au.nivel_aprovacao, au.ordem, au.aprovador_id,
                       COALESCE(u.email, 'Usuário não encontrado') as aprovador_email,
                       COALESCE(u.nome, '') as aprovador_nome
                FROM public.aprovacoes_unificada au
                LEFT JOIN public.users u ON au.aprovador_id = u.id
                WHERE au.processo_tipo = approval_record.processo_tipo
                AND au.processo_id = approval_record.processo_id
                AND au.company_id = approval_record.company_id
                AND au.status = 'pendente'
                AND (au.nivel_aprovacao < approval_record.nivel_aprovacao
                     OR (au.nivel_aprovacao = approval_record.nivel_aprovacao AND au.ordem < COALESCE(approval_record.ordem, 0)))
                ORDER BY au.nivel_aprovacao, au.ordem
                LIMIT 5
            LOOP
                IF v_pending_details != '' THEN v_pending_details := v_pending_details || ', '; END IF;
                v_pending_details := v_pending_details || format('Nível %s, Ordem %s (%s)',
                    v_pending_approval.nivel_aprovacao, v_pending_approval.ordem,
                    COALESCE(NULLIF(v_pending_approval.aprovador_nome, ''), v_pending_approval.aprovador_email, 'Usuário não encontrado'));
            END LOOP;
            RAISE EXCEPTION 'Não é possível aprovar. Existem % aprovações pendentes que devem ser processadas antes desta, respeitando a ordem hierárquica. Aprovações pendentes: %',
                v_pending_count, v_pending_details;
        END IF;
    END IF;

    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;

    IF p_status = 'aprovado' THEN
        SELECT NOT EXISTS(
            SELECT 1 FROM public.aprovacoes_unificada
            WHERE processo_tipo = approval_record.processo_tipo
            AND processo_id = approval_record.processo_id
            AND company_id = approval_record.company_id
            AND status = 'pendente'
        ) INTO all_approved;

        IF all_approved THEN
            CASE approval_record.processo_tipo
                WHEN 'conta_pagar' THEN
                    UPDATE financeiro.contas_pagar
                    SET status = 'aprovado', data_aprovacao = NOW(), aprovado_por = p_aprovador_id, updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                WHEN 'requisicao_compra' THEN
                    SELECT data_necessidade, data_solicitacao INTO v_requisicao_data_necessidade, v_requisicao_data_solicitacao
                    FROM compras.requisicoes_compra WHERE id = approval_record.processo_id;
                    IF v_requisicao_data_necessidade IS NOT NULL AND v_requisicao_data_solicitacao IS NOT NULL AND v_requisicao_data_necessidade < v_requisicao_data_solicitacao THEN
                        v_requisicao_data_necessidade := v_requisicao_data_solicitacao;
                    END IF;
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada'::compras.status_requisicao, workflow_state = 'em_cotacao',
                        data_necessidade = COALESCE(v_requisicao_data_necessidade, v_requisicao_data_solicitacao),
                        data_aprovacao = NOW(), aprovado_por = p_aprovador_id, updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                WHEN 'cotacao_compra' THEN
                    SELECT numero_cotacao INTO v_numero_cotacao
                    FROM compras.cotacao_ciclos
                    WHERE id = approval_record.processo_id AND company_id = approval_record.company_id;
                    UPDATE compras.cotacao_ciclos
                    SET status = 'aprovada', workflow_state = 'aprovada', updated_at = NOW()
                    WHERE numero_cotacao = v_numero_cotacao AND company_id = approval_record.company_id;
                WHEN 'solicitacao_saida_material' THEN
                    UPDATE almoxarifado.solicitacoes_saida_materiais SET status = 'aprovado', data_aprovacao = NOW(), updated_at = NOW() WHERE id = approval_record.processo_id;
                WHEN 'solicitacao_transferencia_material' THEN
                    UPDATE almoxarifado.transferencias SET status = 'aprovado', data_aprovacao = NOW(), aprovador_id = p_aprovador_id, updated_at = NOW() WHERE id = approval_record.processo_id;
                WHEN 'logistica' THEN
                    UPDATE logistica.logistics_requests SET status = 'aprovado', updated_at = NOW() WHERE id = approval_record.processo_id;
                WHEN 'combustivel' THEN
                    UPDATE combustivel.refuel_requests SET status = 'aprovada', aprovado_por = p_aprovador_id, aprovado_em = NOW(), updated_at = NOW() WHERE id = approval_record.processo_id;
                ELSE NULL;
            END CASE;
        END IF;
    END IF;

    IF p_status IN ('rejeitado', 'cancelado') THEN
        CASE approval_record.processo_tipo
            WHEN 'conta_pagar' THEN
                UPDATE financeiro.contas_pagar SET status = p_status, updated_at = NOW() WHERE id = approval_record.processo_id;
            WHEN 'requisicao_compra' THEN
                UPDATE compras.requisicoes_compra SET status = 'cancelada'::compras.status_requisicao, workflow_state = CASE WHEN p_status = 'rejeitado' THEN 'reprovada' ELSE 'cancelada' END, updated_at = NOW() WHERE id = approval_record.processo_id;
            WHEN 'cotacao_compra' THEN
                SELECT numero_cotacao INTO v_numero_cotacao
                FROM compras.cotacao_ciclos
                WHERE id = approval_record.processo_id AND company_id = approval_record.company_id;
                UPDATE compras.cotacao_ciclos
                SET status = 'reprovada', workflow_state = 'reprovada', updated_at = NOW()
                WHERE numero_cotacao = v_numero_cotacao AND company_id = approval_record.company_id;
            WHEN 'solicitacao_saida_material' THEN
                UPDATE almoxarifado.solicitacoes_saida_materiais SET status = p_status, updated_at = NOW() WHERE id = approval_record.processo_id;
            WHEN 'solicitacao_transferencia_material' THEN
                UPDATE almoxarifado.transferencias SET status = p_status, updated_at = NOW() WHERE id = approval_record.processo_id;
            WHEN 'logistica' THEN
                UPDATE logistica.logistics_requests SET status = 'rejeitado', updated_at = NOW() WHERE id = approval_record.processo_id;
            WHEN 'combustivel' THEN
                UPDATE combustivel.refuel_requests SET status = 'reprovada', observacoes_aprovacao = COALESCE(p_observacoes, 'Solicitação rejeitada'), updated_at = NOW() WHERE id = approval_record.processo_id;
            ELSE NULL;
        END CASE;
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.process_approval(UUID, VARCHAR, TEXT, UUID) IS
'Processa aprovação. Saída de material: atualiza almoxarifado.solicitacoes_saida_materiais. 2026-02-22.';
