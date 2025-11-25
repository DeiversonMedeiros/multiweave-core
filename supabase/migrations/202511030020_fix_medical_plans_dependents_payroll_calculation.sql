-- =====================================================
-- CORREÇÃO: INCLUIR DEPENDENTES NO CÁLCULO DA FOLHA
-- =====================================================
-- Data: 2025-11-03
-- Descrição: Corrige as funções de cálculo da folha para incluir valores dos dependentes dos convênios médicos

-- Função para calcular total de descontos de convênios médicos (incluindo dependentes)
CREATE OR REPLACE FUNCTION calculate_medical_plan_discounts_total(
  company_id_param UUID,
  employee_id_param UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_discounts DECIMAL(10,2) := 0;
  titular_discounts DECIMAL(10,2) := 0;
  dependents_discounts DECIMAL(10,2) := 0;
BEGIN
  -- Calcular descontos do titular (funcionário)
  SELECT COALESCE(SUM(emp.valor_mensal), 0)
  INTO titular_discounts
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

  -- Calcular descontos dos dependentes (somando valores de dependentes ativos)
  SELECT COALESCE(SUM(epd.valor_mensal), 0)
  INTO dependents_discounts
  FROM rh.employee_plan_dependents epd
  INNER JOIN rh.employee_medical_plans emp ON epd.employee_plan_id = emp.id
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE epd.company_id = company_id_param
    AND emp.employee_id = employee_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND mp.tipo_folha = 'desconto'
    AND epd.status = 'ativo'
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE
    AND (epd.data_exclusao IS NULL OR epd.data_exclusao >= CURRENT_DATE)
    AND epd.data_inclusao <= CURRENT_DATE;

  -- Total = titular + dependentes
  total_discounts := titular_discounts + dependents_discounts;
  
  RETURN total_discounts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular total de benefícios de convênios médicos (incluindo dependentes)
CREATE OR REPLACE FUNCTION calculate_medical_plan_benefits_total(
  company_id_param UUID,
  employee_id_param UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_benefits DECIMAL(10,2) := 0;
  titular_benefits DECIMAL(10,2) := 0;
  dependents_benefits DECIMAL(10,2) := 0;
BEGIN
  -- Calcular benefícios do titular (funcionário)
  SELECT COALESCE(SUM(emp.valor_mensal), 0)
  INTO titular_benefits
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

  -- Calcular benefícios dos dependentes (somando valores de dependentes ativos)
  SELECT COALESCE(SUM(epd.valor_mensal), 0)
  INTO dependents_benefits
  FROM rh.employee_plan_dependents epd
  INNER JOIN rh.employee_medical_plans emp ON epd.employee_plan_id = emp.id
  INNER JOIN rh.medical_plans mp ON emp.plan_id = mp.id
  INNER JOIN rh.medical_agreements ma ON mp.agreement_id = ma.id
  WHERE epd.company_id = company_id_param
    AND emp.employee_id = employee_id_param
    AND emp.entra_no_calculo_folha = true
    AND mp.entra_no_calculo_folha = true
    AND mp.tipo_folha = 'provento'
    AND epd.status = 'ativo'
    AND emp.status = 'ativo'
    AND mp.ativo = true
    AND ma.ativo = true
    AND (emp.data_fim IS NULL OR emp.data_fim >= CURRENT_DATE)
    AND emp.data_inicio <= CURRENT_DATE
    AND (epd.data_exclusao IS NULL OR epd.data_exclusao >= CURRENT_DATE)
    AND epd.data_inclusao <= CURRENT_DATE;

  -- Total = titular + dependentes
  total_benefits := titular_benefits + dependents_benefits;
  
  RETURN total_benefits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar comentários das funções
COMMENT ON FUNCTION calculate_medical_plan_discounts_total IS 'Calcula o total de descontos de convênios médicos para um funcionário (incluindo valores do titular e dependentes)';
COMMENT ON FUNCTION calculate_medical_plan_benefits_total IS 'Calcula o total de benefícios de convênios médicos para um funcionário (incluindo valores do titular e dependentes)';

