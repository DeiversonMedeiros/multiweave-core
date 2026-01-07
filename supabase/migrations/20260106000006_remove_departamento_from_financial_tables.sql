-- =====================================================
-- MIGRATION: Remover campo departamento das tabelas financeiras
-- =====================================================
-- Data: 2026-01-06
-- Descrição: Remove o campo "departamento" das tabelas contas_pagar e contas_receber
-- Autor: Sistema MultiWeave Core
-- =====================================================

-- Remover coluna departamento da tabela financeiro.contas_pagar
ALTER TABLE IF EXISTS financeiro.contas_pagar 
DROP COLUMN IF EXISTS departamento;

-- Remover coluna departamento da tabela financeiro.contas_receber
ALTER TABLE IF EXISTS financeiro.contas_receber 
DROP COLUMN IF EXISTS departamento;

-- Comentário de confirmação
COMMENT ON TABLE financeiro.contas_pagar IS 'Tabela de contas a pagar - campo departamento removido em 2026-01-06';
COMMENT ON TABLE financeiro.contas_receber IS 'Tabela de contas a receber - campo departamento removido em 2026-01-06';

