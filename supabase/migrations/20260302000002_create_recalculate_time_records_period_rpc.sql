-- =====================================================
-- RPC: Recalcular registros de ponto por período
-- =====================================================
-- Objetivo:
-- - Permitir que a UI "rh/time-records" tenha um botão para
--   recalcular registros de ponto em um intervalo de datas,
--   aplicando a lógica mais recente de:
--   - rh.recalculate_time_record_hours (horas trabalhadas/negativas/noturnas)
--   - rh.calculate_overtime_by_scale (horas_extras_50 / horas_extras_100)
--
-- Parâmetros:
-- - p_company_id: empresa alvo (obrigatório)
-- - p_start_date / p_end_date: intervalo de datas (obrigatório)
-- - p_employee_id: opcional; quando informado, limita a um funcionário
--
-- Retorno:
-- - JSON com contagem de registros processados/erros.
-- =====================================================

CREATE OR REPLACE FUNCTION public.recalculate_time_records_period(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_employee_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
  v_total_processed INTEGER := 0;
  v_total_errors INTEGER := 0;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'p_company_id é obrigatório';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date e p_end_date são obrigatórios';
  END IF;

  -- Garantir ordem correta de datas
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'p_end_date não pode ser menor que p_start_date';
  END IF;

  -- Iterar sobre registros no período/empresa (e opcionalmente funcionário)
  FOR v_record IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.company_id = p_company_id
      AND tr.data_registro >= p_start_date
      AND tr.data_registro <= p_end_date
      AND (p_employee_id IS NULL OR tr.employee_id = p_employee_id)
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY tr.data_registro ASC
  LOOP
    BEGIN
      -- Recalcular horas trabalhadas/negativas/noturnas com base em time_record_events
      PERFORM rh.recalculate_time_record_hours(v_record.id);

      -- Garantir aplicação da lógica de escala/feriado/domingo/folga
      PERFORM rh.calculate_overtime_by_scale(v_record.id);

      v_total_processed := v_total_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_total_errors := v_total_errors + 1;
        RAISE WARNING '[recalculate_time_records_period] Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'company_id', p_company_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'employee_id', p_employee_id,
    'total_processed', v_total_processed,
    'total_errors', v_total_errors
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.recalculate_time_records_period IS 
  'Recalcula registros de ponto de uma empresa em um período de datas, '
  'opcionalmente filtrando por funcionário. Usa recalculate_time_record_hours '
  'e calculate_overtime_by_scale para aplicar a lógica mais recente '
  'de horas trabalhadas, extras (50%/100%), negativas e noturnas.';

GRANT EXECUTE ON FUNCTION public.recalculate_time_records_period(
  UUID,
  DATE,
  DATE,
  UUID
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.recalculate_time_records_period(
  UUID,
  DATE,
  DATE,
  UUID
) TO service_role;

