-- =====================================================
-- AJUSTE: Cálculos considerando Artigo 62 da CLT
-- =====================================================
-- Funcionários que não precisam registrar ponto (requer_registro_ponto = false)
-- não devem ter saldo negativo por ausência de registro de ponto
-- =====================================================

-- 1. Atualizar função recalculate_time_record_hours para considerar requer_registro_ponto
CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_date date;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  v_horas_trabalhadas numeric(4,2) := 0;
  v_horas_extras numeric(4,2) := 0;
  v_horas_faltas numeric(4,2) := 0;
  v_horas_negativas numeric(4,2) := 0;
  v_last_event_at timestamptz;
  v_work_shift_id uuid;
  v_horas_diarias numeric(4,2);
  v_horas_extra_window numeric(4,2) := 0;
  v_diferenca_horas numeric(4,2);
  v_requer_registro_ponto boolean := true; -- Default true para compatibilidade
BEGIN
  SELECT tr.employee_id, tr.company_id, tr.data_registro, tr.horas_faltas,
         COALESCE(e.requer_registro_ponto, true) -- Default true se NULL
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas, v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar o turno de trabalho ativo do funcionário para a data do registro
  SELECT es.turno_id, ws.horas_diarias
  INTO v_work_shift_id, v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrar turno, usar 8.0 como padrão (pode ser ajustado)
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  -- Map each event_type to the first occurrence of the day
  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calculate hours worked = (saida-entrada) - (saida_almoco-entrada_almoco)
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSE
    v_horas_trabalhadas := 0;
  END IF;

  -- Calculate extra hours from extra window (extra_inicio/extra_fim)
  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  END IF;

  -- Calcular diferença entre horas trabalhadas e horas_diarias do turno
  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  -- IMPORTANTE: Se funcionário não precisa registrar ponto (Artigo 62),
  -- não deve calcular horas negativas por ausência de registro
  -- Apenas calcular horas negativas se houver registro incompleto (entrada sem saída, etc)
  IF v_requer_registro_ponto THEN
    -- Funcionário precisa registrar ponto: calcular normalmente
    IF v_diferenca_horas > 0 THEN
      -- Horas extras do trabalho além do turno + horas extras da janela extra
      v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      v_horas_negativas := 0;
    ELSIF v_diferenca_horas < 0 THEN
      -- Horas negativas (trabalhou menos que o turno)
      -- Mas só se houver registro (entrada ou saída), caso contrário é falta não registrada
      IF v_entrada IS NOT NULL OR v_saida IS NOT NULL THEN
        v_horas_negativas := round(ABS(v_diferenca_horas), 2);
        v_horas_extras := round(v_horas_extra_window, 2); -- Apenas janela extra se houver
      ELSE
        -- Sem registro de ponto: considerar como falta (horas_faltas)
        v_horas_negativas := 0;
        v_horas_extras := 0;
        v_horas_faltas := COALESCE(v_horas_faltas, 0) + v_horas_diarias;
      END IF;
    ELSE
      -- Exatamente igual ao turno
      v_horas_extras := round(v_horas_extra_window, 2);
      v_horas_negativas := 0;
    END IF;
  ELSE
    -- Funcionário NÃO precisa registrar ponto (Artigo 62): não calcular horas negativas
    -- Apenas calcular horas extras se houver registro manual
    IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
      -- Se registrou manualmente, calcular horas extras se trabalhou mais que o turno
      IF v_diferenca_horas > 0 THEN
        v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      ELSE
        v_horas_extras := round(v_horas_extra_window, 2);
      END IF;
      v_horas_negativas := 0;
    ELSE
      -- Sem registro: não calcular nada (funcionário não precisa registrar)
      v_horas_extras := 0;
      v_horas_negativas := 0;
    END IF;
  END IF;

  -- Keep faltas as-is if previously set; if NULL, default to 0
  -- horas_faltas será usado apenas para faltas justificadas
  v_horas_faltas := COALESCE(v_horas_faltas, 0);

  -- Usar o event_at mais recente como referência para updated_at
  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  -- Se não houver eventos, usar NOW() como fallback
  IF v_last_event_at IS NULL THEN
    v_last_event_at := now();
  END IF;

  UPDATE rh.time_records
  SET 
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1,
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = CASE 
      WHEN v_horas_negativas > 0 THEN -v_horas_negativas -- Negativo indica débito
      ELSE v_horas_extras -- Positivo indica crédito
    END,
    horas_faltas = v_horas_faltas,
    updated_at = v_last_event_at
  WHERE id = p_time_record_id;
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. Considera Artigo 62 da CLT: funcionários que não precisam registrar ponto não têm saldo negativo por ausência de registro.';

