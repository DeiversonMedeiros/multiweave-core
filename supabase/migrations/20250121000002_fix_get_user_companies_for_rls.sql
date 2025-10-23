-- =====================================================
-- CORREÇÃO DA FUNÇÃO get_user_companies PARA RLS
-- =====================================================
-- Data: 2025-01-21
-- Descrição: Corrige a função get_user_companies para não ser set-returning

-- Remover função existente
DROP FUNCTION IF EXISTS public.get_user_companies();

-- Criar função que retorna boolean para uso em RLS
CREATE OR REPLACE FUNCTION public.user_has_company_access(company_id_param UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    has_access boolean := false;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verificar se é super admin
    IF public.is_admin_simple(current_user_id) THEN
        RETURN true;
    END IF;
    
    -- Verificar se o usuário tem acesso à empresa específica
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_companies uc 
        WHERE uc.user_id = current_user_id 
        AND uc.company_id = company_id_param
        AND uc.ativo = true
    ) INTO has_access;
    
    RETURN has_access;
END;
$$;

-- Criar função que retorna array (para uso em outras funções)
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_companies uuid[];
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;
    
    -- Se for super admin, retornar todas as empresas
    IF public.is_admin_simple(current_user_id) THEN
        SELECT ARRAY(SELECT id FROM public.companies) INTO user_companies;
        RETURN user_companies;
    END IF;
    
    SELECT ARRAY(
        SELECT uc.company_id 
        FROM public.user_companies uc 
        WHERE uc.user_id = current_user_id 
        AND uc.ativo = true
    ) INTO user_companies;
    
    RETURN COALESCE(user_companies, ARRAY[]::uuid[]);
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.user_has_company_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_company_access(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_companies() TO anon;

