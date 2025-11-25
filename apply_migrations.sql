-- Aplicar migração 1: Views Materializadas
\i supabase/migrations/20251109000001_create_dashboard_materialized_views.sql

-- Aplicar migração 2: Funções de Refresh
\i supabase/migrations/20251109000002_create_refresh_statistics_views_function.sql

-- Executar refresh inicial
SELECT public.refresh_all_statistics_views();

