-- =====================================================
-- CORREÇÃO: FILTRO DE GESTOR NA FUNÇÃO get_gestor_dashboard_stats
-- =====================================================
-- Data: 2025-12-06
-- Descrição: Adiciona parâmetro user_id e filtra estatísticas apenas para
--            funcionários dos quais o usuário é gestor imediato
-- =====================================================

CREATE OR REPLACE FUNCTION get_gestor_dashboard_stats(
    company_uuid UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_funcionarios', (
            SELECT COUNT(*) 
            FROM rh.employees e
            WHERE e.company_id = company_uuid 
            AND e.status = 'ativo'
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
        ),
        'solicitacoes_pendentes', (
            SELECT COUNT(*) FROM (
                -- Férias pendentes (apenas de funcionários gerenciados)
                SELECT 1 FROM rh.vacations v
                JOIN rh.employees e ON e.id = v.employee_id
                WHERE v.company_id = company_uuid AND v.status = 'pendente'
                AND (
                    e.gestor_imediato_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM rh.employees gestor_employee
                        WHERE gestor_employee.id = e.gestor_imediato_id
                        AND gestor_employee.user_id = p_user_id
                    )
                )
                UNION ALL
                -- Compensações pendentes (apenas de funcionários gerenciados)
                SELECT 1 FROM rh.compensation_requests cr
                JOIN rh.employees e ON e.id = cr.employee_id
                WHERE cr.company_id = company_uuid AND cr.status = 'pendente'
                AND (
                    e.gestor_imediato_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM rh.employees gestor_employee
                        WHERE gestor_employee.id = e.gestor_imediato_id
                        AND gestor_employee.user_id = p_user_id
                    )
                )
                UNION ALL
                -- Atestados pendentes (apenas de funcionários gerenciados)
                SELECT 1 FROM rh.medical_certificates mc
                JOIN rh.employees e ON e.id = mc.employee_id
                WHERE mc.company_id = company_uuid AND mc.status = 'pendente'
                AND (
                    e.gestor_imediato_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM rh.employees gestor_employee
                        WHERE gestor_employee.id = e.gestor_imediato_id
                        AND gestor_employee.user_id = p_user_id
                    )
                )
                UNION ALL
                -- Reembolsos pendentes (apenas de funcionários gerenciados)
                SELECT 1 FROM rh.reimbursement_requests rr
                JOIN rh.employees e ON e.id = rr.employee_id
                WHERE rr.company_id = company_uuid AND rr.status = 'pendente'
                AND (
                    e.gestor_imediato_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM rh.employees gestor_employee
                        WHERE gestor_employee.id = e.gestor_imediato_id
                        AND gestor_employee.user_id = p_user_id
                    )
                )
                UNION ALL
                -- Equipamentos pendentes (apenas de funcionários gerenciados)
                SELECT 1 FROM rh.equipment_rental_approvals era
                JOIN rh.employees e ON e.id = era.employee_id
                WHERE era.company_id = company_uuid AND era.status = 'pendente'
                AND (
                    e.gestor_imediato_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM rh.employees gestor_employee
                        WHERE gestor_employee.id = e.gestor_imediato_id
                        AND gestor_employee.user_id = p_user_id
                    )
                )
                UNION ALL
                -- Correções pendentes (apenas de funcionários gerenciados)
                SELECT 1 FROM rh.attendance_corrections ac
                JOIN rh.employees e ON e.id = ac.employee_id
                WHERE ac.company_id = company_uuid AND ac.status = 'pendente'
                AND (
                    e.gestor_imediato_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM rh.employees gestor_employee
                        WHERE gestor_employee.id = e.gestor_imediato_id
                        AND gestor_employee.user_id = p_user_id
                    )
                )
            ) as total
        ),
        'ferias_pendentes', (
            SELECT COUNT(*) 
            FROM rh.vacations v
            JOIN rh.employees e ON e.id = v.employee_id
            WHERE v.company_id = company_uuid 
            AND v.status = 'pendente'
            AND (
                e.gestor_imediato_id = p_user_id
                OR EXISTS (
                    SELECT 1 FROM rh.employees gestor_employee
                    WHERE gestor_employee.id = e.gestor_imediato_id
                    AND gestor_employee.user_id = p_user_id
                )
            )
        ),
        'compensacoes_pendentes', (
            SELECT COUNT(*) 
            FROM rh.compensation_requests cr
            JOIN rh.employees e ON e.id = cr.employee_id
            WHERE cr.company_id = company_uuid 
            AND cr.status = 'pendente'
            AND (
                e.gestor_imediato_id = p_user_id
                OR EXISTS (
                    SELECT 1 FROM rh.employees gestor_employee
                    WHERE gestor_employee.id = e.gestor_imediato_id
                    AND gestor_employee.user_id = p_user_id
                )
            )
        ),
        'atestados_pendentes', (
            SELECT COUNT(*) 
            FROM rh.medical_certificates mc
            JOIN rh.employees e ON e.id = mc.employee_id
            WHERE mc.company_id = company_uuid 
            AND mc.status = 'pendente'
            AND (
                e.gestor_imediato_id = p_user_id
                OR EXISTS (
                    SELECT 1 FROM rh.employees gestor_employee
                    WHERE gestor_employee.id = e.gestor_imediato_id
                    AND gestor_employee.user_id = p_user_id
                )
            )
        ),
        'reembolsos_pendentes', (
            SELECT COUNT(*) 
            FROM rh.reimbursement_requests rr
            JOIN rh.employees e ON e.id = rr.employee_id
            WHERE rr.company_id = company_uuid 
            AND rr.status = 'pendente'
            AND (
                e.gestor_imediato_id = p_user_id
                OR EXISTS (
                    SELECT 1 FROM rh.employees gestor_employee
                    WHERE gestor_employee.id = e.gestor_imediato_id
                    AND gestor_employee.user_id = p_user_id
                )
            )
        ),
        'equipamentos_pendentes', (
            SELECT COUNT(*) 
            FROM rh.equipment_rental_approvals era
            JOIN rh.employees e ON e.id = era.employee_id
            WHERE era.company_id = company_uuid 
            AND era.status = 'pendente'
            AND (
                e.gestor_imediato_id = p_user_id
                OR EXISTS (
                    SELECT 1 FROM rh.employees gestor_employee
                    WHERE gestor_employee.id = e.gestor_imediato_id
                    AND gestor_employee.user_id = p_user_id
                )
            )
        ),
        'correcoes_pendentes', (
            SELECT COUNT(*) 
            FROM rh.attendance_corrections ac
            JOIN rh.employees e ON e.id = ac.employee_id
            WHERE ac.company_id = company_uuid 
            AND ac.status = 'pendente'
            AND (
                e.gestor_imediato_id = p_user_id
                OR EXISTS (
                    SELECT 1 FROM rh.employees gestor_employee
                    WHERE gestor_employee.id = e.gestor_imediato_id
                    AND gestor_employee.user_id = p_user_id
                )
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_gestor_dashboard_stats(UUID, UUID) IS 
'Retorna estatísticas do dashboard apenas para funcionários dos quais o usuário é gestor imediato. Filtra por gestor_imediato_id (user_id ou employee_id com user_id correspondente).';

