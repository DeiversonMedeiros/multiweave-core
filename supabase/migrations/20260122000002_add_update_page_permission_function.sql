-- =====================================================
-- FUNÇÃO: update_page_permission_production
-- =====================================================
-- Atualiza ou cria permissão de página para um perfil
-- Similar às funções update_entity_permission_production e update_module_permission_production
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_page_permission_production(
  p_profile_id UUID,
  p_page_path TEXT,
  p_action TEXT,
  p_value BOOLEAN
)
RETURNS TABLE(
  id UUID,
  profile_id UUID,
  page_path TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuário tem permissão para gerenciar permissões
  -- Aceita Super Admin (is_admin_simple) OU usuários com todas as permissões de produção
  IF auth.uid() IS NOT NULL AND NOT (is_admin_simple(auth.uid()) OR is_admin_all_production(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuários com permissões administrativas podem gerenciar permissões';
  END IF;
  
  -- Buscar permissão existente
  SELECT pp.id INTO permission_id
  FROM page_permissions pp
  WHERE pp.profile_id = p_profile_id AND pp.page_path = p_page_path;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissão existente
    UPDATE page_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE page_permissions.can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE page_permissions.can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE page_permissions.can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE page_permissions.can_delete END,
      updated_at = NOW()
    WHERE page_permissions.id = permission_id;
  ELSE
    -- Criar nova permissão
    INSERT INTO page_permissions (
      profile_id,
      page_path,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_page_path,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING page_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissão atualizada
  RETURN QUERY
  SELECT 
    pp.id,
    pp.profile_id,
    pp.page_path,
    pp.can_read,
    pp.can_create,
    pp.can_edit,
    pp.can_delete,
    pp.created_at,
    pp.updated_at
  FROM page_permissions pp
  WHERE pp.id = permission_id;
END;
$$;

-- =====================================================
-- FUNÇÃO: get_page_permissions_by_profile
-- =====================================================
-- Retorna todas as permissões de página para um perfil
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_page_permissions_by_profile(
  p_profile_id UUID
)
RETURNS TABLE(
  id UUID,
  profile_id UUID,
  page_path TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.profile_id,
    pp.page_path,
    pp.can_read,
    pp.can_create,
    pp.can_edit,
    pp.can_delete,
    pp.created_at,
    pp.updated_at
  FROM page_permissions pp
  WHERE pp.profile_id = p_profile_id
  ORDER BY pp.page_path;
END;
$$;
