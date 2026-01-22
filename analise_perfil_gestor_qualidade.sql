-- =====================================================
-- ANÁLISE COMPLETA: Perfil "Gestor Qualidade"
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Buscar perfil "Gestor Qualidade"
SELECT 
    id,
    nome,
    is_active,
    created_at,
    updated_at
FROM profiles
WHERE nome ILIKE '%qualidade%' OR nome ILIKE '%gestor qualidade%'
ORDER BY nome;

-- 2. Verificar permissões de MÓDULOS do perfil
-- Substitua <PROFILE_ID> pelo ID encontrado na query acima
\echo ''
\echo '=== PERMISSÕES DE MÓDULOS ==='
SELECT 
    mp.id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    p.nome as perfil_nome
FROM module_permissions mp
JOIN profiles p ON p.id = mp.profile_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%'
ORDER BY mp.module_name;

-- 3. Verificar permissões de ENTIDADES do perfil
\echo ''
\echo '=== PERMISSÕES DE ENTIDADES ==='
SELECT 
    ep.id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil_nome
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%'
ORDER BY ep.entity_name;

-- 4. Verificar especificamente entidades relacionadas a treinamento
\echo ''
\echo '=== ENTIDADES DE TREINAMENTO ==='
SELECT 
    ep.id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil_nome
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%')
  AND (ep.entity_name ILIKE '%trein%' OR ep.entity_name ILIKE '%training%')
ORDER BY ep.entity_name;

-- 5. Verificar TODAS as entidades relacionadas a treinamento no banco
\echo ''
\echo '=== TODAS AS ENTIDADES "TREINAMENTO" NO BANCO ==='
SELECT DISTINCT 
    entity_name,
    COUNT(*) as total_permissoes
FROM entity_permissions
WHERE entity_name ILIKE '%trein%' OR entity_name ILIKE '%training%'
GROUP BY entity_name
ORDER BY entity_name;

-- 6. Verificar entidades do módulo RH para comparar
\echo ''
\echo '=== ENTIDADES COMUNS DO MÓDULO RH ==='
SELECT DISTINCT 
    entity_name,
    COUNT(*) as total_permissoes
FROM entity_permissions
WHERE entity_name IN (
    'employees', 'funcionarios',
    'positions', 'cargos',
    'units', 'unidades',
    'trainings', 'treinamentos',
    'time_records', 'registros_ponto',
    'vacations', 'ferias',
    'periodic_exams', 'exames_periodicos',
    'disciplinary_actions', 'acoes_disciplinares'
)
GROUP BY entity_name
ORDER BY entity_name;

-- 7. Verificar usuários vinculados ao perfil
\echo ''
\echo '=== USUÁRIOS VINCULADOS AO PERFIL ==='
SELECT 
    u.id as user_id,
    u.email,
    uc.company_id,
    uc.ativo,
    p.nome as perfil_nome,
    c.razao_social as empresa
FROM auth.users u
JOIN user_companies uc ON uc.user_id = u.id
JOIN profiles p ON p.id = uc.profile_id
LEFT JOIN companies c ON c.id = uc.company_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%'
ORDER BY u.email;

-- 8. Verificar se o perfil tem permissão no módulo RH
\echo ''
\echo '=== PERMISSÃO NO MÓDULO RH ==='
SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    p.nome as perfil_nome
FROM module_permissions mp
JOIN profiles p ON p.id = mp.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%')
  AND (mp.module_name = 'rh' OR mp.module_name = 'treinamento')
ORDER BY mp.module_name;

-- 9. Resumo: Total de permissões por tipo
\echo ''
\echo '=== RESUMO DE PERMISSÕES ==='
SELECT 
    p.nome as perfil_nome,
    COUNT(DISTINCT mp.module_name) as total_modulos,
    COUNT(DISTINCT CASE WHEN mp.can_read THEN mp.module_name END) as modulos_read,
    COUNT(DISTINCT CASE WHEN mp.can_create THEN mp.module_name END) as modulos_create,
    COUNT(DISTINCT ep.entity_name) as total_entidades,
    COUNT(DISTINCT CASE WHEN ep.can_read THEN ep.entity_name END) as entidades_read,
    COUNT(DISTINCT CASE WHEN ep.can_create THEN ep.entity_name END) as entidades_create
FROM profiles p
LEFT JOIN module_permissions mp ON mp.profile_id = p.id
LEFT JOIN entity_permissions ep ON ep.profile_id = p.id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor qualidade%'
GROUP BY p.id, p.nome;
