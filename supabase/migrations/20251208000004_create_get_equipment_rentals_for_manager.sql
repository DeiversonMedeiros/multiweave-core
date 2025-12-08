-- =====================================================
-- FUNÇÃO PARA BUSCAR EQUIPAMENTOS DO GESTOR
-- Retorna apenas equipamentos de funcionários gerenciados pelo gestor
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_equipment_rentals_for_manager(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    funcionario_nome TEXT,
    funcionario_matricula TEXT,
    equipamento VARCHAR(255),
    data_inicio DATE,
    data_fim DATE,
    motivo TEXT,
    status VARCHAR(50),
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
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
        era.id,
        era.employee_id,
        e.nome::TEXT as funcionario_nome,
        e.matricula::TEXT as funcionario_matricula,
        era.equipamento,
        era.data_inicio,
        era.data_fim,
        era.motivo,
        era.status,
        era.aprovado_por,
        era.aprovado_em,
        era.observacoes,
        era.created_at,
        era.updated_at
    FROM rh.equipment_rental_approvals era
    INNER JOIN rh.employees e ON era.employee_id = e.id
    WHERE era.company_id = p_company_id
    -- Filtrar apenas equipamentos de funcionários onde o usuário é gestor
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
    ORDER BY era.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_equipment_rentals_for_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_rentals_for_manager(UUID, UUID) TO anon;

COMMENT ON FUNCTION public.get_equipment_rentals_for_manager(UUID, UUID) IS 
'Retorna equipamentos apenas dos funcionários gerenciados pelo gestor. Filtra apenas equipamentos de funcionários onde o usuário é gestor imediato. Usa SECURITY DEFINER para garantir acesso aos registros.';

