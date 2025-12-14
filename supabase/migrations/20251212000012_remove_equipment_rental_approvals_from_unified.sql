-- =====================================================
-- REMOVER TRIGGERS DE APROVAÇÕES UNIFICADAS
-- As aprovações devem ser feitas diretamente nas tabelas
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Remove os triggers que criam aprovações em aprovacoes_unificada
--            As aprovações devem ser feitas diretamente em equipment_rental_approvals
--            e equipment_rental_monthly_payments

-- Remover trigger de equipment_rental_monthly_payments
DROP TRIGGER IF EXISTS trigger_create_approvals_equipment_rental_monthly_payment ON rh.equipment_rental_monthly_payments;

-- Remover trigger de equipment_rental_approvals
DROP TRIGGER IF EXISTS trigger_create_approvals_equipment_rental_approval ON rh.equipment_rental_approvals;

-- Remover aprovações existentes em aprovacoes_unificada para equipment_rental
DELETE FROM public.aprovacoes_unificada 
WHERE processo_tipo IN ('equipment_rental_monthly_payment', 'equipment_rental_approval');

COMMENT ON FUNCTION create_approvals_for_equipment_rental_monthly_payment IS 'DEPRECATED: Não usar mais. As aprovações devem ser feitas diretamente na tabela equipment_rental_monthly_payments';
COMMENT ON FUNCTION create_approvals_for_equipment_rental_approval IS 'DEPRECATED: Não usar mais. As aprovações devem ser feitas diretamente na tabela equipment_rental_approvals';
