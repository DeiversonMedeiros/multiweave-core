-- Teste direto da função is_admin
-- Vamos verificar se a função está retornando true para o usuário Super Admin

-- 1. Verificar o usuário e seu perfil
SELECT 
    u.id as user_id,
    u.nome,
    u.email,
    uc.profile_id,
    p.nome as profile_name,
    p.descricao,
    uc.ativo as user_company_active
FROM users u
JOIN user_companies uc ON u.id = uc.user_id
JOIN profiles p ON uc.profile_id = p.id
WHERE u.email = 'deiverson.medeiros@estrategicengenharia.com.br';

-- 2. Testar a função is_admin diretamente
SELECT is_admin('e745168f-addb-4456-a6fa-f4a336d874ac'::uuid) as is_admin_result;

-- 3. Verificar todos os perfis disponíveis
SELECT id, nome, descricao, is_active FROM profiles ORDER BY nome;

-- 4. Verificar se existe algum perfil com nome exato 'Super Admin'
SELECT * FROM profiles WHERE nome = 'Super Admin';

-- 5. Verificar a query que a função is_admin executa
SELECT 
    uc.user_id,
    p.nome as profile_name,
    uc.ativo
FROM user_companies uc
JOIN profiles p ON uc.profile_id = p.id
WHERE uc.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'::uuid
AND p.nome = 'Super Admin'
AND uc.ativo = true;
