-- =====================================================
-- MIGRAÇÃO: Adicionar Condição de Recebimento e Impostos
-- =====================================================
-- Data: 2025-12-06
-- Descrição: Adiciona campos de condição de recebimento e impostos (PIS, COFINS, CSLL, IR, INSS, ISS) na tabela contas_receber
-- Autor: Sistema MultiWeave Core

-- Adicionar campo condicao_recebimento (dias: 30, 45, 60, 90)
ALTER TABLE financeiro.contas_receber
ADD COLUMN IF NOT EXISTS condicao_recebimento INTEGER;

-- Adicionar campos de impostos
ALTER TABLE financeiro.contas_receber
ADD COLUMN IF NOT EXISTS valor_pis DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_cofins DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_csll DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_ir DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_inss DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_iss DECIMAL(15,2) DEFAULT 0;

-- Adicionar constraint para validar condição de recebimento
ALTER TABLE financeiro.contas_receber
ADD CONSTRAINT contas_receber_condicao_recebimento_check 
CHECK (condicao_recebimento IS NULL OR condicao_recebimento IN (30, 45, 60, 90));

-- Adicionar comentários
COMMENT ON COLUMN financeiro.contas_receber.condicao_recebimento IS 'Condição de recebimento em dias (30, 45, 60 ou 90 dias)';
COMMENT ON COLUMN financeiro.contas_receber.valor_pis IS 'Valor do imposto PIS';
COMMENT ON COLUMN financeiro.contas_receber.valor_cofins IS 'Valor do imposto COFINS';
COMMENT ON COLUMN financeiro.contas_receber.valor_csll IS 'Valor do imposto CSLL';
COMMENT ON COLUMN financeiro.contas_receber.valor_ir IS 'Valor do imposto IR';
COMMENT ON COLUMN financeiro.contas_receber.valor_inss IS 'Valor do imposto INSS';
COMMENT ON COLUMN financeiro.contas_receber.valor_iss IS 'Valor do imposto ISS';

