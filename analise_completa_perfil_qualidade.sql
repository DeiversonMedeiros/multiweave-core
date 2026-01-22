-- =====================================================
-- ANÁLISE COMPLETA: Perfil "Gestor Qualidade"
-- Execute no SQL Editor do Supabase Dashboard
-- =====================================================

-- =====================================================
-- 1. BUSCAR PERFIL "GESTOR QUALIDADE"
-- =====================================================
SELECT 
    id,
    nome,
    is_active,
    created_at,
    updated_at
FROM profiles
WHERE nome ILIKE '%qualidade%' OR nome ILIKE '%gestor%qualidade%'
ORDER BY nome;

-- =====================================================
-- 2. PERMISSÕES DE MÓDULOS DO PERFIL
-- =====================================================
SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    p.nome as perfil_nome
FROM module_permissions mp
JOIN profiles p ON p.id = mp.profile_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%'
ORDER BY mp.module_name;

-- =====================================================
-- 3. VERIFICAR ESPECIFICAMENTE PERMISSÃO NO MÓDULO RH
-- =====================================================
SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    p.nome as perfil_nome,
    CASE 
        WHEN mp.can_read = true AND mp.module_name = 'rh' THEN '⚠️ PROBLEMA: Tem acesso ao módulo RH completo'
        ELSE '✅ OK'
    END as status
FROM module_permissions mp
JOIN profiles p ON p.id = mp.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%')
  AND (mp.module_name = 'rh' OR mp.module_name = 'treinamento')
ORDER BY mp.module_name;

-- =====================================================
-- 4. PERMISSÕES DE ENTIDADES DO PERFIL
-- =====================================================
SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil_nome
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%'
ORDER BY ep.entity_name;

-- =====================================================
-- 5. ENTIDADES DE TREINAMENTO (CRÍTICO)
-- =====================================================
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil_nome,
    CASE 
        WHEN ep.entity_name = 'treinamentos' THEN '✅ CORRETO (português)'
        WHEN ep.entity_name = 'trainings' THEN '⚠️ INCONSISTENTE (inglês)'
        WHEN ep.entity_name = 'training' THEN '⚠️ INCONSISTENTE (singular)'
        ELSE '❓ DESCONHECIDO'
    END as status_nome
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%')
  AND (ep.entity_name ILIKE '%trein%' OR ep.entity_name ILIKE '%training%')
ORDER BY ep.entity_name;

-- =====================================================
-- 6. TODAS AS ENTIDADES "TREINAMENTO" NO BANCO (para identificar inconsistências)
-- =====================================================
SELECT DISTINCT 
    entity_name,
    COUNT(*) as total_permissoes,
    COUNT(DISTINCT profile_id) as perfis_com_essa_entidade
FROM entity_permissions
WHERE entity_name ILIKE '%trein%' OR entity_name ILIKE '%training%'
GROUP BY entity_name
ORDER BY entity_name;

-- =====================================================
-- 7. ENTIDADES DO MÓDULO RH (para comparar)
-- =====================================================
SELECT DISTINCT 
    entity_name,
    COUNT(*) as total_permissoes
FROM entity_permissions
WHERE entity_name IN (
    'employees', 'funcionarios',
    'positions', 'cargos',
    'units', 'unidades',
    'trainings', 'treinamentos', 'training',
    'time_records', 'registros_ponto',
    'vacations', 'ferias',
    'periodic_exams', 'exames_periodicos',
    'disciplinary_actions', 'acoes_disciplinares'
)
GROUP BY entity_name
ORDER BY entity_name;

-- =====================================================
-- 8. VERIFICAR ENTIDADES DO RH QUE O PERFIL TEM ACESSO
-- =====================================================
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil_nome,
    CASE 
        WHEN ep.entity_name IN ('employees', 'funcionarios') THEN '🚫 Não deveria ter acesso'
        WHEN ep.entity_name IN ('positions', 'cargos') THEN '🚫 Não deveria ter acesso'
        WHEN ep.entity_name IN ('units', 'unidades') THEN '🚫 Não deveria ter acesso'
        WHEN ep.entity_name IN ('trainings', 'treinamentos') THEN '✅ CORRETO - Deve ter acesso'
        ELSE '⚠️ Verificar'
    END as status
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%')
  AND ep.entity_name IN (
    'employees', 'funcionarios',
    'positions', 'cargos',
    'units', 'unidades',
    'trainings', 'treinamentos', 'training',
    'time_records', 'registros_ponto',
    'vacations', 'ferias'
  )
