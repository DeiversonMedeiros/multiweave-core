-- Aplicar todas as migrações da FASE 1.1

-- Migração 1: Views Materializadas
\i supabase/migrations/20251109000001_create_dashboard_materialized_views.sql

-- Migração 2: Funções de Refresh  
\i supabase/migrations/20251109000002_create_refresh_statistics_views_function.sql

-- Refresh inicial
SELECT public.refresh_all_statistics_views();

