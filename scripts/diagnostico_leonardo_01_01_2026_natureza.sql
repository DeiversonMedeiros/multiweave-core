-- =====================================================
-- Diagnóstico: LEONARDO SILVA PEREIRA - 01/01/2026 mostra DSR em vez de Feriado
-- Executar no banco (psql ou SQL Editor Supabase).
-- Se a query 2 retornar uma linha com natureza_dia = 'dsr', esse override
-- faz a tela mostrar DSR; a migração 20260220000006 corrige isso para 'feriado'.
-- =====================================================

-- 1) Funcionário Leonardo Silva Pereira (id e company_id)
SELECT e.id AS employee_id, e.company_id, e.nome, c.nome_fantasia
FROM rh.employees e
JOIN public.companies c ON c.id = e.company_id
WHERE e.nome ILIKE '%LEONARDO%SILVA%PEREIRA%' OR e.nome ILIKE '%LEONARDO SILVA PEREIRA%';

-- 2) Override de natureza do dia para 01/01/2026 (se existir, força o valor exibido)
SELECT o.id, o.employee_id, o.data_registro, o.natureza_dia, o.created_at
FROM rh.time_record_day_nature_override o
JOIN rh.employees e ON e.id = o.employee_id
WHERE e.nome ILIKE '%LEONARDO%SILVA%PEREIRA%'
  AND o.data_registro = '2026-01-01';

-- 3) Registro em time_records para 01/01/2026 (natureza_dia e is_feriado)
SELECT tr.id, tr.employee_id, tr.data_registro, tr.natureza_dia, tr.is_feriado, tr.is_dia_folga
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.nome ILIKE '%LEONARDO%SILVA%PEREIRA%'
  AND tr.data_registro::date = '2026-01-01';

-- 4) Feriado 01/01/2026 na empresa do Leonardo
SELECT h.id, h.company_id, h.nome, h.data, h.tipo, h.ativo
FROM rh.holidays h
WHERE h.company_id = (SELECT company_id FROM rh.employees WHERE nome ILIKE '%LEONARDO%SILVA%PEREIRA%' LIMIT 1)
  AND h.data = '2026-01-01';

-- 5) Teste rh.is_holiday(2026-01-01) para a empresa do Leonardo
SELECT rh.is_holiday(
  '2026-01-01'::date,
  (SELECT company_id FROM rh.employees WHERE nome ILIKE '%LEONARDO%SILVA%PEREIRA%' LIMIT 1)
) AS is_feriado_01_01_2026;
