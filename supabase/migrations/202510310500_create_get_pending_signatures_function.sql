-- =====================================================
-- FUNÇÃO RPC PARA BUSCAR ASSINATURAS DE PONTO PENDENTES
-- =====================================================
-- Data: 2025-10-31
-- Descrição: Função para buscar assinaturas de ponto que precisam de aprovação do gestor
-- =====================================================

-- Criar a função no schema public
CREATE OR REPLACE FUNCTION get_pending_signatures(
    p_company_id UUID
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    funcionario_nome VARCHAR(255),
    funcionario_matricula VARCHAR(50),
    month_year VARCHAR(7),
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    manager_approval_required BOOLEAN,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        trs.id,
        trs.employee_id,
        e.nome as funcionario_nome,
        e.matricula as funcionario_matricula,
        trs.month_year,
        trs.signature_timestamp,
        trs.status,
        trs.manager_approval_required,
        trs.rejection_reason,
        trs.created_at,
        trs.updated_at
    FROM rh.time_record_signatures trs
    JOIN rh.employees e ON e.id = trs.employee_id
    WHERE trs.company_id = p_company_id
    AND trs.status = 'signed'  -- Assinado pelo funcionário
    AND trs.manager_approval_required = true
    AND trs.manager_approved_by IS NULL  -- Ainda não aprovado pelo gestor
    ORDER BY trs.signature_timestamp DESC, trs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_signatures(UUID) IS 
'Retorna assinaturas de ponto que estão pendentes de aprovação do gestor';

-- Conceder permissões de execução
GRANT EXECUTE ON FUNCTION get_pending_signatures(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_signatures(UUID) TO anon;

