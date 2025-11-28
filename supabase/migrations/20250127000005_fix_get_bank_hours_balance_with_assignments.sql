-- =====================================================
-- CORRIGIR FUNÇÃO get_bank_hours_balance
-- PARA FUNCIONAR COM bank_hours_assignments (SISTEMA NOVO)
-- =====================================================

CREATE OR REPLACE FUNCTION rh.get_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID
)
RETURNS TABLE(
  current_balance DECIMAL(6,2),
  accumulated_hours DECIMAL(6,2),
  compensated_hours DECIMAL(6,2),
  expired_hours DECIMAL(6,2),
  last_calculation_date DATE,
  has_bank_hours BOOLEAN,
  max_accumulation_hours DECIMAL(5,2),
  accumulation_period_months INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH balance_data AS (
    SELECT 
      b.current_balance,
      b.accumulated_hours,
      b.compensated_hours,
      b.expired_hours,
      b.last_calculation_date
    FROM rh.bank_hours_balance b
    WHERE b.employee_id = p_employee_id
      AND b.company_id = p_company_id
  ),
  assignment_config AS (
    -- Sistema novo: bank_hours_assignments
    SELECT 
      bht.has_bank_hours,
      bht.max_accumulation_hours,
      bht.accumulation_period_months
    FROM rh.bank_hours_assignments bha
    INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
    WHERE bha.employee_id = p_employee_id
      AND bha.company_id = p_company_id
      AND bha.is_active = true
      AND bht.is_active = true
      AND bht.has_bank_hours = true
    ORDER BY bha.assigned_at DESC
    LIMIT 1
  ),
  old_config AS (
    -- Sistema antigo: bank_hours_config (só se não tiver no sistema novo)
    SELECT 
      c.has_bank_hours,
      c.max_accumulation_hours,
      c.accumulation_period_months
    FROM rh.bank_hours_config c
    WHERE c.employee_id = p_employee_id
      AND c.company_id = p_company_id
      AND c.is_active = true
      AND c.has_bank_hours = true
      AND NOT EXISTS (SELECT 1 FROM assignment_config)
    LIMIT 1
  )
  SELECT 
    COALESCE(bd.current_balance, 0),
    COALESCE(bd.accumulated_hours, 0),
    COALESCE(bd.compensated_hours, 0),
    COALESCE(bd.expired_hours, 0),
    COALESCE(bd.last_calculation_date, CURRENT_DATE),
    -- Verificar se tem banco de horas no sistema novo ou antigo
    COALESCE(
      ac.has_bank_hours,
      oc.has_bank_hours,
      false
    ) AS has_bank_hours,
    -- Usar max_accumulation do sistema novo ou antigo
    COALESCE(
      ac.max_accumulation_hours,
      oc.max_accumulation_hours,
      0
    ) AS max_accumulation_hours,
    -- Usar accumulation_period_months do sistema novo ou antigo
    COALESCE(
      ac.accumulation_period_months,
      oc.accumulation_period_months,
      0
    ) AS accumulation_period_months
  FROM balance_data bd
  FULL OUTER JOIN assignment_config ac ON true
  FULL OUTER JOIN old_config oc ON true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.get_bank_hours_balance IS 
  'Retorna o saldo atual do banco de horas de um funcionário.
   Funciona com bank_hours_assignments (sistema novo) e bank_hours_config (sistema antigo).
   Prioriza sistema novo sobre sistema antigo.';

