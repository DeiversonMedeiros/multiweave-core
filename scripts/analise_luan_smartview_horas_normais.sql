-- Análise: LUAN CLAUDIO (SMARTVIEW) - Escala 6x1 Fixa 7,33h - horas negativas em dias Normal
-- Objetivo: Verificar por que dias "Normal" com 7h20 estão sendo debitados 40min (sistema usa 8h)

\echo '=== 1. EMPRESA SMARTVIEW ==='
SELECT id, nome_fantasia, razao_social FROM companies WHERE nome_fantasia ILIKE '%SMARTVIEW%' OR razao_social ILIKE '%SMARTVIEW%';

\echo ''
\echo '=== 2. FUNCIONÁRIO LUAN CLAUDIO (matrícula 05021) ==='
SELECT e.id, e.nome, e.matricula, e.company_id, e.work_shift_id
FROM rh.employees e
JOIN companies c ON c.id = e.company_id
WHERE (c.nome_fantasia ILIKE '%SMARTVIEW%' OR c.razao_social ILIKE '%SMARTVIEW%')
  AND (e.nome ILIKE '%LUAN%CLAU%' OR e.matricula = '05021');

\echo ''
\echo '=== 3. TURNO DO FUNCIONÁRIO (work_shift + employee_shifts) ==='
SELECT 
  e.id AS employee_id,
  e.nome,
  e.work_shift_id AS emp_work_shift_id,
  es.turno_id AS scale_turno_id,
  es.data_inicio,
  es.data_fim,
  es.ativo,
  ws.id AS ws_id,
  ws.nome AS turno_nome,
  ws.horas_diarias AS ws_horas_diarias,
  ws.horarios_por_dia
FROM rh.employees e
JOIN companies c ON c.id = e.company_id
LEFT JOIN rh.employee_shifts es ON es.funcionario_id = e.id AND es.company_id = e.company_id AND es.ativo = true
LEFT JOIN rh.work_shifts ws ON ws.id = COALESCE(es.turno_id, e.work_shift_id)
WHERE (c.nome_fantasia ILIKE '%SMARTVIEW%' OR c.razao_social ILIKE '%SMARTVIEW%')
  AND (e.nome ILIKE '%LUAN%CLAU%' OR e.matricula = '05021');

\echo ''
\echo '=== 4. HORAS ESPERADAS POR DIA (get_work_shift_hours_for_day) - 28/01 e 31/01/2026 ==='
-- 28/01/2026 = quarta = dia 3; 31/01/2026 = sábado = dia 6
SELECT 
  ws.id,
  ws.nome,
  ws.horas_diarias AS padrao_horas_diarias,
  rh.get_work_shift_hours_for_day(ws.id, 3) AS dia_3_quarta_28jan,
  rh.get_work_shift_hours_for_day(ws.id, 6) AS dia_6_sabado_31jan
FROM rh.employees e
JOIN companies c ON c.id = e.company_id
LEFT JOIN rh.employee_shifts es ON es.funcionario_id = e.id AND es.company_id = e.company_id AND es.ativo = true
LEFT JOIN rh.work_shifts ws ON ws.id = COALESCE(es.turno_id, e.work_shift_id)
WHERE (c.nome_fantasia ILIKE '%SMARTVIEW%' OR c.razao_social ILIKE '%SMARTVIEW%')
  AND (e.nome ILIKE '%LUAN%CLAU%' OR e.matricula = '05021');

\echo ''
\echo '=== 5. REGISTROS COM HORAS NEGATIVAS - JAN/2026 (dias Normal) ==='
SELECT 
  tr.id,
  tr.data_registro,
  to_char(tr.data_registro, 'Dy DD/MM') AS data_fmt,
  EXTRACT(DOW FROM tr.data_registro) AS dow_raw,
  CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7 ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END AS dia_semana,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.status
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
JOIN companies c ON c.id = tr.company_id
WHERE (c.nome_fantasia ILIKE '%SMARTVIEW%' OR c.razao_social ILIKE '%SMARTVIEW%')
  AND (e.nome ILIKE '%LUAN%CLAU%' OR e.matricula = '05021')
  AND tr.data_registro >= '2026-01-01'
  AND tr.data_registro < '2026-02-01'
  AND tr.horas_negativas IS NOT NULL AND tr.horas_negativas <> 0
ORDER BY tr.data_registro DESC;

\echo ''
\echo '=== 6. VALIDAÇÃO: qual horas_diarias seria usada em 28/01 e 31/01? ==='
WITH emp_ws AS (
  SELECT e.id AS emp_id, COALESCE(es.turno_id, e.work_shift_id) AS turno_id
  FROM rh.employees e
  JOIN companies c ON c.id = e.company_id
  LEFT JOIN rh.employee_shifts es ON es.funcionario_id = e.id AND es.company_id = e.company_id AND es.ativo = true
  WHERE (c.nome_fantasia ILIKE '%SMARTVIEW%' OR c.razao_social ILIKE '%SMARTVIEW%') AND (e.nome ILIKE '%LUAN%CLAU%' OR e.matricula = '05021')
)
SELECT 
  '2026-01-28'::date AS data_registro,
  3 AS dia_semana,
  (rh.get_work_shift_hours_for_day(emp_ws.turno_id, 3)->>'horas_diarias')::numeric AS horas_esperadas_28jan
FROM emp_ws
UNION ALL
SELECT 
  '2026-01-31'::date,
  6,
  (rh.get_work_shift_hours_for_day(emp_ws.turno_id, 6)->>'horas_diarias')::numeric
FROM emp_ws;

\echo ''
\echo '=== 7. AMOSTRA TURNO: nome e tipo (Escala 6x1 Fixa?) ==='
SELECT ws.id, ws.nome, ws.codigo, ws.horas_diarias, ws.dias_semana
FROM rh.work_shifts ws
WHERE ws.company_id = (SELECT id FROM companies WHERE nome_fantasia ILIKE '%SMARTVIEW%' OR razao_social ILIKE '%SMARTVIEW%' LIMIT 1)
  AND (ws.nome ILIKE '%6x1%' OR ws.nome ILIKE '%fixa%' OR ws.horas_diarias = 7.33 OR (ws.horarios_por_dia->'1'->>'horas_diarias')::numeric = 7.33);
