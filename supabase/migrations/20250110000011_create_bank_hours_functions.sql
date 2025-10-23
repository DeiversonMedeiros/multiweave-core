-- =====================================================
-- FUNÇÕES PARA CÁLCULO AUTOMÁTICO DO BANCO DE HORAS
-- =====================================================

-- 1. FUNÇÃO PARA INICIALIZAR CONFIGURAÇÃO DE BANCO DE HORAS
-- =====================================================
CREATE OR REPLACE FUNCTION rh.initialize_bank_hours_config(
  p_employee_id UUID,
  p_company_id UUID,
  p_has_bank_hours BOOLEAN DEFAULT true,
  p_accumulation_period_months INTEGER DEFAULT 12,
  p_max_accumulation_hours DECIMAL(5,2) DEFAULT 40.00,
  p_compensation_rate DECIMAL(4,2) DEFAULT 1.00
)
RETURNS UUID AS $$
DECLARE
  v_config_id UUID;
  v_balance_id UUID;
BEGIN
  -- Inserir ou atualizar configuração
  INSERT INTO rh.bank_hours_config (
    employee_id, company_id, has_bank_hours, 
    accumulation_period_months, max_accumulation_hours, compensation_rate
  ) VALUES (
    p_employee_id, p_company_id, p_has_bank_hours,
    p_accumulation_period_months, p_max_accumulation_hours, p_compensation_rate
  )
  ON CONFLICT (employee_id, company_id) 
  DO UPDATE SET
    has_bank_hours = EXCLUDED.has_bank_hours,
    accumulation_period_months = EXCLUDED.accumulation_period_months,
    max_accumulation_hours = EXCLUDED.max_accumulation_hours,
    compensation_rate = EXCLUDED.compensation_rate,
    updated_at = NOW()
  RETURNING id INTO v_config_id;

  -- Inicializar saldo se não existir
  INSERT INTO rh.bank_hours_balance (employee_id, company_id)
  VALUES (p_employee_id, p_company_id)
  ON CONFLICT (employee_id, company_id) DO NOTHING
  RETURNING id INTO v_balance_id;

  RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNÇÃO PARA CALCULAR HORAS EXTRAS E ACUMULAR NO BANCO
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
  v_balance rh.bank_hours_balance%ROWTYPE;
  v_total_extra_hours DECIMAL(5,2) := 0;
  v_hours_to_accumulate DECIMAL(5,2) := 0;
  v_hours_to_compensate DECIMAL(5,2) := 0;
  v_new_balance DECIMAL(6,2) := 0;
  v_transaction_id UUID;
BEGIN
  -- Buscar configuração
  SELECT * INTO v_config 
  FROM rh.bank_hours_config 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id 
    AND is_active = true;

  -- Se não tem banco de horas configurado, retornar zeros
  IF NOT FOUND OR NOT v_config.has_bank_hours THEN
    RETURN QUERY SELECT 0.00, 0.00, 0.00;
    RETURN;
  END IF;

  -- Buscar saldo atual
  SELECT * INTO v_balance 
  FROM rh.bank_hours_balance 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  -- Calcular total de horas extras no período
  SELECT COALESCE(SUM(horas_extras), 0) INTO v_total_extra_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado';

  -- Determinar quanto acumular e quanto compensar
  IF v_config.auto_compensate AND v_balance.current_balance > 0 THEN
    -- Compensar horas existentes primeiro
    v_hours_to_compensate := LEAST(v_total_extra_hours, v_balance.current_balance);
    v_hours_to_accumulate := v_total_extra_hours - v_hours_to_compensate;
  ELSE
    -- Apenas acumular
    v_hours_to_accumulate := v_total_extra_hours;
  END IF;

  -- Verificar limite máximo de acumulação
  IF v_hours_to_accumulate > 0 THEN
    v_hours_to_accumulate := LEAST(
      v_hours_to_accumulate, 
      v_config.max_accumulation_hours - v_balance.accumulated_hours
    );
  END IF;

  -- Atualizar saldo
  v_new_balance := v_balance.current_balance + v_hours_to_accumulate - v_hours_to_compensate;

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
      'Compensação automática de banco de horas', v_config.compensation_rate, true
    );
  END IF;

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = v_new_balance,
    accumulated_hours = accumulated_hours + v_hours_to_accumulate,
    compensated_hours = compensated_hours + v_hours_to_compensate,
    last_calculation_date = p_period_end,
    updated_at = NOW()
  WHERE employee_id = p_employee_id AND company_id = p_company_id;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNÇÃO PARA PROCESSAR EXPIRAÇÃO DE HORAS
-- =====================================================
CREATE OR REPLACE FUNCTION rh.process_bank_hours_expiration(
  p_company_id UUID,
  p_expiration_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  employees_processed INTEGER,
  hours_expired DECIMAL(8,2)
) AS $$
DECLARE
  v_employee_record RECORD;
  v_hours_to_expire DECIMAL(5,2);
  v_total_employees INTEGER := 0;
  v_total_hours_expired DECIMAL(8,2) := 0;
