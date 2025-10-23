-- Corrigir a função is_admin existente para resolver ambiguidade de colunas
-- Mantendo a assinatura original mas corrigindo a ambiguidade
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = is_admin.user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
