-- Migration: Campos de nota fiscal em entradas_materiais (Série, Tipo de Documento, Chave de acesso)
-- Uso: modal "Confirmar Recebimento de Materiais" em almoxarifado/entradas

ALTER TABLE almoxarifado.entradas_materiais
  ADD COLUMN IF NOT EXISTS serie_nota_fiscal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tipo_documento_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chave_acesso VARCHAR(44);

COMMENT ON COLUMN almoxarifado.entradas_materiais.serie_nota_fiscal IS 'Série da nota fiscal (ex.: 1, 2)';
COMMENT ON COLUMN almoxarifado.entradas_materiais.tipo_documento_fiscal IS 'Tipo do documento fiscal (ex.: NF-e, NFC-e, CT-e)';
COMMENT ON COLUMN almoxarifado.entradas_materiais.chave_acesso IS 'Chave de acesso da NF-e (44 dígitos)';
