-- =====================================================
-- FUNÇÕES PARA CONVÊNIOS MÉDICOS NA FOLHA DE PAGAMENTO
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Funções para buscar descontos de convênios médicos na folha de pagamento

-- Função para buscar descontos de convênios médicos de um funcionário
CREATE OR REPLACE FUNCTION get_employee_medical_plan_discounts(
  company_id_param UUID,
  employee_id_param UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  employee_id UUID,
  plan_id UUID,
  plan_name TEXT,
  agreement_name TEXT,
  plan_type TEXT,
  category TEXT,
  discount_type TEXT,
  monthly_value DECIMAL(10,2),
  employee_discount_percent DECIMAL(5,2),
  final_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN,
  enters_payroll BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    emp.id,
    emp.employee_id,
    emp.plan_id,
    mp.nome as plan_name,
    ma.nome as agreement_name,
    ma.tipo as plan_type,
    mp.categoria_desconto as category,
    mp.tipo_folha as discount_type,
    emp.valor_mensal as monthly_value,
    mp.desconto_funcionario as employee_discount_percent,
    emp.valor_mensal as final_value, -- Já vem com desconto aplicado
    emp.data_inicio as start_date,
    emp.data_fim as end_date,
    (emp.status = 'ativo') as is_active,
    emp.entra_no_calculo_folha as enters_payroll
  FROM rh.employee_medical_plans emp
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE emp.company_id = company_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (employee_id_param IS NULL OR emp.employee_id = employee_id_param)
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE
  ORDER BY emp.employee_id, ma.nome, mp.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar descontos de convênios médicos (apenas descontos)
CREATE OR REPLACE FUNCTION get_employee_medical_plan_discounts_only(
  company_id_param UUID,
  employee_id_param UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  employee_id UUID,
  plan_id UUID,
  plan_name TEXT,
  agreement_name TEXT,
  plan_type TEXT,
  category TEXT,
  monthly_value DECIMAL(10,2),
  final_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    emp.id,
    emp.employee_id,
    emp.plan_id,
    mp.nome as plan_name,
    ma.nome as agreement_name,
    ma.tipo as plan_type,
    mp.categoria_desconto as category,
    emp.valor_mensal as monthly_value,
    emp.valor_mensal as final_value,
    emp.data_inicio as start_date,
    emp.data_fim as end_date,
    (emp.status = 'ativo') as is_active
  FROM rh.employee_medical_plans emp
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE emp.company_id = company_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND mp.tipo_folha = 'desconto'
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (employee_id_param IS NULL OR emp.employee_id = employee_id_param)
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE
  ORDER BY emp.employee_id, ma.nome, mp.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular total de descontos de convênios médicos
CREATE OR REPLACE FUNCTION calculate_medical_plan_discounts_total(
  company_id_param UUID,
  employee_id_param UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_discounts DECIMAL(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(emp.valor_mensal), 0)
  INTO total_discounts
  FROM rh.employee_medical_plans emp
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE emp.company_id = company_id_param
    AND emp.employee_id = employee_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND mp.tipo_folha = 'desconto'
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE;
    
  RETURN total_discounts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular total de benefícios de convênios médicos (proventos)
CREATE OR REPLACE FUNCTION calculate_medical_plan_benefits_total(
  company_id_param UUID,
  employee_id_param UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_benefits DECIMAL(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(emp.valor_mensal), 0)
  INTO total_benefits
  FROM rh.employee_medical_plans emp
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE emp.company_id = company_id_param
    AND emp.employee_id = employee_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND mp.tipo_folha = 'provento'
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE;
    
  RETURN total_benefits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função unificada para buscar todos os convênios médicos (descontos + benefícios)
CREATE OR REPLACE FUNCTION get_employee_all_medical_plans(
  company_id_param UUID,
  employee_id_param UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  employee_id UUID,
  plan_id UUID,
  plan_name TEXT,
  agreement_name TEXT,
  plan_type TEXT,
  category TEXT,
  discount_type TEXT,
  monthly_value DECIMAL(10,2),
  final_value DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN,
  enters_payroll BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    emp.id,
    emp.employee_id,
    emp.plan_id,
    mp.nome as plan_name,
    ma.nome as agreement_name,
    ma.tipo as plan_type,
    mp.categoria_desconto as category,
    mp.tipo_folha as discount_type,
    emp.valor_mensal as monthly_value,
    emp.valor_mensal as final_value,
    emp.data_inicio as start_date,
    emp.data_fim as end_date,
    (emp.status = 'ativo') as is_active,
    emp.entra_no_calculo_folha as enters_payroll
  FROM rh.employee_medical_plans emp
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE emp.company_id = company_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (employee_id_param IS NULL OR emp.employee_id = employee_id_param)
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE
  ORDER BY emp.employee_id, mp.tipo_folha, ma.nome, mp.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION get_employee_medical_plan_discounts IS 'Busca todos os convênios médicos de funcionário que entram no cálculo da folha';
COMMENT ON FUNCTION get_employee_medical_plan_discounts_only IS 'Busca apenas descontos de convênios médicos de funcionário';
COMMENT ON FUNCTION calculate_medical_plan_discounts_total IS 'Calcula o total de descontos de convênios médicos para um funcionário';
COMMENT ON FUNCTION calculate_medical_plan_benefits_total IS 'Calcula o total de benefícios de convênios médicos para um funcionário';
COMMENT ON FUNCTION get_employee_all_medical_plans IS 'Busca todos os convênios médicos de funcionário (descontos + benefícios)';
