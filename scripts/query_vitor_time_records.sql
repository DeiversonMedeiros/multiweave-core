-- Colaborador VITOR (matrícula 03027) e registros de ponto 27-29/01
\echo '=== EMPLOYEE VITOR ==='
SELECT id, nome, matricula, company_id
FROM rh.employees
WHERE nome ILIKE '%VITOR%COSTA%NETO%' OR matricula = '03027';

\echo ''
\echo '=== TIME_RECORDS (employee VITOR, 27 a 29/01) - TODAS AS LINHAS ==='
SELECT tr.id, tr.data_registro, tr.entrada, tr.entrada_almoco, tr.saida_almoco, tr.saida, tr.entrada_extra1, tr.saida_extra1, tr.created_at
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id AND e.company_id = tr.company_id
WHERE (e.nome ILIKE '%VITOR%COSTA%NETO%' OR e.matricula = '03027')
  AND tr.data_registro BETWEEN '2026-01-27' AND '2026-01-29'
ORDER BY tr.data_registro, tr.created_at;

\echo ''
\echo '=== DUPLICATAS (mesmo employee_id, company_id, data_registro) ==='
SELECT tr.employee_id, tr.company_id, tr.data_registro, COUNT(*) AS qtd
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id AND e.company_id = tr.company_id
WHERE (e.nome ILIKE '%VITOR%COSTA%NETO%' OR e.matricula = '03027')
  AND tr.data_registro BETWEEN '2026-01-27' AND '2026-01-29'
GROUP BY tr.employee_id, tr.company_id, tr.data_registro
HAVING COUNT(*) > 1;

\echo ''
\echo '=== TIME_RECORD_EVENTS (eventos dos registros acima) ==='
SELECT tre.id, tre.time_record_id, tre.event_type, tre.event_at, tr.data_registro
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tr.id = tre.time_record_id
JOIN rh.employees e ON e.id = tr.employee_id AND e.company_id = tr.company_id
WHERE (e.nome ILIKE '%VITOR%COSTA%NETO%' OR e.matricula = '03027')
  AND tr.data_registro BETWEEN '2026-01-27' AND '2026-01-29'
ORDER BY tre.event_at;

\echo ''
\echo '=== JANELA (time_record_settings) ==='
SELECT company_id, janela_tempo_marcacoes FROM rh.time_record_settings LIMIT 5;