ORDER BY ep.entity_name;

-- =====================================================
-- 9. USUÁRIOS VINCULADOS AO PERFIL
-- =====================================================
SELECT 
    u.id as user_id,
    u.email,
    uc.company_id,
    uc.ativo as usuario_ativo,
    p.nome as perfil_nome,
    p.id as profile_id,
    c.razao_social as empresa
FROM auth.users u
JOIN user_companies uc ON uc.user_id = u.id
JOIN profiles p ON p.id = uc.profile_id
LEFT JOIN companies c ON c.id = uc.company_id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%'
ORDER BY u.email;

-- =====================================================
-- 10. RESUMO COMPLETO DAS PERMISSÕES
-- =====================================================
SELECT 
    p.id as profile_id,
    p.nome as perfil_nome,
    COUNT(DISTINCT mp.module_name) as total_modulos,
    COUNT(DISTINCT CASE WHEN mp.module_name = 'rh' AND mp.can_read THEN 'rh' END) as tem_acesso_rh,
    COUNT(DISTINCT ep.entity_name) as total_entidades,
    COUNT(DISTINCT CASE WHEN ep.entity_name IN ('treinamentos', 'trainings', 'training') AND ep.can_read THEN ep.entity_name END) as tem_acesso_treinamento,
    COUNT(DISTINCT CASE WHEN ep.entity_name IN ('employees', 'funcionarios', 'positions', 'cargos', 'units', 'unidades') AND ep.can_read THEN ep.entity_name END) as tem_acesso_outras_entidades_rh
FROM profiles p
LEFT JOIN module_permissions mp ON mp.profile_id = p.id
LEFT JOIN entity_permissions ep ON ep.profile_id = p.id
WHERE p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%'
GROUP BY p.id, p.nome;

-- =====================================================
-- 11. DIAGNÓSTICO DO PROBLEMA
-- =====================================================
WITH perfil_info AS (
    SELECT id, nome FROM profiles 
    WHERE nome ILIKE '%qualidade%' OR nome ILIKE '%gestor%qualidade%'
    LIMIT 1
),
modulo_rh AS (
    SELECT COUNT(*) > 0 as tem_permissao_modulo_rh
    FROM module_permissions mp
    JOIN perfil_info pi ON pi.id = mp.profile_id
    WHERE mp.module_name = 'rh' AND mp.can_read = true
),
entidade_treinamento AS (
    SELECT COUNT(*) > 0 as tem_permissao_entidade
    FROM entity_permissions ep
    JOIN perfil_info pi ON pi.id = ep.profile_id
    WHERE ep.entity_name IN ('treinamentos', 'trainings', 'training') AND ep.can_read = true
),
outras_entidades_rh AS (
    SELECT COUNT(*) as total
    FROM entity_permissions ep
    JOIN perfil_info pi ON pi.id = ep.profile_id
    WHERE ep.entity_name IN ('employees', 'funcionarios', 'positions', 'cargos', 'units', 'unidades') 
      AND ep.can_read = true
)
SELECT 
    (SELECT nome FROM perfil_info) as perfil,
    (SELECT tem_permissao_modulo_rh FROM modulo_rh) as "Tem permissão módulo RH?",
    (SELECT tem_permissao_entidade FROM entidade_treinamento) as "Tem permissão entidade treinamento?",
    (SELECT total FROM outras_entidades_rh) as "Outras entidades RH com acesso",
    CASE 
        WHEN (SELECT tem_permissao_modulo_rh FROM modulo_rh) = true 
         AND (SELECT total FROM outras_entidades_rh) = 0 
         AND (SELECT tem_permissao_entidade FROM entidade_treinamento) = true
        THEN '🚨 PROBLEMA: Tem acesso ao módulo RH completo, permitindo ver todas as páginas mesmo sem permissão nas entidades específicas'
        WHEN (SELECT tem_permissao_modulo_rh FROM modulo_rh) = false 
         AND (SELECT tem_permissao_entidade FROM entidade_treinamento) = true
        THEN '✅ CORRETO: Só tem acesso à entidade treinamento'
        ELSE '⚠️ Verificar configuração'
    END as diagnostico;
