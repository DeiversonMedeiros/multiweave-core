-- =====================================================
-- Recálculo de registros de ponto afetados pelas correções
-- (Extras 50% janela de tempo + horas parciais 2/4/6 marcações)
-- =====================================================
-- Execute APÓS aplicar as migrations:
--   20260210000002_fix_overtime_cap_janela_and_incomplete_marks.sql
--   20260210000003_fix_is_rest_day_call_calculate_overtime.sql
--   20260210000004_recalculate_partial_hours_ultimo_evento.sql
--
-- Recalcula para TODOS que tiveram algum dos problemas:
--   1. Extras 50% acima de 15h (ou 99h59) → passa a respeitar janela e eventos reais
--   2. Horas trabalhadas > 24h (suspeito) → recálculo
--   3. Registro incompleto (tem entrada, sem saída) → passa a calcular horas parciais
--      quando há 2, 4 ou 6 marcações (ex.: entrada + início almoço = horas até início almoço)
-- =====================================================

DO $$
DECLARE
  v_rec RECORD;
  v_count INT := 0;
  v_extras_altos INT := 0;
  v_horas_altas INT := 0;
  v_incompletos INT := 0;
BEGIN
  -- Contar por critério (para o relatório)
  SELECT COUNT(*) INTO v_extras_altos FROM rh.time_records WHERE COALESCE(horas_extras_50, 0) > 15;
  SELECT COUNT(*) INTO v_horas_altas FROM rh.time_records WHERE COALESCE(horas_trabalhadas, 0) > 24;
  SELECT COUNT(*) INTO v_incompletos FROM rh.time_records WHERE entrada IS NOT NULL AND saida IS NULL;

  RAISE NOTICE 'Registros a recalculados (podem se sobrepor): Extras 50%% > 15: %, Horas > 24: %, Incompletos (entrada sem saída): %',
    v_extras_altos, v_horas_altas, v_incompletos;

  FOR v_rec IN
    SELECT DISTINCT tr.id
    FROM rh.time_records tr
    WHERE COALESCE(tr.horas_extras_50, 0) > 15
       OR COALESCE(tr.horas_trabalhadas, 0) > 24
       OR (tr.entrada IS NOT NULL AND tr.saida IS NULL)
    ORDER BY tr.id
  LOOP
    PERFORM rh.recalculate_time_record_hours(v_rec.id);
    v_count := v_count + 1;
    IF v_count % 100 = 0 THEN
      RAISE NOTICE 'Recalculados % registros...', v_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total de registros recalculados: %', v_count;
END;
$$;
