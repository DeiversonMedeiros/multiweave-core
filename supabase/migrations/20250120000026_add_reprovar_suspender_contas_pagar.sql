-- =====================================================
-- FUNÇÕES: REPROVAR E SUSPENDER CONTAS A PAGAR
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Funções para reprovar (resetar aprovações) e suspender (cancelar) contas a pagar
-- Autor: Sistema MultiWeave Core

-- 1. FUNÇÃO PARA REPROVAR CONTA A PAGAR
-- =====================================================
-- Reprova a conta, resetando as aprovações para a primeira etapa
-- e voltando o status para 'pendente'
CREATE OR REPLACE FUNCTION financeiro.reprovar_conta_pagar(
    p_conta_pagar_id UUID,
    p_company_id UUID,
    p_reprovado_por UUID,
    p_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conta_exists BOOLEAN;
BEGIN
    -- Verificar se a conta existe e pertence à empresa
    SELECT EXISTS(
        SELECT 1 
        FROM financeiro.contas_pagar 
        WHERE id = p_conta_pagar_id 
        AND company_id = p_company_id
    ) INTO v_conta_exists;
    
    IF NOT v_conta_exists THEN
        RAISE EXCEPTION 'Conta a pagar não encontrada ou não pertence à empresa';
    END IF;
    
    -- Cancelar todas as aprovações pendentes
    UPDATE public.aprovacoes_unificada
    SET status = 'cancelado',
        observacoes = COALESCE(p_observacoes, 'Conta reprovada - retornando para primeira etapa'),
        updated_at = NOW()
    WHERE processo_tipo = 'conta_pagar'
    AND processo_id = p_conta_pagar_id
    AND company_id = p_company_id
    AND status = 'pendente';
    
    -- Limpar aprovações existentes (incluindo aprovadas e rejeitadas)
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = 'conta_pagar' 
    AND processo_id = p_conta_pagar_id 
    AND company_id = p_company_id;
    
    -- Resetar status da conta para pendente
    UPDATE financeiro.contas_pagar
    SET status = 'pendente',
        data_aprovacao = NULL,
        aprovado_por = NULL,
        observacoes = COALESCE(
            observacoes || E'\n\n--- Reprovação em ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') || ' ---\n' || COALESCE(p_observacoes, 'Conta reprovada e retornada para primeira etapa de aprovação'),
            '--- Reprovação em ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') || ' ---\n' || COALESCE(p_observacoes, 'Conta reprovada e retornada para primeira etapa de aprovação')
        ),
        updated_at = NOW()
    WHERE id = p_conta_pagar_id
    AND company_id = p_company_id;
    
    -- Criar novas aprovações (primeira etapa)
    PERFORM public.create_approvals_for_process('conta_pagar', p_conta_pagar_id, p_company_id);
    
    RETURN TRUE;
END;
$$;

-- 2. FUNÇÃO PARA SUSPENDER CONTA A PAGAR
-- =====================================================
-- Suspende (cancela) a conta e finaliza o processo de aprovação
CREATE OR REPLACE FUNCTION financeiro.suspender_conta_pagar(
    p_conta_pagar_id UUID,
    p_company_id UUID,
    p_suspenso_por UUID,
    p_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conta_exists BOOLEAN;
BEGIN
    -- Verificar se a conta existe e pertence à empresa
    SELECT EXISTS(
        SELECT 1 
        FROM financeiro.contas_pagar 
        WHERE id = p_conta_pagar_id 
        AND company_id = p_company_id
    ) INTO v_conta_exists;
    
    IF NOT v_conta_exists THEN
        RAISE EXCEPTION 'Conta a pagar não encontrada ou não pertence à empresa';
    END IF;
    
    -- Cancelar todas as aprovações pendentes
    UPDATE public.aprovacoes_unificada
    SET status = 'cancelado',
        observacoes = COALESCE(p_observacoes, 'Conta suspensa - processo finalizado'),
        updated_at = NOW()
    WHERE processo_tipo = 'conta_pagar'
    AND processo_id = p_conta_pagar_id
    AND company_id = p_company_id
    AND status = 'pendente';
    
    -- Atualizar status da conta para cancelado
    UPDATE financeiro.contas_pagar
    SET status = 'cancelado',
        data_aprovacao = NULL,
        aprovado_por = NULL,
        observacoes = COALESCE(
            observacoes || E'\n\n--- Suspensão em ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') || ' ---\n' || COALESCE(p_observacoes, 'Conta suspensa - processo finalizado'),
            '--- Suspensão em ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI') || ' ---\n' || COALESCE(p_observacoes, 'Conta suspensa - processo finalizado')
        ),
        updated_at = NOW()
    WHERE id = p_conta_pagar_id
    AND company_id = p_company_id;
    
    RETURN TRUE;
END;
$$;

-- Comentários
COMMENT ON FUNCTION financeiro.reprovar_conta_pagar IS 'Reprova uma conta a pagar, resetando as aprovações para a primeira etapa e voltando o status para pendente';
COMMENT ON FUNCTION financeiro.suspender_conta_pagar IS 'Suspende (cancela) uma conta a pagar e finaliza o processo de aprovação';

-- Permissões
GRANT EXECUTE ON FUNCTION financeiro.reprovar_conta_pagar TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.suspender_conta_pagar TO authenticated;

