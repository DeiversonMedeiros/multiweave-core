-- =====================================================
-- FILTRO POR GESTOR NA APROVAÇÃO DE HORAS EXTRAS
-- =====================================================
-- Data: 2026-02-05
-- Descrição: Cria função get_pending_overtime_records_for_manager que retorna
--            apenas registros de ponto com hora extra pendente dos funcionários
--            subordinados ao gestor (gestor_imediato_id = user ou employee.user_id).
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_pending_overtime_records_for_manager(
    p_company_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    funcionario_nome VARCHAR(255),
    funcionario_matricula VARCHAR(50),
    data_registro DATE,
    entrada TIME,
    saida TIME,
    entrada_almoco TIME,
    saida_almoco TIME,
    entrada_extra1 TIME,
    saida_extra1 TIME,
    horas_trabalhadas NUMERIC(4,2),
    horas_extras NUMERIC(4,2),
    horas_extras_50 NUMERIC(4,2),
    horas_extras_100 NUMERIC(4,2),
    horas_para_banco NUMERIC(4,2),
    horas_para_pagamento NUMERIC(4,2),
    horas_faltas NUMERIC(4,2),
    status VARCHAR(20),
    observacoes TEXT,
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.employee_id,
        e.nome::VARCHAR(255) AS funcionario_nome,
        e.matricula::VARCHAR(50) AS funcionario_matricula,
        tr.data_registro,
        tr.entrada,
        tr.saida,
        tr.entrada_almoco,
        tr.saida_almoco,
        tr.entrada_extra1,
        tr.saida_extra1,
        tr.horas_trabalhadas,
        tr.horas_extras,
        tr.horas_extras_50,
        tr.horas_extras_100,
        tr.horas_para_banco,
        tr.horas_para_pagamento,
        tr.horas_faltas,
        tr.status::VARCHAR(20),
        tr.observacoes,
        tr.aprovado_por,
        tr.aprovado_em,
        tr.created_at,
        tr.updated_at
    FROM rh.time_records tr
    JOIN rh.employees e ON e.id = tr.employee_id
    WHERE tr.company_id = p_company_id
    AND tr.status = 'pendente'
    AND (
        COALESCE(tr.horas_extras, 0) > 0
        OR COALESCE(tr.horas_extras_50, 0) > 0
        OR COALESCE(tr.horas_extras_100, 0) > 0
    )
    -- Apenas funcionários cujo gestor imediato é o usuário logado
    AND (
        e.gestor_imediato_id = p_user_id
        OR EXISTS (
            SELECT 1
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
            AND gestor_employee.user_id = p_user_id
        )
    )
    ORDER BY tr.data_registro DESC, tr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_pending_overtime_records_for_manager(UUID, UUID) IS
'Retorna registros de ponto com hora extra pendentes de aprovação apenas dos funcionários subordinados ao gestor (portal gestor).';

GRANT EXECUTE ON FUNCTION public.get_pending_overtime_records_for_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_overtime_records_for_manager(UUID, UUID) TO anon;
