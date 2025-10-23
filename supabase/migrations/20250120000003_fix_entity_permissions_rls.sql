-- =====================================================
-- MIGRAÇÃO: Corrigir políticas RLS da tabela entity_permissions
-- Data: 2025-01-20
-- Descrição: Corrige as políticas RLS para permitir acesso a usuários autenticados
-- =====================================================

-- Remover política existente se houver
DROP POLICY IF EXISTS "Admins can manage entity permissions" ON entity_permissions;

-- Criar política mais permissiva para entity_permissions
-- Permitir acesso a usuários autenticados que tenham perfil ativo
CREATE POLICY "Authenticated users can access entity permissions" ON entity_permissions
FOR ALL USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = auth.uid() 
    AND uc.ativo = true
    AND p.is_active = true
  )
);

-- Verificar se a política foi criada
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'entity_permissions'
AND policyname = 'Authenticated users can access entity permissions';
