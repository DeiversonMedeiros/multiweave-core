-- =====================================================
-- CORREÇÃO: Lista de correções do gestor por status
-- =====================================================
-- Data: 2026-02-23
-- Descrição: Nova RPC que retorna correções de ponto dos funcionários do gestor
--            com filtro opcional de status, para que a tela "Aprovação de Correções de Ponto"
--            mostre a lista alinhada aos cards (Total, Pendentes, Aprovadas, Rejeitadas).
--            get_pending_attendance_corrections só retorna pendentes; esta retorna todas ou por status.

CREATE OR REPLACE FUNCTION public.get_attendance_corrections_for_manager(
    p_company_id UUID,
    p_user_id UUID,
    p_status TEXT DEFAULT NULL
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
    entrada_almoco_original TIME,
    saida_almoco_original TIME,
    entrada_almoco_corrigida TIME,
    saida_almoco_corrigida TIME,
    entrada_extra1_original TIME,
    saida_extra1_original TIME,
    entrada_extra1_corrigida TIME,
    saida_extra1_corrigida TIME,
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
        ac.entrada_almoco_original,
        ac.saida_almoco_original,
        ac.entrada_almoco_corrigida,
        ac.saida_almoco_corrigida,
        ac.entrada_extra1_original,
        ac.saida_extra1_original,
        ac.entrada_extra1_corrigida,
        ac.saida_extra1_corrigida,
        ac.justificativa,
        ac.status,
        ac.solicitado_por,
        ac.aprovado_por,
        ac.aprovado_em,
        ac.observacoes,
        ac.created_at,
        ac.updated_at,
        e.nome::VARCHAR(255) as funcionario_nome,
        e.matricula::VARCHAR(50) as funcionario_matricula
    FROM rh.attendance_corrections ac
    JOIN rh.employees e ON e.id = ac.employee_id
    WHERE ac.company_id = p_company_id
    AND (
        p_status IS NULL
        OR (p_status IS NOT NULL AND ac.status = p_status)
    )
    AND (
        e.gestor_imediato_id = p_user_id
        OR EXISTS (
            SELECT 1
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
            AND gestor_employee.user_id = p_user_id
        )
    )
    ORDER BY ac.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_attendance_corrections_for_manager(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_corrections_for_manager(UUID, UUID, TEXT) TO anon;

COMMENT ON FUNCTION public.get_attendance_corrections_for_manager(UUID, UUID, TEXT) IS
'Retorna correções de ponto dos funcionários do gestor. p_status: NULL = todas, ''pendente''/''aprovado''/''rejeitado'' = filtrar por status. Mesmo critério de gestor que get_pending_attendance_corrections e get_attendance_corrections_stats_for_manager.';
