-- =====================================================
-- Diagnóstico: Feriado 01/01/2026 SMARTVIEW x LUANA
-- Natureza do dia não aparece como Feriado na aba Resumo por Funcionário
-- =====================================================

-- 1) Empresa SMARTVIEW (companies: nome_fantasia / razao_social)
SELECT id AS company_id, nome_fantasia, razao_social
FROM public.companies
WHERE UPPER(TRIM(nome_fantasia)) LIKE '%SMARTVIEW%' OR UPPER(TRIM(razao_social)) LIKE '%SMARTVIEW%';

-- 2) Feriados em 01/01/2026 (todas as empresas)
SELECT h.id, h.company_id, c.nome_fantasia AS company_name, h.nome, h.data, h.tipo, h.ativo
FROM rh.holidays h
JOIN public.companies c ON c.id = h.company_id
WHERE h.data = '2026-01-01'
ORDER BY c.nome_fantasia;

-- 3) Feriados em 01/01/2026 apenas SMARTVIEW
SELECT h.id, h.company_id, h.nome, h.data, h.tipo, h.ativo
FROM rh.holidays h
JOIN public.companies c ON c.id = h.company_id
WHERE h.data = '2026-01-01'
  AND (UPPER(TRIM(c.nome_fantasia)) LIKE '%SMARTVIEW%' OR UPPER(TRIM(c.razao_social)) LIKE '%SMARTVIEW%');

-- 4) Funcionária LUANA DA CRUZ DA SILVA
SELECT e.id AS employee_id, e.company_id, e.nome, c.nome_fantasia AS company_name
FROM rh.employees e
JOIN public.companies c ON c.id = e.company_id
WHERE UPPER(TRIM(e.nome)) LIKE '%LUANA%CRUZ%SILVA%' OR UPPER(TRIM(e.nome)) LIKE '%LUANA%DA CRUZ%';

-- 5) time_records da LUANA em 01/01/2026 (qualquer empresa onde ela exista)
SELECT tr.id, tr.employee_id, tr.company_id, tr.data_registro,
       tr.entrada, tr.saida, tr.horas_trabalhadas, tr.natureza_dia, tr.is_feriado, tr.is_dia_folga
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE (UPPER(TRIM(e.nome)) LIKE '%LUANA%CRUZ%SILVA%' OR UPPER(TRIM(e.nome)) LIKE '%LUANA%DA CRUZ%')
  AND tr.data_registro::date = '2026-01-01';

-- 6) Overrides de natureza para LUANA em 01/01/2026
SELECT o.id, o.employee_id, o.company_id, o.data_registro, o.natureza_dia
FROM rh.time_record_day_nature_override o
JOIN rh.employees e ON e.id = o.employee_id
WHERE (UPPER(TRIM(e.nome)) LIKE '%LUANA%CRUZ%SILVA%' OR UPPER(TRIM(e.nome)) LIKE '%LUANA%DA CRUZ%')
  AND o.data_registro = '2026-01-01';

-- 7) Verificação: para a empresa SMARTVIEW, existe feriado 01/01/2026?
SELECT EXISTS (
  SELECT 1 FROM rh.holidays h
  JOIN public.companies c ON c.id = h.company_id
  WHERE h.data = '2026-01-01' AND h.ativo = true
    AND (UPPER(TRIM(c.nome_fantasia)) LIKE '%SMARTVIEW%' OR UPPER(TRIM(c.razao_social)) LIKE '%SMARTVIEW%')
) AS smartview_tem_feriado_01_01_2026;

-- 8) LUANA na SMARTVIEW: employee_id e company_id
SELECT e.id AS employee_id, e.company_id, e.nome
FROM rh.employees e
JOIN public.companies c ON c.id = e.company_id
WHERE (UPPER(TRIM(c.nome_fantasia)) LIKE '%SMARTVIEW%' OR UPPER(TRIM(c.razao_social)) LIKE '%SMARTVIEW%')
  AND (UPPER(TRIM(e.nome)) LIKE '%LUANA%CRUZ%' OR UPPER(TRIM(e.nome)) LIKE '%LUANA%DA CRUZ%');

-- 9) Para LUANA na SMARTVIEW: tem registro em time_records em 01/01/2026?
SELECT tr.id, tr.data_registro, tr.entrada, tr.saida, tr.natureza_dia, tr.is_feriado
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
JOIN public.companies c ON c.id = e.company_id
WHERE (UPPER(TRIM(c.nome_fantasia)) LIKE '%SMARTVIEW%' OR UPPER(TRIM(c.razao_social)) LIKE '%SMARTVIEW%')
  AND (UPPER(TRIM(e.nome)) LIKE '%LUANA%CRUZ%' OR UPPER(TRIM(e.nome)) LIKE '%LUANA%DA CRUZ%')
  AND tr.data_registro::date = '2026-01-01';

-- 10) Para LUANA na SMARTVIEW: tem override em 01/01/2026?
SELECT o.id, o.data_registro, o.natureza_dia
FROM rh.time_record_day_nature_override o
JOIN rh.employees e ON e.id = o.employee_id
JOIN public.companies c ON c.id = o.company_id
WHERE (UPPER(TRIM(c.nome_fantasia)) LIKE '%SMARTVIEW%' OR UPPER(TRIM(c.razao_social)) LIKE '%SMARTVIEW%')
  AND (UPPER(TRIM(e.nome)) LIKE '%LUANA%CRUZ%' OR UPPER(TRIM(e.nome)) LIKE '%LUANA%DA CRUZ%')
  AND o.data_registro = '2026-01-01';
