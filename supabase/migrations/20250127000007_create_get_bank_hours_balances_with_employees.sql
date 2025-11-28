-- =====================================================
-- FUNÇÃO RPC: Buscar Saldos de Banco de Horas com Dados dos Funcionários
-- =====================================================
-- Retorna saldos de banco de horas com informações dos funcionários
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_bank_hours_balances_with_employees(
  p_company_id UUID
)
RETURNS TABLE(
  id UUID,
  employee_id UUID,
  company_id UUID,
  current_balance DECIMAL(6,2),
  accumulated_hours DECIMAL(6,2),
  compensated_hours DECIMAL(6,2),
  expired_hours DECIMAL(6,2),
  last_calculation_date DATE,
  next_expiration_date DATE,
  is_locked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  employee_nome TEXT,
  employee_matricula TEXT,
  employee_cpf TEXT,
  employee_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bhb.id,
    bhb.employee_id,
    bhb.company_id,
    bhb.current_balance,
    bhb.accumulated_hours,
    bhb.compensated_hours,
    bhb.expired_hours,
    bhb.last_calculation_date,
    bhb.next_expiration_date,
    bhb.is_locked,
    bhb.created_at,
    bhb.updated_at,
    e.nome::TEXT AS employee_nome,
    e.matricula::TEXT AS employee_matricula,
    e.cpf::TEXT AS employee_cpf,
    e.email::TEXT AS employee_email
  FROM rh.bank_hours_balance bhb
  INNER JOIN rh.employees e ON e.id = bhb.employee_id
  WHERE bhb.company_id = p_company_id
  ORDER BY e.nome;
END;
$$;

COMMENT ON FUNCTION public.get_bank_hours_balances_with_employees IS 
  'Retorna saldos de banco de horas com informações dos funcionários.
   Útil para exibir nomes e dados dos colaboradores no dashboard.';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_bank_hours_balances_with_employees TO authenticated;

