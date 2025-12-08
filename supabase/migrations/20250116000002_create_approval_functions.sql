-- =====================================================
-- FUNÇÕES DO SISTEMA DE APROVAÇÕES UNIFICADO
-- =====================================================

-- 1. FUNÇÃO PARA DETERMINAR APROVADORES NECESSÁRIOS
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
    processo_departamento VARCHAR(100);
    processo_classe_financeira VARCHAR(100);
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, departamento, classe_financeira, usuario_id
            INTO processo_valor, processo_centro_custo_id, processo_departamento, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
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
    FOR config_record IN
        SELECT * FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
        AND (departamento IS NULL OR departamento = processo_departamento)
        AND (classe_financeira IS NULL OR classe_financeira = processo_classe_financeira)
        AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
        ORDER BY nivel_aprovacao, valor_limite DESC
    LOOP
        -- Processar aprovadores do JSONB
        FOR aprovador_record IN
            SELECT 
                (aprovador->>'user_id')::UUID as user_id,
                COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
            FROM jsonb_array_elements(config_record.aprovadores) as aprovador
        LOOP
            nivel := config_record.nivel_aprovacao;
            aprovador_id := aprovador_record.user_id;
            is_primary := aprovador_record.is_primary;
            ordem := aprovador_record.ordem;
            RETURN NEXT;
        END LOOP;
    END LOOP;
END;
$$;

-- 2. FUNÇÃO PARA CRIAR APROVAÇÕES AUTOMÁTICAS
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
BEGIN
    -- Limpar aprovações existentes para este processo
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id;

    -- Criar novas aprovações baseadas nas configurações
    FOR approver_record IN
        SELECT * FROM public.get_required_approvers(p_processo_tipo, p_processo_id, p_company_id)
        ORDER BY nivel, ordem
    LOOP
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
    END LOOP;

    RETURN approval_created;
END;
$$;

-- 3. FUNÇÃO PARA PROCESSAR APROVAÇÃO (COM 3 STATUS)
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
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'cotacao_compra' THEN
                    UPDATE compras.cotacoes
                    SET status = 'aprovado',
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
                UPDATE compras.requisicoes_compra
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'cotacao_compra' THEN
                UPDATE compras.cotacoes
                SET status = p_status,
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

-- 4. FUNÇÃO PARA TRANSFERIR APROVAÇÃO
-- =====================================================
CREATE OR REPLACE FUNCTION public.transfer_approval(
    p_aprovacao_id UUID,
    p_novo_aprovador_id UUID,
    p_motivo TEXT,
    p_transferido_por UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approval_record RECORD;
BEGIN
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar aprovador
    UPDATE public.aprovacoes_unificada
    SET aprovador_id = p_novo_aprovador_id,
        transferido_em = NOW(),
        transferido_por = p_transferido_por,
        motivo_transferencia = p_motivo,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    RETURN TRUE;
END;
$$;

-- 5. FUNÇÃO PARA RESETAR APROVAÇÕES APÓS EDIÇÃO
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_approvals_after_edit(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Limpar aprovações existentes
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id;
    
    -- Criar novas aprovações
    PERFORM public.create_approvals_for_process(p_processo_tipo, p_processo_id, p_company_id);
    
    -- Marcar como resetado no histórico
    UPDATE public.historico_edicoes_solicitacoes
    SET aprovacoes_resetadas = true,
        data_reset = NOW()
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id
    AND aprovacoes_resetadas = false;
    
    RETURN TRUE;
END;
$$;

-- 6. FUNÇÃO PARA VERIFICAR SE PODE EDITAR (NÃO CANCELADO)
-- =====================================================
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
    
    -- Retorna true se não estiver cancelado
    RETURN entity_status IS NOT NULL AND entity_status != 'cancelado';
END;
$$;

-- 7. FUNÇÃO PARA OBTER APROVAÇÕES PENDENTES DE UM USUÁRIO
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_pending_approvals_for_user(
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
    WHERE au.aprovador_id = p_user_id
    AND au.company_id = p_company_id
    AND au.status = 'pendente'
    ORDER BY au.created_at DESC;
END;
$$;
