-- Recalcular registros de ponto de TODOS os funcionários de TODAS as empresas
-- para aplicar a regra atual de horas_diarias do turno (ex.: 7,33h em escalas 6x1)
-- e corrigir horas negativas indevidas calculadas com fallback 8h.
--
-- Período: ajuste as datas abaixo se quiser outro intervalo (ex.: mais meses).
-- Para processar TODO o histórico, use:
--   tr.data_registro >= '2000-01-01' AND tr.data_registro < '2030-01-01'

DO $$
DECLARE
  r RECORD;
  n int := 0;
  -- Período a processar (altere conforme necessário)
  v_data_inicio date := '2026-01-01';
  v_data_fim    date := '2026-02-01';
BEGIN
  FOR r IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.data_registro >= v_data_inicio
      AND tr.data_registro < v_data_fim
    ORDER BY tr.company_id, tr.employee_id, tr.data_registro
  LOOP
    PERFORM rh.recalculate_time_record_hours(r.id);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Recalculados % registros (todos os funcionários, todas as empresas, período % a %).', n, v_data_inicio, v_data_fim - 1;
END $$;
