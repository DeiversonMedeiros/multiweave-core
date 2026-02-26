-- =====================================================
-- MIGRAÇÃO: Add updated_at em almoxarifado.entradas_materiais
-- Data: 2026-02-24
-- Descrição:
--   A função genérica public.update_entity_data sempre adiciona
--   "updated_at = now()" no UPDATE. Algumas tabelas antigas,
--   incluindo almoxarifado.entradas_materiais, não tinham essa
--   coluna e isso gerava erros como:
--     [update_entity_data] Erro ao atualizar dados:
--     column "updated_at" of relation "entradas_materiais" does not exist
--   Esta migração garante a existência da coluna e inicializa
--   com created_at para registros antigos.
-- =====================================================

ALTER TABLE almoxarifado.entradas_materiais
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Preencher updated_at para linhas existentes (caso esteja nulo)
UPDATE almoxarifado.entradas_materiais
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

