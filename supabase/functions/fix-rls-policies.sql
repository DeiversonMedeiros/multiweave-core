-- Corrigir políticas RLS para usar is_admin_simple

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage module permissions" ON module_permissions;
DROP POLICY IF EXISTS "Admins can manage entity permissions" ON entity_permissions;

-- Criar políticas corrigidas para module_permissions
CREATE POLICY "Admins can manage module permissions" ON module_permissions
FOR ALL USING (is_admin_simple(auth.uid()));

-- Criar políticas corrigidas para entity_permissions  
CREATE POLICY "Admins can manage entity permissions" ON entity_permissions
FOR ALL USING (is_admin_simple(auth.uid()));

-- Verificar se as políticas foram criadas
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('module_permissions', 'entity_permissions')
AND policyname LIKE '%Admins%';
