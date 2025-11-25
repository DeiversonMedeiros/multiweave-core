-- =====================================================
-- CORREÇÃO: FUNÇÃO user_has_company_access_new PARA USAR is_admin_simple
-- =====================================================

-- Recriar a função com a chamada correta para is_admin_simple
CREATE OR REPLACE FUNCTION public.user_has_company_access_new(p_user_id uuid, p_company_id uuid) 
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Super admin tem acesso a todas as empresas
  IF is_admin_simple(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se o usuário tem acesso à empresa
  RETURN EXISTS (
    SELECT 1
    FROM user_companies uc
    WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true
  );
END;
$$;

-- Garantir permissões
GRANT ALL ON FUNCTION public.user_has_company_access_new(p_user_id uuid, p_company_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_has_company_access_new(p_user_id uuid, p_company_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_has_company_access_new(p_user_id uuid, p_company_id uuid) TO service_role;
