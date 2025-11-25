-- =====================================================
-- ADICIONAR CAMPOS DE FOLHA DE PAGAMENTO EM CONTAS A PAGAR
-- Data: 2025-11-15
-- Descrição: Adiciona campos para rastrear folha de pagamento nas contas a pagar
-- =====================================================

-- Adicionar campos payroll_id e employee_id na tabela contas_pagar
ALTER TABLE financeiro.contas_pagar
ADD COLUMN IF NOT EXISTS payroll_id UUID,
ADD COLUMN IF NOT EXISTS employee_id UUID;

-- Adicionar comentários
COMMENT ON COLUMN financeiro.contas_pagar.payroll_id IS 'ID da folha de pagamento relacionada';
COMMENT ON COLUMN financeiro.contas_pagar.employee_id IS 'ID do funcionário relacionado à folha de pagamento';

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_pagar_payroll_id ON financeiro.contas_pagar(payroll_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_employee_id ON financeiro.contas_pagar(employee_id);

-- Adicionar foreign keys (opcional, pode causar problemas se já existirem registros)
-- ALTER TABLE financeiro.contas_pagar
-- ADD CONSTRAINT contas_pagar_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES rh.payroll(id) ON DELETE SET NULL,
-- ADD CONSTRAINT contas_pagar_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE SET NULL;

