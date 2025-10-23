-- Função para verificar se um usuário é admin baseado em permissões de produção (ignora módulos de teste)
CREATE OR REPLACE FUNCTION is_admin_production(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  total_production_modules INTEGER;
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
  
  -- Contar total de módulos de produção (ignorando módulos de teste)
  SELECT COUNT(DISTINCT module_name) INTO total_production_modules
  FROM module_permissions
  WHERE module_name NOT LIKE 'teste_%';
  
  -- Contar quantos módulos de produção o usuário tem com todas as permissões
  SELECT COUNT(*) INTO user_permissions_count
  FROM module_permissions mp
  WHERE mp.profile_id = user_profile_id
  AND mp.module_name NOT LIKE 'teste_%'
  AND mp.can_read = true
  AND mp.can_create = true
  AND mp.can_edit = true
  AND mp.can_delete = true;
  
  -- Retorna true se tem pelo menos 80% das permissões de módulos de produção
  RETURN user_permissions_count >= (total_production_modules * percentage_threshold);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função que verifica se tem permissões de todos os módulos de produção
CREATE OR REPLACE FUNCTION is_admin_all_production(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  total_production_modules INTEGER;
  user_permissions_count INTEGER;
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
  
  -- Contar total de módulos de produção
  SELECT COUNT(DISTINCT module_name) INTO total_production_modules
  FROM module_permissions
  WHERE module_name NOT LIKE 'teste_%';
  
  -- Contar quantos módulos de produção o usuário tem com todas as permissões
  SELECT COUNT(*) INTO user_permissions_count
  FROM module_permissions mp
  WHERE mp.profile_id = user_profile_id
  AND mp.module_name NOT LIKE 'teste_%'
  AND mp.can_read = true
  AND mp.can_create = true
  AND mp.can_edit = true
  AND mp.can_delete = true;
  
  -- Retorna true se tem todas as permissões dos módulos de produção
  RETURN user_permissions_count = total_production_modules;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
