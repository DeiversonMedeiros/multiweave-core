-- =====================================================
-- CORREÇÃO: Todas as funções de aprovação/rejeição
-- Corrige o problema de foreign key em todas as tabelas
-- Busca o profile_id correto da tabela user_companies
-- =====================================================

-- Função auxiliar para obter profile_id
CREATE OR REPLACE FUNCTION public.get_profile_id_for_user(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Buscar o profile_id da tabela user_companies
    SELECT uc.profile_id INTO v_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = p_user_id
      AND uc.company_id = p_company_id
      AND uc.ativo = true
    LIMIT 1;
    
    -- Se não encontrou, usar o user_id como fallback
    IF v_profile_id IS NULL THEN
        v_profile_id := p_user_id;
    END IF;
    
    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. APPROVE_VACATION / REJECT_VACATION
-- =====================================================
DROP FUNCTION IF EXISTS public.approve_vacation(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_vacation(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_vacation(
    p_vacation_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_vacation RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    -- Obter user_id autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    -- Buscar a solicitação de férias
    SELECT * INTO v_vacation FROM rh.vacations WHERE id = p_vacation_id;
    
    IF v_vacation IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de ferias nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_vacation.status = 'aprovado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi aprovada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    -- Obter profile_id correto
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_vacation.company_id);
    
    -- Atualizar
    UPDATE rh.vacations v
    SET 
        status = 'aprovado',
        aprovado_por = v_profile_id,
        data_aprovacao = NOW(),
        observacoes_aprovacao = COALESCE(p_observacoes, v.observacoes_aprovacao),
        updated_at = NOW()
    WHERE v.id = p_vacation_id
      AND v.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_vacation(
    p_vacation_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_vacation RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_vacation FROM rh.vacations WHERE id = p_vacation_id;
    
    IF v_vacation IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de ferias nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_vacation.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi rejeitada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_vacation.company_id);
    
    UPDATE rh.vacations v
    SET 
        status = 'rejeitado',
        aprovado_por = v_profile_id,
        data_aprovacao = NOW(),
        observacoes_aprovacao = COALESCE(p_observacoes, v.observacoes_aprovacao),
        updated_at = NOW()
    WHERE v.id = p_vacation_id
      AND v.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

-- =====================================================
-- 2. APPROVE_COMPENSATION / REJECT_COMPENSATION
-- =====================================================
DROP FUNCTION IF EXISTS public.approve_compensation(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_compensation(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_compensation(
    p_compensation_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_compensation RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_compensation FROM rh.compensation_requests WHERE id = p_compensation_id;
    
    IF v_compensation IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de compensacao nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_compensation.status = 'aprovado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi aprovada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_compensation.company_id);
    
    UPDATE rh.compensation_requests c
    SET 
        status = 'aprovado',
        aprovado_por = v_profile_id,
        data_aprovacao = NOW(),
        observacoes_aprovacao = COALESCE(p_observacoes, c.observacoes_aprovacao),
        updated_at = NOW()
    WHERE c.id = p_compensation_id
      AND c.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_compensation(
    p_compensation_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_compensation RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_compensation FROM rh.compensation_requests WHERE id = p_compensation_id;
    
    IF v_compensation IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de compensacao nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_compensation.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi rejeitada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_compensation.company_id);
    
    UPDATE rh.compensation_requests c
    SET 
        status = 'rejeitado',
        aprovado_por = v_profile_id,
        data_aprovacao = NOW(),
        observacoes_aprovacao = COALESCE(p_observacoes, c.observacoes_aprovacao),
        updated_at = NOW()
    WHERE c.id = p_compensation_id
      AND c.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

-- =====================================================
-- 3. APPROVE_REIMBURSEMENT / REJECT_REIMBURSEMENT
-- =====================================================
DROP FUNCTION IF EXISTS public.approve_reimbursement(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_reimbursement(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_reimbursement(
    p_reimbursement_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_reimbursement RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_reimbursement FROM rh.reimbursement_requests WHERE id = p_reimbursement_id;
    
    IF v_reimbursement IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de reembolso nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_reimbursement.status = 'aprovado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi aprovada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_reimbursement.company_id);
    
    UPDATE rh.reimbursement_requests r
    SET 
        status = 'aprovado',
        aprovado_por = v_profile_id,
        data_aprovacao = NOW(),
        observacoes_aprovacao = COALESCE(p_observacoes, r.observacoes_aprovacao),
        updated_at = NOW()
    WHERE r.id = p_reimbursement_id
      AND r.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_reimbursement(
    p_reimbursement_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_reimbursement RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_reimbursement FROM rh.reimbursement_requests WHERE id = p_reimbursement_id;
    
    IF v_reimbursement IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de reembolso nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_reimbursement.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi rejeitada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_reimbursement.company_id);
    
    UPDATE rh.reimbursement_requests r
    SET 
        status = 'rejeitado',
        aprovado_por = v_profile_id,
        data_aprovacao = NOW(),
        observacoes_aprovacao = COALESCE(p_observacoes, r.observacoes_aprovacao),
        updated_at = NOW()
    WHERE r.id = p_reimbursement_id
      AND r.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

-- =====================================================
-- 4. APPROVE_EQUIPMENT / REJECT_EQUIPMENT
-- =====================================================
DROP FUNCTION IF EXISTS public.approve_equipment(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_equipment(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_equipment(
    p_equipment_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_equipment RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_equipment FROM rh.equipment_rental_approvals WHERE id = p_equipment_id;
    
    IF v_equipment IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de equipamento nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_equipment.status = 'aprovado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi aprovada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_equipment.company_id);
    
    UPDATE rh.equipment_rental_approvals e
    SET 
        status = 'aprovado',
        aprovado_por = v_profile_id,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, e.observacoes),
        updated_at = NOW()
    WHERE e.id = p_equipment_id
      AND e.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_equipment(
    p_equipment_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_equipment RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    SELECT * INTO v_equipment FROM rh.equipment_rental_approvals WHERE id = p_equipment_id;
    
    IF v_equipment IS NULL THEN
        RAISE EXCEPTION 'Solicitacao de equipamento nao encontrada' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_equipment.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Solicitacao ja foi rejeitada anteriormente' USING ERRCODE = '23505';
    END IF;
    
    v_profile_id := public.get_profile_id_for_user(auth.uid(), v_equipment.company_id);
    
    UPDATE rh.equipment_rental_approvals e
    SET 
        status = 'rejeitado',
        aprovado_por = v_profile_id,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, e.observacoes),
        updated_at = NOW()
    WHERE e.id = p_equipment_id
      AND e.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar solicitacao. Pode ter sido modificada por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_profile_id_for_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_id_for_user(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_vacation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_vacation(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_vacation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_vacation(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_compensation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_compensation(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_compensation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_compensation(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_reimbursement(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_reimbursement(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_reimbursement(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_reimbursement(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_equipment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_equipment(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_equipment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_equipment(UUID, UUID, TEXT) TO anon;

COMMENT ON FUNCTION public.get_profile_id_for_user(UUID, UUID) IS 
'Funcao auxiliar para obter o profile_id correto de um usuario em uma empresa.';

