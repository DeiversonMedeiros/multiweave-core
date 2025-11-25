-- =====================================================
-- FUNÇÃO PARA BUSCAR ESTATÍSTICAS DE CORREÇÕES DO GESTOR
-- Retorna estatísticas (total, pendentes, aprovadas, rejeitadas) 
-- apenas das correções dos funcionários do gestor
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_attendance_corrections_stats_for_manager(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    total BIGINT,
    pendentes BIGINT,
    aprovadas BIGINT,
    rejeitadas BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE ac.status = 'pendente')::BIGINT as pendentes,
        COUNT(*) FILTER (WHERE ac.status = 'aprovado')::BIGINT as aprovadas,
        COUNT(*) FILTER (WHERE ac.status = 'rejeitado')::BIGINT as rejeitadas
    FROM rh.attendance_corrections ac
    JOIN rh.employees e ON e.id = ac.employee_id
    WHERE ac.company_id = p_company_id
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
    );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_attendance_corrections_stats_for_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_corrections_stats_for_manager(UUID, UUID) TO anon;

COMMENT ON FUNCTION public.get_attendance_corrections_stats_for_manager(UUID, UUID) IS 
'Retorna estatísticas (total, pendentes, aprovadas, rejeitadas) das correções de ponto dos funcionários do gestor. Filtra apenas correções de funcionários onde o usuário é gestor imediato. Usa SECURITY DEFINER para garantir acesso aos registros.';

