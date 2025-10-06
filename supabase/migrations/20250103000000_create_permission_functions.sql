-- Função para verificar se um usuário é super admin
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

-- Função para verificar permissão de módulo
CREATE OR REPLACE FUNCTION check_module_permission(
  p_user_id UUID,
  p_module_name TEXT,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se é super admin
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Obter profile_id do usuário
  SELECT uc.profile_id INTO user_profile_id
  FROM user_companies uc
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true
  LIMIT 1;
  
  -- Se não encontrou perfil, retorna false
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar permissão específica
  SELECT CASE p_permission
    WHEN 'read' THEN can_read
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    ELSE FALSE
  END INTO has_permission
  FROM module_permissions
  WHERE profile_id = user_profile_id
  AND module_name = p_module_name;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar permissão de entidade
CREATE OR REPLACE FUNCTION check_entity_permission(
  p_user_id UUID,
  p_entity_name TEXT,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se é super admin
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Obter profile_id do usuário
  SELECT uc.profile_id INTO user_profile_id
  FROM user_companies uc
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true
  LIMIT 1;
  
  -- Se não encontrou perfil, retorna false
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar permissão específica
  SELECT CASE p_permission
    WHEN 'read' THEN can_read
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    ELSE FALSE
  END INTO has_permission
  FROM entity_permissions
  WHERE profile_id = user_profile_id
  AND entity_name = p_entity_name;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter permissões do usuário atual
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  module_name TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) AS $$
BEGIN
  -- Se for super admin, retorna todas as permissões
  IF is_admin(p_user_id) THEN
    RETURN QUERY
    SELECT DISTINCT
      mp.module_name,
      true as can_read,
      true as can_create,
      true as can_edit,
      true as can_delete
    FROM module_permissions mp;
    RETURN;
  END IF;
  
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

-- Função para verificar acesso a empresa
CREATE OR REPLACE FUNCTION user_has_company_access(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin tem acesso a todas as empresas
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se o usuário tem acesso à empresa
  RETURN EXISTS (
    SELECT 1
    FROM user_companies uc
    WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

