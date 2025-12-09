-- Script para atualizar permissões do perfil "Gestor"
-- Dar acesso total aos módulos portal_gestor e portal_colaborador
-- E todas as entidades relacionadas

DO $$
DECLARE
    v_gestor_profile_id UUID := 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e';
    v_super_admin_profile_id UUID := '2242ce27-800c-494e-b7b9-c75cb832aa4d';
    v_user_id UUID := '1300f9f0-9290-46c6-b108-afb13443c271';
    v_updated_count INTEGER;
BEGIN
    -- 1. Reverter o perfil do usuário de volta para "Gestor"
    UPDATE public.user_companies
    SET profile_id = v_gestor_profile_id
    WHERE user_id = v_user_id
    AND profile_id = v_super_admin_profile_id
    AND ativo = true;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Revertidos % vínculos do usuário para Gestor', v_updated_count;
    
    -- 2. Atualizar permissões do módulo portal_gestor para acesso total
    UPDATE public.module_permissions
    SET can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = true
    WHERE profile_id = v_gestor_profile_id
    AND module_name = 'portal_gestor';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Atualizadas % permissões do módulo portal_gestor', v_updated_count;
    
    -- 3. Atualizar permissões do módulo portal_colaborador para acesso total
    UPDATE public.module_permissions
    SET can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = true
    WHERE profile_id = v_gestor_profile_id
    AND module_name = 'portal_colaborador';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Atualizadas % permissões do módulo portal_colaborador', v_updated_count;
    
    -- 4. Atualizar permissões de entidades relacionadas aos portais
    -- Entidades do portal do gestor e colaborador
    UPDATE public.entity_permissions
    SET can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = true
    WHERE profile_id = v_gestor_profile_id
    AND entity_name IN (
        -- Entidades básicas dos portais
        'aprovacoes',
        'aprovacoes_compra',
        'registros_ponto',
        'time_records',
        'vacations',
        'ferias',
        'reimbursement_requests',
        'reembolsos',
        'exames_periodicos',
        'periodic_exams',
        'disciplinary_actions',
        'acoes_disciplinares',
        'employees',
        'funcionarios',
        'cargos',
        'income_statements',
        -- Entidades específicas das páginas do portal gestor
        'time_tracking_management',
        'vacation_approvals',
        'exam_management',
        'approval_center',
        'approvals',
        'approval_configs',
        'manager_dashboard',
        -- Entidade do portal colaborador
        'portal_colaborador'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Atualizadas % permissões de entidades relacionadas aos portais', v_updated_count;
    
    RAISE NOTICE '✅ Permissões do perfil Gestor atualizadas com sucesso!';
END $$;

-- Verificar resultado - perfil do usuário
SELECT 
    u.id,
    u.email,
    p.nome as perfil_nome,
    uc.company_id,
    uc.ativo
FROM auth.users u
JOIN public.user_companies uc ON uc.user_id = u.id
JOIN public.profiles p ON p.id = uc.profile_id
WHERE u.id = '1300f9f0-9290-46c6-b108-afb13443c271';

-- Verificar permissões dos módulos portal_gestor e portal_colaborador
SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    p.nome as perfil
FROM public.module_permissions mp
JOIN public.profiles p ON p.id = mp.profile_id
WHERE p.id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e'
AND mp.module_name IN ('portal_gestor', 'portal_colaborador')
ORDER BY mp.module_name;

-- Verificar permissões de entidades relacionadas
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM public.entity_permissions ep
WHERE ep.profile_id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e'
AND ep.entity_name IN (
    'aprovacoes',
    'aprovacoes_compra',
    'registros_ponto',
    'time_records',
    'vacations',
    'ferias',
    'reimbursement_requests',
    'reembolsos',
    'exames_periodicos',
    'periodic_exams',
    'disciplinary_actions',
    'acoes_disciplinares',
    'employees',
    'funcionarios',
    'cargos',
    'income_statements'
)
ORDER BY ep.entity_name;

