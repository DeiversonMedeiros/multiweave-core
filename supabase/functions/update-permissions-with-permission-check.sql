-- Função para atualizar permissão de módulo (com verificação de admin baseada em permissões)
CREATE OR REPLACE FUNCTION update_module_permission_with_check(
  p_profile_id UUID,
  p_module_name TEXT,
  p_action TEXT,
  p_value BOOLEAN
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  module_name TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuário tem permissão para gerenciar permissões
  -- Usa verificação baseada em permissões em vez de nome do perfil
  IF auth.uid() IS NOT NULL AND NOT is_admin_by_permissions_flexible(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuários com permissões administrativas podem gerenciar permissões';
  END IF;
  
  -- Buscar permissão existente
  SELECT mp.id INTO permission_id
  FROM module_permissions mp
  WHERE mp.profile_id = p_profile_id AND mp.module_name = p_module_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissão existente
    UPDATE module_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE module_permissions.id = permission_id;
  ELSE
    -- Criar nova permissão
    INSERT INTO module_permissions (
      profile_id,
      module_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_module_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING module_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissão atualizada
  RETURN QUERY
  SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.created_at,
    mp.updated_at
  FROM module_permissions mp
  WHERE mp.id = permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar permissão de entidade (com verificação de admin baseada em permissões)
CREATE OR REPLACE FUNCTION update_entity_permission_with_check(
  p_profile_id UUID,
  p_entity_name TEXT,
  p_action TEXT,
  p_value BOOLEAN
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  entity_name TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuário tem permissão para gerenciar permissões
  -- Usa verificação baseada em permissões em vez de nome do perfil
  IF auth.uid() IS NOT NULL AND NOT is_admin_by_permissions_flexible(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuários com permissões administrativas podem gerenciar permissões';
  END IF;
  
  -- Buscar permissão existente
  SELECT ep.id INTO permission_id
  FROM entity_permissions ep
  WHERE ep.profile_id = p_profile_id AND ep.entity_name = p_entity_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissão existente
    UPDATE entity_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE entity_permissions.id = permission_id;
  ELSE
    -- Criar nova permissão
    INSERT INTO entity_permissions (
      profile_id,
      entity_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_entity_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING entity_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissão atualizada
  RETURN QUERY
  SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    ep.created_at,
    ep.updated_at
  FROM entity_permissions ep
  WHERE ep.id = permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
