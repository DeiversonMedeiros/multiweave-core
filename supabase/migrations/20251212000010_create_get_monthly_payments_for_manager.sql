-- =====================================================
-- FUNÇÃO PARA BUSCAR PAGAMENTOS MENSais DO GESTOR
-- Retorna apenas pagamentos de funcionários gerenciados pelo gestor
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_equipment_rental_monthly_payments_for_manager(
    p_company_id UUID,
    p_user_id UUID,
    p_month_reference INTEGER DEFAULT NULL,
    p_year_reference INTEGER DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    funcionario_nome TEXT,
    funcionario_matricula TEXT,
    month_reference INTEGER,
    year_reference INTEGER,
    valor_base NUMERIC(10,2),
    valor_calculado NUMERIC(10,2),
    valor_aprovado NUMERIC(10,2),
    status VARCHAR(50),
    equipment_rental_approval_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
BEGIN
    -- Access check: current user must belong to the company
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = p_company_id
          AND uc.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        erpm.id,
        erpm.employee_id,
        e.nome::TEXT as funcionario_nome,
        e.matricula::TEXT as funcionario_matricula,
        erpm.month_reference,
        erpm.year_reference,
        erpm.valor_base,
        erpm.valor_calculado,
        erpm.valor_aprovado,
        erpm.status::VARCHAR(50),
        erpm.equipment_rental_approval_id,
        erpm.created_at,
        erpm.updated_at
    FROM rh.equipment_rental_monthly_payments erpm
    INNER JOIN rh.employees e ON erpm.employee_id = e.id
    WHERE erpm.company_id = p_company_id
    -- Filtrar apenas pagamentos de funcionários onde o usuário é gestor
    AND (
        -- Caso 1: gestor_imediato_id é o user_id diretamente
        e.gestor_imediato_id = p_user_id
        OR
        -- Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
        EXISTS (
            SELECT 1 
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
            AND gestor_employee.user_id = p_user_id
        )
    )
    -- Filtros opcionais
    AND (p_month_reference IS NULL OR erpm.month_reference = p_month_reference)
    AND (p_year_reference IS NULL OR erpm.year_reference = p_year_reference)
    AND (p_status IS NULL OR erpm.status = p_status)
    ORDER BY erpm.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_equipment_rental_monthly_payments_for_manager(UUID, UUID, INTEGER, INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_rental_monthly_payments_for_manager(UUID, UUID, INTEGER, INTEGER, VARCHAR) TO anon;

COMMENT ON FUNCTION public.get_equipment_rental_monthly_payments_for_manager(UUID, UUID, INTEGER, INTEGER, VARCHAR) IS 
'Retorna pagamentos mensais de aluguel de equipamentos apenas dos funcionários gerenciados pelo gestor. Filtra apenas pagamentos de funcionários onde o usuário é gestor imediato.';
