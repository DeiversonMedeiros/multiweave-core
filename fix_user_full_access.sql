-- Script para dar acesso total ao usuário 1300f9f0-9290-46c6-b108-afb13443c271
-- Atualiza o perfil de "Gestor" para "Super Admin" em todas as empresas vinculadas

-- ID do perfil Super Admin
-- ID do perfil Gestor (atual)
-- ID do usuário

DO $$
DECLARE
    v_super_admin_profile_id UUID := '2242ce27-800c-494e-b7b9-c75cb832aa4d';
    v_gestor_profile_id UUID := 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e';
    v_user_id UUID := '1300f9f0-9290-46c6-b108-afb13443c271';
    v_updated_count INTEGER;
BEGIN
    -- Atualizar todos os vínculos do usuário de "Gestor" para "Super Admin"
    UPDATE public.user_companies
    SET profile_id = v_super_admin_profile_id
    WHERE user_id = v_user_id
    AND profile_id = v_gestor_profile_id
    AND ativo = true;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Atualizados % vínculos do usuário para Super Admin', v_updated_count;
    
    -- Verificar resultado
    IF v_updated_count > 0 THEN
        RAISE NOTICE '✅ Usuário agora tem acesso total ao sistema!';
    ELSE
        RAISE NOTICE '⚠️ Nenhum vínculo foi atualizado. Verifique se o usuário está vinculado ao perfil Gestor.';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    u.id as user_id,
    u.email,
    p.nome as perfil_nome,
    uc.company_id,
    uc.ativo,
    uc.created_at
FROM auth.users u
JOIN public.user_companies uc ON uc.user_id = u.id
JOIN public.profiles p ON p.id = uc.profile_id
WHERE u.id = '1300f9f0-9290-46c6-b108-afb13443c271'
ORDER BY uc.created_at DESC;

-- Verificar se agora é reconhecido como admin
SELECT 
    'is_admin' as funcao,
    is_admin('1300f9f0-9290-46c6-b108-afb13443c271') as resultado;

-- Verificar permissões do módulo portal_gestor
SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    p.nome as perfil
FROM public.module_permissions mp
JOIN public.user_companies uc ON uc.profile_id = mp.profile_id
JOIN public.profiles p ON p.id = mp.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271'
AND uc.ativo = true
AND mp.module_name = 'portal_gestor';

