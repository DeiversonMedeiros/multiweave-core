-- Campos de nota fiscal em contas_pagar e pedidos_compra
-- Uso: modal Conta a Pagar e modal Editar Pedido de Compra

-- 1. Contas a pagar (já tem numero_nota_fiscal)
ALTER TABLE financeiro.contas_pagar
  ADD COLUMN IF NOT EXISTS serie_nota_fiscal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tipo_documento_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chave_acesso VARCHAR(44);

COMMENT ON COLUMN financeiro.contas_pagar.serie_nota_fiscal IS 'Série da nota fiscal';
COMMENT ON COLUMN financeiro.contas_pagar.tipo_documento_fiscal IS 'Tipo do documento fiscal (NF-e, NFC-e, CT-e, etc.)';
COMMENT ON COLUMN financeiro.contas_pagar.chave_acesso IS 'Chave de acesso da NF-e (44 dígitos)';

-- 2. Pedidos de compra (inclui número da nota fiscal + mesmos campos)
ALTER TABLE compras.pedidos_compra
  ADD COLUMN IF NOT EXISTS numero_nota_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS serie_nota_fiscal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tipo_documento_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chave_acesso VARCHAR(44);

COMMENT ON COLUMN compras.pedidos_compra.numero_nota_fiscal IS 'Número da nota fiscal do pedido';
COMMENT ON COLUMN compras.pedidos_compra.serie_nota_fiscal IS 'Série da nota fiscal';
COMMENT ON COLUMN compras.pedidos_compra.tipo_documento_fiscal IS 'Tipo do documento fiscal (NF-e, NFC-e, CT-e, etc.)';
COMMENT ON COLUMN compras.pedidos_compra.chave_acesso IS 'Chave de acesso da NF-e (44 dígitos)';
