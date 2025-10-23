-- =====================================================
-- RPC FUNCTIONS PARA PORTAL DO GESTOR
-- =====================================================

-- Função para buscar estatísticas do dashboard do gestor
CREATE OR REPLACE FUNCTION get_gestor_dashboard_stats(company_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_funcionarios', (
            SELECT COUNT(*) 
            FROM rh.employees 
            WHERE company_id = company_uuid 
            AND status = 'ativo'
        ),
        'solicitacoes_pendentes', (
            SELECT COUNT(*) FROM (
                SELECT 1 FROM rh.vacations WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.compensation_requests WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.medical_certificates WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.reimbursement_requests WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.equipment_rental_approvals WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.attendance_corrections WHERE company_id = company_uuid AND status = 'pendente'
            ) as total
        ),
        'ferias_pendentes', (
            SELECT COUNT(*) 
            FROM rh.vacations 
            WHERE company_id = company_uuid 
            AND status = 'pendente'
        ),
        'compensacoes_pendentes', (
            SELECT COUNT(*) 
            FROM rh.compensation_requests 
            WHERE company_id = company_uuid 
            AND status = 'pendente'
        ),
        'atestados_pendentes', (
            SELECT COUNT(*) 
            FROM rh.medical_certificates 
            WHERE company_id = company_uuid 
            AND status = 'pendente'
        ),
        'reembolsos_pendentes', (
            SELECT COUNT(*) 
            FROM rh.reimbursement_requests 
            WHERE company_id = company_uuid 
            AND status = 'pendente'
        ),
        'equipamentos_pendentes', (
            SELECT COUNT(*) 
            FROM rh.equipment_rental_approvals 
            WHERE company_id = company_uuid 
            AND status = 'pendente'
        ),
        'correcoes_pendentes', (
            SELECT COUNT(*) 
            FROM rh.attendance_corrections 
            WHERE company_id = company_uuid 
            AND status = 'pendente'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar atividades recentes do gestor
CREATE OR REPLACE FUNCTION get_gestor_recent_activities(
    company_uuid UUID, 
    limit_count INTEGER DEFAULT 10
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
        -- Férias
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
        WHERE v.company_id = company_uuid
        
        UNION ALL
        
        -- Compensações
        SELECT 
            cr.id,
            'compensacao'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            cr.created_at as data_solicitacao,
            cr.status,
            CONCAT('Solicitação de compensação de ', cr.horas_solicitadas, ' horas') as descricao,
            NULL::INTEGER as dias,
            cr.horas_solicitadas as horas,
            NULL::DECIMAL(10,2) as valor,
            cr.observacoes
        FROM rh.compensation_requests cr
        JOIN rh.employees e ON e.id = cr.employee_id
        WHERE cr.company_id = company_uuid
        
        UNION ALL
        
        -- Atestados
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
        WHERE mc.company_id = company_uuid
        
        UNION ALL
        
        -- Reembolsos
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
        WHERE rr.company_id = company_uuid
        
        UNION ALL
        
        -- Equipamentos
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
        WHERE era.company_id = company_uuid
        
        UNION ALL
        
        -- Correções de ponto
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
        WHERE ac.company_id = company_uuid
    )
    ORDER BY data_solicitacao DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar aprovações pendentes para um usuário
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
        
        -- Compensações pendentes
        SELECT 
            cr.id,
            'compensacao'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            cr.created_at as data_solicitacao,
            cr.status,
            CONCAT('Solicitação de compensação de ', cr.horas_solicitadas, ' horas') as descricao,
            NULL::INTEGER as dias,
            cr.horas_solicitadas as horas,
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
        
        -- Correções de ponto pendentes
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
    )
    ORDER BY data_solicitacao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funções de aprovação e rejeição
CREATE OR REPLACE FUNCTION approve_vacation(
    vacation_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.vacations 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = vacation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_vacation(
    vacation_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.vacations 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = vacation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_compensation(
    compensation_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.compensation_requests 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = compensation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_compensation(
    compensation_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.compensation_requests 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = compensation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_medical_certificate(
    certificate_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.medical_certificates 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = certificate_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_medical_certificate(
    certificate_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.medical_certificates 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = certificate_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_reimbursement(
    reimbursement_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.reimbursement_requests 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = reimbursement_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_reimbursement(
    reimbursement_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.reimbursement_requests 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = reimbursement_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_equipment(
    equipment_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.equipment_rental_approvals 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = equipment_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_equipment(
    equipment_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.equipment_rental_approvals 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = equipment_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_attendance_correction(
    correction_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.attendance_corrections 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = correction_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_attendance_correction(
    correction_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.attendance_corrections 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes_aprovacao = observacoes,
        updated_at = NOW()
    WHERE id = correction_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários nas funções
COMMENT ON FUNCTION get_gestor_dashboard_stats(UUID) IS 'Retorna estatísticas do dashboard do gestor para uma empresa';
COMMENT ON FUNCTION get_gestor_recent_activities(UUID, INTEGER) IS 'Retorna atividades recentes do gestor para uma empresa';
COMMENT ON FUNCTION get_pending_approvals_for_user(UUID, UUID) IS 'Retorna aprovações pendentes para um usuário em uma empresa';
COMMENT ON FUNCTION approve_vacation(UUID, UUID, TEXT) IS 'Aprova uma solicitação de férias';
COMMENT ON FUNCTION reject_vacation(UUID, UUID, TEXT) IS 'Rejeita uma solicitação de férias';
COMMENT ON FUNCTION approve_compensation(UUID, UUID, TEXT) IS 'Aprova uma solicitação de compensação';
COMMENT ON FUNCTION reject_compensation(UUID, UUID, TEXT) IS 'Rejeita uma solicitação de compensação';
COMMENT ON FUNCTION approve_medical_certificate(UUID, UUID, TEXT) IS 'Aprova um atestado médico';
COMMENT ON FUNCTION reject_medical_certificate(UUID, UUID, TEXT) IS 'Rejeita um atestado médico';
COMMENT ON FUNCTION approve_reimbursement(UUID, UUID, TEXT) IS 'Aprova uma solicitação de reembolso';
COMMENT ON FUNCTION reject_reimbursement(UUID, UUID, TEXT) IS 'Rejeita uma solicitação de reembolso';
COMMENT ON FUNCTION approve_equipment(UUID, UUID, TEXT) IS 'Aprova uma solicitação de equipamento';
COMMENT ON FUNCTION reject_equipment(UUID, UUID, TEXT) IS 'Rejeita uma solicitação de equipamento';
COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS 'Aprova uma correção de ponto';
COMMENT ON FUNCTION reject_attendance_correction(UUID, UUID, TEXT) IS 'Rejeita uma correção de ponto';
