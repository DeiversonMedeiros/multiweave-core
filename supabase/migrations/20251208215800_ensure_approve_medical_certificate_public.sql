-- =====================================================
-- GARANTIR: approve_medical_certificate e reject_medical_certificate no schema public
-- Recria as funções explicitamente no schema public para garantir que o Supabase REST API as encontre
-- =====================================================

-- Remover funções antigas de todos os schemas
DROP FUNCTION IF EXISTS public.approve_medical_certificate(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_medical_certificate(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS approve_medical_certificate(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_medical_certificate(UUID, UUID, TEXT);

-- Função para aprovar atestado médico (explicitamente no schema public)
CREATE OR REPLACE FUNCTION public.approve_medical_certificate(
    p_certificate_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_certificate RECORD;
    v_update_count INTEGER;
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
                COALESCE(mc.observacoes || E'\n\nObservacoes da aprovacao: ' || p_observacoes, p_observacoes)
            ELSE 
                mc.observacoes
        END,
        updated_at = NOW()
    WHERE mc.id = p_certificate_id
      AND mc.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar atestado. Pode ter sido modificado por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

-- Função para rejeitar atestado médico (explicitamente no schema public)
CREATE OR REPLACE FUNCTION public.reject_medical_certificate(
    p_certificate_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_certificate RECORD;
    v_update_count INTEGER;
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
                COALESCE(mc.observacoes || E'\n\nMotivo da rejeicao: ' || p_observacoes, p_observacoes)
            ELSE 
                mc.observacoes
        END,
        updated_at = NOW()
    WHERE mc.id = p_certificate_id
      AND mc.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar atestado. Pode ter sido modificado por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    RETURN true;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.approve_medical_certificate(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_medical_certificate(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_medical_certificate(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_medical_certificate(UUID, UUID, TEXT) TO anon;

-- Comentários
COMMENT ON FUNCTION public.approve_medical_certificate(UUID, UUID, TEXT) IS 
'Aprova um atestado medico. Criada explicitamente no schema public para garantir visibilidade no Supabase REST API.';

COMMENT ON FUNCTION public.reject_medical_certificate(UUID, UUID, TEXT) IS 
'Rejeita um atestado medico. Criada explicitamente no schema public para garantir visibilidade no Supabase REST API.';