-- 2. Atualizar função calculate_and_accumulate_bank_hours para considerar requer_registro_ponto
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
  v_hours_to_accumulate DECIMAL(5,2) := 0;
  v_hours_to_compensate DECIMAL(5,2) := 0;
  v_new_balance DECIMAL(6,2) := 0;
  v_requer_registro_ponto boolean := true;
BEGIN
  -- Verificar se funcionário precisa registrar ponto
  SELECT COALESCE(requer_registro_ponto, true) INTO v_requer_registro_ponto
  FROM rh.employees
  WHERE id = p_employee_id AND company_id = p_company_id;

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

  -- Calcular total de horas extras (positivas) e horas negativas (débito) no período
  -- IMPORTANTE: Se funcionário não precisa registrar ponto, não considerar horas negativas
  -- por ausência de registro (apenas se houver registro manual incompleto)
  SELECT 
    COALESCE(SUM(CASE WHEN horas_extras > 0 THEN horas_extras ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN horas_extras < 0 THEN ABS(horas_extras) ELSE 0 END), 0)
  INTO v_total_extra_hours, v_total_negative_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado';

  -- Se funcionário não precisa registrar ponto, não descontar horas negativas
  -- por ausência de registro (apenas considerar se houver registro manual incompleto)
  IF NOT v_requer_registro_ponto THEN
    -- Para funcionários do Artigo 62, apenas considerar horas negativas se houver
    -- registro manual (entrada ou saída), não por ausência total de registro
    -- Por enquanto, vamos zerar horas negativas para esses funcionários
    -- pois a ausência de registro não deve gerar débito
    v_total_negative_hours := 0;
  END IF;

  -- Primeiro, descontar horas negativas do saldo
  IF v_total_negative_hours > 0 THEN
    -- Descontar do saldo atual (se houver saldo positivo)
    IF COALESCE(v_balance.current_balance, 0) > 0 THEN
      v_new_balance := GREATEST(
        0, 
        v_balance.current_balance - v_total_negative_hours
      );
      -- Se sobrou horas negativas após descontar do saldo, elas ficam como débito
      IF v_total_negative_hours > v_balance.current_balance THEN
        v_total_negative_hours := v_total_negative_hours - v_balance.current_balance;
      ELSE
        v_total_negative_hours := 0;
      END IF;
    END IF;
    -- Horas negativas restantes ficam como débito no saldo
    IF v_total_negative_hours > 0 THEN
      v_new_balance := v_new_balance - v_total_negative_hours;
    END IF;
  ELSE
    v_new_balance := COALESCE(v_balance.current_balance, 0);
  END IF;

  -- Determinar quanto acumular e quanto compensar das horas extras
  IF v_config.auto_compensate AND v_new_balance > 0 THEN
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
      GREATEST(0, v_config.max_accumulation_hours - COALESCE(v_balance.accumulated_hours, 0))
    );
  END IF;

  -- Atualizar saldo final
  v_new_balance := v_new_balance + v_hours_to_accumulate - v_hours_to_compensate;

  -- Atualizar ou criar registro de saldo
  IF v_balance IS NOT NULL THEN
    UPDATE rh.bank_hours_balance SET
      current_balance = v_new_balance,
      accumulated_hours = COALESCE(v_balance.accumulated_hours, 0) + v_hours_to_accumulate,
      compensated_hours = COALESCE(v_balance.compensated_hours, 0) + v_hours_to_compensate,
      last_calculation_date = p_period_end,
      updated_at = NOW()
    WHERE employee_id = p_employee_id AND company_id = p_company_id;
  ELSE
    INSERT INTO rh.bank_hours_balance (
      employee_id, company_id, current_balance, 
      accumulated_hours, compensated_hours, last_calculation_date
    ) VALUES (
      p_employee_id, p_company_id, v_new_balance,
      v_hours_to_accumulate, v_hours_to_compensate, p_period_end
    );
  END IF;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.calculate_and_accumulate_bank_hours(UUID, UUID, DATE, DATE) IS 
'Calcula e acumula horas no banco de horas. Considera Artigo 62 da CLT: funcionários que não precisam registrar ponto não têm saldo negativo por ausência de registro.';

