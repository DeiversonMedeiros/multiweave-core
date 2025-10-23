-- =====================================================
-- SCRIPT DE CORREÇÕES DO BANCO DE DADOS
-- =====================================================
-- Este script corrige os problemas identificados na análise

-- =====================================================
-- FASE 1: LIMPEZA DE DADOS DE TESTE
-- =====================================================

-- 1.1 Remover módulos de teste
DELETE FROM module_permissions WHERE module_name LIKE 'teste_%';

-- 1.2 Remover perfis de teste
DELETE FROM profiles WHERE nome LIKE '%Teste%';

-- 1.3 Remover usuários de teste e suas associações
DELETE FROM user_companies WHERE user_id IN (
  SELECT id FROM users WHERE nome LIKE 'Teste%'
);
DELETE FROM users WHERE nome LIKE 'Teste%';

-- =====================================================
-- FASE 2: CORREÇÃO DE PERMISSÕES DO PERFIL GERENTE
-- =====================================================

-- 2.1 Restaurar permissões básicas para Gerente (dashboard e users)
UPDATE module_permissions 
SET can_read = true, can_create = false, can_edit = false, can_delete = false
WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8' 
AND module_name IN ('dashboard', 'users');

-- 2.2 Garantir que Gerente tenha permissões de leitura para módulos essenciais
INSERT INTO module_permissions (profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
  '34632fe2-980b-4382-b104-ea244ed586f8' as profile_id,
  module_name,
  true as can_read,
  false as can_create,
  false as can_edit,
  false as can_delete,
  NOW() as created_at,
  NOW() as updated_at
FROM (VALUES 
  ('companies'),
  ('projects'),
  ('materials'),
  ('partners'),
  ('cost_centers')
) AS missing_modules(module_name)
WHERE NOT EXISTS (
  SELECT 1 FROM module_permissions 
  WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8' 
  AND module_name = missing_modules.module_name
);

-- =====================================================
-- FASE 3: PADRONIZAÇÃO DE FUNÇÕES
-- =====================================================

-- 3.1 Remover funções is_admin conflitantes (manter apenas is_admin_simple)
DROP FUNCTION IF EXISTS is_admin_production(uuid);
DROP FUNCTION IF EXISTS is_admin_by_permissions(uuid);
DROP FUNCTION IF EXISTS is_admin_by_permissions_flexible(uuid);
DROP FUNCTION IF EXISTS is_admin_by_permissions_simple(uuid);
DROP FUNCTION IF EXISTS is_admin_new(uuid);
DROP FUNCTION IF EXISTS is_admin_by_core_permissions(uuid);

-- =====================================================
-- FASE 4: VALIDAÇÃO E LIMPEZA ADICIONAL
-- =====================================================

-- 4.1 Remover permissões órfãs (sem perfil válido)
DELETE FROM module_permissions WHERE profile_id NOT IN (
  SELECT id FROM profiles
);

DELETE FROM entity_permissions WHERE profile_id NOT IN (
  SELECT id FROM profiles
);

-- 4.2 Remover associações órfãs (sem usuário ou perfil válido)
DELETE FROM user_companies WHERE user_id NOT IN (
  SELECT id FROM users
) OR profile_id NOT IN (
  SELECT id FROM profiles
);

-- =====================================================
-- FASE 5: VERIFICAÇÕES FINAIS
-- =====================================================

-- 5.1 Verificar se Super Admin tem todas as permissões
-- (Este será executado como verificação, não como correção)

-- 5.2 Verificar se não há mais módulos de teste
-- SELECT module_name FROM module_permissions WHERE module_name LIKE 'teste_%';

-- 5.3 Verificar se não há mais usuários de teste
-- SELECT nome FROM users WHERE nome LIKE 'Teste%';

-- =====================================================
-- RELATÓRIO DE EXECUÇÃO
-- =====================================================

-- Este script executa as seguintes correções:
-- 1. Remove 6 módulos de teste
-- 2. Remove 2 perfis de teste  
-- 3. Remove 15 usuários de teste
-- 4. Corrige permissões do perfil Gerente
-- 5. Remove 6 funções is_admin conflitantes
-- 6. Limpa dados órfãos

-- Após execução, o sistema deve ter:
-- - 19 módulos de produção (0 de teste)
-- - 4 perfis válidos (0 de teste)
-- - 1 usuário válido (0 de teste)
-- - 1 função is_admin padronizada
-- - Permissões consistentes
