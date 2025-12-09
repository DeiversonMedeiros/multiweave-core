-- Script detalhado para verificar permissões do usuário 1300f9f0-9290-46c6-b108-afb13443c271
-- Portal do Gestor

\echo '=== 1. DADOS BÁSICOS DO USUÁRIO ==='
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

\echo ''
\echo '=== 2. VERIFICAÇÃO DE ADMIN ==='
SELECT 
    'is_admin' as funcao,
    is_admin('1300f9f0-9290-46c6-b108-afb13443c271') as resultado;

\echo ''
\echo '=== 3. PERMISSÕES DO MÓDULO PORTAL_GESTOR ==='
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

\echo ''
\echo '=== 4. TODAS AS PERMISSÕES DE MÓDULOS ==='
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

\echo ''
\echo '=== 5. TODAS AS PERMISSÕES DE ENTIDADES ==='
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

\echo ''
\echo '=== 6. MÓDULOS SEM ACESSO TOTAL ==='
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

\echo ''
\echo '=== 7. ENTIDADES SEM ACESSO TOTAL ==='
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

\echo ''
\echo '=== 8. PERFIS DISPONÍVEIS (Super Admin, Administrador, Gestor) ==='
SELECT 
    id,
    nome,
    descricao,
    created_at
FROM public.profiles
WHERE nome IN ('Super Admin', 'Administrador', 'Gestor', 'Portal Gestor')
ORDER BY nome;

\echo ''
\echo '=== 9. TODOS OS VÍNCULOS DO USUÁRIO ==='
SELECT 
    uc.id,
    uc.company_id,
    p.nome as perfil,
    uc.ativo,
    uc.created_at
FROM public.user_companies uc
JOIN public.profiles p ON p.id = uc.profile_id
WHERE uc.user_id = '1300f9f0-9290-46c6-b108-afb13443c271';

