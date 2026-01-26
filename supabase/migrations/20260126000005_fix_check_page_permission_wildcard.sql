-- =====================================================
-- CORREÇÃO: check_page_permission com wildcards
-- =====================================================
-- A função check_page_permission não estava lidando corretamente
-- com wildcards quando o page_path passado já contém wildcard.
-- Exemplo: /rh/treinamentos* não estava fazendo match com /rh/treinamentos*
-- =====================================================

CREATE OR REPLACE FUNCTION check_page_permission(
  p_user_id UUID,
  p_page_path TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_profile_id UUID;
  v_permission RECORD;
  v_normalized_path TEXT;
  v_path_without_wildcard TEXT;
BEGIN
  -- Verificar se é admin
  IF is_admin_simple(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Normalizar caminho da página (remover parâmetros de rota, mas manter estrutura)
  -- Se o caminho já tem wildcard, não normalizar completamente
  IF p_page_path LIKE '%*' THEN
    -- Se já tem wildcard, apenas remover parâmetros de rota antes do wildcard
    v_path_without_wildcard := regexp_replace(p_page_path, '\*$', '');
    -- Remover apenas seções que parecem ser IDs UUID ou números (parâmetros de rota)
    -- Mas manter a estrutura base do caminho
    v_normalized_path := regexp_replace(v_path_without_wildcard, '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', '', 'i'); -- UUID
    v_normalized_path := regexp_replace(v_normalized_path, '/[0-9]+$', '', 'g'); -- Números
    v_normalized_path := regexp_replace(v_normalized_path, '/[^/]+/edit$', '', 'g'); -- /:id/edit
    v_normalized_path := regexp_replace(v_normalized_path, '/[^/]+/new$', '', 'g'); -- /:id/new
    v_normalized_path := regexp_replace(v_normalized_path, '/:[^/]+', '', 'g'); -- /:param
    -- Adicionar wildcard de volta se o original tinha
    v_normalized_path := v_normalized_path || '*';
  ELSE
    -- Normalizar normalmente (remover apenas parâmetros de rota, não o último segmento válido)
    -- Remover apenas seções que parecem ser IDs UUID ou números (parâmetros de rota)
    v_normalized_path := regexp_replace(p_page_path, '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', '', 'i'); -- UUID
    v_normalized_path := regexp_replace(v_normalized_path, '/[0-9]+$', '', 'g'); -- Números
    v_normalized_path := regexp_replace(v_normalized_path, '/[^/]+/edit$', '', 'g'); -- /:id/edit
    v_normalized_path := regexp_replace(v_normalized_path, '/[^/]+/new$', '', 'g'); -- /:id/new
    v_normalized_path := regexp_replace(v_normalized_path, '/:[^/]+', '', 'g'); -- /:param
  END IF;
  
  -- Buscar perfil do usuário na empresa ativa
  SELECT uc.profile_id INTO v_profile_id
  FROM user_companies uc
  WHERE uc.user_id = p_user_id
    AND uc.ativo = true
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar permissão da página (com suporte a wildcards)
  -- Prioridade: match exato > wildcard
  SELECT pp.* INTO v_permission
  FROM page_permissions pp
  WHERE pp.profile_id = v_profile_id
    AND (
      -- Match exato (com ou sem wildcard)
      pp.page_path = v_normalized_path OR
      pp.page_path = p_page_path OR
      -- Se a permissão tem wildcard, verificar se o caminho normalizado começa com o padrão
      (pp.page_path LIKE '%*' AND v_normalized_path LIKE replace(pp.page_path, '*', '%')) OR
      -- Se o caminho normalizado tem wildcard, verificar se a permissão começa com o padrão
      (v_normalized_path LIKE '%*' AND pp.page_path LIKE replace(v_normalized_path, '*', '%')) OR
      -- Match exato com wildcard removido (caminho sem wildcard, permissão com wildcard)
      (v_normalized_path = replace(pp.page_path, '*', '') AND pp.page_path LIKE '%*') OR
      -- Match exato com wildcard removido (caminho com wildcard, permissão sem wildcard)
      (replace(v_normalized_path, '*', '') = pp.page_path AND v_normalized_path LIKE '%*') OR
      -- Se a permissão tem wildcard e o caminho normalizado (sem wildcard) começa com o padrão da permissão
      (pp.page_path LIKE '%*' AND v_normalized_path LIKE replace(pp.page_path, '*', '%') AND NOT v_normalized_path LIKE '%*') OR
      -- Se o caminho normalizado não tem wildcard, verificar se começa com o padrão da permissão (sem wildcard)
      (pp.page_path LIKE '%*' AND v_normalized_path LIKE replace(pp.page_path, '*', '%'))
    )
  ORDER BY 
    CASE 
      WHEN pp.page_path = v_normalized_path THEN 0  -- Match exato primeiro
      WHEN pp.page_path = p_page_path THEN 0  -- Match exato com caminho original
      WHEN v_normalized_path = replace(pp.page_path, '*', '') AND pp.page_path LIKE '%*' THEN 1  -- Caminho sem wildcard, permissão com wildcard
      WHEN pp.page_path LIKE '%*' AND v_normalized_path LIKE replace(pp.page_path, '*', '%') THEN 2  -- Wildcard depois
      WHEN v_normalized_path LIKE '%*' AND pp.page_path LIKE replace(v_normalized_path, '*', '%') THEN 2  -- Wildcard no caminho
      ELSE 3
    END
  LIMIT 1;
  
  IF v_permission IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar ação específica
  CASE p_action
    WHEN 'read' THEN RETURN v_permission.can_read;
    WHEN 'create' THEN RETURN v_permission.can_create;
    WHEN 'edit' THEN RETURN v_permission.can_edit;
    WHEN 'delete' THEN RETURN v_permission.can_delete;
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION check_page_permission IS 'Verifica se o usuário tem permissão para acessar uma página específica. Corrigido para lidar corretamente com wildcards.';
