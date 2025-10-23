-- =====================================================
-- REMOÇÃO DA TABELA SCHEDULE_PLANNING
-- =====================================================

-- Remover políticas RLS primeiro
DROP POLICY IF EXISTS "Users can view schedule_planning from their company" ON rh.schedule_planning;
DROP POLICY IF EXISTS "Users can insert schedule_planning in their company" ON rh.schedule_planning;
DROP POLICY IF EXISTS "Users can update schedule_planning from their company" ON rh.schedule_planning;
DROP POLICY IF EXISTS "Users can delete schedule_planning from their company" ON rh.schedule_planning;

-- Remover trigger
DROP TRIGGER IF EXISTS trigger_update_schedule_planning_updated_at ON rh.schedule_planning;

-- Remover função do trigger
DROP FUNCTION IF EXISTS update_schedule_planning_updated_at();

-- Remover índices
DROP INDEX IF EXISTS idx_schedule_planning_company_id;
DROP INDEX IF EXISTS idx_schedule_planning_periodo_inicio;
DROP INDEX IF EXISTS idx_schedule_planning_periodo_fim;
DROP INDEX IF EXISTS idx_schedule_planning_status;

-- Remover a tabela
DROP TABLE IF EXISTS rh.schedule_planning;

-- Comentário de confirmação
COMMENT ON SCHEMA rh IS 'Schema RH - Tabela schedule_planning removida em 2025-01-21';
