-- =====================================================
-- MIGRAÇÃO: Alterar aprovado_por de profiles para users
-- =====================================================
-- Data: 2026-01-23
-- Descrição: Altera a foreign key do campo aprovado_por na tabela
--            rh.medical_certificates para referenciar users(id) 
--            ao invés de profiles(id)
-- =====================================================

-- Remover a foreign key antiga que referencia profiles
ALTER TABLE rh.medical_certificates
DROP CONSTRAINT IF EXISTS medical_certificates_aprovado_por_fkey;

-- Migrar dados existentes: converter profile_id para user_id
-- Se o aprovado_por for um profile_id, tentar encontrar o user_id correspondente
-- através da tabela user_companies (que relaciona user_id com profile_id)
UPDATE rh.medical_certificates mc
SET aprovado_por = (
    SELECT uc.user_id
    FROM public.user_companies uc
    WHERE uc.profile_id = mc.aprovado_por
      AND uc.ativo = true
    LIMIT 1
)
WHERE mc.aprovado_por IS NOT NULL
  AND EXISTS (
      SELECT 1 
      FROM public.user_companies uc 
      WHERE uc.profile_id = mc.aprovado_por
  )
  AND NOT EXISTS (
      SELECT 1 
      FROM public.users u 
      WHERE u.id = mc.aprovado_por
  );

-- Se ainda houver registros com profile_id que não foram convertidos,
-- definir como NULL (não podemos manter referências inválidas)
UPDATE rh.medical_certificates
SET aprovado_por = NULL
WHERE aprovado_por IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM public.users u 
      WHERE u.id = aprovado_por
  );

-- Adicionar nova foreign key que referencia users
ALTER TABLE rh.medical_certificates
ADD CONSTRAINT medical_certificates_aprovado_por_fkey 
FOREIGN KEY (aprovado_por) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Atualizar as funções de aprovação para usar users diretamente
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
    v_user_id UUID;
BEGIN
    -- Obter o user_id do usuário autenticado
    v_user_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF v_user_id IS NULL THEN
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
    
    -- Verificar acesso do usuário à empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = v_user_id
          AND uc.company_id = v_certificate.company_id
          AND uc.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
    END IF;
    
    -- Atualizar o atestado usando o user_id diretamente
    UPDATE rh.medical_certificates mc
    SET 
        status = 'aprovado',
        aprovado_por = v_user_id,  -- Usar o user_id diretamente
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

-- Atualizar função de rejeição
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
    v_user_id UUID;
BEGIN
    -- Obter o user_id do usuário autenticado
    v_user_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF v_user_id IS NULL THEN
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
    
    -- Verificar acesso do usuário à empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = v_user_id
          AND uc.company_id = v_certificate.company_id
          AND uc.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
    END IF;
    
    -- Atualizar o atestado usando o user_id diretamente
    UPDATE rh.medical_certificates mc
    SET 
        status = 'rejeitado',
        aprovado_por = v_user_id,  -- Usar o user_id diretamente
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
'Aprova um atestado medico. Usa o user_id diretamente da tabela users.';

COMMENT ON FUNCTION public.reject_medical_certificate(UUID, UUID, TEXT) IS 
'Rejeita um atestado medico. Usa o user_id diretamente da tabela users.';

-- Comentário na coluna
COMMENT ON COLUMN rh.medical_certificates.aprovado_por IS 
'ID do usuário que aprovou o atestado (referencia users.id)';
