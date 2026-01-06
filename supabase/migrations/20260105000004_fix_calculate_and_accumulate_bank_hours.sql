-- =====================================================
-- CORRIGIR FUNÇÃO calculate_and_accumulate_bank_hours
-- =====================================================
-- Problemas corrigidos:
-- 1. Suportar sistema novo (bank_hours_assignments) e antigo (bank_hours_config)
-- 2. Usar apenas horas_extras_50 (excluir horas_extras_100)
-- 3. Verificar duplicação de transações para evitar recálculo
-- 4. Verificar se período já foi processado
-- 5. Processar horas negativas corretamente
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
  v_existing_transaction_count INTEGER := 0;
  v_last_calculation_date DATE;
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

  -- IMPORTANTE: Verificar se há transações automáticas que se sobrepõem com este período
  -- Se houver sobreposição, não recalcular para evitar duplicação
  SELECT COUNT(*) INTO v_existing_transaction_count
  FROM rh.bank_hours_transactions
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_automatic = true
    AND (
      -- Período exato
      (reference_period_start = p_period_start AND reference_period_end = p_period_end)
      OR
      -- Período que se sobrepõe (início ou fim dentro do período calculado)
      (reference_period_start >= p_period_start AND reference_period_start <= p_period_end)
      OR
      (reference_period_end >= p_period_start AND reference_period_end <= p_period_end)
      OR
      -- Período que contém o período calculado
      (reference_period_start <= p_period_start AND reference_period_end >= p_period_end)
    )
    AND transaction_type IN ('accumulation', 'compensation', 'adjustment');

  -- Se há transações sobrepostas, deletar apenas as do período EXATO e recalcular
  -- Se não há período exato mas há sobreposição, não recalcular (retornar saldo atual)
  IF v_existing_transaction_count > 0 THEN
    -- Verificar se há período exato
    SELECT COUNT(*) INTO v_existing_transaction_count
    FROM rh.bank_hours_transactions
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND is_automatic = true
      AND reference_period_start = p_period_start
      AND reference_period_end = p_period_end
      AND transaction_type IN ('accumulation', 'compensation', 'adjustment');
    
    -- Se há período exato, deletar e recalcular
    IF v_existing_transaction_count > 0 THEN
      DELETE FROM rh.bank_hours_transactions
      WHERE employee_id = p_employee_id
        AND company_id = p_company_id
        AND is_automatic = true
        AND reference_period_start = p_period_start
        AND reference_period_end = p_period_end
        AND transaction_type IN ('accumulation', 'compensation', 'adjustment');
      
      -- Recalcular saldo baseado nas transações restantes
      SELECT COALESCE(SUM(hours_amount), 0) INTO v_new_balance
      FROM rh.bank_hours_transactions
      WHERE employee_id = p_employee_id
        AND company_id = p_company_id;
      
      -- Atualizar saldo temporariamente antes de recalcular
      UPDATE rh.bank_hours_balance SET
        current_balance = v_new_balance,
        last_calculation_date = p_period_start - INTERVAL '1 day'
      WHERE employee_id = p_employee_id 
        AND company_id = p_company_id;
      
      -- Buscar saldo atualizado
      SELECT * INTO v_balance 
      FROM rh.bank_hours_balance 
      WHERE employee_id = p_employee_id 
        AND company_id = p_company_id;
    ELSE
      -- Há sobreposição mas não é período exato - não recalcular para evitar duplicação
      v_new_balance := COALESCE(v_balance.current_balance, 0);
      RETURN QUERY SELECT 0.00, 0.00, v_new_balance;
      RETURN;
    END IF;
  END IF;

  -- Saldo inicial para cálculo
  v_new_balance := COALESCE(v_balance.current_balance, 0);

  -- Calcular total de horas extras 50% (apenas 50%, excluir 100%) e horas negativas no período
  -- IMPORTANTE: Considerar apenas horas_extras_50, não horas_extras genérico
  -- Usar horas_extras como fallback apenas se não houver horas_extras_100
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(horas_extras_50, 0) > 0 THEN horas_extras_50
        WHEN COALESCE(horas_extras_50, 0) = 0 THEN
          CASE 
            WHEN COALESCE(horas_extras, 0) > 0 AND COALESCE(horas_extras_100, 0) = 0 THEN horas_extras
            ELSE 0
          END
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(COALESCE(horas_negativas, 0)), 0)
  INTO v_total_extra_hours, v_total_negative_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado'; -- Apenas registros aprovados

  -- Processar horas negativas primeiro (débitos)
  IF v_total_negative_hours > 0 THEN
    -- Descontar horas negativas do saldo
    v_new_balance := v_new_balance - v_total_negative_hours;
    
    -- Criar transação de débito (horas negativas)
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'adjustment', p_period_end,
      -v_total_negative_hours, p_period_start, p_period_end,
      'Horas negativas do período ' || p_period_start::text || ' a ' || p_period_end::text, true
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
        GREATEST(0, v_max_accumulation - COALESCE(v_balance.accumulated_hours, 0))
      );
    END IF;

    -- Transação de compensação
    IF v_hours_to_compensate > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, reference_period_start, reference_period_end,
        description, is_automatic
      ) VALUES (
        p_employee_id, p_company_id, 'compensation', p_period_end,
        -v_hours_to_compensate, p_period_start, p_period_end,
        'Compensação automática de horas', true
      );
    END IF;

    -- Transação de acumulação
    IF v_hours_to_accumulate > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, reference_period_start, reference_period_end,
        description, is_automatic
      ) VALUES (
        p_employee_id, p_company_id, 'accumulation', p_period_end,
        v_hours_to_accumulate, p_period_start, p_period_end,
        'Acumulação de horas extras 50%', true
      );
    END IF;
  END IF;

  -- Atualizar saldo final
  v_new_balance := v_new_balance + v_hours_to_accumulate - v_hours_to_compensate;

  -- Atualizar registro de saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = v_new_balance,
    accumulated_hours = COALESCE(v_balance.accumulated_hours, 0) + v_hours_to_accumulate,
    compensated_hours = COALESCE(v_balance.compensated_hours, 0) + v_hours_to_compensate,
    last_calculation_date = p_period_end,
    updated_at = NOW()
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.calculate_and_accumulate_bank_hours(uuid, uuid, date, date) IS 
  'Calcula e acumula horas extras 50% no banco de horas para um funcionário em um período.
   Suporta sistema novo (bank_hours_assignments) e antigo (bank_hours_config).
   Considera apenas horas_extras_50 (exclui horas_extras_100 que são pagas diretamente).
   Evita duplicação verificando se o período já foi processado.
   Processa horas negativas corretamente antes das horas extras.
   Apenas registros com status aprovado são considerados.';
