-- =====================================================
-- ANÁLISE COMPLETA: Perfil "Gestor Qualidade"
-- =====================================================

-- 1. BUSCAR PERFIL "GESTOR QUALIDADE"
SELECT 
    id,
    nome,
    descricao,
    is_active,
    created_at
FROM profiles
WHERE nome ILIKE '%qualidade%' OR nome ILIKE '%gestor qualidade%'
ORDER BY created_at DESC;

-- 2. VERIFICAR PERMISSÕES DE MÓDULO DO PERFIL
SELECT 
    mp.id,
    mp.profile_id,
    p.nome as perfil_nome,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete
FROM module_permissions mp
JOIN profiles p ON p.id = mp.profile_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%'
ORDER BY mp.module_name;

-- 3. VERIFICAR PERMISSÕES DE ENTIDADE DO PERFIL
SELECT 
    ep.id,
    ep.profile_id,
    p.nome as perfil_nome,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%'
ORDER BY ep.entity_name;

-- 4. VERIFICAR USUÁRIOS COM ESTE PERFIL
SELECT 
    uc.id,
    uc.user_id,
    u.email,
    uc.company_id,
    c.nome as empresa_nome,
    uc.profile_id,
    p.nome as perfil_nome,
    uc.ativo
FROM user_companies uc
JOIN profiles p ON p.id = uc.profile_id
JOIN auth.users u ON u.id = uc.user_id
LEFT JOIN companies c ON c.id = uc.company_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%';

-- 5. VERIFICAR TODAS AS ENTIDADES RELACIONADAS A TREINAMENTO
SELECT DISTINCT entity_name
FROM entity_permissions
WHERE entity_name ILIKE '%trein%' OR entity_name ILIKE '%train%'
ORDER BY entity_name;
