-- =====================================================
-- MIGRAÇÃO: REMOVER TABELA EVENT_CONSOLIDATIONS
-- =====================================================
-- Data: 2025-12-20
-- Descrição: Remove a tabela event_consolidations que não é mais necessária
--            após unificação do processo de folha de pagamento
-- =====================================================

-- Remover tabela event_consolidations (não mais necessária após unificação)
DROP TABLE IF EXISTS rh.event_consolidations CASCADE;

-- Comentário explicativo
COMMENT ON SCHEMA rh IS 'Schema de Recursos Humanos - Tabela event_consolidations removida em 2025-12-20 após unificação do processo de folha de pagamento';

