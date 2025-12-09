-- =====================================================
-- CORREÇÃO: approve_medical_certificate e reject_medical_certificate
-- Corrige ambiguidade na coluna observacoes
-- =====================================================

-- Remover funções antigas
DROP FUNCTION IF EXISTS approve_medical_certificate(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_medical_certificate(UUID, UUID, TEXT);

-- Função para aprovar atestado médico
CREATE OR REPLACE FUNCTION approve_medical_certificate(
    p_certificate_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_certificate RECORD;
BEGIN
    -- Buscar o atestado
    SELECT * INTO v_certificate
    FROM rh.medical_certificates
    WHERE id = p_certificate_id;
    
    -- Verificar se o atestado existe
    IF v_certificate IS NULL THEN
        RAISE EXCEPTION 'Atestado nao encontrado' USING ERRCODE = 'P0001';
    END IF;
    
    -- Verificar se já foi aprovado
    IF v_certificate.status = 'aprovado' THEN
        RAISE EXCEPTION 'Atestado ja foi aprovado anteriormente' USING ERRCODE = '23505';
    END IF;
    
    -- Verificar se já foi rejeitado
    IF v_certificate.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Atestado ja foi rejeitado e nao pode ser aprovado' USING ERRCODE = '23505';
    END IF;
    
    -- Atualizar o atestado
    -- Usar o alias da tabela para evitar ambiguidade entre parâmetro e coluna
    UPDATE rh.medical_certificates mc
    SET 
        status = 'aprovado',
        aprovado_por = p_approved_by,
        aprovado_em = NOW(),
        observacoes = CASE 
            WHEN p_observacoes IS NOT NULL AND p_observacoes != '' THEN 
                COALESCE(mc.observacoes || E'\n\nObservações da aprovação: ' || p_observacoes, p_observacoes)
            ELSE 
                mc.observacoes
        END,  -- Preservar observações existentes e adicionar novas se fornecidas
        updated_at = NOW()
    WHERE mc.id = p_certificate_id
      AND mc.status = 'pendente';  -- Garantir que só atualiza se ainda estiver pendente
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar atestado médico
CREATE OR REPLACE FUNCTION reject_medical_certificate(
    p_certificate_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_certificate RECORD;
BEGIN
    -- Buscar o atestado
    SELECT * INTO v_certificate
    FROM rh.medical_certificates
    WHERE id = p_certificate_id;
    
    -- Verificar se o atestado existe
    IF v_certificate IS NULL THEN
        RAISE EXCEPTION 'Atestado nao encontrado' USING ERRCODE = 'P0001';
    END IF;
    
    -- Verificar se já foi aprovado
    IF v_certificate.status = 'aprovado' THEN
        RAISE EXCEPTION 'Atestado ja foi aprovado e nao pode ser rejeitado' USING ERRCODE = '23505';
    END IF;
    
    -- Verificar se já foi rejeitado
    IF v_certificate.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Atestado ja foi rejeitado anteriormente' USING ERRCODE = '23505';
    END IF;
    
    -- Atualizar o atestado
    -- Usar o alias da tabela para evitar ambiguidade entre parâmetro e coluna
    UPDATE rh.medical_certificates mc
    SET 
        status = 'rejeitado',
        aprovado_por = p_rejected_by,
        aprovado_em = NOW(),
        observacoes = CASE 
            WHEN p_observacoes IS NOT NULL AND p_observacoes != '' THEN 
                COALESCE(mc.observacoes || E'\n\nMotivo da rejeição: ' || p_observacoes, p_observacoes)
            ELSE 
                mc.observacoes
        END,  -- Preservar observações existentes e adicionar motivo da rejeição
        updated_at = NOW()
    WHERE mc.id = p_certificate_id
      AND mc.status = 'pendente';  -- Garantir que só atualiza se ainda estiver pendente
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION approve_medical_certificate(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_medical_certificate(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION reject_medical_certificate(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_medical_certificate(UUID, UUID, TEXT) TO anon;

COMMENT ON FUNCTION approve_medical_certificate(UUID, UUID, TEXT) IS 
'Aprova um atestado medico. Corrigido para evitar ambiguidade na coluna observacoes.';

COMMENT ON FUNCTION reject_medical_certificate(UUID, UUID, TEXT) IS 
'Rejeita um atestado medico. Corrigido para evitar ambiguidade na coluna observacoes.';

