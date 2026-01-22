-- =====================================================
-- MIGRAÇÃO: Adicionar vinculação pedido_id em contas_pagar
-- Data: 2026-01-21
-- Descrição: Adiciona foreign key para vincular conta a pagar ao pedido de compra
-- =====================================================

-- Adicionar coluna pedido_id
ALTER TABLE financeiro.contas_pagar
ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES compras.pedidos_compra(id) ON DELETE SET NULL;

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_contas_pagar_pedido_id ON financeiro.contas_pagar(pedido_id);

-- Comentário
COMMENT ON COLUMN financeiro.contas_pagar.pedido_id IS 'ID do pedido de compra que originou esta conta a pagar. Permite rastreabilidade completa: Cotação → Pedido → Conta a Pagar';
