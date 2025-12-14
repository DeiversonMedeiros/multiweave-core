-- =====================================================
-- CORREÇÃO: Permitir NULL em equipment_rental_approval_id
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Altera a coluna equipment_rental_approval_id para permitir NULL,
--            pois pagamentos podem vir de employee_benefit_assignments

ALTER TABLE rh.equipment_rental_monthly_payments 
  ALTER COLUMN equipment_rental_approval_id DROP NOT NULL;

COMMENT ON COLUMN rh.equipment_rental_monthly_payments.equipment_rental_approval_id IS 
  'ID da aprovação de aluguel de equipamento (NULL quando vem de employee_benefit_assignments)';
