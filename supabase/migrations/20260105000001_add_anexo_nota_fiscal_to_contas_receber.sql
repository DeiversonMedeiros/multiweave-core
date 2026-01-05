-- =====================================================
-- MIGRAÇÃO: ADICIONAR CAMPO DE ANEXO DE NOTA FISCAL
-- Data: 2026-01-05
-- Descrição: Adiciona campo específico para anexo de nota fiscal na tabela contas_receber
-- =====================================================

-- Adicionar campo de anexo específico para nota fiscal
ALTER TABLE financeiro.contas_receber
ADD COLUMN IF NOT EXISTS anexo_nota_fiscal TEXT;

-- Comentário para documentação
COMMENT ON COLUMN financeiro.contas_receber.anexo_nota_fiscal IS 'URL ou caminho do arquivo de nota fiscal anexado';

-- Nota: O bucket 'notas-fiscais' já foi criado anteriormente e pode ser usado
-- tanto para contas a pagar quanto para contas a receber

