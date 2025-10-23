-- Função flexível para verificar se um usuário é admin baseado em ter a maioria das permissões habilitadas
CREATE OR REPLACE FUNCTION is_admin_by_permissions_flexible(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  total_modules INTEGER;
  user_permissions_count INTEGER;
  percentage_threshold FLOAT := 0.8; -- 80% dos módulos
BEGIN
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
  
  -- Contar total de módulos no sistema
  SELECT COUNT(DISTINCT module_name) INTO total_modules
  FROM module_permissions;
  
  -- Contar quantos módulos o usuário tem com todas as permissões (read, create, edit, delete = true)
  SELECT COUNT(*) INTO user_permissions_count
  FROM module_permissions mp
  WHERE mp.profile_id = user_profile_id
  AND mp.can_read = true
  AND mp.can_create = true
  AND mp.can_edit = true
  AND mp.can_delete = true;
  
  -- Retorna true se tem pelo menos 80% das permissões de módulos
  RETURN user_permissions_count >= (total_modules * percentage_threshold);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função que verifica se tem permissões de módulos principais (mais restritiva)
CREATE OR REPLACE FUNCTION is_admin_by_core_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  core_modules TEXT[] := ARRAY['dashboard', 'users', 'companies', 'projects', 'rh', 'financeiro', 'configuracoes'];
  module_count INTEGER;
BEGIN
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
  
  -- Contar quantos módulos principais o usuário tem com todas as permissões
  SELECT COUNT(*) INTO module_count
  FROM module_permissions mp
  WHERE mp.profile_id = user_profile_id
  AND mp.module_name = ANY(core_modules)
  AND mp.can_read = true
  AND mp.can_create = true
  AND mp.can_edit = true
  AND mp.can_delete = true;
  
  -- Retorna true se tem todas as permissões dos módulos principais
  RETURN module_count = array_length(core_modules, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
