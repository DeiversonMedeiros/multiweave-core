-- Recalcular registros de ponto do LUAN (SMARTVIEW) para jan/2026
-- para aplicar a regra atual de 7,33h e zerar horas negativas indevidas.
-- Executar após confirmar a análise em docs/ANALISE_LUAN_SMARTVIEW_HORAS_NORMAIS_7h33.md

DO $$
DECLARE
  r RECORD;
  n int := 0;
BEGIN
  FOR r IN
    SELECT tr.id, tr.data_registro
    FROM rh.time_records tr
    JOIN rh.employees e ON e.id = tr.employee_id
    WHERE e.id = 'fc762aa3-4cf1-4d6b-a823-4260b2461822'
      AND tr.data_registro >= '2026-01-01'
      AND tr.data_registro < '2026-02-01'
    ORDER BY tr.data_registro
  LOOP
    PERFORM rh.recalculate_time_record_hours(r.id);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Recalculados % registros (LUAN SMARTVIEW jan/2026).', n;
END $$;
