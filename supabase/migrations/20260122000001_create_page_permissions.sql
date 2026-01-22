-- =====================================================
-- SISTEMA DE PERMISSÕES POR PÁGINA
-- =====================================================
-- Este sistema permite controle de acesso por página/rota
-- em vez de por entidade, simplificando a gestão de permissões
-- =====================================================

-- Tabela de permissões por página
CREATE TABLE IF NOT EXISTS public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,  -- Ex: '/rh/employees*', '/portal-colaborador/treinamentos'
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, page_path)
);

-- Comentários
COMMENT ON TABLE public.page_permissions IS 'Permissões por página/rota - permite controle granular de acesso por página';
COMMENT ON COLUMN public.page_permissions.page_path IS 'Caminho da página com suporte a wildcards (*). Ex: /rh/employees* corresponde a /rh/employees, /rh/employees/:id, etc.';
COMMENT ON COLUMN public.page_permissions.can_read IS 'Pode visualizar a página';
COMMENT ON COLUMN public.page_permissions.can_create IS 'Pode criar registros na página';
COMMENT ON COLUMN public.page_permissions.can_edit IS 'Pode editar registros na página';
COMMENT ON COLUMN public.page_permissions.can_delete IS 'Pode deletar registros na página';

-- Habilitar RLS
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_page_permissions_profile_id ON public.page_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_page_path ON public.page_permissions(page_path);
CREATE INDEX IF NOT EXISTS idx_page_permissions_profile_path ON public.page_permissions(profile_id, page_path);

-- Trigger para updated_at
CREATE TRIGGER update_page_permissions_updated_at 
  BEFORE UPDATE ON public.page_permissions
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- FUNÇÕES RPC PARA VERIFICAÇÃO DE PERMISSÕES POR PÁGINA
-- =====================================================

-- Função para normalizar caminho de página (remove parâmetros)
CREATE OR REPLACE FUNCTION normalize_page_path(p_path TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized_path TEXT;
BEGIN
  -- Remove parâmetros de rota (/:id, /:id/edit, etc)
  normalized_path := regexp_replace(p_path, '/[^/]+$', '', 'g');
  normalized_path := regexp_replace(normalized_path, '/[^/]+/edit$', '', 'g');
  normalized_path := regexp_replace(normalized_path, '/[^/]+/new$', '', 'g');
  
  -- Se ainda tiver parâmetros, remove
  normalized_path := regexp_replace(normalized_path, '/:[^/]+', '', 'g');
  
  RETURN normalized_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para verificar permissão de página
CREATE OR REPLACE FUNCTION check_page_permission(
  p_user_id UUID,
  p_page_path TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_profile_id UUID;
  v_permission RECORD;
  v_normalized_path TEXT;
  v_matched_path TEXT;
BEGIN
  -- Verificar se é admin
  IF is_admin_simple(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Normalizar caminho da página
  v_normalized_path := normalize_page_path(p_page_path);
  
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
      -- Match exato
      pp.page_path = v_normalized_path OR
      -- Wildcard no final (ex: /rh/employees*)
      (pp.page_path LIKE '%*' AND v_normalized_path LIKE replace(pp.page_path, '*', '%')) OR
      -- Match exato com wildcard removido
      v_normalized_path = replace(pp.page_path, '*', '')
    )
  ORDER BY 
    CASE 
      WHEN pp.page_path = v_normalized_path THEN 0  -- Match exato primeiro
      WHEN pp.page_path LIKE '%*' AND v_normalized_path LIKE replace(pp.page_path, '*', '%') THEN 1  -- Wildcard depois
      ELSE 2
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

-- Função simplificada para obter permissões de página do usuário
CREATE OR REPLACE FUNCTION get_user_page_permissions_simple(p_user_id UUID)
RETURNS TABLE (
  page_path TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) AS $$
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
  
  -- Buscar permissões do perfil do usuário
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Política para leitura: usuários podem ver suas próprias permissões
CREATE POLICY "Users can view their own page permissions"
  ON public.page_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_companies uc
      WHERE uc.profile_id = page_permissions.profile_id
        AND uc.user_id = auth.uid()
        AND uc.ativo = true
    )
    OR is_admin_simple(auth.uid())
  );

-- Política para inserção: apenas admins
CREATE POLICY "Only admins can insert page permissions"
  ON public.page_permissions
  FOR INSERT
  WITH CHECK (is_admin_simple(auth.uid()));

-- Política para atualização: apenas admins
CREATE POLICY "Only admins can update page permissions"
  ON public.page_permissions
  FOR UPDATE
  USING (is_admin_simple(auth.uid()))
  WITH CHECK (is_admin_simple(auth.uid()));

-- Política para deleção: apenas admins
CREATE POLICY "Only admins can delete page permissions"
  ON public.page_permissions
  FOR DELETE
  USING (is_admin_simple(auth.uid()));
