-- =====================================================
-- SCRIPT DE CORREÇÃO: Perfil "Gestor Qualidade"
-- Data: 2026-01-16
-- =====================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- O perfil "Gestor Qualidade" tem permissão de MÓDULO "rh",
-- o que permite ver TODAS as páginas do módulo RH.
-- 
-- As páginas de treinamento usam RequireEntity com "treinamentos" (português),
-- mas o perfil tem permissão para "trainings" (inglês).
--
-- SOLUÇÃO:
-- 1. Remover permissão de MÓDULO "rh"
-- 2. Padronizar permissão de ENTIDADE para "treinamentos" (português)
-- 3. Remover permissões de entidades desnecessárias
-- =====================================================

-- ID do perfil "Gestor Qualidade"
-- 3759c8b5-15d7-4a13-b721-65f1f5c6be22

-- =====================================================
-- PASSO 1: Remover permissão do módulo RH
-- (Isso evita que o usuário veja todas as páginas do RH)
-- =====================================================
DELETE FROM module_permissions 
WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22' 
  AND module_name = 'rh';

-- =====================================================
-- PASSO 2: Padronizar nome da entidade para 'treinamentos' (português)
-- As páginas usam "treinamentos", não "trainings"
-- =====================================================

-- Primeiro, atualizar "trainings" para "treinamentos" se existir
UPDATE entity_permissions
SET entity_name = 'treinamentos'
WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22'
  AND entity_name = 'trainings';

-- Garantir que existe permissão para "treinamentos" com as mesmas permissões
-- Se não existir, criar uma nova
INSERT INTO entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
SELECT 
    '3759c8b5-15d7-4a13-b721-65f1f5c6be22'::uuid as profile_id,
    'treinamentos' as entity_name,
    true as can_read,
    true as can_create,
    true as can_edit,
    false as can_delete
WHERE NOT EXISTS (
    SELECT 1 FROM entity_permissions 
    WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22'::uuid 
      AND entity_name = 'treinamentos'
);

-- Se já existir, atualizar as permissões para garantir que estão corretas
UPDATE entity_permissions
SET 
    can_read = true,
    can_create = true,
    can_edit = true,
    can_delete = false,
    updated_at = NOW()
WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22'::uuid 
  AND entity_name = 'treinamentos';

-- =====================================================
-- PASSO 3: Remover permissões de outras entidades desnecessárias
-- Manter apenas as permissões de treinamento e portais
-- =====================================================
DELETE FROM entity_permissions
WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22'
  AND entity_name IN (
    'approval_center',
    'registros_ponto',
    'time_records'
  );

-- =====================================================
-- PASSO 4: Verificar resultado final
-- =====================================================
SELECT 
    '=== PERMISSÕES DE MÓDULO ===' as tipo;

SELECT 
    'Módulos' as tipo,
    module_name as nome,
    can_read,
    can_create,
    can_edit,
    can_delete
FROM module_permissions
WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22'
ORDER BY module_name;

SELECT 
    '' as separador;

SELECT 
    '=== PERMISSÕES DE ENTIDADE ===' as tipo;

SELECT 
    'Entidades' as tipo,
    entity_name as nome,
    can_read,
    can_create,
    can_edit,
    can_delete
FROM entity_permissions
WHERE profile_id = '3759c8b5-15d7-4a13-b721-65f1f5c6be22'
ORDER BY entity_name;

-- =====================================================
-- RESUMO DA CORREÇÃO:
-- ✅ Removida permissão de módulo "rh"
-- ✅ Padronizada entidade para "treinamentos" (português)
-- ✅ Removidas permissões de entidades desnecessárias
-- 
-- RESULTADO ESPERADO:
-- - Usuário só consegue acessar páginas de treinamento
-- - Não consegue acessar outras páginas do módulo RH
-- =====================================================
