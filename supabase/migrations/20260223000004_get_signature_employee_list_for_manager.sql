-- Lista funcionários que assinaram/não assinaram para um mês/ano, apenas os subordinados ao gestor (p_user_id).
-- Usado na aba "Acompanhar Assinatura" do portal do gestor.
CREATE OR REPLACE FUNCTION get_signature_employee_list_for_manager(
    p_company_id UUID,
    p_month_year VARCHAR(7),
    p_user_id UUID
)
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR,
    employee_matricula VARCHAR,
    signature_id UUID,
    signature_status VARCHAR,
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    has_signed BOOLEAN
) AS $$
DECLARE
    month_start DATE;
    month_end DATE;
BEGIN
    -- Apenas o próprio gestor pode consultar sua equipe
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = p_company_id
          AND uc.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
    END IF;

    IF p_month_year !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Formato de mês/ano inválido. Use YYYY-MM';
    END IF;

    month_start := (p_month_year || '-01')::DATE;
    month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    RETURN QUERY
    SELECT 
        e.id AS employee_id,
        e.nome AS employee_name,
        COALESCE(e.matricula, '') AS employee_matricula,
        trs.id AS signature_id,
        COALESCE(trs.status, 'not_created') AS signature_status,
        trs.signature_timestamp,
        -- Status da assinatura do colaborador: assinou se há data de assinatura (signed/approved = aprovado)
        CASE 
            WHEN trs.signature_timestamp IS NOT NULL THEN true
            ELSE false
        END AS has_signed
    FROM rh.employees e
    INNER JOIN rh.time_records tr ON tr.employee_id = e.id
    LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id AND trs.month_year = p_month_year
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND tr.data_registro >= month_start
      AND tr.data_registro <= month_end
      AND (
        e.gestor_imediato_id = p_user_id
        OR EXISTS (
            SELECT 1
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
              AND gestor_employee.user_id = p_user_id
        )
      )
    GROUP BY e.id, e.nome, e.matricula, trs.id, trs.status, trs.signature_timestamp
    ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_signature_employee_list_for_manager(UUID, VARCHAR(7), UUID) IS
'Lista funcionários que assinaram/não assinaram para um mês/ano, apenas subordinados ao gestor (user_id).';

GRANT EXECUTE ON FUNCTION get_signature_employee_list_for_manager(UUID, VARCHAR(7), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_signature_employee_list_for_manager(UUID, VARCHAR(7), UUID) TO service_role;
