-- =====================================================
-- MIGRAÇÃO: Aprovações para cotação com múltiplos centros de custo
-- Data: 2026-02-15
-- Descrição:
--   1. Nova função get_required_approvers_cotacao_aggregate: agrega aprovadores
--      de todos os centros de custo dos ciclos com mesmo numero_cotacao
--   2. create_approvals_for_process usa aggregate para cotacao_compra
--   3. create_approvals_cotacao_ciclos: evita duplicatas quando vários ciclos
--      do mesmo numero_cotacao disparam
--   4. process_approval: ao aprovar/rejeitar, atualiza TODOS os ciclos com
--      mesmo numero_cotacao
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO get_required_approvers_cotacao_aggregate
--    Retorna aprovadores de todos os CCs dos ciclos com mesmo numero_cotacao
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_required_approvers_cotacao_aggregate(
    p_cotacao_ciclo_id UUID,
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
    v_numero_cotacao VARCHAR(50);
    v_processo_valor DECIMAL(15,2) := 0;
    v_centro_custos UUID[] := '{}';
    v_ciclo RECORD;
    v_sub DECIMAL(15,2);
    v_frete_itens DECIMAL(15,2);
    v_frete_imp DECIMAL(15,2);
    v_desconto_forn DECIMAL(15,2);
    v_base DECIMAL(15,2);
    v_desconto_geral DECIMAL(15,2);
    config_record RECORD;
    aprovador_record RECORD;
    cc_id UUID;
    aprovadores_ja_retornados UUID[] := '{}';
BEGIN
    -- Obter numero_cotacao do ciclo
    SELECT numero_cotacao INTO v_numero_cotacao
    FROM compras.cotacao_ciclos
    WHERE id = p_cotacao_ciclo_id AND company_id = p_company_id;
    
    IF v_numero_cotacao IS NULL THEN
        RETURN;
    END IF;
    
    -- Para cada ciclo com mesmo numero_cotacao (todos, não só em_aprovacao) coletar CCs e somar valor.
    -- Assim, quando o front atualiza apenas um ciclo para em_aprovacao, ainda agregamos aprovadores
    -- de todos os CCs das requisições da cotação (multi-CC).
    FOR v_ciclo IN
        SELECT cc.id, cc.requisicao_id, r.centro_custo_id,
               cc.valor_frete, cc.desconto_percentual, cc.desconto_valor
        FROM compras.cotacao_ciclos cc
        INNER JOIN compras.requisicoes_compra r ON r.id = cc.requisicao_id
        WHERE cc.numero_cotacao = v_numero_cotacao
          AND cc.company_id = p_company_id
    LOOP
        IF v_ciclo.centro_custo_id IS NOT NULL THEN
            v_centro_custos := array_append(v_centro_custos, v_ciclo.centro_custo_id);
        END IF;
        
        -- Calcular valor deste ciclo (mesma fórmula de get_required_approvers)
        SELECT 
            COALESCE(SUM(cif.valor_total_calculado), 0),
            COALESCE(SUM(COALESCE(cif.valor_frete, 0)), 0)
        INTO v_sub, v_frete_itens
        FROM compras.cotacao_item_fornecedor cif
        INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
        WHERE cf.cotacao_id = v_ciclo.id AND cif.is_vencedor = true;
        
        SELECT 
            COALESCE(SUM(COALESCE(cf.valor_frete, 0) + COALESCE(cf.valor_imposto, 0)), 0),
            COALESCE(SUM(
                (SELECT COALESCE(SUM(c2.valor_total_calculado), 0) FROM compras.cotacao_item_fornecedor c2 
                 WHERE c2.cotacao_fornecedor_id = cf.id AND c2.is_vencedor = true)
                * COALESCE(cf.desconto_percentual, 0) / 100 + COALESCE(cf.desconto_valor, 0)
            ), 0)
        INTO v_frete_imp, v_desconto_forn
        FROM compras.cotacao_fornecedores cf
        WHERE cf.cotacao_id = v_ciclo.id
          AND EXISTS (SELECT 1 FROM compras.cotacao_item_fornecedor c WHERE c.cotacao_fornecedor_id = cf.id AND c.is_vencedor = true);
        
        v_base := COALESCE(v_sub, 0) + COALESCE(v_frete_itens, 0) + COALESCE(v_frete_imp, 0) - COALESCE(v_desconto_forn, 0);
        v_desconto_geral := v_base * COALESCE(v_ciclo.desconto_percentual, 0) / 100
                          + COALESCE(v_ciclo.desconto_valor, 0);
        v_processo_valor := v_processo_valor + GREATEST(v_base + COALESCE(v_ciclo.valor_frete, 0) - v_desconto_geral, 0);
    END LOOP;
    
    -- Remover duplicatas do array
    v_centro_custos := (SELECT COALESCE(array_agg(DISTINCT x), '{}'::uuid[]) FROM unnest(v_centro_custos) AS x);
    
    -- Se nenhum CC, tentar config genérica (centro_custo_id IS NULL)
    IF array_length(v_centro_custos, 1) IS NULL THEN
        FOR config_record IN
            SELECT * FROM public.configuracoes_aprovacao_unificada
            WHERE company_id = p_company_id
            AND processo_tipo = 'cotacao_compra'
            AND ativo = true
            AND centro_custo_id IS NULL
            AND (valor_limite IS NULL OR valor_limite >= v_processo_valor)
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
    
    -- Para cada centro de custo distinto, buscar configs e retornar aprovadores (dedup)
    FOREACH cc_id IN ARRAY v_centro_custos
    LOOP
        FOR config_record IN
            SELECT * FROM public.configuracoes_aprovacao_unificada
            WHERE company_id = p_company_id
            AND processo_tipo = 'cotacao_compra'
            AND ativo = true
            AND (valor_limite IS NULL OR valor_limite >= v_processo_valor)
            AND (centro_custo_id IS NULL OR centro_custo_id = cc_id)
            ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
        LOOP
            FOR aprovador_record IN
                SELECT (aprovador->>'user_id')::UUID as user_id,
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
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers_cotacao_aggregate(UUID, UUID) IS 
'Retorna aprovadores agregados de todos os centros de custo dos ciclos com mesmo numero_cotacao. Usado para cotações com itens de múltiplos CCs. 2026-02-15.';

-- =====================================================
-- 2. ATUALIZAR create_approvals_for_process para usar aggregate em cotacao_compra
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
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id;

    -- cotacao_compra: usar aggregate para múltiplos CCs
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

    -- Aprovação automática quando não há config (mantém lógica existente)
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
                UPDATE public.solicitacoes_saida_materiais
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

-- =====================================================
-- 3. ATUALIZAR create_approvals_cotacao_ciclos: evitar duplicatas por numero_cotacao
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_approvals_cotacao_ciclos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_aprovacoes_existentes INTEGER;
    v_ja_existe_por_numero INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_aprovacoes_existentes
    FROM public.aprovacoes_unificada
    WHERE processo_tipo = 'cotacao_compra'
      AND processo_id = NEW.id
      AND company_id = NEW.company_id;
    
    IF v_aprovacoes_existentes > 0 THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se já existem aprovações para outro ciclo com mesmo numero_cotacao
    SELECT COUNT(*) INTO v_ja_existe_por_numero
    FROM public.aprovacoes_unificada au
    JOIN compras.cotacao_ciclos cc ON cc.id = au.processo_id
    WHERE au.processo_tipo = 'cotacao_compra'
      AND cc.numero_cotacao = NEW.numero_cotacao
      AND cc.company_id = NEW.company_id;
    
    IF v_ja_existe_por_numero > 0 THEN
        RAISE NOTICE '[create_approvals_cotacao_ciclos] Aprovações já existem para numero_cotacao=%. Ignorando ciclo %', NEW.numero_cotacao, NEW.id;
        RETURN NEW;
    END IF;
    
    IF (NEW.workflow_state = 'em_aprovacao' OR NEW.status = 'em_aprovacao') THEN
        BEGIN
            PERFORM public.create_approvals_for_process('cotacao_compra', NEW.id, NEW.company_id);
            -- Alinhar todos os ciclos com mesmo numero_cotacao a em_aprovacao (front pode ter atualizado só um)
            UPDATE compras.cotacao_ciclos
            SET workflow_state = 'em_aprovacao', status = 'em_aprovacao', updated_at = NOW()
            WHERE numero_cotacao = NEW.numero_cotacao
              AND company_id = NEW.company_id
              AND id <> NEW.id
              AND (workflow_state IS DISTINCT FROM 'em_aprovacao' OR status IS DISTINCT FROM 'em_aprovacao');
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING '[create_approvals_cotacao_ciclos] Erro ao criar aprovações para ciclo %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- =====================================================
-- 4. ATUALIZAR process_approval: ao aprovar/rejeitar cotação, atualizar TODOS os ciclos
--    (Alteração mínima: apenas os blocos cotacao_compra passam a usar numero_cotacao)
-- =====================================================

-- Recriar process_approval mantendo toda a lógica existente, alterando só cotacao_compra
-- O arquivo 20260125000001_improve_process_approval_error_message.sql define a versão atual.
-- Alterações: WHERE id = ... -> WHERE numero_cotacao = (SELECT ...) AND company_id = ...
-- para atualizar todos os ciclos da mesma cotação.

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
    entity_company_id UUID;
    v_requisicao_id UUID;
    v_requisicao_numero VARCHAR(50);
    v_requisicao_status_atual compras.status_requisicao;
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
    
    RAISE NOTICE '[process_approval] Aprovação encontrada: processo_tipo=%, processo_id=%, nivel_aprovacao=%, ordem=%', 
        approval_record.processo_tipo, approval_record.processo_id, approval_record.nivel_aprovacao, approval_record.ordem;
    
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
                    UPDATE public.solicitacoes_saida_materiais SET status = 'aprovado', data_aprovacao = NOW(), updated_at = NOW() WHERE id = approval_record.processo_id;
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
                UPDATE public.solicitacoes_saida_materiais SET status = p_status, updated_at = NOW() WHERE id = approval_record.processo_id;
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
'Processa aprovação. Cotação: ao aprovar/rejeitar atualiza TODOS os ciclos com mesmo numero_cotacao. 2026-02-15.';
