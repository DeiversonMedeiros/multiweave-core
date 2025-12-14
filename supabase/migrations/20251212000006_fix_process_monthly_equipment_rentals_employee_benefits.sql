-- =====================================================
-- CORREÇÃO: process_monthly_equipment_rentals
-- Buscar também de employee_benefit_assignments
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Modifica a função para buscar benefícios também de employee_benefit_assignments
--            onde benefit_type = 'equipment_rental', não apenas de equipment_rental_approvals

CREATE OR REPLACE FUNCTION process_monthly_equipment_rentals(
  p_company_id UUID,
  p_month_reference INTEGER,
  p_year_reference INTEGER,
  p_processed_by UUID
) RETURNS INTEGER AS $$
DECLARE
  v_equipment_rental RECORD;
  v_calculation RECORD;
  v_payment_id UUID;
  v_count INTEGER := 0;
  v_cost_center_id UUID;
  v_classe_financeira_id UUID;
BEGIN
  -- Buscar classe financeira do benefício de aluguel de equipamentos
  SELECT classe_financeira_id INTO v_classe_financeira_id
  FROM rh.benefit_configurations
  WHERE company_id = p_company_id
    AND benefit_type = 'equipment_rental'
    AND is_active = true
  LIMIT 1;

  -- Iterar sobre aluguéis ativos da empresa
  -- Buscar de duas fontes:
  -- 1. equipment_rental_approvals (aprovações específicas de aluguel)
  -- 2. employee_benefit_assignments (benefícios cadastrados com tipo equipment_rental)
  FOR v_equipment_rental IN
    -- Buscar de equipment_rental_approvals
    SELECT 
      era.id, 
      era.employee_id, 
      era.company_id, 
      era.valor_mensal,
      e.cost_center_id,
      'equipment_rental_approval' as source_type,
      era.id as source_id
    FROM rh.equipment_rental_approvals era
    JOIN rh.employees e ON e.id = era.employee_id
    WHERE era.company_id = p_company_id
      AND era.status IN ('aprovado', 'ativo')
      AND (
        era.data_fim IS NULL 
        OR (era.data_fim >= MAKE_DATE(p_year_reference, p_month_reference, 1))
      )
      AND era.data_inicio <= (DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE
    
    UNION ALL
    
    -- Buscar de employee_benefit_assignments onde benefit_type = 'equipment_rental'
    SELECT 
      eba.id, 
      eba.employee_id, 
      eba.company_id, 
      COALESCE(eba.custom_value, bc.base_value, 0) as valor_mensal,
      e.cost_center_id,
      'employee_benefit_assignment' as source_type,
      eba.id as source_id
    FROM rh.employee_benefit_assignments eba
    JOIN rh.benefit_configurations bc ON bc.id = eba.benefit_config_id
    JOIN rh.employees e ON e.id = eba.employee_id
    WHERE eba.company_id = p_company_id
      AND eba.is_active = true
      AND bc.benefit_type = 'equipment_rental'
      AND bc.is_active = true
      AND (
        eba.end_date IS NULL 
        OR (eba.end_date >= MAKE_DATE(p_year_reference, p_month_reference, 1))
      )
      AND eba.start_date <= (DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE
  LOOP
    -- Verificar se já existe pagamento para este período
    -- Se for de equipment_rental_approvals, verificar por equipment_rental_approval_id
    -- Se for de employee_benefit_assignments, verificar por employee_id, valor e período
    IF v_equipment_rental.source_type = 'equipment_rental_approval' THEN
      SELECT id INTO v_payment_id
      FROM rh.equipment_rental_monthly_payments
      WHERE equipment_rental_approval_id = v_equipment_rental.source_id
        AND month_reference = p_month_reference
        AND year_reference = p_year_reference;
    ELSE
      -- Para employee_benefit_assignments, verificar se já existe pagamento para este employee_benefit_assignment e período
      -- Verificar por employee_id, valor e período (comparando valores com tolerância)
      SELECT id INTO v_payment_id
      FROM rh.equipment_rental_monthly_payments
      WHERE employee_id = v_equipment_rental.employee_id
        AND month_reference = p_month_reference
        AND year_reference = p_year_reference
        AND equipment_rental_approval_id IS NULL
        AND ABS(valor_base - v_equipment_rental.valor_mensal) < 0.01  -- Comparar valores (tolerância para decimais)
      LIMIT 1;
    END IF;

    -- Se já existe, pular
    IF v_payment_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Calcular valor mensal
    -- Se for de equipment_rental_approvals, usar a função calculate_equipment_rental_monthly_value
    -- Se for de employee_benefit_assignments, calcular diretamente
    IF v_equipment_rental.source_type = 'equipment_rental_approval' THEN
      SELECT * INTO v_calculation
      FROM calculate_equipment_rental_monthly_value(
        v_equipment_rental.source_id,
        p_month_reference,
        p_year_reference
      );
    ELSE
      -- Para employee_benefit_assignments, usar valor mensal direto
      -- Inicializar o record usando SELECT para evitar erro "record is not assigned yet"
      SELECT 
        v_equipment_rental.valor_mensal as valor_base,
        30 as dias_trabalhados,
        0 as dias_ausencia,
        0 as desconto_ausencia,
        v_equipment_rental.valor_mensal as valor_calculado
      INTO v_calculation;
    END IF;

    -- Criar registro de pagamento com centro de custo e classe financeira
    INSERT INTO rh.equipment_rental_monthly_payments (
      equipment_rental_approval_id,
      employee_id,
      company_id,
      month_reference,
      year_reference,
      valor_base,
      dias_trabalhados,
      dias_ausencia,
      desconto_ausencia,
      valor_calculado,
      valor_aprovado,
      status,
      cost_center_id,
      classe_financeira_id,
      processado_por,
      processado_em
    ) VALUES (
      CASE WHEN v_equipment_rental.source_type = 'equipment_rental_approval' THEN v_equipment_rental.source_id ELSE NULL END,
      v_equipment_rental.employee_id,
      v_equipment_rental.company_id,
      p_month_reference,
      p_year_reference,
      v_calculation.valor_base,
      v_calculation.dias_trabalhados,
      v_calculation.dias_ausencia,
      v_calculation.desconto_ausencia,
      v_calculation.valor_calculado,
      v_calculation.valor_calculado, -- Inicialmente, valor aprovado = valor calculado
      'pendente_aprovacao',
      v_equipment_rental.cost_center_id,
      v_classe_financeira_id,
      p_processed_by,
      NOW()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_monthly_equipment_rentals IS 'Processa pagamentos mensais de aluguéis, buscando de equipment_rental_approvals e employee_benefit_assignments, gravando centro de custo e classe financeira';
