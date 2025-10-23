-- Teste da função is_admin para o usuário atual
-- Vamos verificar se a função está funcionando corretamente

-- Primeiro, vamos ver o usuário atual e suas permissões
SELECT 
    u.id as user_id,
    u.nome,
    u.email,
    uc.profile_id,
    p.nome as profile_name,
    uc.ativo as user_company_active
FROM users u
JOIN user_companies uc ON u.id = uc.user_id
JOIN profiles p ON uc.profile_id = p.id
WHERE u.email = 'deiverson.medeiros@estrategicengenharia.com.br';

-- Testar a função is_admin diretamente
SELECT is_admin('e745168f-addb-4456-a6fa-f4a336d874ac'::uuid) as is_admin_result;

-- Verificar se existe o perfil "Super Admin"
SELECT * FROM profiles WHERE nome = 'Super Admin';

-- Verificar as permissões do usuário
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM entity_permissions ep
JOIN user_companies uc ON ep.profile_id = uc.profile_id
WHERE uc.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'::uuid
AND ep.entity_name = 'users';
