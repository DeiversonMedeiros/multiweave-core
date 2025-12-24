-- =====================================================
-- MIGRAÇÃO: Adicionar campos extras em cotacao_fornecedores
-- Data....: 2025-12-20
-- Objetivo:
--   - Adicionar campos de frete, imposto e desconto por fornecedor
--   - Permitir cálculo de totais mais precisos na cotação
-- =====================================================

-- Adicionar campos extras na tabela cotacao_fornecedores
ALTER TABLE compras.cotacao_fornecedores
    ADD COLUMN IF NOT EXISTS valor_frete NUMERIC(15,2) DEFAULT 0 CHECK (valor_frete >= 0),
    ADD COLUMN IF NOT EXISTS valor_imposto NUMERIC(15,2) DEFAULT 0 CHECK (valor_imposto >= 0),
    ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(7,4) DEFAULT 0 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
    ADD COLUMN IF NOT EXISTS desconto_valor NUMERIC(15,2) DEFAULT 0 CHECK (desconto_valor >= 0);

COMMENT ON COLUMN compras.cotacao_fornecedores.valor_frete IS 'Valor do frete cobrado pelo fornecedor';
COMMENT ON COLUMN compras.cotacao_fornecedores.valor_imposto IS 'Valor de impostos cobrados pelo fornecedor';
COMMENT ON COLUMN compras.cotacao_fornecedores.desconto_percentual IS 'Desconto percentual aplicado sobre o total dos itens';
COMMENT ON COLUMN compras.cotacao_fornecedores.desconto_valor IS 'Desconto em valor absoluto aplicado sobre o total dos itens';

