-- =====================================================
-- ATUALIZAR CÁLCULO DE BENEFÍCIOS NA FOLHA
-- =====================================================
-- Data: 2025-11-03
-- Descrição: Atualiza função de cálculo de benefícios para considerar dias reais de trabalho

-- Remover funções antigas para evitar conflito de assinatura
DROP FUNCTION IF EXISTS get_employee_payroll_benefits(UUID, UUID);
DROP FUNCTION IF EXISTS calculate_payroll_benefits_total(UUID, UUID);

-- Criar função atualizada para calcular benefícios diários baseado em dias reais
CREATE OR REPLACE FUNCTION get_employee_payroll_benefits(
  company_id_param UUID,
  employee_id_param UUID DEFAULT NULL,
  month_param INTEGER DEFAULT NULL,
  year_param INTEGER DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  employee_id UUID,
  benefit_config_id UUID,
  benefit_name TEXT,
  benefit_type TEXT,
  calculation_type TEXT,
  custom_value DECIMAL(10,2),
  calculated_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN,
  entra_no_calculo_folha BOOLEAN
) AS $$
DECLARE
  start_date_calc DATE;
  end_date_calc DATE;
BEGIN
  -- Determinar período de cálculo
  IF month_param IS NOT NULL AND year_param IS NOT NULL THEN
    -- Primeiro e último dia do mês
    start_date_calc := DATE(year_param || '-' || LPAD(month_param::TEXT, 2, '0') || '-01');
    end_date_calc := (DATE(year_param || '-' || LPAD(month_param::TEXT, 2, '0') || '-01') + INTERVAL '1 month - 1 day')::DATE;
  ELSE
    -- Se não especificado, usar mês atual
    start_date_calc := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    end_date_calc := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  RETURN QUERY
  SELECT 
    eba.id,
    eba.employee_id,
    eba.benefit_config_id,
    bc.name as benefit_name,
    bc.benefit_type,
    bc.calculation_type,
    eba.custom_value,
    -- Calcular valor baseado no tipo de cálculo
    CASE 
      WHEN eba.custom_value IS NOT NULL AND eba.custom_value > 0 THEN
        eba.custom_value
      WHEN bc.calculation_type = 'daily_value' THEN
        -- Usar função de cálculo de dias reais
        calculate_daily_benefit_value(
          company_id_param,
          eba.employee_id,
          eba.benefit_config_id,
          GREATEST(eba.start_date, start_date_calc),
          LEAST(COALESCE(eba.end_date, end_date_calc), end_date_calc)
        )
      WHEN bc.calculation_type = 'work_days' THEN
        -- Calcular baseado em dias trabalhados reais
        bc.base_value * calculate_working_days_for_benefits(
          company_id_param,
          eba.employee_id,
          GREATEST(eba.start_date, start_date_calc),
          LEAST(COALESCE(eba.end_date, end_date_calc), end_date_calc)
        )::DECIMAL
      ELSE
        COALESCE(eba.custom_value, bc.base_value, 0)
    END as calculated_value,
    eba.start_date,
    eba.end_date,
    eba.is_active,
    bc.entra_no_calculo_folha
  FROM rh.employee_benefit_assignments eba
  INNER JOIN rh.benefit_configurations bc ON eba.benefit_config_id = bc.id
  WHERE eba.company_id = company_id_param
    AND eba.is_active = true
    AND bc.is_active = true
    AND bc.entra_no_calculo_folha = true
    AND (employee_id_param IS NULL OR eba.employee_id = employee_id_param)
    AND (eba.end_date IS NULL OR eba.end_date >= start_date_calc)
    AND eba.start_date <= end_date_calc
  ORDER BY eba.employee_id, bc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função de cálculo total
CREATE OR REPLACE FUNCTION calculate_payroll_benefits_total(
  company_id_param UUID,
  employee_id_param UUID,
  month_param INTEGER DEFAULT NULL,
  year_param INTEGER DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_benefits DECIMAL(10,2) := 0;
  start_date_calc DATE;
  end_date_calc DATE;
BEGIN
  -- Determinar período de cálculo
  IF month_param IS NOT NULL AND year_param IS NOT NULL THEN
    start_date_calc := DATE(year_param || '-' || LPAD(month_param::TEXT, 2, '0') || '-01');
    end_date_calc := (DATE(year_param || '-' || LPAD(month_param::TEXT, 2, '0') || '-01') + INTERVAL '1 month - 1 day')::DATE;
  ELSE
    start_date_calc := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    end_date_calc := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  SELECT COALESCE(SUM(
    CASE 
      WHEN eba.custom_value IS NOT NULL AND eba.custom_value > 0 THEN
        eba.custom_value
      WHEN bc.calculation_type = 'daily_value' THEN
        calculate_daily_benefit_value(
          company_id_param,
          eba.employee_id,
          eba.benefit_config_id,
          GREATEST(eba.start_date, start_date_calc),
          LEAST(COALESCE(eba.end_date, end_date_calc), end_date_calc)
        )
      WHEN bc.calculation_type = 'work_days' THEN
        bc.base_value * calculate_working_days_for_benefits(
          company_id_param,
          eba.employee_id,
          GREATEST(eba.start_date, start_date_calc),
          LEAST(COALESCE(eba.end_date, end_date_calc), end_date_calc)
        )::DECIMAL
      ELSE
        COALESCE(eba.custom_value, bc.base_value, 0)
    END
  ), 0)
  INTO total_benefits
  FROM rh.employee_benefit_assignments eba
  INNER JOIN rh.benefit_configurations bc ON eba.benefit_config_id = bc.id
  WHERE eba.company_id = company_id_param
    AND eba.employee_id = employee_id_param
    AND eba.is_active = true
    AND bc.is_active = true
    AND bc.entra_no_calculo_folha = true
    AND (eba.end_date IS NULL OR eba.end_date >= start_date_calc)
    AND eba.start_date <= end_date_calc;
    
  RETURN total_benefits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar comentários
COMMENT ON FUNCTION get_employee_payroll_benefits IS 'Busca benefícios de funcionário que entram no cálculo da folha, calculando valores baseados em dias reais de trabalho';
COMMENT ON FUNCTION calculate_payroll_benefits_total IS 'Calcula o total de benefícios que entram na folha considerando dias reais de trabalho';

