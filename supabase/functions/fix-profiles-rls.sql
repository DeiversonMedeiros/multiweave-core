-- Corrigir políticas RLS da tabela profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- Recriar política com função correta
CREATE POLICY "Admins can manage profiles" ON profiles
FOR ALL
TO public
USING (is_admin_simple(auth.uid()));

-- Verificar se a política foi criada corretamente
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'Admins can manage profiles';
