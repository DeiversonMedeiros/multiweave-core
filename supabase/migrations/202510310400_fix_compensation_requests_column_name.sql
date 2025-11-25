-- =====================================================
-- CORREÇÃO: NOME DA COLUNA EM COMPENSATION_REQUESTS
-- =====================================================
-- Data: 2025-10-31
-- Descrição: Corrige o nome da coluna de horas_solicitadas para quantidade_horas
--            na função get_pending_approvals_for_user
-- =====================================================

-- Recriar a função com o nome correto da coluna
CREATE OR REPLACE FUNCTION get_pending_approvals_for_user(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS TABLE (
    id UUID,
    tipo VARCHAR(50),
    funcionario_nome VARCHAR(255),
    funcionario_matricula VARCHAR(50),
    data_solicitacao TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    descricao TEXT,
    dias INTEGER,
    horas INTEGER,
    valor DECIMAL(10,2),
    observacoes TEXT
) AS $$
BEGIN
    RETURN QUERY
    (
        -- Registros de ponto com hora extra pendentes
        SELECT 
            tr.id,
            'registro_ponto'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            tr.created_at as data_solicitacao,
            tr.status,
            CONCAT('Registro de ponto com ', tr.horas_extras, 'h de hora extra em ', tr.data_registro) as descricao,
            NULL::INTEGER as dias,
            tr.horas_extras::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            tr.observacoes
        FROM rh.time_records tr
        JOIN rh.employees e ON e.id = tr.employee_id
        WHERE tr.company_id = p_company_id
        AND tr.status = 'pendente'
        AND tr.horas_extras > 0
        
        UNION ALL
        
        -- Férias pendentes
        SELECT 
            v.id,
            'ferias'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            v.created_at as data_solicitacao,
            v.status,
            CONCAT('Solicitação de férias de ', v.dias_solicitados, ' dias') as descricao,
            v.dias_solicitados as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            v.observacoes
        FROM rh.vacations v
        JOIN rh.employees e ON e.id = v.employee_id
        WHERE v.company_id = p_company_id
        AND v.status = 'pendente'
        
        UNION ALL
        
        -- Compensações pendentes (CORRIGIDO: quantidade_horas em vez de horas_solicitadas)
        SELECT 
            cr.id,
            'compensacao'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            cr.created_at as data_solicitacao,
            cr.status,
            CONCAT('Solicitação de compensação de ', cr.quantidade_horas, ' horas') as descricao,
            NULL::INTEGER as dias,
            cr.quantidade_horas::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            cr.observacoes
        FROM rh.compensation_requests cr
        JOIN rh.employees e ON e.id = cr.employee_id
        WHERE cr.company_id = p_company_id
        AND cr.status = 'pendente'
        
        UNION ALL
        
        -- Atestados pendentes
        SELECT 
            mc.id,
            'atestado'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            mc.created_at as data_solicitacao,
            mc.status,
            CONCAT('Atestado médico de ', mc.dias_afastamento, ' dias') as descricao,
            mc.dias_afastamento as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            mc.observacoes
        FROM rh.medical_certificates mc
        JOIN rh.employees e ON e.id = mc.employee_id
        WHERE mc.company_id = p_company_id
        AND mc.status = 'pendente'
        
        UNION ALL
        
        -- Reembolsos pendentes
        SELECT 
            rr.id,
            'reembolso'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            rr.created_at as data_solicitacao,
            rr.status,
            CONCAT('Solicitação de reembolso de R$ ', rr.valor_solicitado) as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            rr.valor_solicitado as valor,
            rr.observacoes
        FROM rh.reimbursement_requests rr
        JOIN rh.employees e ON e.id = rr.employee_id
        WHERE rr.company_id = p_company_id
        AND rr.status = 'pendente'
        
        UNION ALL
        
        -- Equipamentos pendentes
        SELECT 
            era.id,
            'equipamento'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            era.created_at as data_solicitacao,
            era.status,
            CONCAT('Solicitação de equipamento: ', era.tipo_equipamento) as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            era.observacoes
        FROM rh.equipment_rental_approvals era
        JOIN rh.employees e ON e.id = era.employee_id
        WHERE era.company_id = p_company_id
        AND era.status = 'pendente'
        
        UNION ALL
        
        -- Correções de ponto pendentes (sempre exigem aprovação)
        SELECT 
            ac.id,
            'correcao_ponto'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            ac.created_at as data_solicitacao,
            ac.status,
            CONCAT('Correção de ponto para ', ac.data_original) as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            ac.observacoes
        FROM rh.attendance_corrections ac
        JOIN rh.employees e ON e.id = ac.employee_id
        WHERE ac.company_id = p_company_id
        AND ac.status = 'pendente'
        
        UNION ALL
        
        -- Assinaturas de ponto pendentes de aprovação do gestor (após o funcionário assinar)
        SELECT 
            trs.id,
            'assinatura_ponto'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            trs.signature_timestamp as data_solicitacao,
            trs.status,
            CONCAT('Assinatura de ponto de ', trs.month_year, ' aguardando aprovação') as descricao,
            NULL::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            NULL::TEXT as observacoes
        FROM rh.time_record_signatures trs
        JOIN rh.employees e ON e.id = trs.employee_id
        WHERE trs.company_id = p_company_id
        AND trs.status = 'signed'  -- Assinado pelo funcionário
        AND trs.manager_approval_required = true
        AND trs.manager_approved_by IS NULL  -- Ainda não aprovado pelo gestor
    )
    ORDER BY data_solicitacao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_approvals_for_user(UUID, UUID) IS 
'Retorna aprovações pendentes incluindo registros de ponto com hora extra, correções de ponto e assinaturas que precisam de aprovação do gestor. Corrigido: usa quantidade_horas em vez de horas_solicitadas para compensation_requests';

