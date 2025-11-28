-- =====================================================
-- FUNÇÃO RPC PARA RECALCULAR BANCO DE HORAS RETROATIVAMENTE
-- =====================================================
-- Permite recalcular banco de horas para um funcionário específico
-- ou para todos os funcionários de uma empresa em um período específico
-- =====================================================

-- Função para recalcular banco de horas de um funcionário específico
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
BEGIN
  -- Se não especificado, usar últimos 30 dias
  v_period_start := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '30 days');
  v_period_end := COALESCE(p_period_end, CURRENT_DATE);

  -- Executar cálculo
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
    'new_balance', v_result.new_balance
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
   Útil para processar retroativamente débitos de dias sem registro de ponto.';

-- Função para recalcular banco de horas de todos os funcionários de uma empresa
CREATE OR REPLACE FUNCTION public.recalculate_company_bank_hours(
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
  v_employee_record RECORD;
  v_result RECORD;
  v_total_processed INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_results JSON[] := '{}';
  v_response JSON;
BEGIN
  -- Se não especificado, usar últimos 30 dias
  v_period_start := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '30 days');
  v_period_end := COALESCE(p_period_end, CURRENT_DATE);

  -- Processar cada funcionário com banco de horas ativo
  FOR v_employee_record IN
    SELECT DISTINCT employee_id
    FROM rh.bank_hours_config
    WHERE company_id = p_company_id
      AND is_active = true
      AND has_bank_hours = true
  LOOP
    BEGIN
      -- Executar cálculo
      SELECT * INTO v_result
      FROM rh.calculate_and_accumulate_bank_hours(
        v_employee_record.employee_id,
        p_company_id,
        v_period_start,
        v_period_end
      );

      -- Adicionar resultado ao array
      v_results := array_append(v_results, json_build_object(
        'employee_id', v_employee_record.employee_id,
        'hours_accumulated', v_result.hours_accumulated,
        'hours_compensated', v_result.hours_compensated,
        'new_balance', v_result.new_balance
      ));

      v_total_processed := v_total_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_total_errors := v_total_errors + 1;
        v_results := array_append(v_results, json_build_object(
          'employee_id', v_employee_record.employee_id,
          'error', SQLERRM
        ));
    END;
  END LOOP;

  -- Retornar resultado
  v_response := json_build_object(
    'success', true,
    'company_id', p_company_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'total_processed', v_total_processed,
    'total_errors', v_total_errors,
    'results', v_results
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

COMMENT ON FUNCTION public.recalculate_company_bank_hours IS 
  'Recalcula banco de horas para todos os funcionários de uma empresa em um período.
   Útil para processar retroativamente débitos de dias sem registro de ponto em massa.';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.recalculate_employee_bank_hours TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_company_bank_hours TO authenticated;

