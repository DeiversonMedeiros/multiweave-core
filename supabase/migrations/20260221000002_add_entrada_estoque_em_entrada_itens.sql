-- =====================================================
-- MIGRAÇÃO: Marcar itens que já tiveram entrada no estoque
-- Data: 2026-02-21
-- Descrição:
--   Coluna entrada_estoque_em: quando preenchida, o item já foi lançado
--   no estoque (almoxarifado.estoque_atual) e não deve ser editável no modal.
-- =====================================================

ALTER TABLE almoxarifado.entrada_itens
  ADD COLUMN IF NOT EXISTS entrada_estoque_em TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_entrada_itens_entrada_estoque_em
  ON almoxarifado.entrada_itens(entrada_estoque_em) WHERE entrada_estoque_em IS NOT NULL;

COMMENT ON COLUMN almoxarifado.entrada_itens.entrada_estoque_em IS
  'Data/hora em que a quantidade aprovada foi lançada no estoque. Quando preenchido, o item fica indisponível para edição.';
