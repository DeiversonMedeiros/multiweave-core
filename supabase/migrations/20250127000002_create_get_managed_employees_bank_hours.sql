-- =====================================================
-- FUNÇÃO RPC: Buscar Banco de Horas dos Funcionários Sob Gestão
-- =====================================================
-- Retorna lista de funcionários sob gestão de um gestor com seus saldos de banco de horas
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_managed_employees_bank_hours(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS TABLE(
  employee_id UUID,
  employee_nome TEXT,
  employee_matricula TEXT,
  employee_cpf TEXT,
  employee_email TEXT,
  position_nome TEXT,
  unit_nome TEXT,
  current_balance DECIMAL(6,2),
  accumulated_hours DECIMAL(6,2),
  compensated_hours DECIMAL(6,2),
  expired_hours DECIMAL(6,2),
  last_calculation_date DATE,
  has_bank_hours BOOLEAN,
  bank_hours_config_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS employee_id,
    e.nome::TEXT AS employee_nome,
    e.matricula::TEXT AS employee_matricula,
    e.cpf::TEXT AS employee_cpf,
    e.email::TEXT AS employee_email,
    p.nome::TEXT AS position_nome,
    u.nome::TEXT AS unit_nome,
    COALESCE(bhb.current_balance, 0) AS current_balance,
    COALESCE(bhb.accumulated_hours, 0) AS accumulated_hours,
    COALESCE(bhb.compensated_hours, 0) AS compensated_hours,
    COALESCE(bhb.expired_hours, 0) AS expired_hours,
    bhb.last_calculation_date,
    -- Considerar bank_hours_assignments (sistema novo) ou bank_hours_config (sistema antigo)
    COALESCE(
      CASE 
        WHEN bha.id IS NOT NULL AND bht.has_bank_hours = true THEN true
        WHEN bhc.id IS NOT NULL AND bhc.has_bank_hours = true THEN true
        ELSE false
      END,
      false
    ) AS has_bank_hours,
    -- Retornar config_id se existir, senão assignment_id
    COALESCE(bhc.id, bha.id) AS bank_hours_config_id
  FROM rh.employees e
  LEFT JOIN rh.positions p ON p.id = e.cargo_id
  LEFT JOIN rh.units u ON u.id = e.departamento_id
  -- Sistema novo: bank_hours_assignments
  LEFT JOIN rh.bank_hours_assignments bha ON bha.employee_id = e.id 
    AND bha.company_id = e.company_id 
    AND bha.is_active = true
  LEFT JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
    AND bht.is_active = true
  -- Sistema antigo: bank_hours_config
  LEFT JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id 
    AND bhc.company_id = e.company_id 
    AND bhc.is_active = true
  -- Saldo do banco de horas
  LEFT JOIN rh.bank_hours_balance bhb ON bhb.employee_id = e.id 
    AND bhb.company_id = e.company_id
  WHERE e.company_id = p_company_id
    AND e.status = 'ativo'
    AND (
      -- Caso 1: gestor_imediato_id é o user_id diretamente
      e.gestor_imediato_id = p_user_id
      OR
      -- Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
      EXISTS (
        SELECT 1 
        FROM rh.employees gestor_employee
        WHERE gestor_employee.id = e.gestor_imediato_id
          AND gestor_employee.user_id = p_user_id
      )
    )
  ORDER BY e.nome;
END;
$$;

COMMENT ON FUNCTION public.get_managed_employees_bank_hours IS 
  'Retorna lista de funcionários sob gestão de um gestor com seus saldos de banco de horas.
   Considera gestor_imediato_id como user_id ou employee_id com user_id correspondente.';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_managed_employees_bank_hours TO authenticated;

