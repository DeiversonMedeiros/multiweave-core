-- Fix para expor check_entity_permission como RPC
-- Este script corrige o erro 404 ao chamar check_entity_permission

-- Primeiro, vamos verificar se a função existe e criar se necessário
CREATE OR REPLACE FUNCTION check_entity_permission(
  p_user_id UUID,
  p_entity_name TEXT,
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

  -- Verificar permissão específica da entidade
  SELECT 
    CASE p_action
      WHEN 'read' THEN ep.can_read
      WHEN 'create' THEN ep.can_create
      WHEN 'edit' THEN ep.can_edit
      WHEN 'delete' THEN ep.can_delete
      ELSE FALSE
    END
  INTO has_permission
  FROM entity_permissions ep
  JOIN user_companies uc ON ep.profile_id = uc.profile_id
  WHERE uc.user_id = p_user_id
    AND ep.entity_name = p_entity_name
    AND uc.ativo = true;

  RETURN COALESCE(has_permission, FALSE);
END;
$$;

-- Garantir que a função seja acessível via RPC
GRANT EXECUTE ON FUNCTION check_entity_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_entity_permission(UUID, TEXT, TEXT) TO anon;

-- Verificar se is_admin_simple existe e funciona
CREATE OR REPLACE FUNCTION is_admin_simple(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Garantir que is_admin_simple seja acessível via RPC
GRANT EXECUTE ON FUNCTION is_admin_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_simple(UUID) TO anon;

-- Verificar se get_user_permissions_simple existe
CREATE OR REPLACE FUNCTION get_user_permissions_simple(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  module_name TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete
  FROM module_permissions mp
  JOIN user_companies uc ON mp.profile_id = uc.profile_id
  WHERE uc.user_id = p_user_id
    AND uc.ativo = true;
END;
$$;

-- Garantir que get_user_permissions_simple seja acessível via RPC
GRANT EXECUTE ON FUNCTION get_user_permissions_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions_simple(UUID) TO anon;

-- Verificar se check_company_access existe
CREATE OR REPLACE FUNCTION check_company_access(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    WHERE uc.user_id = p_user_id 
    AND uc.company_id = p_company_id
    AND uc.ativo = true
  );
END;
$$;

-- Garantir que check_company_access seja acessível via RPC
GRANT EXECUTE ON FUNCTION check_company_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_company_access(UUID, UUID) TO anon;
