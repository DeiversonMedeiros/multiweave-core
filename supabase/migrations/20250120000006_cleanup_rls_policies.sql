-- =====================================================
-- MIGRAÇÃO: Limpar políticas RLS conflitantes
-- Data: 2025-01-20
-- Descrição: Remove políticas RLS conflitantes da tabela entity_permissions
-- =====================================================

-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view their entity permissions" ON entity_permissions;
DROP POLICY IF EXISTS "Users can view their own entity permissions" ON entity_permissions;

-- Verificar políticas restantes
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'entity_permissions';
