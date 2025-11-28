-- =====================================================
-- CORRIGIR FUNÇÃO run_bank_hours_calculation
-- PARA FUNCIONAR COM bank_hours_assignments (SISTEMA NOVO)
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
  -- Considerar tanto sistema novo (bank_hours_assignments) quanto antigo (bank_hours_config)
  FOR v_employee_record IN
    -- Sistema novo: bank_hours_assignments
    SELECT DISTINCT bha.employee_id, bha.company_id
    FROM rh.bank_hours_assignments bha
    INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
    WHERE bha.company_id = p_company_id
      AND bha.is_active = true
      AND bht.is_active = true
      AND bht.has_bank_hours = true
    
    UNION
    
    -- Sistema antigo: bank_hours_config (só se não tiver no sistema novo)
    SELECT DISTINCT bhc.employee_id, bhc.company_id
    FROM rh.bank_hours_config bhc
    WHERE bhc.company_id = p_company_id
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
      AND NOT EXISTS (
        SELECT 1 
        FROM rh.bank_hours_assignments bha2
        INNER JOIN rh.bank_hours_types bht2 ON bht2.id = bha2.bank_hours_type_id
        WHERE bha2.employee_id = bhc.employee_id
          AND bha2.company_id = bhc.company_id
          AND bha2.is_active = true
          AND bht2.is_active = true
          AND bht2.has_bank_hours = true
      )
  LOOP
    BEGIN
      -- Calcular e acumular horas para este colaborador
      SELECT * INTO v_result
      FROM rh.calculate_and_accumulate_bank_hours(
        v_employee_record.employee_id,
        v_employee_record.company_id,
        v_period_start,
        v_period_end
      );

      v_total_accumulated := v_total_accumulated + COALESCE(v_result.hours_accumulated, 0);
      v_total_compensated := v_total_compensated + COALESCE(v_result.hours_compensated, 0);
      v_employees_processed := v_employees_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro mas continua processando outros funcionários
        RAISE WARNING 'Erro ao processar funcionário %: %', v_employee_record.employee_id, SQLERRM;
    END;
  END LOOP;

  -- Processar expiração de horas
  BEGIN
    SELECT * INTO v_result
    FROM rh.process_bank_hours_expiration(p_company_id, p_calculation_date);
    
    v_total_expired := COALESCE(v_result.hours_expired, 0);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar expiração: %', SQLERRM;
      v_total_expired := 0;
  END;

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

COMMENT ON FUNCTION rh.run_bank_hours_calculation IS 
  'Executa cálculo completo do banco de horas para uma empresa.
   Funciona com bank_hours_assignments (sistema novo) e bank_hours_config (sistema antigo).
   Prioriza sistema novo sobre sistema antigo.';

