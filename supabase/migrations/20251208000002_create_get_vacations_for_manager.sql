-- =====================================================
-- FUNÇÃO PARA BUSCAR FÉRIAS DO GESTOR
-- Retorna apenas férias de funcionários gerenciados pelo gestor
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_vacations_for_manager(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    funcionario_nome TEXT,
    funcionario_matricula TEXT,
    tipo VARCHAR(50),
    data_inicio DATE,
    data_fim DATE,
    dias_solicitados INTEGER,
    status VARCHAR(50),
    observacoes TEXT,
    anexos TEXT[],
    solicitado_por UUID,
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    saldo_ferias_disponivel INTEGER,
    ano_aquisitivo INTEGER,
    periodo_aquisitivo_inicio DATE,
    periodo_aquisitivo_fim DATE
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
        v.id,
        v.employee_id,
        e.nome::TEXT as funcionario_nome,
        e.matricula::TEXT as funcionario_matricula,
        v.tipo,
        v.data_inicio,
        v.data_fim,
        v.dias_solicitados,
        v.status,
        v.observacoes,
        v.anexos,
        v.solicitado_por,
        v.aprovado_por,
        v.aprovado_em,
        v.created_at,
        v.updated_at,
        COALESCE(ve.dias_disponiveis, 30)::INTEGER as saldo_ferias_disponivel,
        ve.ano_aquisitivo,
        ve.data_inicio_periodo as periodo_aquisitivo_inicio,
        ve.data_fim_periodo as periodo_aquisitivo_fim
    FROM rh.vacations v
    INNER JOIN rh.employees e ON v.employee_id = e.id
    LEFT JOIN rh.vacation_entitlements ve ON ve.employee_id = e.id 
        AND v.data_inicio >= ve.data_inicio_periodo 
        AND v.data_inicio <= ve.data_fim_periodo
    WHERE v.company_id = p_company_id
    -- Filtrar apenas férias de funcionários onde o usuário é gestor
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
    ORDER BY v.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_vacations_for_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vacations_for_manager(UUID, UUID) TO anon;

COMMENT ON FUNCTION public.get_vacations_for_manager(UUID, UUID) IS 
'Retorna férias apenas dos funcionários gerenciados pelo gestor. Filtra apenas férias de funcionários onde o usuário é gestor imediato. Usa SECURITY DEFINER para garantir acesso aos registros.';

