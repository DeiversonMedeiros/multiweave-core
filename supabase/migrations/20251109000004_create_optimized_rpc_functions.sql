-- =====================================================
-- FASE 1.3: FUNÇÕES RPC PARA AGREGAÇÕES
-- Sistema: MultiWeave Core
-- Data: 2025-11-09
-- Descrição: Criação de funções RPC para processar agregações
--           no servidor e reduzir transferência de dados
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: get_rh_dashboard_stats()
-- Estatísticas do módulo RH usando view materializada
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_rh_dashboard_stats(
    p_company_id UUID
)
RETURNS TABLE (
    employees_active BIGINT,
    employees_inactive BIGINT,
    employees_on_leave BIGINT,
    time_records_pending BIGINT,
    time_records_approved BIGINT,
    time_records_rejected BIGINT,
    trainings_active BIGINT,
    trainings_inactive BIGINT,
    periodic_exams_overdue BIGINT,
    periodic_exams_due_soon BIGINT,
    disciplinary_actions_last_30_days BIGINT,
    vacations_pending BIGINT,
    compensations_pending BIGINT,
    reimbursements_pending BIGINT,
    medical_certificates_pending BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stats.employees_active,
        stats.employees_inactive,
        stats.employees_on_leave,
        stats.time_records_pending,
        stats.time_records_approved,
        stats.time_records_rejected,
        stats.trainings_active,
        stats.trainings_inactive,
        stats.periodic_exams_overdue,
        stats.periodic_exams_due_soon,
        stats.disciplinary_actions_last_30_days,
        stats.vacations_pending,
        stats.compensations_pending,
        stats.reimbursements_pending,
        stats.medical_certificates_pending,
        stats.last_updated
    FROM public.rh_dashboard_stats_mv stats
    WHERE stats.company_id = p_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_rh_dashboard_stats(UUID) IS 
'Retorna estatísticas do módulo RH usando view materializada otimizada';

-- =====================================================
-- 2. FUNÇÃO: get_frota_dashboard_stats()
-- Estatísticas do módulo Frota usando view materializada
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_frota_dashboard_stats(
    p_company_id UUID
)
RETURNS TABLE (
    vehicles_own BIGINT,
    vehicles_rented BIGINT,
    vehicles_aggregated BIGINT,
    vehicles_active BIGINT,
    vehicles_inactive BIGINT,
    vehicles_maintenance BIGINT,
    maintenances_pending BIGINT,
    maintenances_in_progress BIGINT,
    maintenances_scheduled_next_30_days BIGINT,
    incidents_last_30_days BIGINT,
    incidents_pending BIGINT,
    inspections_last_30_days BIGINT,
    requests_pending BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stats.vehicles_own,
        stats.vehicles_rented,
        stats.vehicles_aggregated,
        stats.vehicles_active,
        stats.vehicles_inactive,
        stats.vehicles_maintenance,
        stats.maintenances_pending,
        stats.maintenances_in_progress,
        stats.maintenances_scheduled_next_30_days,
        stats.incidents_last_30_days,
        stats.incidents_pending,
        stats.inspections_last_30_days,
        stats.requests_pending,
        stats.last_updated
    FROM public.frota_dashboard_stats_mv stats
    WHERE stats.company_id = p_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_frota_dashboard_stats(UUID) IS 
'Retorna estatísticas do módulo Frota usando view materializada otimizada';

-- =====================================================
-- 3. FUNÇÃO: get_almoxarifado_dashboard_stats()
-- Estatísticas do módulo Almoxarifado usando view materializada
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_almoxarifado_dashboard_stats(
    p_company_id UUID
)
RETURNS TABLE (
    total_almoxarifados BIGINT,
    active_almoxarifados BIGINT,
    total_materials_equipment BIGINT,
    active_materials_equipment BIGINT,
    materials_in_stock BIGINT,
    total_stock_value NUMERIC,
    items_below_minimum BIGINT,
    items_above_maximum BIGINT,
    movements_last_30_days BIGINT,
    movements_entrada_last_30_days BIGINT,
    movements_saida_last_30_days BIGINT,
    entries_pending BIGINT,
    transfers_pending BIGINT,
    inventories_in_progress BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stats.total_almoxarifados,
        stats.active_almoxarifados,
        stats.total_materials_equipment,
        stats.active_materials_equipment,
        stats.materials_in_stock,
        stats.total_stock_value,
        stats.items_below_minimum,
        stats.items_above_maximum,
        stats.movements_last_30_days,
        stats.movements_entrada_last_30_days,
        stats.movements_saida_last_30_days,
        stats.entries_pending,
        stats.transfers_pending,
        stats.inventories_in_progress,
        stats.last_updated
    FROM public.almoxarifado_dashboard_stats_mv stats
    WHERE stats.company_id = p_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_almoxarifado_dashboard_stats(UUID) IS 
'Retorna estatísticas do módulo Almoxarifado usando view materializada otimizada';

-- =====================================================
-- 4. FUNÇÃO: get_time_records_for_export()
-- Registros de ponto otimizados para exportação (sem campos pesados)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_time_records_for_export(
    p_company_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    employee_nome TEXT,
    employee_matricula TEXT,
    data_registro DATE,
    entrada TIME,
    saida TIME,
    entrada_almoco TIME,
    saida_almoco TIME,
    horas_trabalhadas NUMERIC,
    horas_extras NUMERIC,
    horas_faltas NUMERIC,
    status TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.employee_id,
        e.nome::TEXT as employee_nome,
        e.matricula::TEXT as employee_matricula,
        tr.data_registro,
        tr.entrada,
        tr.saida,
        tr.entrada_almoco,
        tr.saida_almoco,
        tr.horas_trabalhadas,
        tr.horas_extras,
        tr.horas_faltas,
        tr.status::TEXT,
        tr.observacoes,
        tr.created_at
    FROM rh.time_records tr
    JOIN rh.employees e ON e.id = tr.employee_id
    WHERE tr.company_id = p_company_id
        AND (p_start_date IS NULL OR tr.data_registro >= p_start_date)
        AND (p_end_date IS NULL OR tr.data_registro <= p_end_date)
        AND (p_status IS NULL OR tr.status = p_status)
    ORDER BY tr.data_registro DESC, tr.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_time_records_for_export(UUID, DATE, DATE, TEXT, INTEGER, INTEGER) IS 
'Retorna registros de ponto otimizados para exportação (sem campos JSONB pesados)';

-- =====================================================
-- 5. FUNÇÃO: get_employees_for_export()
-- Funcionários otimizados para exportação (sem campos pesados)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_employees_for_export(
    p_company_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    nome TEXT,
    matricula TEXT,
    cpf TEXT,
    rg TEXT,
    data_nascimento DATE,
    data_admissao DATE,
    data_demissao DATE,
    cargo_nome TEXT,
    departamento_nome TEXT,
    salario_base NUMERIC,
    status TEXT,
    telefone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.nome::TEXT,
        e.matricula::TEXT,
        e.cpf::TEXT,
        e.rg::TEXT,
        e.data_nascimento,
        e.data_admissao,
        e.data_demissao,
        p.nome::TEXT as cargo_nome,
        u.nome::TEXT as departamento_nome,
        e.salario_base,
        e.status::TEXT,
        e.telefone::TEXT,
        e.email::TEXT,
        e.created_at
    FROM rh.employees e
    LEFT JOIN rh.positions p ON p.id = e.cargo_id
    LEFT JOIN rh.units u ON u.id = e.departamento_id
    WHERE e.company_id = p_company_id
        AND (p_status IS NULL OR e.status = p_status)
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_employees_for_export(UUID, TEXT, INTEGER, INTEGER) IS 
'Retorna funcionários otimizados para exportação (sem campos JSONB pesados)';

-- =====================================================
-- 6. FUNÇÃO: get_dashboard_stats()
-- Estatísticas gerais do sistema usando view materializada
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_company_id UUID
)
RETURNS TABLE (
    total_employees BIGINT,
    active_employees BIGINT,
    inactive_employees BIGINT,
    time_records_last_30_days BIGINT,
    total_trainings BIGINT,
    active_trainings BIGINT,
    total_vehicles BIGINT,
    active_vehicles BIGINT,
    total_materials_in_stock BIGINT,
    total_stock_value NUMERIC,
    total_projects BIGINT,
    active_projects BIGINT,
    total_cost_centers BIGINT,
    total_partners BIGINT,
    active_partners BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stats.total_employees,
        stats.active_employees,
        stats.inactive_employees,
        stats.time_records_last_30_days,
        stats.total_trainings,
        stats.active_trainings,
        stats.total_vehicles,
        stats.active_vehicles,
        stats.total_materials_in_stock,
        stats.total_stock_value,
        stats.total_projects,
        stats.active_projects,
        stats.total_cost_centers,
        stats.total_partners,
        stats.active_partners,
        stats.last_updated
    FROM public.dashboard_stats_mv stats
    WHERE stats.company_id = p_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats(UUID) IS 
'Retorna estatísticas gerais do sistema usando view materializada otimizada';

-- =====================================================
-- 7. FUNÇÃO: get_financial_dashboard_stats()
-- Estatísticas do módulo Financeiro usando view materializada
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_financial_dashboard_stats(
    p_company_id UUID
)
RETURNS TABLE (
    accounts_payable_pending BIGINT,
    accounts_payable_paid BIGINT,
    accounts_payable_pending_value NUMERIC,
    accounts_payable_paid_value NUMERIC,
    accounts_receivable_pending BIGINT,
    accounts_receivable_received BIGINT,
    accounts_receivable_pending_value NUMERIC,
    accounts_receivable_received_value NUMERIC,
    cash_flow_entrada_last_30_days NUMERIC,
    cash_flow_saida_last_30_days NUMERIC,
    accounting_entries_last_30_days BIGINT,
    approvals_pending BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stats.accounts_payable_pending,
        stats.accounts_payable_paid,
        stats.accounts_payable_pending_value,
        stats.accounts_payable_paid_value,
        stats.accounts_receivable_pending,
        stats.accounts_receivable_received,
        stats.accounts_receivable_pending_value,
        stats.accounts_receivable_received_value,
        stats.cash_flow_entrada_last_30_days,
        stats.cash_flow_saida_last_30_days,
        stats.accounting_entries_last_30_days,
        stats.approvals_pending,
        stats.last_updated
    FROM public.financial_dashboard_stats_mv stats
    WHERE stats.company_id = p_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_financial_dashboard_stats(UUID) IS 
'Retorna estatísticas do módulo Financeiro usando view materializada otimizada';

-- =====================================================
-- PERMISSÕES
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_rh_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_frota_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_almoxarifado_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_time_records_for_export(UUID, DATE, DATE, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employees_for_export(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard_stats(UUID) TO authenticated;

