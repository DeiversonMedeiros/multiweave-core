-- =====================================================
-- CORREÇÃO DAS FUNÇÕES DE CORREÇÃO DE PONTO
-- =====================================================

-- Remover funções existentes se houver conflito
DROP FUNCTION IF EXISTS approve_attendance_correction(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_attendance_correction(UUID, UUID, TEXT);

-- Função para aprovar correção de ponto
CREATE OR REPLACE FUNCTION approve_attendance_correction(
    p_correction_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_correction RECORD;
    v_time_record_id UUID;
BEGIN
    -- Buscar a correção
    SELECT * INTO v_correction
    FROM rh.attendance_corrections
    WHERE id = p_correction_id;
    
    IF v_correction IS NULL THEN
        RETURN false;
    END IF;
    
    -- Atualizar status da correção
    UPDATE rh.attendance_corrections
    SET 
        status = 'aprovado',
        aprovado_por = p_approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_correction_id;
    
    -- Buscar ou criar registro de ponto
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_correction.employee_id
    AND data_registro = v_correction.data_original;
    
    IF v_time_record_id IS NULL THEN
        -- Criar novo registro
        INSERT INTO rh.time_records (
            employee_id,
            company_id,
            data_registro,
            entrada,
            saida,
            status,
            observacoes,
            created_at,
            updated_at
        ) VALUES (
            v_correction.employee_id,
            v_correction.company_id,
            v_correction.data_original,
            v_correction.entrada_corrigida,
            v_correction.saida_corrigida,
            'aprovado',
            'Registro corrigido e aprovado',
            NOW(),
            NOW()
        ) RETURNING id INTO v_time_record_id;
    ELSE
        -- Atualizar registro existente
        UPDATE rh.time_records
        SET 
            entrada = v_correction.entrada_corrigida,
            saida = v_correction.saida_corrigida,
            status = 'aprovado',
            observacoes = COALESCE(observacoes, '') || ' | Registro corrigido e aprovado',
            updated_at = NOW()
        WHERE id = v_time_record_id;
    END IF;
    
    -- Registrar no histórico
    INSERT INTO rh.correction_history (
        correction_id,
        action,
        new_values,
        changed_by,
        reason
    ) VALUES (
        p_correction_id,
        'approved',
        jsonb_build_object(
            'aprovado_por', p_approved_by,
            'aprovado_em', NOW(),
            'observacoes', p_observacoes
        ),
        p_approved_by,
        'Correção aprovada'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar correção de ponto
CREATE OR REPLACE FUNCTION reject_attendance_correction(
    p_correction_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Atualizar status da correção
    UPDATE rh.attendance_corrections
    SET 
        status = 'rejeitado',
        aprovado_por = p_rejected_by,
        aprovado_em = NOW(),
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_correction_id;
    
    -- Registrar no histórico
    INSERT INTO rh.correction_history (
        correction_id,
        action,
        new_values,
        changed_by,
        reason
    ) VALUES (
        p_correction_id,
        'rejected',
        jsonb_build_object(
            'rejeitado_por', p_rejected_by,
            'rejeitado_em', NOW(),
            'observacoes', p_observacoes
        ),
        p_rejected_by,
        'Correção rejeitada: ' || p_observacoes
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS 'Aprova uma correção de ponto e atualiza o registro original';
COMMENT ON FUNCTION reject_attendance_correction(UUID, UUID, TEXT) IS 'Rejeita uma correção de ponto com justificativa';
