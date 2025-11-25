-- =====================================================
-- FASE 1.1: FUNÇÃO DE REFRESH DAS VIEWS MATERIALIZADAS
-- Sistema: MultiWeave Core
-- Data: 2025-11-09
-- Descrição: Função para atualizar todas as views materializadas
--           e triggers/jobs para atualização automática
-- =====================================================

-- =====================================================
-- FUNÇÃO PRINCIPAL: REFRESH_ALL_STATISTICS_VIEWS
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_all_statistics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualizar todas as views materializadas de forma concorrente
    -- CONCURRENTLY permite leituras durante a atualização
    
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.rh_dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.frota_dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.almoxarifado_dashboard_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.financial_dashboard_stats_mv;
    
    -- Log de atualização (opcional - pode ser removido se não houver tabela de logs)
    RAISE NOTICE 'Views materializadas atualizadas com sucesso em %', NOW();
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.refresh_all_statistics_views() IS 
'Atualiza todas as views materializadas de estatísticas do sistema. Pode ser chamada manualmente ou via trigger/job agendado.';

-- =====================================================
-- FUNÇÃO PARA REFRESH DE UMA VIEW ESPECÍFICA
-- =====================================================

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

COMMENT ON FUNCTION public.refresh_statistics_view(TEXT) IS 
'Atualiza uma view materializada específica. Valores aceitos: dashboard_stats, rh_dashboard_stats, frota_dashboard_stats, almoxarifado_dashboard_stats, financial_dashboard_stats';

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================
-- NOTA: Triggers em cada tabela podem ser pesados.
-- Recomenda-se usar jobs agendados (pg_cron) em vez de triggers
-- para grandes volumes de dados.

-- Função genérica para trigger de refresh
CREATE OR REPLACE FUNCTION public.trigger_refresh_statistics_views()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Usar NOTIFY para evitar bloqueios
    -- A atualização real será feita via job agendado ou manualmente
    PERFORM pg_notify('refresh_statistics_views', '');
    RETURN NULL;
END;
$$;

-- =====================================================
-- TRIGGERS OPCIONAIS (Comentados - usar apenas se necessário)
-- =====================================================
-- Descomentar apenas se o volume de dados for baixo
-- Para grandes volumes, usar jobs agendados é mais eficiente

/*
-- Trigger para atualizar quando houver mudanças em employees
CREATE TRIGGER refresh_stats_on_employees_change
    AFTER INSERT OR UPDATE OR DELETE ON rh.employees
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_refresh_statistics_views();

-- Trigger para atualizar quando houver mudanças em time_records
CREATE TRIGGER refresh_stats_on_time_records_change
    AFTER INSERT OR UPDATE OR DELETE ON rh.time_records
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_refresh_statistics_views();

-- Trigger para atualizar quando houver mudanças em vehicles
CREATE TRIGGER refresh_stats_on_vehicles_change
    AFTER INSERT OR UPDATE OR DELETE ON frota.vehicles
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_refresh_statistics_views();

-- Trigger para atualizar quando houver mudanças em estoque_atual
CREATE TRIGGER refresh_stats_on_estoque_change
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.estoque_atual
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_refresh_statistics_views();
*/

-- =====================================================
-- CONFIGURAÇÃO DE JOB AGENDADO (pg_cron)
-- =====================================================
-- Para usar jobs agendados, é necessário ter a extensão pg_cron instalada
-- Execute apenas se pg_cron estiver disponível no Supabase

/*
-- Atualizar views a cada hora
SELECT cron.schedule(
    'refresh-statistics-views-hourly',
    '0 * * * *', -- A cada hora
    'SELECT public.refresh_all_statistics_views();'
);

-- Atualizar views diariamente às 2h da manhã
SELECT cron.schedule(
    'refresh-statistics-views-daily',
    '0 2 * * *', -- Diariamente às 2h
    'SELECT public.refresh_all_statistics_views();'
);
*/

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- Para atualizar manualmente todas as views:
-- SELECT public.refresh_all_statistics_views();

-- Para atualizar uma view específica:
-- SELECT public.refresh_statistics_view('rh_dashboard_stats');

-- Para verificar quando foi a última atualização:
-- SELECT company_id, last_updated FROM public.dashboard_stats_mv LIMIT 1;

-- =====================================================
-- PERMISSÕES
-- =====================================================

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION public.refresh_all_statistics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_statistics_view(TEXT) TO authenticated;

