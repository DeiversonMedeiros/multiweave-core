-- =====================================================
-- CORREÇÃO: Usar user_id em vez de profile_id para aprovador_id
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Corrige a função create_approvals_for_equipment_rental_monthly_payment
--            para usar user_id diretamente, pois aprovador_id referencia users(id)

CREATE OR REPLACE FUNCTION create_approvals_for_equipment_rental_monthly_payment(
  p_payment_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_payment RECORD;
  v_gestor_user_id UUID;
  v_approval_created BOOLEAN := false;
BEGIN
  -- Buscar dados do pagamento
  SELECT 
    erpm.*,
    e.gestor_imediato_id,
    e.nome as employee_name
  INTO v_payment
  FROM rh.equipment_rental_monthly_payments erpm
  JOIN rh.employees e ON e.id = erpm.employee_id
  WHERE erpm.id = p_payment_id
    AND erpm.company_id = p_company_id
    AND erpm.status = 'pendente_aprovacao';

  IF NOT FOUND THEN
    RAISE NOTICE '[create_approvals_for_equipment_rental_monthly_payment] Pagamento não encontrado: %', p_payment_id;
    RETURN false;
  END IF;

  RAISE NOTICE '[create_approvals_for_equipment_rental_monthly_payment] Processando pagamento: %, gestor_imediato_id: %', p_payment_id, v_payment.gestor_imediato_id;

  -- Se o funcionário tem gestor imediato, criar aprovação para ele
  IF v_payment.gestor_imediato_id IS NOT NULL THEN
    -- gestor_imediato_id já é um user_id (da tabela users)
    -- Verificar se o user_id existe na tabela users
    SELECT id INTO v_gestor_user_id
    FROM public.users
    WHERE id = v_payment.gestor_imediato_id;

    IF v_gestor_user_id IS NOT NULL THEN
      RAISE NOTICE '[create_approvals_for_equipment_rental_monthly_payment] Criando aprovação para gestor: %', v_gestor_user_id;
      
      -- Criar aprovação na tabela unificada
      INSERT INTO public.aprovacoes_unificada (
        company_id,
        processo_tipo,
        processo_id,
        nivel_aprovacao,
        aprovador_id,
        aprovador_original_id,
        status
      ) VALUES (
        p_company_id,
        'equipment_rental_monthly_payment',
        p_payment_id,
        1, -- Nível 1 para aprovação do gestor
        v_gestor_user_id,
        v_gestor_user_id,
        'pendente'
      )
      ON CONFLICT DO NOTHING; -- Evitar duplicatas

      v_approval_created := true;
    ELSE
      RAISE WARNING '[create_approvals_for_equipment_rental_monthly_payment] Gestor não encontrado na tabela users: %', v_payment.gestor_imediato_id;
    END IF;
  ELSE
    RAISE NOTICE '[create_approvals_for_equipment_rental_monthly_payment] Funcionário não tem gestor imediato';
  END IF;

  -- Também criar aprovações baseadas em configurações (se houver)
  -- Isso permite configurações mais complexas de aprovação
  PERFORM public.create_approvals_for_process(
    'equipment_rental_monthly_payment',
    p_payment_id,
    p_company_id
  );

  RETURN v_approval_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_approvals_for_equipment_rental_monthly_payment IS 'Cria aprovações automáticas para pagamento mensal de aluguel, identificando gestor do funcionário (usa user_id diretamente)';

-- =====================================================
-- CORREÇÃO: create_approvals_for_equipment_rental_approval
-- =====================================================

CREATE OR REPLACE FUNCTION create_approvals_for_equipment_rental_approval(
  p_equipment_rental_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_equipment_rental RECORD;
  v_gestor_user_id UUID;
  v_approval_created BOOLEAN := false;
BEGIN
  -- Buscar dados do aluguel de equipamento
  SELECT 
    era.*,
    e.gestor_imediato_id,
    e.nome as employee_name
  INTO v_equipment_rental
  FROM rh.equipment_rental_approvals era
  JOIN rh.employees e ON e.id = era.employee_id
  WHERE era.id = p_equipment_rental_id
    AND era.company_id = p_company_id
    AND era.status = 'pendente';

  IF NOT FOUND THEN
    RAISE NOTICE '[create_approvals_for_equipment_rental_approval] Aluguel não encontrado: %', p_equipment_rental_id;
    RETURN false;
  END IF;

  RAISE NOTICE '[create_approvals_for_equipment_rental_approval] Processando aluguel: %, gestor_imediato_id: %', p_equipment_rental_id, v_equipment_rental.gestor_imediato_id;

  -- Se o funcionário tem gestor imediato, criar aprovação para ele
  IF v_equipment_rental.gestor_imediato_id IS NOT NULL THEN
    -- gestor_imediato_id já é um user_id (da tabela users)
    -- Verificar se o user_id existe na tabela users
    SELECT id INTO v_gestor_user_id
    FROM public.users
    WHERE id = v_equipment_rental.gestor_imediato_id;

    IF v_gestor_user_id IS NOT NULL THEN
      RAISE NOTICE '[create_approvals_for_equipment_rental_approval] Criando aprovação para gestor: %', v_gestor_user_id;
      
      -- Verificar se já existe aprovação antes de inserir
      IF NOT EXISTS (
        SELECT 1 
        FROM public.aprovacoes_unificada 
        WHERE processo_tipo = 'equipment_rental_approval'
          AND processo_id = p_equipment_rental_id
          AND aprovador_id = v_gestor_user_id
      ) THEN
        -- Criar aprovação na tabela unificada
        INSERT INTO public.aprovacoes_unificada (
          company_id,
          processo_tipo,
          processo_id,
          nivel_aprovacao,
          aprovador_id,
          aprovador_original_id,
          status
        ) VALUES (
          p_company_id,
          'equipment_rental_approval',
          p_equipment_rental_id,
          1, -- Nível 1 para aprovação do gestor
          v_gestor_user_id,
          v_gestor_user_id,
          'pendente'
        );
        
        RAISE NOTICE '[create_approvals_for_equipment_rental_approval] Aprovação inserida com sucesso';
      ELSE
        RAISE NOTICE '[create_approvals_for_equipment_rental_approval] Aprovação já existe, pulando inserção';
      END IF;

      v_approval_created := true;
    ELSE
      RAISE WARNING '[create_approvals_for_equipment_rental_approval] Gestor não encontrado na tabela users: %', v_equipment_rental.gestor_imediato_id;
    END IF;
  ELSE
    RAISE NOTICE '[create_approvals_for_equipment_rental_approval] Funcionário não tem gestor imediato';
  END IF;

  -- Também criar aprovações baseadas em configurações (se houver)
  PERFORM public.create_approvals_for_process(
    'equipment_rental_approval',
    p_equipment_rental_id,
    p_company_id
  );

  RETURN v_approval_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_approvals_for_equipment_rental_approval IS 'Cria aprovações automáticas para aluguel de equipamento inicial, identificando gestor do funcionário (usa user_id diretamente)';
