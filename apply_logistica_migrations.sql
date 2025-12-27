-- =====================================================
-- APLICAR TODAS AS MIGRAÇÕES DE LOGÍSTICA
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Aplicar migração 1: Schema de logística
\i supabase/migrations/20251220000020_create_logistica_schema.sql

-- Aplicar migração 2: Funções RPC
\i supabase/migrations/20251220000021_create_logistica_rpc_functions.sql

-- Aplicar migração 3: Integração com sistema de aprovações
\i supabase/migrations/20251220000022_add_logistica_to_approval_system.sql

