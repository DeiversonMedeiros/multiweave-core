-- Cole no SQL Editor do Supabase e execute. Resultados em abas.

-- 1) Registro + turno + tipo retornado
SELECT 
  tr.id AS time_record_id,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.is_domingo,
  tr.is_dia_folga,
  e.nome,
  ws.nome AS escala_nome,
  ws.tipo_escala::text AS tipo_escala,
  ws.dias_semana,
  (SELECT rh.get_employee_work_shift_type(e.id, e.company_id, tr.data_registro)) AS get_work_shift_type
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%'
  AND tr.data_registro = '2026-01-31';

-- 2) is_sunday e is_rest_day para 31/01/2026
SELECT 
  e.id,
  e.nome,
  rh.is_rest_day(e.id, e.company_id, '2026-01-31'::date) AS is_rest_day,
  rh.is_sunday('2026-01-31'::date) AS is_sunday,
  EXTRACT(DOW FROM '2026-01-31'::date) AS dow
FROM rh.employees e
WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%';

-- 3) Trecho da função no banco (deve conter "IF v_is_domingo THEN" para 100%, não "OR v_is_dia_folga")
SELECT substring(
  pg_get_functiondef(p.oid) from 'ELSE\s+-- Escala fixa.*?END IF;\s+END IF;\s+v_horas_negativas'
) AS escala_fixa_bloco
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'rh' AND p.proname = 'calculate_overtime_by_scale';
