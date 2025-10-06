CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

