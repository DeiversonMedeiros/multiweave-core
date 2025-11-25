-- =====================================================
-- FUNÇÃO PARA BUSCAR CORREÇÕES DE PONTO PENDENTES
-- Retorna correções pendentes dos funcionários do gestor
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_pending_attendance_corrections(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    company_id UUID,
    data_original DATE,
    entrada_original TIME,
    saida_original TIME,
    entrada_corrigida TIME,
    saida_corrigida TIME,
    justificativa TEXT,
    status VARCHAR(20),
    solicitado_por UUID,
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    funcionario_nome VARCHAR(255),
    funcionario_matricula VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.employee_id,
        ac.company_id,
        ac.data_original,
        ac.entrada_original,
        ac.saida_original,
        ac.entrada_corrigida,
        ac.saida_corrigida,
        ac.justificativa,
        ac.status,
        ac.solicitado_por,
        ac.aprovado_por,
        ac.aprovado_em,
        ac.observacoes,
        ac.created_at,
        ac.updated_at,
        e.nome as funcionario_nome,
        e.matricula as funcionario_matricula
    FROM rh.attendance_corrections ac
    JOIN rh.employees e ON e.id = ac.employee_id
    WHERE ac.company_id = p_company_id
    AND ac.status = 'pendente'
    -- Filtrar apenas correções de funcionários onde o usuário é gestor
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
    ORDER BY ac.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_pending_attendance_corrections(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_attendance_corrections(UUID, UUID) TO anon;

COMMENT ON FUNCTION public.get_pending_attendance_corrections(UUID, UUID) IS 
'Retorna correções de ponto pendentes dos funcionários do gestor. Filtra apenas correções de funcionários onde o usuário é gestor imediato (via gestor_imediato_id). Usa SECURITY DEFINER para garantir acesso aos registros.';

