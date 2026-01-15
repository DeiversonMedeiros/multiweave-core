-- =====================================================
-- Migration: Adicionar status de validação na folha de pagamento
-- =====================================================
-- Descrição: Adiciona os status 'em_revisao' e 'validado' 
--            para controlar o fluxo de aprovação da folha

-- 1. Remover constraint antiga
ALTER TABLE rh.payroll 
DROP CONSTRAINT IF EXISTS payroll_status_check;

-- 2. Adicionar nova constraint com os novos status
ALTER TABLE rh.payroll 
ADD CONSTRAINT payroll_status_check 
CHECK (status IN ('pendente', 'em_revisao', 'processado', 'validado', 'pago', 'cancelado'));

-- 3. Adicionar comentário explicativo
COMMENT ON COLUMN rh.payroll.status IS 
'Status da folha: pendente (inicial), em_revisao (gerada, aguardando revisão RH), processado (calculado), validado (aprovado pelo RH, visível para colaborador), pago (pago), cancelado (cancelado)';

-- 4. Atualizar folhas existentes com status 'processado' para 'em_revisao' se necessário
-- (opcional - apenas se quiser migrar dados existentes)
-- UPDATE rh.payroll SET status = 'em_revisao' WHERE status = 'processado';
