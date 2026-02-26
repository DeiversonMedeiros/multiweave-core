-- =====================================================
-- MIGRAÇÃO: Add updated_at em almoxarifado.entrada_itens
-- Data: 2026-02-24
-- Descrição:
--   A função genérica public.update_entity_data sempre adiciona
--   "updated_at = now()" no UPDATE. A tabela almoxarifado.entrada_itens
--   (no banco remoto, inspecionada via Supabase CLI) ainda não possui
--   essa coluna, gerando erros:
--     [update_entity_data] Erro ao atualizar dados:
--     column "updated_at" of relation "entrada_itens" does not exist
--   Esta migração cria a coluna e preenche um valor inicial para
--   registros existentes.
-- =====================================================

ALTER TABLE almoxarifado.entrada_itens
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Preencher updated_at para linhas existentes (caso esteja nulo)
-- Como a tabela não tem created_at próprio, usamos NOW() como fallback.
UPDATE almoxarifado.entrada_itens
SET updated_at = COALESCE(updated_at, NOW())
WHERE updated_at IS NULL;

