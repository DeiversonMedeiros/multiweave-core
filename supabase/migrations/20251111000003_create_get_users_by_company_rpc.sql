-- =====================================================
-- MIGRAÇÃO: Criar função RPC get_users_by_company
-- =====================================================
-- Data: 2025-11-11
-- Descrição: Cria a função RPC para buscar usuários de uma empresa
--            Respeitando permissões e RLS
--            Usada pelo hook useEmployeeUser para buscar usuários disponíveis para vínculo

-- Função para buscar usuários de uma empresa
CREATE OR REPLACE FUNCTION public.get_users_by_company(
  p_company_id UUID
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  ativo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
  is_user_admin BOOLEAN;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o usuário é admin
  SELECT public.is_admin_simple(current_user_id) INTO is_user_admin;

  -- Se for admin, retornar todos os usuários ativos da empresa
  IF is_user_admin THEN
    RETURN QUERY
    SELECT 
      u.id,
      u.nome::TEXT,
      u.email::TEXT,
      u.ativo
    FROM public.users u
    INNER JOIN public.user_companies uc ON uc.user_id = u.id
    WHERE uc.company_id = p_company_id
      AND uc.ativo = true
      AND u.ativo = true
    ORDER BY u.nome;
  ELSE
    -- Se não for admin, verificar se o usuário tem acesso à empresa
    IF NOT EXISTS (
      SELECT 1 
      FROM public.user_companies uc 
      WHERE uc.user_id = current_user_id 
        AND uc.company_id = p_company_id
        AND uc.ativo = true
    ) THEN
      RAISE EXCEPTION 'Usuário não tem acesso a esta empresa';
    END IF;

    -- Retornar usuários da empresa (respeitando RLS)
    RETURN QUERY
    SELECT 
      u.id,
      u.nome::TEXT,
      u.email::TEXT,
      u.ativo
    FROM public.users u
    INNER JOIN public.user_companies uc ON uc.user_id = u.id
    WHERE uc.company_id = p_company_id
      AND uc.ativo = true
      AND u.ativo = true
    ORDER BY u.nome;
  END IF;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_users_by_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_by_company(UUID) TO anon;

-- Comentário
COMMENT ON FUNCTION public.get_users_by_company(UUID) IS 
'Retorna usuários de uma empresa. Se o usuário for admin, retorna todos os usuários. Caso contrário, retorna apenas se o usuário tiver acesso à empresa.';

