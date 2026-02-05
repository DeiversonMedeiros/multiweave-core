-- =====================================================
-- CORREÇÃO: LOOKUP DE PROFILE_ID EM APPROVE_TIME_RECORD
-- =====================================================
-- Data: 2026-02-05
-- Descrição: Corrige as funções approve_time_record e reject_time_record
--            para buscar o profile_id correto usando get_profile_id_for_user,
--            evitando erro de foreign key constraint quando user_id não existe
--            diretamente na tabela profiles.
-- =====================================================

-- Atualizar função approve_time_record para usar profile_id
CREATE OR REPLACE FUNCTION approve_time_record(
    p_time_record_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_time_record RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    -- Buscar o registro de ponto para obter company_id
    SELECT tr.* INTO v_time_record
    FROM rh.time_records tr
    WHERE tr.id = p_time_record_id
      AND tr.status = 'pendente'
      AND (COALESCE(tr.horas_extras, 0) > 0 
           OR COALESCE(tr.horas_extras_50, 0) > 0 
           OR COALESCE(tr.horas_extras_100, 0) > 0);
    
    IF v_time_record IS NULL THEN
        RAISE EXCEPTION 'Registro de ponto nao encontrado ou ja processado' USING ERRCODE = 'P0001';
    END IF;
    
    -- Obter profile_id correto usando a função auxiliar
    v_profile_id := public.get_profile_id_for_user(p_approved_by, v_time_record.company_id);
    
    -- Atualizar o registro
    UPDATE rh.time_records
    SET 
        status = 'aprovado',
        aprovado_por = v_profile_id,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_time_record_id
      AND status = 'pendente'
      AND (COALESCE(horas_extras, 0) > 0 
           OR COALESCE(horas_extras_50, 0) > 0 
           OR COALESCE(horas_extras_100, 0) > 0);
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar registro. Pode ter sido modificado por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função reject_time_record para usar profile_id
CREATE OR REPLACE FUNCTION reject_time_record(
    p_time_record_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_time_record RECORD;
    v_profile_id UUID;
    v_update_count INTEGER;
BEGIN
    -- Buscar o registro de ponto para obter company_id
    SELECT tr.* INTO v_time_record
    FROM rh.time_records tr
    WHERE tr.id = p_time_record_id
      AND tr.status = 'pendente'
      AND (COALESCE(tr.horas_extras, 0) > 0 
           OR COALESCE(tr.horas_extras_50, 0) > 0 
           OR COALESCE(tr.horas_extras_100, 0) > 0);
    
    IF v_time_record IS NULL THEN
        RAISE EXCEPTION 'Registro de ponto nao encontrado ou ja processado' USING ERRCODE = 'P0001';
    END IF;
    
    -- Obter profile_id correto usando a função auxiliar
    v_profile_id := public.get_profile_id_for_user(p_rejected_by, v_time_record.company_id);
    
    -- Atualizar o registro
    UPDATE rh.time_records
    SET 
        status = 'rejeitado',
        aprovado_por = v_profile_id,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_time_record_id
      AND status = 'pendente'
      AND (COALESCE(horas_extras, 0) > 0 
           OR COALESCE(horas_extras_50, 0) > 0 
           OR COALESCE(horas_extras_100, 0) > 0);
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar registro. Pode ter sido modificado por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_time_record(UUID, UUID, TEXT) IS 
'Aprova um registro de ponto que possui hora extra. Usa get_profile_id_for_user para obter o profile_id correto.';
COMMENT ON FUNCTION reject_time_record(UUID, UUID, TEXT) IS 
'Rejeita um registro de ponto que possui hora extra. Usa get_profile_id_for_user para obter o profile_id correto.';
