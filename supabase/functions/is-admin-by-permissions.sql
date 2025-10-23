-- Função para verificar se um usuário é admin baseado em ter todas as permissões habilitadas
CREATE OR REPLACE FUNCTION is_admin_by_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  total_modules INTEGER;
  user_permissions_count INTEGER;
  total_entities INTEGER;
  user_entity_permissions_count INTEGER;
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
  
  -- Se o usuário tem todas as permissões de módulos, verificar entidades também
  IF user_permissions_count = total_modules THEN
    -- Contar total de entidades no sistema
    SELECT COUNT(DISTINCT entity_name) INTO total_entities
    FROM entity_permissions;
    
    -- Contar quantas entidades o usuário tem com todas as permissões
    SELECT COUNT(*) INTO user_entity_permissions_count
    FROM entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.can_read = true
    AND ep.can_create = true
    AND ep.can_edit = true
    AND ep.can_delete = true;
    
    -- Retorna true se tem todas as permissões de módulos E entidades
    RETURN user_entity_permissions_count = total_entities;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função alternativa mais simples: verifica se tem permissões de todos os módulos principais
CREATE OR REPLACE FUNCTION is_admin_by_permissions_simple(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
  required_modules TEXT[] := ARRAY['dashboard', 'users', 'companies', 'projects', 'materials', 'partners', 'cost_centers', 'configuracoes', 'portal_colaborador', 'portal_gestor', 'financeiro', 'compras', 'almoxarifado', 'frota', 'logistica', 'rh', 'recruitment', 'treinamento', 'combustivel', 'metalurgica', 'comercial', 'implantacao'];
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
  AND mp.module_name = ANY(required_modules)
  AND mp.can_read = true
  AND mp.can_create = true
  AND mp.can_edit = true
  AND mp.can_delete = true;
  
  -- Retorna true se tem todas as permissões dos módulos principais
  RETURN module_count = array_length(required_modules, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
