-- =====================================================
-- FUNÇÃO RPC: Buscar Transações de Banco de Horas com Dados dos Funcionários
-- =====================================================
-- Retorna transações de banco de horas com informações dos funcionários
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_bank_hours_transactions_with_employees(
  p_company_id UUID,
  p_employee_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  employee_id UUID,
  company_id UUID,
  transaction_type VARCHAR(20),
  transaction_date DATE,
  hours_amount DECIMAL(6,2),
  time_record_id UUID,
  reference_period_start DATE,
  reference_period_end DATE,
  description TEXT,
  compensation_rate DECIMAL(4,2),
  is_automatic BOOLEAN,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  overtime_percentage INTEGER,
  expires_at DATE,
  is_paid BOOLEAN,
  closure_id UUID,
  employee_nome TEXT,
  employee_matricula TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bht.id,
    bht.employee_id,
    bht.company_id,
    bht.transaction_type,
    bht.transaction_date,
    bht.hours_amount,
    bht.time_record_id,
    bht.reference_period_start,
    bht.reference_period_end,
    bht.description,
    bht.compensation_rate,
    bht.is_automatic,
    bht.created_by,
    bht.approved_by,
    bht.approved_at,
    bht.created_at,
    bht.updated_at,
    bht.overtime_percentage,
    bht.expires_at,
    bht.is_paid,
    bht.closure_id,
    e.nome::TEXT AS employee_nome,
    e.matricula::TEXT AS employee_matricula
  FROM rh.bank_hours_transactions bht
  INNER JOIN rh.employees e ON e.id = bht.employee_id
  WHERE bht.company_id = p_company_id
    AND (p_employee_id IS NULL OR bht.employee_id = p_employee_id)
  ORDER BY bht.transaction_date DESC, bht.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_bank_hours_transactions_with_employees IS 
  'Retorna transações de banco de horas com informações dos funcionários.
   Útil para exibir nomes e dados dos colaboradores no dashboard.';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_bank_hours_transactions_with_employees TO authenticated;

