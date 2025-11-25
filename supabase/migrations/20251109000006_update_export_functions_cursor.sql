-- =====================================================
-- ATUALIZAR FUNÇÕES DE EXPORTAÇÃO PARA USAR CURSOR
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Atualizar get_time_records_for_export para usar cursor-based pagination
CREATE OR REPLACE FUNCTION public.get_time_records_for_export(
    p_company_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_last_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    data_registro DATE,
    entrada TIME,
    saida TIME,
    horas_trabalhadas NUMERIC,
    status VARCHAR,
    employee_name VARCHAR,
    company_name VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tr.id,
        tr.employee_id,
        tr.data_registro,
        tr.entrada,
        tr.saida,
        tr.horas_trabalhadas,
        tr.status::VARCHAR,
        e.nome::VARCHAR as employee_name,
        c.razao_social::VARCHAR as company_name
    FROM rh.time_records tr
    JOIN rh.employees e ON tr.employee_id = e.id
    JOIN public.companies c ON tr.company_id = c.id
    WHERE tr.company_id = p_company_id
        AND (p_employee_id IS NULL OR tr.employee_id = p_employee_id)
        AND (p_start_date IS NULL OR tr.data_registro >= p_start_date)
        AND (p_end_date IS NULL OR tr.data_registro <= p_end_date)
        AND (p_last_id IS NULL OR tr.id > p_last_id) -- Cursor-based pagination
    ORDER BY tr.id
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_time_records_for_export(UUID, DATE, DATE, UUID, UUID, INTEGER) IS 
'Retorna registros de ponto otimizados para exportação usando cursor-based pagination';

-- Atualizar get_employees_for_export para usar cursor-based pagination
CREATE OR REPLACE FUNCTION public.get_employees_for_export(
    p_company_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_last_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
    id UUID,
    nome VARCHAR,
    matricula VARCHAR,
    cpf VARCHAR,
    status VARCHAR,
    data_admissao DATE,
    cargo_name VARCHAR,
    department_name VARCHAR,
    company_name VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.nome::VARCHAR,
        e.matricula::VARCHAR,
        e.cpf::VARCHAR,
        e.status::VARCHAR,
        e.data_admissao,
        p.name::VARCHAR as cargo_name,
        u.name::VARCHAR as department_name,
        c.razao_social::VARCHAR as company_name
    FROM rh.employees e
    LEFT JOIN rh.positions p ON e.cargo_id = p.id
    LEFT JOIN rh.units u ON e.departamento_id = u.id
    JOIN public.companies c ON e.company_id = c.id
    WHERE e.company_id = p_company_id
        AND (p_status IS NULL OR e.status = p_status)
        AND (p_department_id IS NULL OR e.departamento_id = p_department_id)
        AND (p_last_id IS NULL OR e.id > p_last_id) -- Cursor-based pagination
    ORDER BY e.id
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_employees_for_export(UUID, VARCHAR, UUID, UUID, INTEGER) IS 
'Retorna funcionários otimizados para exportação usando cursor-based pagination';

