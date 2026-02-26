-- =====================================================
-- MIGRAÇÃO: Quarentena por item em entrada de materiais
-- Data: 2026-02-21
-- Descrição:
--   Permite marcar itens da entrada como "em quarentena" quando algo está fora do padrão.
--   O item permanece em quarentena até ser liberado; ao retirar da quarentena,
--   a quantidade aprovada pode ser lançada no estoque.
-- =====================================================

ALTER TABLE almoxarifado.entrada_itens
  ADD COLUMN IF NOT EXISTS em_quarentena BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quarentena_motivo TEXT,
  ADD COLUMN IF NOT EXISTS quarentena_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS quarentena_retirada_em TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_entrada_itens_em_quarentena
  ON almoxarifado.entrada_itens(em_quarentena) WHERE em_quarentena = true;

COMMENT ON COLUMN almoxarifado.entrada_itens.em_quarentena IS
  'Se true, o item está em quarentena (não entra no estoque disponível até ser liberado).';
COMMENT ON COLUMN almoxarifado.entrada_itens.quarentena_motivo IS
  'Motivo/observação do problema que levou à quarentena.';
COMMENT ON COLUMN almoxarifado.entrada_itens.quarentena_em IS
  'Data/hora em que o item foi colocado em quarentena.';
COMMENT ON COLUMN almoxarifado.entrada_itens.quarentena_retirada_em IS
  'Data/hora em que o item foi retirado da quarentena (problema corrigido).';
