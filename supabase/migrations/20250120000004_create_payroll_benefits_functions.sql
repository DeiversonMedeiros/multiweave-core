-- =====================================================
-- FUNÇÕES PARA BENEFÍCIOS NA FOLHA DE PAGAMENTO
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Funções para buscar benefícios que entram no cálculo da folha

-- Função para buscar benefícios de funcionário que entram na folha
CREATE OR REPLACE FUNCTION get_employee_payroll_benefits(
  company_id_param UUID,
  employee_id_param UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  employee_id UUID,
  benefit_config_id UUID,
  benefit_name TEXT,
  benefit_type TEXT,
  custom_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN,
  entra_no_calculo_folha BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eba.id,
    eba.employee_id,
    eba.benefit_config_id,
    bc.name as benefit_name,
    bc.benefit_type,
    eba.custom_value,
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
    AND (eba.end_date IS NULL OR eba.end_date >= CURRENT_DATE)
    AND eba.start_date <= CURRENT_DATE
  ORDER BY eba.employee_id, bc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar benefícios de funcionário (todos, incluindo os que não entram na folha)
CREATE OR REPLACE FUNCTION get_employee_all_benefits(
  company_id_param UUID,
  employee_id_param UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  employee_id UUID,
  benefit_config_id UUID,
  benefit_name TEXT,
  benefit_type TEXT,
  custom_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN,
  entra_no_calculo_folha BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eba.id,
    eba.employee_id,
    eba.benefit_config_id,
    bc.name as benefit_name,
    bc.benefit_type,
    eba.custom_value,
    eba.start_date,
    eba.end_date,
    eba.is_active,
    bc.entra_no_calculo_folha
  FROM rh.employee_benefit_assignments eba
  INNER JOIN rh.benefit_configurations bc ON eba.benefit_config_id = bc.id
  WHERE eba.company_id = company_id_param
    AND eba.is_active = true
    AND bc.is_active = true
    AND (employee_id_param IS NULL OR eba.employee_id = employee_id_param)
    AND (eba.end_date IS NULL OR eba.end_date >= CURRENT_DATE)
    AND eba.start_date <= CURRENT_DATE
  ORDER BY eba.employee_id, bc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular total de benefícios que entram na folha
CREATE OR REPLACE FUNCTION calculate_payroll_benefits_total(
  company_id_param UUID,
  employee_id_param UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_benefits DECIMAL(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(COALESCE(eba.custom_value, bc.base_value, 0)), 0)
  INTO total_benefits
  FROM rh.employee_benefit_assignments eba
  INNER JOIN rh.benefit_configurations bc ON eba.benefit_config_id = bc.id
  WHERE eba.company_id = company_id_param
    AND eba.employee_id = employee_id_param
    AND eba.is_active = true
    AND bc.is_active = true
    AND bc.entra_no_calculo_folha = true
    AND (eba.end_date IS NULL OR eba.end_date >= CURRENT_DATE)
    AND eba.start_date <= CURRENT_DATE;
    
  RETURN total_benefits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION get_employee_payroll_benefits IS 'Busca benefícios de funcionário que entram no cálculo da folha de pagamento';
COMMENT ON FUNCTION get_employee_all_benefits IS 'Busca todos os benefícios de funcionário (incluindo os que não entram na folha)';
COMMENT ON FUNCTION calculate_payroll_benefits_total IS 'Calcula o total de benefícios que entram na folha de pagamento para um funcionário';
