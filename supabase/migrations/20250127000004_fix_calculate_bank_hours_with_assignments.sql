-- =====================================================
-- CORRIGIR FUNÇÃO calculate_and_accumulate_bank_hours
-- PARA FUNCIONAR COM bank_hours_assignments (SISTEMA NOVO)
-- E CRIAR REGISTRO EM bank_hours_balance SE NÃO EXISTIR
-- =====================================================

CREATE OR REPLACE FUNCTION rh.calculate_and_accumulate_bank_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE(
  hours_accumulated DECIMAL(5,2),
  hours_compensated DECIMAL(5,2),
  new_balance DECIMAL(6,2)
) AS $$
DECLARE
  v_config rh.bank_hours_config%ROWTYPE;
  v_assignment rh.bank_hours_assignments%ROWTYPE;
  v_bank_hours_type rh.bank_hours_types%ROWTYPE;
  v_balance rh.bank_hours_balance%ROWTYPE;
  v_total_extra_hours DECIMAL(5,2) := 0;
  v_total_negative_hours DECIMAL(5,2) := 0;
  v_hours_to_accumulate DECIMAL(5,2) := 0;
  v_hours_to_compensate DECIMAL(5,2) := 0;
  v_new_balance DECIMAL(6,2) := 0;
  v_transaction_id UUID;
  v_has_bank_hours BOOLEAN := false;
  v_max_accumulation DECIMAL(5,2) := 0;
  v_compensation_rate DECIMAL(4,2) := 1.0;
  v_auto_compensate BOOLEAN := false;
