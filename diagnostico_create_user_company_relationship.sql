-- =====================================================
-- DIAGNÓSTICO: create_user_company_relationship
-- =====================================================
-- Execute estas queries no Supabase SQL Editor para diagnosticar o problema

-- 1. VERIFICAR SE A FUNÇÃO EXISTE
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_user_company_relationship';

-- 2. VERIFICAR PERMISSÕES DA FUNÇÃO
SELECT 
    p.proname AS function_name,
    r.rolname AS role,
    has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.proname = 'create_user_company_relationship'
  AND r.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY r.rolname;

-- 3. VERIFICAR ESTRUTURA DA TABELA user_companies
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_companies'
ORDER BY ordinal_position;

-- 4. VERIFICAR CONSTRAINTS E ÍNDICES DA TABELA user_companies
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.user_companies'::regclass;

-- 5. VERIFICAR SE EXISTEM DADOS DE TESTE (últimos usuários criados)
SELECT 
    u.id,
    u.nome,
    u.email,
    u.company_id,
    u.created_at
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. VERIFICAR ÚLTIMOS RELACIONAMENTOS CRIADOS
SELECT 
    uc.id,
    uc.user_id,
    uc.company_id,
    uc.profile_id,
    uc.ativo,
    uc.created_at,
    u.nome AS user_nome,
    c.razao_social AS company_nome,
    p.nome AS profile_nome
FROM public.user_companies uc
LEFT JOIN public.users u ON uc.user_id = u.id
LEFT JOIN public.companies c ON uc.company_id = c.id
LEFT JOIN public.profiles p ON uc.profile_id = p.id
ORDER BY uc.created_at DESC
LIMIT 10;

-- 7. VERIFICAR EMPRESAS DISPONÍVEIS
SELECT 
    id,
    razao_social,
    nome_fantasia,
    cnpj,
    ativo
FROM public.companies
ORDER BY razao_social;

-- 8. VERIFICAR PERFIS DISPONÍVEIS
SELECT 
    id,
    nome,
    descricao,
    created_at
FROM public.profiles
ORDER BY nome;

-- 9. TESTAR A FUNÇÃO MANUALMENTE (SUBSTITUA OS UUIDs pelos valores reais)
-- IMPORTANTE: Execute apenas após verificar que os UUIDs existem nas queries acima
/*
SELECT * FROM public.create_user_company_relationship(
    'USER_ID_AQUI'::UUID,  -- Substitua pelo ID de um usuário existente em auth.users
    'COMPANY_ID_AQUI'::UUID,  -- Substitua pelo ID de uma empresa existente
    'PROFILE_ID_AQUI'::UUID   -- Substitua pelo ID de um perfil existente
);
*/

-- 10. VERIFICAR SE HÁ TRIGGERS NA TABELA user_companies QUE PODEM ESTAR BLOQUEANDO
SELECT 
    tgname AS trigger_name,
    tgtype::text AS trigger_type,
    tgenabled AS is_enabled,
    pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.user_companies'::regclass;

-- 11. VERIFICAR POLÍTICAS RLS NA TABELA user_companies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_companies';

-- 12. VERIFICAR SE A TABELA user_companies TEM RLS HABILITADO
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_companies';

-- 13. VERIFICAR LOGS DE ERRO RECENTES (se disponível)
-- Nota: Isso pode não estar disponível dependendo da configuração do Supabase
SELECT 
    event_time,
    error_severity,
    message
FROM pg_stat_statements
WHERE query LIKE '%create_user_company_relationship%'
ORDER BY event_time DESC
LIMIT 10;

-- 14. VERIFICAR SE O USUÁRIO RECÉM-CRIADO EXISTE EM auth.users
-- (Execute após tentar criar um usuário e falhar)
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 15. VERIFICAR SE O TRIGGER handle_new_user ESTÁ FUNCIONANDO
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgenabled AS is_enabled,
    pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 16. TESTAR INSERÇÃO DIRETA NA TABELA user_companies (para verificar se há problemas de RLS)
-- IMPORTANTE: Execute apenas se tiver certeza dos valores
/*
INSERT INTO public.user_companies (
    user_id,
    company_id,
    profile_id,
    ativo,
    created_at,
    updated_at
)
VALUES (
    'USER_ID_AQUI'::UUID,
    'COMPANY_ID_AQUI'::UUID,
    'PROFILE_ID_AQUI'::UUID,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (user_id, company_id) DO NOTHING
RETURNING *;
*/

