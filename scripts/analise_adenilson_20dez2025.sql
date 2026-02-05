-- Análise: ADENILSON LIMA DOS SANTOS, AXISENG, 20/12/2025 - hora extra 100%
-- Objetivo: entender por que 20/12/2025 (sábado) contou como 100% e não 50%
--
-- CONCLUSÃO (ver docs/ANALISE_ADENILSON_20DEZ2025_HORA_EXTRA_100.md):
-- O turno "Escala 6x1 Fixa" tem dias_semana = {1,2,3,4,5}. A função antiga is_rest_day
-- (antes de 20260110000001) usava só dias_semana e tratava todo sábado/domingo como folga.
-- Com a lógica atual (ciclo rotativo), 20/12 é posição 2 no ciclo = dia de trabalho.
-- O correto seria 50% (banco), não 100%. Recalcular o registro corrige.

-- 1) Empresa AXISENG
SELECT id, nome_fantasia, razao_social FROM public.companies WHERE nome_fantasia ILIKE '%AXISENG%';

-- 2) Funcionário ADENILSON LIMA DOS SANTOS na AXISENG
SELECT e.id, e.nome, e.company_id, e.work_shift_id, c.nome_fantasia
FROM rh.employees e
JOIN public.companies c ON c.id = e.company_id
WHERE e.nome ILIKE '%ADENILSON%LIMA%' AND c.nome_fantasia ILIKE '%AXISENG%';

-- 3) Registro de ponto em 20/12/2025 para esse funcionário
-- (usar o company_id e employee_id encontrados acima)
\set company_axiseng 'dc060329-50cd-4114-922f-624a6ab036d6'
\set data_reg '2025-12-20'

SELECT 
  tr.id,
  tr.employee_id,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.is_feriado,
  tr.is_domingo,
  tr.is_dia_folga,
  tr.entrada,
  tr.saida,
  EXTRACT(DOW FROM tr.data_registro) AS dow,
  to_char(tr.data_registro, 'Day') AS dia_semana
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.nome ILIKE '%ADENILSON%LIMA%'
  AND tr.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND tr.data_registro::date = '2025-12-20';

-- 4) Turno do funcionário (work_shift e employee_shifts) e tipo de escala
SELECT 
  e.id AS employee_id,
  e.nome,
  ws.id AS work_shift_id,
  ws.nome AS turno_nome,
  ws.tipo_escala,
  ws.horas_diarias,
  ws.dias_trabalho,
  ws.dias_folga,
  ws.ciclo_dias,
  ws.dias_semana
FROM rh.employees e
LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
WHERE e.nome ILIKE '%ADENILSON%LIMA%'
  AND e.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';

SELECT 
  es.funcionario_id,
  es.turno_id,
  es.data_inicio,
  es.data_fim,
  es.ativo,
  ws.tipo_escala,
  ws.dias_trabalho,
  ws.dias_folga,
  ws.ciclo_dias
FROM rh.employee_shifts es
JOIN rh.work_shifts ws ON ws.id = es.turno_id
JOIN rh.employees e ON e.id = es.funcionario_id
WHERE e.nome ILIKE '%ADENILSON%LIMA%'
  AND es.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND es.data_inicio <= '2025-12-20'
  AND (es.data_fim IS NULL OR es.data_fim >= '2025-12-20')
ORDER BY es.data_inicio DESC;

-- 5) Feriados em 20/12/2025 para a empresa AXISENG
SELECT * FROM rh.holidays 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' 
  AND data::date = '2025-12-20';

-- 6) Verificação is_sunday e is_rest_day para 20/12/2025
-- (executar após ter employee_id)
SELECT 
  '2025-12-20'::date AS data,
  EXTRACT(DOW FROM '2025-12-20'::date) AS dow_postgres,
  rh.is_sunday('2025-12-20'::date) AS is_sunday;