BEGIN
  -- Primeiro, tentar buscar configuração do sistema novo (bank_hours_assignments)
  SELECT bha.* INTO v_assignment
  FROM rh.bank_hours_assignments bha
  INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
  WHERE bha.employee_id = p_employee_id 
    AND bha.company_id = p_company_id 
    AND bha.is_active = true
    AND bht.is_active = true
    AND bht.has_bank_hours = true
  LIMIT 1;

  -- Se encontrou assignment, buscar o tipo
  IF FOUND THEN
    SELECT * INTO v_bank_hours_type
    FROM rh.bank_hours_types
    WHERE id = v_assignment.bank_hours_type_id
      AND is_active = true
      AND has_bank_hours = true;
  END IF;

  -- Se encontrou no sistema novo, usar essas configurações
  IF FOUND THEN
    v_has_bank_hours := true;
    v_max_accumulation := COALESCE(v_bank_hours_type.max_accumulation_hours, 999.50);
    v_compensation_rate := COALESCE(v_bank_hours_type.compensation_rate, 1.0);
    v_auto_compensate := COALESCE(v_bank_hours_type.auto_compensate, false);
  ELSE
    -- Se não encontrou, tentar sistema antigo (bank_hours_config)
    SELECT * INTO v_config 
    FROM rh.bank_hours_config 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id 
      AND is_active = true
      AND has_bank_hours = true
    LIMIT 1;

    IF FOUND THEN
      v_has_bank_hours := true;
      v_max_accumulation := COALESCE(v_config.max_accumulation_hours, 40.00);
      v_compensation_rate := COALESCE(v_config.compensation_rate, 1.0);
      v_auto_compensate := COALESCE(v_config.auto_compensate, false);
    END IF;
  END IF;

  -- Se não tem banco de horas configurado, retornar zeros
  IF NOT v_has_bank_hours THEN
    RETURN QUERY SELECT 0.00, 0.00, 0.00;
    RETURN;
  END IF;

  -- Buscar saldo atual (ou criar se não existir)
  -- IMPORTANTE: Se esta função for chamada após um recálculo, o saldo já foi revertido
  SELECT * INTO v_balance 
  FROM rh.bank_hours_balance 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  -- Se não existe saldo, criar registro inicial
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
      p_period_start
    )
    RETURNING * INTO v_balance;
  END IF;
  
  -- Saldo inicial para cálculo (já revertido se for recálculo)
  v_new_balance := COALESCE(v_balance.current_balance, 0);

  -- Calcular total de horas extras (positivas) e horas negativas (débito) no período
  SELECT 
    COALESCE(SUM(CASE WHEN horas_extras > 0 THEN horas_extras ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN horas_extras < 0 THEN ABS(horas_extras) ELSE 0 END), 0)
  INTO v_total_extra_hours, v_total_negative_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado';

  -- Processar horas negativas primeiro (débitos)
  IF v_total_negative_hours > 0 THEN
    -- Descontar horas negativas do saldo
    v_new_balance := v_new_balance - v_total_negative_hours;
    
    -- Registrar transação de débito (ajuste negativo)
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'adjustment', p_period_end,
      -v_total_negative_hours, p_period_start, p_period_end,
      'Débito de horas (dias sem registro ou horas faltantes)', true
    );
  END IF;

  -- Depois, processar horas extras positivas
  IF v_total_extra_hours > 0 THEN
    -- Determinar quanto acumular e quanto compensar
    IF v_auto_compensate AND v_new_balance > 0 THEN
      -- Compensar horas existentes primeiro
      v_hours_to_compensate := LEAST(v_total_extra_hours, v_new_balance);
      v_hours_to_accumulate := v_total_extra_hours - v_hours_to_compensate;
    ELSE
      -- Apenas acumular
      v_hours_to_accumulate := v_total_extra_hours;
    END IF;

    -- Verificar limite máximo de acumulação
    IF v_hours_to_accumulate > 0 THEN
      v_hours_to_accumulate := LEAST(
        v_hours_to_accumulate, 
        v_max_accumulation - COALESCE(v_balance.accumulated_hours, 0)
      );
    END IF;

    -- Atualizar saldo com horas extras
    v_new_balance := v_new_balance + v_hours_to_accumulate - v_hours_to_compensate;
  END IF;

  -- Registrar transação de acumulação
  IF v_hours_to_accumulate > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'accumulation', p_period_end,
      v_hours_to_accumulate, p_period_start, p_period_end,
      'Acumulação automática de horas extras', true
    );
  END IF;

  -- Registrar transação de compensação
  IF v_hours_to_compensate > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, compensation_rate, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'compensation', p_period_end,
      -v_hours_to_compensate, p_period_start, p_period_end,
      'Compensação automática de banco de horas', v_compensation_rate, true
    );
  END IF;

  -- Atualizar ou criar saldo
  -- IMPORTANTE: Usar o saldo calculado (v_new_balance) diretamente
  -- Para accumulated_hours e compensated_hours, usar os valores calculados do INSERT
  INSERT INTO rh.bank_hours_balance (
    employee_id,
    company_id,
    current_balance,
    accumulated_hours,
    compensated_hours,
    expired_hours,
    last_calculation_date,
    updated_at
  ) VALUES (
    p_employee_id,
    p_company_id,
    v_new_balance,
    COALESCE(v_balance.accumulated_hours, 0) + v_hours_to_accumulate,
    COALESCE(v_balance.compensated_hours, 0) + v_hours_to_compensate,
    COALESCE(v_balance.expired_hours, 0),
    p_period_end,
    NOW()
  )
  ON CONFLICT (employee_id, company_id) 
  DO UPDATE SET
    -- Usar o saldo calculado diretamente (já inclui todas as operações do período)
    current_balance = EXCLUDED.current_balance,
    -- Usar os valores calculados do INSERT (já incluem a soma correta)
    accumulated_hours = EXCLUDED.accumulated_hours,
    compensated_hours = EXCLUDED.compensated_hours,
    last_calculation_date = EXCLUDED.last_calculation_date,
    updated_at = EXCLUDED.updated_at;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.calculate_and_accumulate_bank_hours IS 
  'Calcula e acumula banco de horas para um funcionário.
   Funciona com bank_hours_assignments (sistema novo) e bank_hours_config (sistema antigo).
   Cria registro em bank_hours_balance se não existir.';

