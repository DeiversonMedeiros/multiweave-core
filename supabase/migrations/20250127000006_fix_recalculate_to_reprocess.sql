-- =====================================================
-- CORRIGIR FUNÇÃO recalculate_employee_bank_hours
-- PARA REPROCESSAR AO INVÉS DE SOMAR NOVAMENTE
-- =====================================================
-- Remove transações automáticas do período e recalcula do zero
-- =====================================================

CREATE OR REPLACE FUNCTION public.recalculate_employee_bank_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_result RECORD;
  v_response JSON;
  v_balance_before rh.bank_hours_balance%ROWTYPE;
  v_transactions_to_remove DECIMAL(6,2) := 0;
  v_accumulated_to_remove DECIMAL(6,2) := 0;
  v_compensated_to_remove DECIMAL(6,2) := 0;
BEGIN
  -- Se não especificado, usar últimos 30 dias
  v_period_start := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '30 days');
  v_period_end := COALESCE(p_period_end, CURRENT_DATE);

  -- Buscar saldo atual antes do recálculo
  SELECT * INTO v_balance_before
  FROM rh.bank_hours_balance
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  -- Se não existe saldo, criar um novo
  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (
      employee_id,
      company_id,
      current_balance,
      accumulated_hours,
      compensated_hours,
      expired_hours,
      last_calculation_date
    ) VALUES (
      p_employee_id,
      p_company_id,
      0.00,
      0.00,
      0.00,
      0.00,
      v_period_start
    )
    RETURNING * INTO v_balance_before;
  END IF;

  -- Calcular total de horas das transações automáticas do período que serão removidas
  -- IMPORTANTE: hours_amount já tem o sinal correto
  -- - accumulation: positivo (ex: 1.21)
  -- - compensation: negativo (ex: -5.0)
  -- - adjustment: negativo para débito (ex: -16.0)
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'accumulation' THEN hours_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'compensation' THEN ABS(hours_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'adjustment' THEN hours_amount ELSE 0 END), 0)
  INTO v_accumulated_to_remove, v_compensated_to_remove, v_transactions_to_remove
  FROM rh.bank_hours_transactions
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_automatic = true
    AND transaction_date BETWEEN v_period_start AND v_period_end;

  -- Remover transações automáticas do período
  DELETE FROM rh.bank_hours_transactions
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_automatic = true
    AND transaction_date BETWEEN v_period_start AND v_period_end;

  -- Reverter o saldo removendo as transações automáticas do período
  -- v_accumulated_to_remove: positivo (precisa subtrair do saldo e de accumulated_hours)
  -- v_compensated_to_remove: positivo (precisa adicionar ao saldo e subtrair de compensated_hours)
  -- v_transactions_to_remove: negativo para débito (precisa adicionar ao saldo, já que era negativo)
  UPDATE rh.bank_hours_balance
  SET 
    current_balance = current_balance - v_accumulated_to_remove + v_compensated_to_remove - v_transactions_to_remove,
    accumulated_hours = GREATEST(0, accumulated_hours - v_accumulated_to_remove),
    compensated_hours = GREATEST(0, compensated_hours - v_compensated_to_remove),
    updated_at = NOW()
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  -- Agora recalcular o período do zero
  SELECT * INTO v_result
  FROM rh.calculate_and_accumulate_bank_hours(
    p_employee_id,
    p_company_id,
    v_period_start,
    v_period_end
  );

  -- Retornar resultado
  v_response := json_build_object(
    'success', true,
    'employee_id', p_employee_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'hours_accumulated', v_result.hours_accumulated,
    'hours_compensated', v_result.hours_compensated,
    'new_balance', v_result.new_balance,
    'transactions_removed', v_accumulated_to_remove + v_compensated_to_remove + v_transactions_to_remove
  );

  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.recalculate_employee_bank_hours IS 
  'Recalcula banco de horas para um funcionário específico em um período.
   Remove transações automáticas do período e recalcula do zero para evitar duplicação.
   Útil para processar retroativamente débitos de dias sem registro de ponto.';

