-- =====================================================
-- CORREÇÃO: FILTRO DE GESTOR NA FUNÇÃO get_pending_approvals_for_user
-- =====================================================
-- Data: 2025-12-06
-- Descrição: Adiciona filtro para retornar apenas aprovações de funcionários
--            dos quais o usuário é gestor imediato
-- =====================================================

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
        -- Férias pendentes (apenas de funcionários gerenciados)
        SELECT 
            v.id,
            'ferias'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            v.created_at as data_solicitacao,
            v.status,
            CONCAT('Solicitação de férias de ', v.dias_solicitados, ' dias') as descricao,
            v.dias_solicitados::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            v.observacoes
        FROM rh.vacations v
        JOIN rh.employees e ON e.id = v.employee_id
        WHERE v.company_id = p_company_id
        AND v.status = 'pendente'
        -- Filtrar apenas funcionários dos quais o usuário é gestor
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
        
        UNION ALL
        
        -- Compensações pendentes (apenas de funcionários gerenciados)
        SELECT 
            cr.id,
            'compensacao'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            cr.created_at as data_solicitacao,
            cr.status,
            CONCAT('Solicitação de compensação de ', cr.quantidade_horas, ' horas') as descricao,
            NULL::INTEGER as dias,
            FLOOR(cr.quantidade_horas)::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            cr.observacoes
        FROM rh.compensation_requests cr
        JOIN rh.employees e ON e.id = cr.employee_id
        WHERE cr.company_id = p_company_id
        AND cr.status = 'pendente'
        -- Filtrar apenas funcionários dos quais o usuário é gestor
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
        
        UNION ALL
        
        -- Atestados pendentes (apenas de funcionários gerenciados)
        SELECT 
            mc.id,
            'atestado'::VARCHAR(50) as tipo,
            e.nome as funcionario_nome,
            e.matricula as funcionario_matricula,
            mc.created_at as data_solicitacao,
            mc.status,
            CONCAT('Atestado médico de ', mc.dias_afastamento, ' dias') as descricao,
            mc.dias_afastamento::INTEGER as dias,
            NULL::INTEGER as horas,
            NULL::DECIMAL(10,2) as valor,
            mc.observacoes
        FROM rh.medical_certificates mc
        JOIN rh.employees e ON e.id = mc.employee_id
        WHERE mc.company_id = p_company_id
        AND mc.status = 'pendente'
        -- Filtrar apenas funcionários dos quais o usuário é gestor
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
        
        UNION ALL
        
        -- Reembolsos pendentes (apenas de funcionários gerenciados)
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
            rr.valor_solicitado::DECIMAL(10,2) as valor,
            rr.observacoes
        FROM rh.reimbursement_requests rr
        JOIN rh.employees e ON e.id = rr.employee_id
        WHERE rr.company_id = p_company_id
        AND rr.status = 'pendente'
        -- Filtrar apenas funcionários dos quais o usuário é gestor
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
        
        UNION ALL
        
        -- Equipamentos pendentes (apenas de funcionários gerenciados)
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
        -- Filtrar apenas funcionários dos quais o usuário é gestor
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
        
        UNION ALL
        
        -- Correções de ponto pendentes (apenas de funcionários gerenciados)
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
        -- Filtrar apenas funcionários dos quais o usuário é gestor
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
    )
    ORDER BY data_solicitacao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_approvals_for_user(UUID, UUID) IS 
'Retorna aprovações pendentes apenas dos funcionários dos quais o usuário é gestor imediato. Filtra por gestor_imediato_id (user_id ou employee_id com user_id correspondente).';

