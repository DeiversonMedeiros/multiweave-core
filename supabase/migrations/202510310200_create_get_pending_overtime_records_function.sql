-- =====================================================
-- FUNÇÃO RPC PARA BUSCAR REGISTROS DE PONTO COM HORA EXTRA PENDENTES
-- =====================================================
-- Data: 2025-10-31
-- Descrição: Função para buscar registros de ponto com hora extra que precisam de aprovação
-- =====================================================

CREATE OR REPLACE FUNCTION rh.get_pending_overtime_records(
    p_company_id UUID
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
        e.nome as funcionario_nome,
        e.matricula as funcionario_matricula,
        tr.data_registro,
        tr.entrada,
        tr.saida,
        tr.entrada_almoco,
        tr.saida_almoco,
        tr.entrada_extra1,
        tr.saida_extra1,
        tr.horas_trabalhadas,
        tr.horas_extras,
        tr.horas_faltas,
        tr.status,
        tr.observacoes,
        tr.aprovado_por,
        tr.aprovado_em,
        tr.created_at,
        tr.updated_at
    FROM rh.time_records tr
    JOIN rh.employees e ON e.id = tr.employee_id
    WHERE tr.company_id = p_company_id
    AND tr.status = 'pendente'
    AND tr.horas_extras > 0
    ORDER BY tr.data_registro DESC, tr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.get_pending_overtime_records(UUID) IS 
'Retorna registros de ponto com hora extra que estão pendentes de aprovação';

