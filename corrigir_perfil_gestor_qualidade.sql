-- =====================================================
-- SCRIPT DE CORREÇÃO: Perfil "Gestor Qualidade"
-- Execute APENAS após analisar os resultados da análise
-- =====================================================

-- IMPORTANTE: Substitua <PROFILE_ID> pelo ID real do perfil encontrado na análise
-- Para encontrar o ID, execute primeiro: analise_completa_perfil_qualidade.sql

-- =====================================================
-- PASSO 1: Remover permissão do módulo RH
-- (Isso evita que o usuário veja todas as páginas do RH)
-- =====================================================
DELETE FROM module_permissions 
WHERE profile_id = '<PROFILE_ID>' 
  AND module_name = 'rh';

-- =====================================================
-- PASSO 2: Padronizar nome da entidade para 'treinamentos' (português)
-- =====================================================
-- Primeiro, verificar se existe 'trainings' ou 'training' e atualizar para 'treinamentos'
UPDATE entity_permissions
SET entity_name = 'treinamentos'
WHERE profile_id = '<PROFILE_ID>'
  AND entity_name IN ('trainings', 'training');

-- Se não existir registro para 'treinamentos', criar um novo
INSERT INTO entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
SELECT 
    '<PROFILE_ID>'::uuid as profile_id,
    'treinamentos' as entity_name,
    true as can_read,
    false as can_create,
    false as can_edit,
    false as can_delete
WHERE NOT EXISTS (
    SELECT 1 FROM entity_permissions 
    WHERE profile_id = '<PROFILE_ID>'::uuid 
      AND entity_name = 'treinamentos'
);

-- =====================================================
-- PASSO 3: Remover permissões de outras entidades do RH
-- =====================================================
DELETE FROM entity_permissions
WHERE profile_id = '<PROFILE_ID>'
  AND entity_name IN (
    'employees', 'funcionarios',
    'positions', 'cargos',
    'units', 'unidades',
    'time_records', 'registros_ponto',
    'vacations', 'ferias',
    'periodic_exams', 'exames_periodicos',
    'disciplinary_actions', 'acoes_disciplinares'
  );

-- =====================================================
-- PASSO 4: Verificar resultado final
-- =====================================================
SELECT 
    'Módulos' as tipo,
    module_name as nome,
    can_read,
    can_create,
    can_edit,
    can_delete
FROM module_permissions
WHERE profile_id = '<PROFILE_ID>'
  AND module_name IN ('rh', 'treinamento')

UNION ALL

SELECT 
    'Entidades' as tipo,
    entity_name as nome,
    can_read,
    can_create,
    can_edit,
    can_delete
FROM entity_permissions
WHERE profile_id = '<PROFILE_ID>'
ORDER BY tipo, nome;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute primeiro: analise_completa_perfil_qualidade.sql
-- 2. Copie o ID do perfil da query 1
-- 3. Substitua todas as ocorrências de <PROFILE_ID> pelo ID real
-- 4. Execute este script de correção
-- 5. Verifique os resultados na query final (PASSO 4)
-- =====================================================
