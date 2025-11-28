-- =====================================================
-- CORREÇÃO: Banco de Horas - Considerar Dias Sem Registro de Ponto
-- =====================================================
-- Problema: O sistema não considera dias sem registro de ponto no cálculo do banco de horas.
-- Solução: Identificar dias que deveriam ter registro baseado no turno e criar débito.
-- =====================================================

-- 1. Função auxiliar para verificar se uma data é feriado
-- =====================================================
CREATE OR REPLACE FUNCTION rh.is_holiday(p_date DATE, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM rh.holidays 
    WHERE company_id = p_company_id 
      AND data = p_date 
      AND ativo = true
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Função para calcular débito de dias sem registro de ponto
-- =====================================================
CREATE OR REPLACE FUNCTION rh.calculate_missing_time_records_debit(
  p_employee_id UUID,
  p_company_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS DECIMAL(6,2) AS $$
DECLARE
  v_work_shift_id UUID;
  v_horas_diarias DECIMAL(4,2);
  v_dias_semana INTEGER[];
  v_shift_start_date DATE;
  v_shift_end_date DATE;
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_total_debit DECIMAL(6,2) := 0;
  v_has_record BOOLEAN;
  v_is_holiday BOOLEAN;
BEGIN
  -- Buscar turno ativo do funcionário no período
  SELECT es.turno_id, ws.horas_diarias, ws.dias_semana, es.data_inicio, es.data_fim
  INTO v_work_shift_id, v_horas_diarias, v_dias_semana, v_shift_start_date, v_shift_end_date
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_period_end
    AND (es.data_fim IS NULL OR es.data_fim >= p_period_start)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrar turno, retornar 0 (sem débito)
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    RETURN 0;
  END IF;

  -- Se dias_semana está vazio ou NULL, usar padrão Segunda-Sexta
  IF v_dias_semana IS NULL OR array_length(v_dias_semana, 1) = 0 THEN
    v_dias_semana := ARRAY[1, 2, 3, 4, 5]; -- Segunda a Sexta
  END IF;

  -- Ajustar período baseado no turno do funcionário
  IF v_shift_start_date > p_period_start THEN
    v_shift_start_date := v_shift_start_date;
  ELSE
    v_shift_start_date := p_period_start;
  END IF;

  IF v_shift_end_date IS NOT NULL AND v_shift_end_date < p_period_end THEN
    v_shift_end_date := v_shift_end_date;
  ELSE
    v_shift_end_date := p_period_end;
  END IF;

  -- Iterar por cada dia do período
  v_current_date := v_shift_start_date;
  
  WHILE v_current_date <= v_shift_end_date LOOP
    -- Obter dia da semana (1=Segunda, 2=Terça, ..., 7=Domingo)
    -- PostgreSQL: EXTRACT(DOW FROM date) retorna 0=Domingo, 1=Segunda, ..., 6=Sábado
    -- Precisamos converter: 0->7, 1->1, 2->2, ..., 6->6
    v_day_of_week := CASE 
      WHEN EXTRACT(DOW FROM v_current_date) = 0 THEN 7 -- Domingo
      ELSE EXTRACT(DOW FROM v_current_date)::INTEGER
    END;

    -- Verificar se este dia deveria ter registro (está em dias_semana do turno)
    IF v_day_of_week = ANY(v_dias_semana) THEN
      -- Verificar se é feriado
      v_is_holiday := rh.is_holiday(v_current_date, p_company_id);
      
      -- Se não é feriado, verificar se há registro de ponto
      IF NOT v_is_holiday THEN
        -- Verificar se existe registro de ponto para este dia
        SELECT EXISTS (
          SELECT 1 
          FROM rh.time_records 
          WHERE employee_id = p_employee_id
            AND company_id = p_company_id
            AND data_registro = v_current_date
        ) INTO v_has_record;

        -- Se não há registro, adicionar débito
        IF NOT v_has_record THEN
          v_total_debit := v_total_debit + v_horas_diarias;
        END IF;
      END IF;
    END IF;

    -- Próximo dia
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_total_debit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.calculate_missing_time_records_debit IS 
  'Calcula débito de horas para dias que deveriam ter registro de ponto mas não têm.
   Considera o turno do funcionário (dias_semana e horas_diarias) e exclui feriados.';

-- 3. Atualizar função calculate_and_accumulate_bank_hours para considerar dias sem registro
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
  v_total_negative_hours DECIMAL(5,2) := 0; -- Horas negativas (débito)
  v_missing_records_debit DECIMAL(6,2) := 0; -- Débito de dias sem registro
  v_total_debit DECIMAL(6,2) := 0; -- Débito total (negativas + dias sem registro)
  v_hours_to_accumulate DECIMAL(5,2) := 0;
  v_hours_to_compensate DECIMAL(5,2) := 0;
  v_new_balance DECIMAL(6,2) := 0;
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

  -- Calcular débito de dias sem registro de ponto
  v_missing_records_debit := rh.calculate_missing_time_records_debit(
    p_employee_id,
    p_company_id,
    p_period_start,
    p_period_end
  );

  -- Calcular total de horas extras (positivas) e horas negativas (débito) no período
  -- dos registros existentes (apenas dos registros que existem)
  SELECT 
    COALESCE(SUM(CASE WHEN horas_extras > 0 THEN horas_extras ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN horas_extras < 0 THEN ABS(horas_extras) ELSE 0 END), 0)
  INTO v_total_extra_hours, v_total_negative_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado';

  -- Inicializar saldo se não existir
  IF v_balance IS NULL THEN
    INSERT INTO rh.bank_hours_balance (employee_id, company_id, current_balance)
    VALUES (p_employee_id, p_company_id, 0)
    RETURNING * INTO v_balance;
  END IF;

  -- Calcular débito total (horas negativas dos registros + dias sem registro)
  v_total_debit := v_total_negative_hours + v_missing_records_debit;

  -- Primeiro, descontar débito total do saldo
  IF v_total_debit > 0 THEN
    -- Descontar do saldo atual (se houver saldo positivo)
    IF COALESCE(v_balance.current_balance, 0) > 0 THEN
      v_new_balance := GREATEST(
        0, 
        v_balance.current_balance - v_total_debit
      );
      -- Se sobrou débito após descontar do saldo, ele fica como saldo negativo
      IF v_total_debit > v_balance.current_balance THEN
        v_new_balance := v_new_balance - (v_total_debit - v_balance.current_balance);
      END IF;
    ELSE
      -- Se não há saldo positivo, o débito fica como saldo negativo
      v_new_balance := -v_total_debit;
    END IF;
  ELSE
    v_new_balance := COALESCE(v_balance.current_balance, 0);
  END IF;

  -- Determinar quanto acumular e quanto compensar das horas extras
  IF v_config.auto_compensate AND v_new_balance < 0 THEN
    -- Se há débito, usar horas extras para compensar primeiro
    v_hours_to_compensate := LEAST(v_total_extra_hours, ABS(v_new_balance));
    v_hours_to_accumulate := v_total_extra_hours - v_hours_to_compensate;
    v_new_balance := v_new_balance + v_hours_to_compensate;
  ELSIF v_config.auto_compensate AND v_new_balance > 0 THEN
    -- Compensar horas existentes primeiro
    v_hours_to_compensate := LEAST(v_total_extra_hours, v_new_balance);
    v_hours_to_accumulate := v_total_extra_hours - v_hours_to_compensate;
    v_new_balance := v_new_balance + v_hours_to_accumulate - v_hours_to_compensate;
  ELSE
    -- Apenas acumular
    v_hours_to_accumulate := v_total_extra_hours;
    v_new_balance := v_new_balance + v_hours_to_accumulate;
  END IF;

  -- Verificar limite máximo de acumulação
  IF v_hours_to_accumulate > 0 THEN
    v_hours_to_accumulate := LEAST(
      v_hours_to_accumulate, 
      GREATEST(0, v_config.max_accumulation_hours - COALESCE(v_balance.accumulated_hours, 0))
    );
  END IF;

  -- Atualizar ou criar registro de saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = v_new_balance,
    accumulated_hours = COALESCE(v_balance.accumulated_hours, 0) + v_hours_to_accumulate,
    compensated_hours = COALESCE(v_balance.compensated_hours, 0) + v_hours_to_compensate,
    last_calculation_date = p_period_end,
    updated_at = NOW()
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  -- Criar transações de histórico
  -- Transação de débito (horas negativas dos registros existentes)
  IF v_total_negative_hours > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date, hours_amount,
      description, reference_period_start, reference_period_end, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'adjustment', p_period_end, 
      -v_total_negative_hours,
      'Horas negativas do período ' || p_period_start::text || ' a ' || p_period_end::text,
      p_period_start, p_period_end, true
    );
  END IF;

  -- Transação de débito (dias sem registro de ponto)
  IF v_missing_records_debit > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date, hours_amount,
      description, reference_period_start, reference_period_end, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'adjustment', p_period_end, -v_missing_records_debit,
      'Débito por dias sem registro de ponto (' || 
      ROUND(v_missing_records_debit / (SELECT horas_diarias FROM rh.work_shifts ws 
                                       INNER JOIN rh.employee_shifts es ON es.turno_id = ws.id 
                                       WHERE es.funcionario_id = p_employee_id 
                                       AND es.company_id = p_company_id 
                                       AND es.ativo = true 
                                       LIMIT 1), 0)::TEXT || ' dias)',
      p_period_start, p_period_end, true
    );
  END IF;

  -- Transação de compensação
  IF v_hours_to_compensate > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date, hours_amount,
      description, reference_period_start, reference_period_end, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'compensation', p_period_end, -v_hours_to_compensate,
      'Compensação automática de horas', p_period_start, p_period_end, true
    );
  END IF;

  -- Transação de acumulação
  IF v_hours_to_accumulate > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date, hours_amount,
      description, reference_period_start, reference_period_end, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'accumulation', p_period_end, v_hours_to_accumulate,
      'Acumulação de horas extras', p_period_start, p_period_end, true
    );
  END IF;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.calculate_and_accumulate_bank_hours(uuid, uuid, date, date) IS 
  'Calcula e acumula horas no banco de horas considerando:
   - Horas extras positivas (crédito) dos registros existentes
   - Horas negativas/devedoras (débito) dos registros existentes
   - Débito de dias sem registro de ponto (baseado no turno do funcionário)
   - Compensação automática quando configurada
   - Exclui feriados do cálculo de dias faltantes';

