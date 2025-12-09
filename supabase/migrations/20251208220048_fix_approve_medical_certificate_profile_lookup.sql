-- =====================================================
-- CORREÇÃO: approve_medical_certificate e reject_medical_certificate
-- Corrige o problema de foreign key no medical_certificates
-- Busca o profile_id correto da tabela user_companies
-- =====================================================

-- Remover funções antigas
DROP FUNCTION IF EXISTS public.approve_medical_certificate(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_medical_certificate(UUID, UUID, TEXT);

-- Função para aprovar atestado médico
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
    v_profile_id UUID;
BEGIN
    -- Obter o user_id do usuário autenticado
    v_profile_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    -- Buscar o atestado primeiro para obter o company_id
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
    
    -- Verificar acesso do usuário à empresa e obter o profile_id correto
    SELECT uc.profile_id INTO v_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = v_certificate.company_id
      AND uc.ativo = true
    LIMIT 1;
    
    -- Se não encontrou o profile_id, tentar usar o user_id diretamente
    IF v_profile_id IS NULL THEN
        -- Verificar se o usuário tem acesso à empresa
        IF NOT EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = v_certificate.company_id
              AND uc.ativo = true
        ) THEN
            RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
        END IF;
        
        -- Se tem acesso mas não tem profile_id, usar o user_id diretamente
        v_profile_id := auth.uid();
    END IF;
    
    -- Atualizar o atestado usando o profile_id correto
    UPDATE rh.medical_certificates mc
    SET 
        status = 'aprovado',
        aprovado_por = v_profile_id,  -- Usar o profile_id obtido de user_companies
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

-- Função para rejeitar atestado médico
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
    v_profile_id UUID;
BEGIN
    -- Obter o user_id do usuário autenticado
    v_profile_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    -- Buscar o atestado primeiro para obter o company_id
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
    
    -- Verificar acesso do usuário à empresa e obter o profile_id correto
    SELECT uc.profile_id INTO v_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = v_certificate.company_id
      AND uc.ativo = true
    LIMIT 1;
    
    -- Se não encontrou o profile_id, tentar usar o user_id diretamente
    IF v_profile_id IS NULL THEN
        -- Verificar se o usuário tem acesso à empresa
        IF NOT EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = v_certificate.company_id
              AND uc.ativo = true
        ) THEN
            RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
        END IF;
        
        -- Se tem acesso mas não tem profile_id, usar o user_id diretamente
        v_profile_id := auth.uid();
    END IF;
    
    -- Atualizar o atestado usando o profile_id correto
    UPDATE rh.medical_certificates mc
    SET 
        status = 'rejeitado',
        aprovado_por = v_profile_id,  -- Usar o profile_id obtido de user_companies
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
'Aprova um atestado medico. Busca o profile_id correto da tabela user_companies para evitar erro de foreign key.';

COMMENT ON FUNCTION public.reject_medical_certificate(UUID, UUID, TEXT) IS 
'Rejeita um atestado medico. Busca o profile_id correto da tabela user_companies para evitar erro de foreign key.';

