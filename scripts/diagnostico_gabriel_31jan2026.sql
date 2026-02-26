-- Diagnóstico: registro GABRIEL 31/01/2026 e função calculate_overtime
\echo '=== 1. Registro de ponto e turno ==='
SELECT 
  tr.id AS time_record_id,
  tr.employee_id,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.horas_negativas,
  tr.is_domingo,
  tr.is_dia_folga,
  tr.is_feriado,
  e.nome AS employee_nome,
  e.work_shift_id,
  ws.nome AS escala_nome,
  ws.tipo_escala,
  ws.dias_semana,
  (SELECT rh.get_employee_work_shift_type(e.id, e.company_id, tr.data_registro)) AS get_employee_work_shift_type
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%'
  AND tr.data_registro = '2026-01-31';

\echo '=== 2. is_rest_day e is_sunday para 31/01/2026 (employee do GABRIEL) ==='
SELECT 
  e.id AS employee_id,
  e.nome,
  rh.is_rest_day(e.id, e.company_id, '2026-01-31'::date) AS is_rest_day,
  rh.is_sunday('2026-01-31'::date) AS is_sunday,
  EXTRACT(DOW FROM '2026-01-31'::date) AS dow_pg,
  (CASE WHEN EXTRACT(DOW FROM '2026-01-31'::date) = 0 THEN 7 ELSE EXTRACT(DOW FROM '2026-01-31'::date)::INTEGER END) AS day_of_week_rh
FROM rh.employees e
WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%';

\echo '=== 3. employee_shifts ativos em 31/01/2026 (pode sobrescrever work_shift do employee) ==='
SELECT 
  es.id,
  es.funcionario_id,
  es.turno_id,
  es.data_inicio,
  es.data_fim,
  es.ativo,
  ws.nome AS escala_nome,
  ws.tipo_escala,
  ws.dias_semana
FROM rh.employee_shifts es
JOIN rh.employees e ON e.id = es.funcionario_id
JOIN rh.work_shifts ws ON ws.id = es.turno_id
WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%'
  AND es.data_inicio <= '2026-01-31'
  AND (es.data_fim IS NULL OR es.data_fim >= '2026-01-31')
  AND es.ativo = true
ORDER BY es.data_inicio DESC;

\echo '=== 4. Assinatura da função calculate_overtime_by_scale (trecho 50%% vs 100%%) ==='
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'rh') 
  AND proname = 'calculate_overtime_by_scale';
