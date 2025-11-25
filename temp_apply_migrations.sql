-- =====================================================
-- FASE 1.1: VIEWS MATERIALIZADAS PARA DASHBOARDS
-- Sistema: MultiWeave Core
-- Data: 2025-11-09
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_stats_mv AS
SELECT 
    c.id as company_id,
    c.razao_social as company_name,
    COUNT(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL) as total_employees,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ativo') as active_employees,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'inativo') as inactive_employees,
    COUNT(DISTINCT tr.id) FILTER (
        WHERE tr.id IS NOT NULL 
        AND tr.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as time_records_last_30_days,
    COUNT(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL) as total_trainings,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_active = true) as active_trainings,
    (SELECT COUNT(*) FROM frota.vehicles v WHERE v.company_id = c.id) as total_vehicles,
    (SELECT COUNT(*) FROM frota.vehicles v WHERE v.company_id = c.id AND v.situacao = 'ativo') as active_vehicles,
    (SELECT COUNT(DISTINCT ea.material_equipamento_id) 
     FROM almoxarifado.estoque_atual ea 
     WHERE ea.company_id = c.id) as total_materials_in_stock,
    (SELECT COALESCE(SUM(ea.quantidade_atual * COALESCE(me.valor_unitario, 0)), 0)
     FROM almoxarifado.estoque_atual ea
     JOIN almoxarifado.materiais_equipamentos me ON ea.material_equipamento_id = me.id
     WHERE ea.company_id = c.id) as total_stock_value,
    COUNT(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) as total_projects,
    COUNT(DISTINCT p.id) FILTER (WHERE p.ativo = true) as active_projects,
    COUNT(DISTINCT cc.id) FILTER (WHERE cc.id IS NOT NULL) as total_cost_centers,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.id IS NOT NULL) as total_partners,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.ativo = true) as active_partners,
    NOW() as last_updated
FROM public.companies c
LEFT JOIN rh.employees e ON e.company_id = c.id
LEFT JOIN rh.time_records tr ON tr.employee_id = e.id
LEFT JOIN rh.trainings t ON t.company_id = c.id
LEFT JOIN public.projects p ON p.company_id = c.id
LEFT JOIN public.cost_centers cc ON cc.company_id = c.id
LEFT JOIN public.partners pt ON pt.company_id = c.id
WHERE c.ativo = true
GROUP BY c.id, c.razao_social;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_stats_mv_company_id_idx 
ON public.dashboard_stats_mv (company_id);

