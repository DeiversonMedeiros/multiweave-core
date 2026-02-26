-- =====================================================
-- Adicionar updated_at em almoxarifado.inventarios
-- =====================================================
-- Motivo: A RPC update_entity_data sempre adiciona "updated_at = now()"
-- ao SET. Sem esta coluna, o UPDATE falha com erro de coluna inexistente.
-- =====================================================

ALTER TABLE almoxarifado.inventarios
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN almoxarifado.inventarios.updated_at IS 'Atualizado automaticamente pelo RPC update_entity_data';
