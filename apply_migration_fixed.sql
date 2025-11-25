-- Aplicar migração corrigida
\i supabase/migrations/20251109000001_create_dashboard_materialized_views.sql
\i supabase/migrations/20251109000002_create_refresh_statistics_views_function.sql
SELECT public.refresh_all_statistics_views();

