-- =====================================================
-- CRIAÇÃO DA FUNÇÃO check_access_permission
-- =====================================================

-- Função para verificar permissões de acesso
CREATE OR REPLACE FUNCTION public.check_access_permission(
  schema_name text,
  table_name text,
  action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    has_permission boolean := false;
BEGIN
    -- Obter ID do usuário atual
    current_user_id := auth.uid();
    
    -- Se não há usuário autenticado, negar acesso
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verificar se é super admin
    IF public.is_admin(current_user_id) THEN
        RETURN true;
    END IF;
    
    -- Verificar permissões baseadas no schema e tabela
    CASE schema_name
        WHEN 'rh' THEN
            -- Para schema RH, verificar se o usuário tem acesso a empresas
            SELECT EXISTS(
                SELECT 1 FROM public.user_companies uc
                WHERE uc.user_id = current_user_id
                AND uc.ativo = true
            ) INTO has_permission;
            
        WHEN 'public' THEN
            -- Para schema público, permitir acesso básico
            has_permission := true;
            
        ELSE
            -- Para outros schemas, negar por padrão
            has_permission := false;
    END CASE;
    
    RETURN has_permission;
END;
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário tem role de admin
    RETURN EXISTS(
        SELECT 1 FROM auth.users
        WHERE id = user_id
        AND raw_user_meta_data->>'role' = 'admin'
    );
END;
$$;

-- Função para obter empresas do usuário (removida - duplicada)

