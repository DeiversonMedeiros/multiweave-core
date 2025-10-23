-- Função simplificada para obter permissões do usuário
CREATE OR REPLACE FUNCTION get_user_permissions_simple(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  module_name TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) AS $$
BEGIN
  -- Retorna permissões específicas do usuário
  RETURN QUERY
  SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete
  FROM user_companies uc
  JOIN module_permissions mp ON uc.profile_id = mp.profile_id
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função simplificada para verificar se é admin
CREATE OR REPLACE FUNCTION is_admin_simple(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = p_user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
