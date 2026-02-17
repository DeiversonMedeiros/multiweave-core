-- =====================================================
-- RPCs para rh.employee_ponto_gestores (schema rh não exposto via REST)
-- =====================================================
-- PostgREST expõe apenas schema public. Estas funções permitem
-- que o frontend leia/grave em rh.employee_ponto_gestores via RPC.

-- Listar gestores de ponto de um funcionário
CREATE OR REPLACE FUNCTION public.get_employee_ponto_gestores(
  p_employee_id uuid,
  p_company_id uuid
)
RETURNS SETOF rh.employee_ponto_gestores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = p_company_id
      AND uc.ativo = true
  ) THEN
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM rh.employee_ponto_gestores
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
  ORDER BY created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_employee_ponto_gestores(uuid, uuid) IS
'Lista gestores de ponto de um funcionário. Requer vínculo do usuário com a empresa.';

GRANT EXECUTE ON FUNCTION public.get_employee_ponto_gestores(uuid, uuid) TO authenticated;

-- Sincronizar gestores (substitui lista atual pela nova)
CREATE OR REPLACE FUNCTION public.sync_employee_ponto_gestores(
  p_employee_id uuid,
  p_user_ids uuid[],
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = p_company_id
      AND uc.ativo = true
  ) THEN
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
  END IF;

  DELETE FROM rh.employee_ponto_gestores
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  IF array_length(p_user_ids, 1) IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
      IF v_user_id IS NOT NULL THEN
        INSERT INTO rh.employee_ponto_gestores (employee_id, user_id, company_id)
        VALUES (p_employee_id, v_user_id, p_company_id)
        ON CONFLICT (employee_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.sync_employee_ponto_gestores(uuid, uuid[], uuid) IS
'Substitui a lista de gestores de ponto do funcionário. Requer vínculo do usuário com a empresa.';

GRANT EXECUTE ON FUNCTION public.sync_employee_ponto_gestores(uuid, uuid[], uuid) TO authenticated;
