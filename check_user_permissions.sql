-- Script para verificar permissões do usuário 1300f9f0-9290-46c6-b108-afb13443c271
-- Portal do Gestor

-- 1. Verificar dados básicos do usuário
SELECT 
    u.id,
    u.email,
    p.nome as perfil_nome,
    p.id as profile_id,
    uc.company_id,
    uc.ativo as user_company_ativo,
    uc.created_at as vinculado_em
FROM auth.users u
LEFT JOIN public.user_companies uc ON uc.user_id = u.id
LEFT JOIN public.profiles p ON p.id = uc.profile_id
WHERE u.id = '1300f9f0-9290-46c6-b108-afb13443c271';

-- 2. Verificar se é reconhecido como admin
SELECT 
    'is_admin' as funcao,
    is_admin('1300f9f0-9290-46c6-b108-afb13443c271') as resultado;

-- 3. Verificar permissões de módulos
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
ORDER BY mp.module_name;

-- 4. Verificar permissões de entidades
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil
FROM public.entity_permissions ep
JOIN public.user_companies uc ON uc.profile_id = ep.profile_id
JOIN public.profiles p ON p.id = ep.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271'
AND uc.ativo = true
ORDER BY ep.entity_name;

-- 5. Verificar total de módulos no sistema
SELECT 
    COUNT(DISTINCT module_name) as total_modulos,
    COUNT(*) as total_permissoes
FROM public.module_permissions;

-- 6. Verificar total de entidades no sistema
SELECT 
    COUNT(DISTINCT entity_name) as total_entidades,
    COUNT(*) as total_permissoes
FROM public.entity_permissions;

-- 7. Verificar quantos módulos o usuário tem acesso total (todas as permissões)
SELECT 
    COUNT(*) as modulos_com_acesso_total
FROM public.module_permissions mp
JOIN public.user_companies uc ON uc.profile_id = mp.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271'
AND uc.ativo = true
AND mp.can_read = true
AND mp.can_create = true
AND mp.can_edit = true
AND mp.can_delete = true;

-- 8. Verificar quantas entidades o usuário tem acesso total
SELECT 
    COUNT(*) as entidades_com_acesso_total
FROM public.entity_permissions ep
JOIN public.user_companies uc ON uc.profile_id = ep.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271'
AND uc.ativo = true
AND ep.can_read = true
AND ep.can_create = true
AND ep.can_edit = true
AND ep.can_delete = true;

-- 9. Verificar módulos que o usuário NÃO tem acesso total
SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete
FROM public.module_permissions mp
JOIN public.user_companies uc ON uc.profile_id = mp.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271'
AND uc.ativo = true
AND NOT (mp.can_read = true AND mp.can_create = true AND mp.can_edit = true AND mp.can_delete = true)
ORDER BY mp.module_name;

-- 10. Verificar entidades que o usuário NÃO tem acesso total
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM public.entity_permissions ep
JOIN public.user_companies uc ON uc.profile_id = ep.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271'
AND uc.ativo = true
AND NOT (ep.can_read = true AND ep.can_create = true AND ep.can_edit = true AND ep.can_delete = true)
ORDER BY ep.entity_name;

-- 11. Verificar se há múltiplos perfis vinculados
SELECT 
    uc.id,
    uc.company_id,
    p.nome as perfil,
    uc.ativo,
    uc.created_at
FROM public.user_companies uc
JOIN public.profiles p ON p.id = uc.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271';

-- 12. Verificar perfil "Super Admin" e "Administrador"
SELECT 
    id,
    nome,
    descricao,
    created_at
FROM public.profiles
WHERE nome IN ('Super Admin', 'Administrador', 'Gestor', 'Portal Gestor')
ORDER BY nome;

