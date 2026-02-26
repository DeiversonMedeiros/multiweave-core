-- =====================================================
-- Recalcular registros de ponto em dia de folga (escala fixa)
-- Execute APÓS aplicar a migration 20260223000002_fix_escala_fixa_dia_nao_trabalhado_extras.sql
-- =====================================================
-- Objetivo: Corrigir registros já existentes (ex.: GABRIEL CARVALHO PEREIRA em 31/01/2026)
--           que foram calculados com a lógica antiga (horas negativas em sábado/domingo da escala fixa).
-- =====================================================

-- 1) Diagnóstico: funcionário "GABRIEL CARVALHO PEREIRA", escala e registro em 31/01/2026
SELECT 
  e.id AS employee_id,
  e.nome,
  e.work_shift_id,
  ws.nome AS escala_nome,
  ws.tipo_escala,
  ws.dias_semana,
  tr.id AS time_record_id,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.horas_extras,
  tr.horas_negativas,
  tr.is_dia_folga
FROM rh.employees e
LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
LEFT JOIN rh.time_records tr ON tr.employee_id = e.id AND tr.data_registro = '2026-01-31'
WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%';

-- 2) Recalcular apenas o registro do dia 31/01/2026 do GABRIEL (substitua o UUID pelo time_record_id do passo 1)
-- SELECT rh.recalculate_time_record_hours('<time_record_id>');

-- 3) Recalcular TODOS os registros que são dia de folga e têm horas negativas (escala fixa) em jan/2026
-- Descomente e execute após conferir o diagnóstico:
/*
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tr.id
    FROM rh.time_records tr
    JOIN rh.employees e ON e.id = tr.employee_id
    JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE tr.data_registro >= '2026-01-01' AND tr.data_registro <= '2026-01-31'
      AND ws.tipo_escala = 'fixa'
      AND rh.is_rest_day(tr.employee_id, tr.company_id, tr.data_registro) = true
      AND (COALESCE(tr.horas_negativas, 0) > 0 OR (tr.horas_trabalhadas > 0 AND COALESCE(tr.horas_extras_50, 0) + COALESCE(tr.horas_extras_100, 0) = 0))
  LOOP
    PERFORM rh.recalculate_time_record_hours(r.id);
    RAISE NOTICE 'Recalculado: %', r.id;
  END LOOP;
END $$;
*/