BEGIN
  -- Processar cada colaborador com banco de horas
  FOR v_employee_record IN
    SELECT 
      b.employee_id,
      b.company_id,
      b.current_balance,
      c.expires_after_months,
      c.accumulation_period_months
    FROM rh.bank_hours_balance b
    JOIN rh.bank_hours_config c ON b.employee_id = c.employee_id AND b.company_id = c.company_id
    WHERE b.company_id = p_company_id
      AND c.is_active = true
      AND c.has_bank_hours = true
      AND b.current_balance > 0
  LOOP
    -- Calcular horas que devem expirar
    v_hours_to_expire := 0;
    
    -- Lógica de expiração baseada no período de acumulação
    -- Por simplicidade, vamos expirar horas antigas baseado na data de cálculo
    IF v_employee_record.current_balance > 0 THEN
      -- Verificar se há horas que devem expirar
      -- Esta é uma implementação simplificada - pode ser refinada conforme necessário
      v_hours_to_expire := LEAST(
        v_employee_record.current_balance,
        v_employee_record.current_balance * 0.1 -- Expirar 10% das horas por mês
      );
    END IF;

    -- Registrar expiração se houver horas para expirar
    IF v_hours_to_expire > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, description, is_automatic
      ) VALUES (
        v_employee_record.employee_id, v_employee_record.company_id, 'expiration', p_expiration_date,
        -v_hours_to_expire, 'Expiração automática de horas do banco', true
      );

      -- Atualizar saldo
      UPDATE rh.bank_hours_balance SET
        current_balance = current_balance - v_hours_to_expire,
        expired_hours = expired_hours + v_hours_to_expire,
        updated_at = NOW()
      WHERE employee_id = v_employee_record.employee_id 
        AND company_id = v_employee_record.company_id;

      v_total_hours_expired := v_total_hours_expired + v_hours_to_expire;
    END IF;

    v_total_employees := v_total_employees + 1;
  END LOOP;

  RETURN QUERY SELECT v_total_employees, v_total_hours_expired;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO PARA EXECUTAR CÁLCULO COMPLETO DO BANCO DE HORAS
-- =====================================================
CREATE OR REPLACE FUNCTION rh.run_bank_hours_calculation(
  p_company_id UUID,
  p_calculation_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_calculation_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_employee_record RECORD;
  v_result RECORD;
  v_total_accumulated DECIMAL(8,2) := 0;
  v_total_compensated DECIMAL(8,2) := 0;
  v_total_expired DECIMAL(8,2) := 0;
  v_employees_processed INTEGER := 0;
BEGIN
  -- Criar registro de cálculo
  INSERT INTO rh.bank_hours_calculations (
    company_id, calculation_date, period_start, period_end, status
  ) VALUES (
    p_company_id, p_calculation_date, 
    p_calculation_date - INTERVAL '1 month', p_calculation_date,
    'running'
  ) RETURNING id INTO v_calculation_id;

  -- Definir período de cálculo (último mês)
  v_period_start := p_calculation_date - INTERVAL '1 month';
  v_period_end := p_calculation_date;

  -- Processar cada colaborador com banco de horas ativo
  FOR v_employee_record IN
    SELECT employee_id, company_id
    FROM rh.bank_hours_config
    WHERE company_id = p_company_id
      AND is_active = true
      AND has_bank_hours = true
  LOOP
    -- Calcular e acumular horas para este colaborador
    SELECT * INTO v_result
    FROM rh.calculate_and_accumulate_bank_hours(
      v_employee_record.employee_id,
      v_employee_record.company_id,
      v_period_start,
      v_period_end
    );

    v_total_accumulated := v_total_accumulated + v_result.hours_accumulated;
    v_total_compensated := v_total_compensated + v_result.hours_compensated;
    v_employees_processed := v_employees_processed + 1;
  END LOOP;

  -- Processar expiração de horas
  SELECT * INTO v_result
  FROM rh.process_bank_hours_expiration(p_company_id, p_calculation_date);
  
  v_total_expired := v_result.hours_expired;

  -- Atualizar registro de cálculo
  UPDATE rh.bank_hours_calculations SET
    employees_processed = v_employees_processed,
    hours_accumulated = v_total_accumulated,
    hours_compensated = v_total_compensated,
    hours_expired = v_total_expired,
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_calculation_id;

  RETURN v_calculation_id;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA OBTER SALDO ATUAL DO BANCO DE HORAS
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
  SELECT 
    COALESCE(b.current_balance, 0),
    COALESCE(b.accumulated_hours, 0),
    COALESCE(b.compensated_hours, 0),
    COALESCE(b.expired_hours, 0),
    COALESCE(b.last_calculation_date, CURRENT_DATE),
    COALESCE(c.has_bank_hours, false),
    COALESCE(c.max_accumulation_hours, 0),
    COALESCE(c.accumulation_period_months, 0)
  FROM rh.bank_hours_balance b
  FULL OUTER JOIN rh.bank_hours_config c ON b.employee_id = c.employee_id AND b.company_id = c.company_id
  WHERE (b.employee_id = p_employee_id OR c.employee_id = p_employee_id)
    AND (b.company_id = p_company_id OR c.company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA AJUSTAR SALDO MANUALMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION rh.adjust_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_description TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance DECIMAL(6,2);
BEGIN
  -- Verificar se o colaborador tem banco de horas configurado
  IF NOT EXISTS (
    SELECT 1 FROM rh.bank_hours_config 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Colaborador não possui banco de horas configurado';
  END IF;

  -- Registrar transação
  INSERT INTO rh.bank_hours_transactions (
    employee_id, company_id, transaction_type, transaction_date,
    hours_amount, description, created_by, is_automatic
  ) VALUES (
    p_employee_id, p_company_id, 'adjustment', CURRENT_DATE,
    p_hours_amount, p_description, p_created_by, false
  ) RETURNING id INTO v_transaction_id;

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = current_balance + p_hours_amount,
    updated_at = NOW()
  WHERE employee_id = p_employee_id AND company_id = p_company_id
  RETURNING current_balance INTO v_new_balance;

  -- Se não existe saldo, criar
  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (employee_id, company_id, current_balance)
    VALUES (p_employee_id, p_company_id, p_hours_amount)
    RETURNING current_balance INTO v_new_balance;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
