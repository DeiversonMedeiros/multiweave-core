-- Diagnóstico: Resumo por Funcionário (rh/time-records) não mostrava KAIQUE e outros em jan/2026
-- Executado em 2026-02-23.
--
-- CAUSA:
-- O resumo era construído apenas a partir de quem tinha pelo menos um time_record no mês.
-- KAIQUE teve férias aprovadas de 2026-01-05 a 2026-01-24 e não tinha nenhum time_record em jan/2026,
-- portanto não aparecia na lista. O mesmo para outros 50+ funcionários da empresa.
--
-- CORREÇÃO (frontend):
-- Incluir no employeeSummary todos os funcionários com requer_registro_ponto = true,
-- mesmo sem time_record no mês. Para esses, completeRecordsWithRestDays([], ...) + getMonthDaysInfo
-- preenchem os dias virtuais (férias, atestado, falta, DSR, etc.).
--
-- Consultas usadas no diagnóstico:

-- KAIQUE: company e requer_registro_ponto
-- SELECT id, nome, company_id, requer_registro_ponto FROM rh.employees WHERE nome ILIKE '%KAIQUE SILVA%';

-- Férias de KAIQUE em jan/2026
-- SELECT v.id, v.employee_id, e.nome, v.data_inicio, v.data_fim, v.status
-- FROM rh.vacations v JOIN rh.employees e ON e.id = v.employee_id
-- WHERE v.employee_id = 'bc699021-236e-4050-b7ab-b54071601550'
--   AND v.data_inicio <= '2026-01-31' AND v.data_fim >= '2026-01-01';

-- Time records de KAIQUE em jan/2026 (resultado: 0)
-- SELECT COUNT(*) FROM rh.time_records tr
-- WHERE tr.employee_id = 'bc699021-236e-4050-b7ab-b54071601550'
--   AND tr.data_registro >= '2026-01-01' AND tr.data_registro < '2026-02-01';

-- Empresa ce390408: 81 com registro em jan/2026 vs 132 que requerem ponto
-- SELECT COUNT(DISTINCT tr.employee_id) AS com_registro,
--   (SELECT COUNT(*) FROM rh.employees WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7' AND requer_registro_ponto = true) AS total_requer_ponto
-- FROM rh.time_records tr
-- WHERE tr.data_registro >= '2026-01-01' AND tr.data_registro < '2026-02-01'
--   AND tr.company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7';
