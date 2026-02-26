-- Execução única: diagnóstico feriado 01/01/2026
\echo '=== 1) Empresa Estrategic ==='
SELECT id, nome_fantasia, razao_social FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' OR razao_social ILIKE '%Estrategic%';

\echo '=== 2) Feriados em 01/01/2026 para Estrategic ==='
SELECT h.id, h.company_id, h.nome, h.data, h.tipo, h.ativo FROM rh.holidays h WHERE h.company_id = (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' LIMIT 1) AND h.data = '2026-01-01';

\echo '=== 3) rh.is_holiday(2026-01-01, Estrategic) ==='
SELECT rh.is_holiday('2026-01-01'::date, (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' LIMIT 1)) AS is_feriado;

\echo '=== 4) Feriados jan/2026 Estrategic ==='
SELECT h.nome, h.data, h.tipo FROM rh.holidays h WHERE h.company_id = (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' LIMIT 1) AND h.data >= '2026-01-01' AND h.data <= '2026-01-31' ORDER BY h.data;
