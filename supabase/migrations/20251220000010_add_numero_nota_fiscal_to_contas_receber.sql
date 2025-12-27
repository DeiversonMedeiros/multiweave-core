-- =====================================================
-- ADICIONAR CAMPO NUMERO_NOTA_FISCAL EM CONTAS A RECEBER
-- =====================================================
-- Data: 2025-12-20
-- Descrição: Adiciona campo para número da nota fiscal em contas a receber
-- Autor: Sistema MultiWeave Core

-- Adicionar campo numero_nota_fiscal na tabela contas_receber
ALTER TABLE financeiro.contas_receber
ADD COLUMN IF NOT EXISTS numero_nota_fiscal VARCHAR(50);

-- Comentário no campo
COMMENT ON COLUMN financeiro.contas_receber.numero_nota_fiscal IS 'Número da nota fiscal da conta a receber';

-- Nota: O bucket 'notas-fiscais' já foi criado na migração 20251220000008
-- e pode ser usado tanto para contas a pagar quanto para contas a receber

