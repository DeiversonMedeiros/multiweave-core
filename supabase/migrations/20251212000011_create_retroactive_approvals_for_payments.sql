-- =====================================================
-- CRIAR APROVAÇÕES RETROATIVAS PARA PAGAMENTOS EXISTENTES
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria aprovações para pagamentos mensais que já existem
--            mas não têm aprovações criadas

DO $$
DECLARE
  v_payment RECORD;
  v_count INTEGER := 0;
  v_result BOOLEAN;
BEGIN
  -- Iterar sobre todos os pagamentos pendentes de aprovação que não têm aprovação criada
  FOR v_payment IN
    SELECT erpm.id, erpm.company_id
    FROM rh.equipment_rental_monthly_payments erpm
    WHERE erpm.status = 'pendente_aprovacao'
      AND NOT EXISTS (
        SELECT 1 
        FROM public.aprovacoes_unificada au
        WHERE au.processo_tipo = 'equipment_rental_monthly_payment'
          AND au.processo_id = erpm.id
      )
  LOOP
    -- Criar aprovação para este pagamento
    SELECT create_approvals_for_equipment_rental_monthly_payment(
      v_payment.id,
      v_payment.company_id
    ) INTO v_result;
    
    IF v_result THEN
      v_count := v_count + 1;
      RAISE NOTICE 'Aprovação criada para pagamento: %', v_payment.id;
    ELSE
      RAISE WARNING 'Falha ao criar aprovação para pagamento: %', v_payment.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total: Criadas % aprovações retroativas para pagamentos mensais', v_count;
END;
$$;
