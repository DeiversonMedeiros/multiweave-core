-- =====================================================
-- CORREÇÃO: Adicionar campos faltantes na função get_equipment_rental_monthly_payments_for_manager
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Adiciona campos dias_trabalhados, dias_ausencia, desconto_ausencia
--            e informações do equipamento na função RPC

DROP FUNCTION IF EXISTS public.get_equipment_rental_monthly_payments_for_manager(UUID, UUID, INTEGER, INTEGER, VARCHAR);

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
    dias_trabalhados INTEGER,
    dias_ausencia INTEGER,
    desconto_ausencia NUMERIC(10,2),
    valor_calculado NUMERIC(10,2),
    valor_aprovado NUMERIC(10,2),
    status VARCHAR(50),
    equipment_rental_approval_id UUID,
    tipo_equipamento TEXT,
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
        erpm.dias_trabalhados,
        erpm.dias_ausencia,
        erpm.desconto_ausencia,
        erpm.valor_calculado,
        erpm.valor_aprovado,
        erpm.status::VARCHAR(50),
        erpm.equipment_rental_approval_id,
        -- Buscar tipo_equipamento de equipment_rental_approvals OU de benefit_configurations
        COALESCE(
            era.tipo_equipamento,
            bc.name,
            bc.description,
            'N/A'
        )::TEXT as tipo_equipamento,
        erpm.created_at,
        erpm.updated_at
    FROM rh.equipment_rental_monthly_payments erpm
    INNER JOIN rh.employees e ON erpm.employee_id = e.id
    LEFT JOIN rh.equipment_rental_approvals era ON era.id = erpm.equipment_rental_approval_id
    -- Quando equipment_rental_approval_id é NULL, buscar de employee_benefit_assignments
    -- Usar LATERAL JOIN para pegar apenas um benefício por pagamento (o mais recente ou o que corresponde ao valor)
    LEFT JOIN LATERAL (
        SELECT bc.name, bc.description
        FROM rh.employee_benefit_assignments eba
        JOIN rh.benefit_configurations bc ON bc.id = eba.benefit_config_id
        WHERE eba.employee_id = erpm.employee_id 
            AND eba.is_active = true
            AND bc.benefit_type = 'equipment_rental'
            AND bc.is_active = true
            AND erpm.equipment_rental_approval_id IS NULL
            -- Verificar se o período do pagamento está dentro do período do benefício
            AND (
                eba.end_date IS NULL 
                OR eba.end_date >= MAKE_DATE(erpm.year_reference, erpm.month_reference, 1)
            )
            AND eba.start_date <= (DATE_TRUNC('month', MAKE_DATE(erpm.year_reference, erpm.month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE
            -- Priorizar benefício que corresponde ao valor do pagamento
            AND ABS(COALESCE(eba.custom_value, bc.base_value, 0) - erpm.valor_base) < 0.01
        ORDER BY eba.start_date DESC
        LIMIT 1
    ) bc ON true
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
'Retorna pagamentos mensais de aluguel de equipamentos apenas dos funcionários gerenciados pelo gestor. Inclui todos os campos necessários: dias_trabalhados, dias_ausencia, desconto_ausencia e tipo_equipamento.';
