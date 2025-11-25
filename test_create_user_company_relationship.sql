-- =====================================================
-- TESTE: create_user_company_relationship
-- =====================================================
-- Execute este script para testar a função RPC diretamente
-- Substitua os UUIDs pelos valores reais do seu banco

-- 1. Verificar se a função existe e está acessível
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_user_company_relationship';

-- 2. Testar a função com dados de exemplo
-- IMPORTANTE: Substitua os UUIDs pelos valores reais antes de executar
/*
DO $$
DECLARE
  v_user_id UUID := 'USER_ID_AQUI'::UUID;  -- Substitua por um ID de usuário existente em auth.users
  v_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6'::UUID;  -- ID da empresa Axiseng
  v_profile_id UUID := 'cab40b7d-efca-4778-ad7a-528463c338ad'::UUID;  -- ID do perfil Teste Perfil
  v_result RECORD;
BEGIN
  RAISE NOTICE 'Testando create_user_company_relationship...';
  RAISE NOTICE 'Parâmetros: user_id=%, company_id=%, profile_id=%', v_user_id, v_company_id, v_profile_id;
  
  -- Chamar a função
  SELECT * INTO v_result
  FROM create_user_company_relationship(v_user_id, v_company_id, v_profile_id);
  
  RAISE NOTICE 'Resultado: id=%, user_id=%, company_id=%, profile_id=%', 
    v_result.id, v_result.user_id, v_result.company_id, v_result.profile_id;
  
  RAISE NOTICE 'Teste concluído com sucesso!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO: %', SQLERRM;
  RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;
*/

-- 3. Verificar se há algum relacionamento existente
SELECT 
    uc.id,
    uc.user_id,
    uc.company_id,
    uc.profile_id,
    uc.ativo,
    u.email AS user_email,
    c.razao_social AS company_name,
    p.nome AS profile_name
FROM public.user_companies uc
LEFT JOIN public.users u ON uc.user_id = u.id
LEFT JOIN public.companies c ON uc.company_id = c.id
LEFT JOIN public.profiles p ON uc.profile_id = p.id
ORDER BY uc.created_at DESC
LIMIT 5;

-- 4. Verificar se há usuários órfãos (criados mas sem relacionamento)
SELECT 
    u.id,
    u.email,
    u.nome,
    u.created_at,
    (SELECT COUNT(*) FROM public.user_companies uc WHERE uc.user_id = u.id) AS relacionamentos_count
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_companies uc WHERE uc.user_id = u.id
)
ORDER BY u.created_at DESC
LIMIT 10;

