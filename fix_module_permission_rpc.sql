-- Fix para check_module_permission
-- Garantir que a função existe e está acessível via RPC

CREATE OR REPLACE FUNCTION check_module_permission(
  p_user_id UUID,
  p_module_name TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se o usuário é admin
  IF is_admin_simple(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Verificar permissão específica do módulo
  SELECT 
    CASE p_action
      WHEN 'read' THEN mp.can_read
      WHEN 'create' THEN mp.can_create
      WHEN 'edit' THEN mp.can_edit
      WHEN 'delete' THEN mp.can_delete
      ELSE FALSE
    END
  INTO has_permission
  FROM module_permissions mp
  JOIN user_companies uc ON mp.profile_id = uc.profile_id
  WHERE uc.user_id = p_user_id
    AND mp.module_name = p_module_name
    AND uc.ativo = true;

  RETURN COALESCE(has_permission, FALSE);
END;
$$;

-- Garantir que a função seja acessível via RPC
GRANT EXECUTE ON FUNCTION check_module_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_module_permission(UUID, TEXT, TEXT) TO anon;
