-- =====================================================
-- MIGRAÇÃO: Adicionar almoxarifado_id em almoxarifado.entrada_itens
-- Data: 2026-02-18
-- Descrição:
--   - Permite que cada item da entrada tenha seu próprio almoxarifado de destino.
--   - Cotação com múltiplos centros de custo pode ter mais de um almoxarifado
--     para o mesmo item; a entrada de materiais passa a aceitar isso por linha.
-- =====================================================

ALTER TABLE almoxarifado.entrada_itens
  ADD COLUMN IF NOT EXISTS almoxarifado_id UUID REFERENCES almoxarifado.almoxarifados(id);

CREATE INDEX IF NOT EXISTS idx_entrada_itens_almoxarifado_id
  ON almoxarifado.entrada_itens(almoxarifado_id);

COMMENT ON COLUMN almoxarifado.entrada_itens.almoxarifado_id IS
  'Almoxarifado de destino do item. Em cotação com múltiplos centros de custo, o mesmo material pode ter destinos diferentes por linha.';
