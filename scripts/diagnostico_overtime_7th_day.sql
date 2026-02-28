-- =====================================================
-- Diagnóstico: hora extra 100% no 7º dia após DSR
-- =====================================================
-- 1) Listar um registro de 11/01/2026 da ESTRATEGIC para pegar employee_id e company_id
-- 2) Rodar diagnose_overtime_7th_day para ver o passo a passo
-- 3) Recalcular apenas esse registro e ver os NOTICEs [OVERTIME_7TH]
--
-- Interpretação do diagnóstico:
-- - "QUEBRA: sem registro em time_records" = não existe linha em rh.time_records
--   para essa data. O 7º dia exige 6 dias consecutivos COM registro; se um dia
--   não tem registro, a contagem para aí. A UI pode mostrar o dia por registro
--   "virtual" (completado pelo frontend) que não está gravado no banco.
-- - "QUEBRA: is_rest_day=TRUE" = dia de folga da escala (quebra o ciclo).
-- - "QUEBRA: is_virtual_dsr=TRUE" = natureza do dia = DSR (quebra o ciclo).
--
-- Uso (no psql ou SQL Editor):
--   \ir scripts/diagnostico_overtime_7th_day.sql
-- Ou copie as queries abaixo e substitua os UUIDs.
-- =====================================================

-- Passo 1: Descobrir employee_id e company_id de um registro em 11/01/2026 (ESTRATEGIC)
SELECT tr.id AS time_record_id,
       tr.employee_id,
       tr.company_id,
       tr.data_registro,
       tr.horas_trabalhadas,
       tr.horas_extras_50,
       tr.horas_extras_100,
       e.nome AS employee_nome,
       c.nome_fantasia AS company
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
JOIN public.companies c ON c.id = tr.company_id
WHERE tr.data_registro = '2026-01-11'
  AND c.nome_fantasia = 'ESTRATEGIC'
ORDER BY e.nome
LIMIT 10;

-- Passo 2: Diagnóstico detalhado (substitua os UUIDs pelos do Passo 1)
-- Exemplo ALEXANDRE PEREIRA GONCALVES (employee_id do log, company ESTRATEGIC):
-- SELECT * FROM rh.diagnose_overtime_7th_day(
--   '0c01db1f-12bd-4554-8fcd-e7e5bebb010c'::uuid,
--   'ce390408-1c18-47fc-bd7d-76379ec488b7'::uuid,
--   '2026-01-11'::date
-- );

-- Passo 3: Recalcular UM registro e ver os logs [OVERTIME_7TH] (substitua o time_record_id)
-- Exemplo Alexandre 11/01 (do log: 5c6372eb-6782-438e-8bb4-f30ec3076381):
-- SET client_min_messages TO NOTICE;
-- SELECT rh.calculate_overtime_by_scale('5c6372eb-6782-438e-8bb4-f30ec3076381'::uuid);

-- Passo 4: Conferir tipo de escala e se 10/01 existe em time_records (Alexandre)
-- SELECT rh.get_employee_work_shift_type('0c01db1f-12bd-4554-8fcd-e7e5bebb010c'::uuid, 'ce390408-1c18-47fc-bd7d-76379ec488b7'::uuid, '2026-01-11'::date) AS tipo_escala;
-- SELECT id, data_registro, horas_trabalhadas FROM rh.time_records WHERE employee_id = '0c01db1f-12bd-4554-8fcd-e7e5bebb010c' AND data_registro BETWEEN '2026-01-04' AND '2026-01-11' ORDER BY data_registro;

-- Passo 5: Verificar se 04/01 tem DSR virtual (override ou natureza_dia no registro)
-- SELECT 'time_records 04/01' AS origem, tr.data_registro, tr.natureza_dia, tr.horas_trabalhadas
-- FROM rh.time_records tr
-- WHERE tr.employee_id = '0c01db1f-12bd-4554-8fcd-e7e5bebb010c'::uuid AND tr.data_registro = '2026-01-04'
-- UNION ALL
-- SELECT 'override 04/01', o.data_registro::text, o.natureza_dia, NULL
-- FROM rh.time_record_day_nature_override o
-- WHERE o.employee_id = '0c01db1f-12bd-4554-8fcd-e7e5bebb010c'::uuid AND o.data_registro = '2026-01-04';
