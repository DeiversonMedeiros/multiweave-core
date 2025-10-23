-- Função para testar contexto de autenticação
CREATE OR REPLACE FUNCTION test_auth_context()
RETURNS TABLE (
  current_user_id UUID,
  is_admin_result BOOLEAN,
  module_permissions_count BIGINT,
  entity_permissions_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    is_admin_simple(auth.uid()) as is_admin_result,
    (SELECT COUNT(*) FROM module_permissions) as module_permissions_count,
    (SELECT COUNT(*) FROM entity_permissions) as entity_permissions_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
