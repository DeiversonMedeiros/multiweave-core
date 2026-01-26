-- =====================================================
-- CORREÇÃO: Filtrar permissões por empresa selecionada
-- =====================================================
-- A função get_user_permissions_simple retorna permissões
-- de todas as empresas, mas deveria filtrar pela empresa
-- selecionada para evitar que módulos apareçam quando
-- o usuário não tem permissão na empresa atual
-- =====================================================

-- Criar nova função que filtra por empresa
CREATE OR REPLACE FUNCTION get_user_permissions_by_company(
  p_user_id UUID DEFAULT auth.uid(),
  p_company_id UUID DEFAULT NULL
)
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
  -- Se não especificou empresa, retornar permissões de todas as empresas (comportamento atual)
  IF p_company_id IS NULL THEN
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
    RETURN;
  END IF;

  -- Filtrar permissões apenas da empresa especificada
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
    AND uc.company_id = p_company_id
    AND uc.ativo = true;
END;
$$;

-- Garantir que a função seja acessível
GRANT EXECUTE ON FUNCTION get_user_permissions_by_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions_by_company(UUID, UUID) TO anon;

COMMENT ON FUNCTION get_user_permissions_by_company IS 'Retorna permissões do usuário filtradas por empresa selecionada';

-- Criar função similar para permissões de página
CREATE OR REPLACE FUNCTION get_user_page_permissions_by_company(
  p_user_id UUID DEFAULT auth.uid(),
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
  page_path TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se é admin, retorna todas as permissões como true
  IF is_admin_simple(p_user_id) THEN
    RETURN QUERY
    SELECT 
      pp.page_path,
      true as can_read,
      true as can_create,
      true as can_edit,
      true as can_delete
    FROM page_permissions pp
    GROUP BY pp.page_path;
    RETURN;
  END IF;

  -- Se não especificou empresa, retornar permissões de todas as empresas (comportamento atual)
  IF p_company_id IS NULL THEN
    RETURN QUERY
    SELECT 
      pp.page_path,
      pp.can_read,
      pp.can_create,
      pp.can_edit,
      pp.can_delete
    FROM page_permissions pp
    JOIN user_companies uc ON uc.profile_id = pp.profile_id
    WHERE uc.user_id = p_user_id
      AND uc.ativo = true;
    RETURN;
  END IF;

  -- Filtrar permissões apenas da empresa especificada
  RETURN QUERY
  SELECT 
    pp.page_path,
    pp.can_read,
    pp.can_create,
    pp.can_edit,
    pp.can_delete
  FROM page_permissions pp
  JOIN user_companies uc ON uc.profile_id = pp.profile_id
  WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true;
END;
$$;

-- Garantir que a função seja acessível
GRANT EXECUTE ON FUNCTION get_user_page_permissions_by_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_page_permissions_by_company(UUID, UUID) TO anon;

COMMENT ON FUNCTION get_user_page_permissions_by_company IS 'Retorna permissões de página do usuário filtradas por empresa selecionada';