CREATE INDEX IF NOT EXISTS dashboard_stats_mv_company_name_idx 
ON public.dashboard_stats_mv (company_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.rh_dashboard_stats_mv AS
SELECT 
    e.company_id,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ativo') as employees_active,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'inativo') as employees_inactive,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'afastado') as employees_on_leave,
    COUNT(DISTINCT tr.id) FILTER (
        WHERE tr.status = 'pendente' 
        AND tr.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as time_records_pending,
    COUNT(DISTINCT tr.id) FILTER (
        WHERE tr.status = 'aprovado' 
        AND tr.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as time_records_approved,
    COUNT(DISTINCT tr.id) FILTER (
        WHERE tr.status = 'rejeitado' 
        AND tr.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as time_records_rejected,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_active = true) as trainings_active,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_active = false) as trainings_inactive,
    COUNT(DISTINCT pe.id) FILTER (
        WHERE pe.data_vencimento < CURRENT_DATE 
        AND pe.status != 'realizado'
    ) as periodic_exams_overdue,
    COUNT(DISTINCT pe.id) FILTER (
        WHERE pe.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND pe.status != 'realizado'
    ) as periodic_exams_due_soon,
    COUNT(DISTINCT ad.id) FILTER (
        WHERE ad.created_at >= CURRENT_DATE - INTERVAL '30 days'
    ) as disciplinary_actions_last_30_days,
    (SELECT COUNT(*) 
     FROM rh.vacations v 
     WHERE v.company_id = e.company_id 
     AND v.status = 'pendente') as vacations_pending,
    (SELECT COUNT(*) 
     FROM rh.compensation_requests cr 
     WHERE cr.company_id = e.company_id 
     AND cr.status = 'pendente') as compensations_pending,
    (SELECT COUNT(*) 
     FROM rh.reimbursement_requests rr 
     WHERE rr.company_id = e.company_id 
     AND rr.status = 'pendente') as reimbursements_pending,
    (SELECT COUNT(*) 
     FROM rh.medical_certificates mc 
     WHERE mc.company_id = e.company_id 
     AND mc.status = 'pendente') as medical_certificates_pending,
    NOW() as last_updated
FROM rh.employees e
LEFT JOIN rh.time_records tr ON tr.employee_id = e.id
LEFT JOIN rh.trainings t ON t.company_id = e.company_id
LEFT JOIN rh.periodic_exams pe ON pe.employee_id = e.id
LEFT JOIN rh.acoes_disciplinares ad ON ad.employee_id = e.id
WHERE e.company_id IS NOT NULL
GROUP BY e.company_id;

CREATE UNIQUE INDEX IF NOT EXISTS rh_dashboard_stats_mv_company_id_idx 
ON public.rh_dashboard_stats_mv (company_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.frota_dashboard_stats_mv AS
SELECT 
    v.company_id,
    COUNT(DISTINCT v.id) FILTER (WHERE v.tipo = 'proprio') as vehicles_own,
    COUNT(DISTINCT v.id) FILTER (WHERE v.tipo = 'locado') as vehicles_rented,
    COUNT(DISTINCT v.id) FILTER (WHERE v.tipo = 'agregado') as vehicles_aggregated,
    COUNT(DISTINCT v.id) FILTER (WHERE v.situacao = 'ativo') as vehicles_active,
    COUNT(DISTINCT v.id) FILTER (WHERE v.situacao = 'inativo') as vehicles_inactive,
    COUNT(DISTINCT v.id) FILTER (WHERE v.situacao = 'manutencao') as vehicles_maintenance,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'pendente') as maintenances_pending,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'em_execucao') as maintenances_in_progress,
    COUNT(DISTINCT m.id) FILTER (
        WHERE m.data_agendada BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND m.status = 'pendente'
    ) as maintenances_scheduled_next_30_days,
    COUNT(DISTINCT i.id) FILTER (
        WHERE i.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as incidents_last_30_days,
    COUNT(DISTINCT i.id) FILTER (
        WHERE i.data >= CURRENT_DATE - INTERVAL '30 days'
        AND i.status = 'pendente'
    ) as incidents_pending,
    COUNT(DISTINCT ins.id) FILTER (
        WHERE ins.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as inspections_last_30_days,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pendente') as requests_pending,
    NOW() as last_updated
FROM frota.vehicles v
LEFT JOIN frota.vehicle_maintenances m ON m.vehicle_id = v.id
LEFT JOIN frota.incidents i ON i.vehicle_id = v.id
LEFT JOIN frota.inspections ins ON ins.vehicle_id = v.id
LEFT JOIN frota.requests r ON r.vehicle_id = v.id
WHERE v.company_id IS NOT NULL
GROUP BY v.company_id;

CREATE UNIQUE INDEX IF NOT EXISTS frota_dashboard_stats_mv_company_id_idx 
ON public.frota_dashboard_stats_mv (company_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.almoxarifado_dashboard_stats_mv AS
SELECT 
    a.company_id,
    COUNT(DISTINCT a.id) as total_almoxarifados,
    COUNT(DISTINCT a.id) FILTER (WHERE a.ativo = true) as active_almoxarifados,
    COUNT(DISTINCT me.id) as total_materials_equipment,
    COUNT(DISTINCT me.id) FILTER (WHERE me.status = 'ativo') as active_materials_equipment,
    COUNT(DISTINCT ea.material_equipamento_id) as materials_in_stock,
    COALESCE(SUM(ea.quantidade_atual * COALESCE(me.valor_unitario, 0)), 0) as total_stock_value,
    COUNT(DISTINCT ea.material_equipamento_id) FILTER (
        WHERE ea.quantidade_atual <= COALESCE(me.estoque_minimo, 0)
    ) as items_below_minimum,
    COUNT(DISTINCT ea.material_equipamento_id) FILTER (
        WHERE me.estoque_maximo IS NOT NULL 
        AND ea.quantidade_atual > me.estoque_maximo
    ) as items_above_maximum,
    COUNT(DISTINCT mo.id) FILTER (
        WHERE mo.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as movements_last_30_days,
    COUNT(DISTINCT mo.id) FILTER (
        WHERE mo.data >= CURRENT_DATE - INTERVAL '30 days'
        AND mo.tipo = 'entrada'
    ) as movements_entrada_last_30_days,
    COUNT(DISTINCT mo.id) FILTER (
        WHERE mo.data >= CURRENT_DATE - INTERVAL '30 days'
        AND mo.tipo = 'saida'
    ) as movements_saida_last_30_days,
    COUNT(DISTINCT em.id) FILTER (WHERE em.status = 'pendente') as entries_pending,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pendente') as transfers_pending,
    COUNT(DISTINCT inv.id) FILTER (WHERE inv.status = 'em_andamento') as inventories_in_progress,
    NOW() as last_updated
FROM almoxarifado.almoxarifados a
LEFT JOIN almoxarifado.materiais_equipamentos me ON me.company_id = a.company_id
LEFT JOIN almoxarifado.estoque_atual ea ON ea.company_id = a.company_id
LEFT JOIN almoxarifado.movimentacoes_estoque mo ON mo.company_id = a.company_id
LEFT JOIN almoxarifado.entradas_materiais em ON em.company_id = a.company_id
LEFT JOIN almoxarifado.transferencias t ON t.company_id = a.company_id
LEFT JOIN almoxarifado.inventarios inv ON inv.company_id = a.company_id
WHERE a.company_id IS NOT NULL
GROUP BY a.company_id;

CREATE UNIQUE INDEX IF NOT EXISTS almoxarifado_dashboard_stats_mv_company_id_idx 
ON public.almoxarifado_dashboard_stats_mv (company_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.financial_dashboard_stats_mv AS
SELECT 
    COALESCE(cp.company_id, cr.company_id) as company_id,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'pendente') as accounts_payable_pending,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'pago') as accounts_payable_paid,
    COALESCE(SUM(cp.valor) FILTER (WHERE cp.status = 'pendente'), 0) as accounts_payable_pending_value,
    COALESCE(SUM(cp.valor) FILTER (WHERE cp.status = 'pago'), 0) as accounts_payable_paid_value,
    COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'pendente') as accounts_receivable_pending,
    COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'recebido') as accounts_receivable_received,
    COALESCE(SUM(cr.valor) FILTER (WHERE cr.status = 'pendente'), 0) as accounts_receivable_pending_value,
    COALESCE(SUM(cr.valor) FILTER (WHERE cr.status = 'recebido'), 0) as accounts_receivable_received_value,
    COALESCE(SUM(fc.valor) FILTER (
        WHERE fc.data >= CURRENT_DATE - INTERVAL '30 days'
        AND fc.tipo = 'entrada'
    ), 0) as cash_flow_entrada_last_30_days,
    COALESCE(SUM(fc.valor) FILTER (
        WHERE fc.data >= CURRENT_DATE - INTERVAL '30 days'
        AND fc.tipo = 'saida'
    ), 0) as cash_flow_saida_last_30_days,
    COUNT(DISTINCT lc.id) FILTER (
        WHERE lc.data >= CURRENT_DATE - INTERVAL '30 days'
    ) as accounting_entries_last_30_days,
    COUNT(DISTINCT ap.id) FILTER (WHERE ap.status = 'pendente') as approvals_pending,
    NOW() as last_updated
FROM financeiro.contas_pagar cp
FULL OUTER JOIN financeiro.contas_receber cr ON cr.company_id = cp.company_id
FULL OUTER JOIN financeiro.fluxo_caixa fc ON fc.company_id = COALESCE(cp.company_id, cr.company_id)
FULL OUTER JOIN financeiro.lancamentos_contabeis lc ON lc.company_id = COALESCE(cp.company_id, cr.company_id)
FULL OUTER JOIN financeiro.aprovacoes ap ON ap.company_id = COALESCE(cp.company_id, cr.company_id)
WHERE COALESCE(cp.company_id, cr.company_id) IS NOT NULL
GROUP BY COALESCE(cp.company_id, cr.company_id);

CREATE UNIQUE INDEX IF NOT EXISTS financial_dashboard_stats_mv_company_id_idx 
ON public.financial_dashboard_stats_mv (company_id);

ALTER MATERIALIZED VIEW public.dashboard_stats_mv SET (security_invoker = true);
ALTER MATERIALIZED VIEW public.rh_dashboard_stats_mv SET (security_invoker = true);
ALTER MATERIALIZED VIEW public.frota_dashboard_stats_mv SET (security_invoker = true);
ALTER MATERIALIZED VIEW public.almoxarifado_dashboard_stats_mv SET (security_invoker = true);
ALTER MATERIALIZED VIEW public.financial_dashboard_stats_mv SET (security_invoker = true);

GRANT SELECT ON public.dashboard_stats_mv TO authenticated;
GRANT SELECT ON public.rh_dashboard_stats_mv TO authenticated;
GRANT SELECT ON public.frota_dashboard_stats_mv TO authenticated;
GRANT SELECT ON public.almoxarifado_dashboard_stats_mv TO authenticated;
GRANT SELECT ON public.financial_dashboard_stats_mv TO authenticated;

-- Funções de Refresh
CREATE OR REPLACE FUNCTION public.refresh_all_statistics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.rh_dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.frota_dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.almoxarifado_dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.financial_dashboard_stats_mv;
    RAISE NOTICE 'Views materializadas atualizadas com sucesso em %', NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_statistics_view(view_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE view_name
        WHEN 'dashboard_stats' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats_mv;
        WHEN 'rh_dashboard_stats' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY public.rh_dashboard_stats_mv;
        WHEN 'frota_dashboard_stats' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY public.frota_dashboard_stats_mv;
        WHEN 'almoxarifado_dashboard_stats' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY public.almoxarifado_dashboard_stats_mv;
        WHEN 'financial_dashboard_stats' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY public.financial_dashboard_stats_mv;
        ELSE
            RAISE EXCEPTION 'View materializada não encontrada: %', view_name;
    END CASE;
    RAISE NOTICE 'View materializada % atualizada com sucesso em %', view_name, NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_all_statistics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_statistics_view(TEXT) TO authenticated;

-- Executar refresh inicial
SELECT public.refresh_all_statistics_views();

