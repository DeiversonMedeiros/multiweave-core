-- Função para buscar permissões de módulo por perfil
CREATE OR REPLACE FUNCTION get_module_permissions_by_profile(p_profile_id UUID)
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
BEGIN
  -- Verificar se o usuário tem permissão para acessar este perfil
  -- Permitir acesso se auth.uid() for NULL (execução direta) ou se for admin
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar permissões';
  END IF;
  
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
  WHERE mp.profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar permissões de entidade por perfil
CREATE OR REPLACE FUNCTION get_entity_permissions_by_profile(p_profile_id UUID)
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
BEGIN
  -- Verificar se o usuário tem permissão para acessar este perfil
  -- Permitir acesso se auth.uid() for NULL (execução direta) ou se for admin
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar permissões';
  END IF;
  
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
  WHERE ep.profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
