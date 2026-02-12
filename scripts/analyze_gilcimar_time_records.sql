-- Script para analisar registros de ponto do GILCIMAR OLIVEIRA DA SILVA
-- Verificar problema de agrupamento de marcações por janela de tempo

-- 1. Buscar funcionário
SELECT id, nome, email, company_id 
FROM public.users 
WHERE nome ILIKE '%GILCIMAR%';

-- 2. Buscar registros de ponto do funcionário para os dias 21 e 22/01/2026
-- Substituir 'EMPLOYEE_ID' pelo ID encontrado acima
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.created_at,
  tr.updated_at,
  e.nome as employee_nome,
  c.nome_fantasia as company_name
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
JOIN public.companies c ON tr.company_id = c.id
WHERE e.nome ILIKE '%GILCIMAR%'
  AND tr.data_registro BETWEEN '2026-01-20' AND '2026-01-23'
ORDER BY tr.data_registro, tr.created_at;

-- 3. Buscar eventos de ponto (time_record_events) para entender o que foi registrado
SELECT 
  tre.id,
  tre.event_type,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' as event_at_local,
  tre.time_record_id,
  tr.data_registro,
  e.nome as employee_nome
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
JOIN public.users e ON tr.employee_id = e.id
WHERE e.nome ILIKE '%GILCIMAR%'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-21 00:00:00'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' <= '2026-01-22 23:59:59'
ORDER BY tre.event_at;

-- 4. Verificar configuração de janela de tempo da empresa SMARTVIEW
SELECT 
  trs.company_id,
  c.nome_fantasia,
  trs.janela_tempo_marcacoes
FROM rh.time_record_settings trs
JOIN public.companies c ON trs.company_id = c.id
WHERE c.nome_fantasia ILIKE '%SMARTVIEW%';

-- 5. Testar função get_consolidated_time_record_by_window para o dia 21/01
-- Substituir 'EMPLOYEE_ID' e 'COMPANY_ID' pelos IDs encontrados acima
SELECT public.get_consolidated_time_record_by_window(
  'EMPLOYEE_ID'::uuid,
  'COMPANY_ID'::uuid,
  '2026-01-21'::date,
  'America/Sao_Paulo'
);

-- 6. Testar função get_consolidated_time_record_by_window para o dia 22/01
SELECT public.get_consolidated_time_record_by_window(
  'EMPLOYEE_ID'::uuid,
  'COMPANY_ID'::uuid,
  '2026-01-22'::date,
  'America/Sao_Paulo'
);

-- 7. Verificar se há registros com entrada_extra1 mas sem outras marcações no mesmo dia
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  e.nome,
  c.nome_fantasia,
  CASE 
    WHEN tr.entrada IS NULL AND tr.entrada_almoco IS NULL AND tr.saida_almoco IS NULL 
         AND tr.saida IS NULL AND tr.entrada_extra1 IS NOT NULL 
    THEN 'ENTRADA_EXTRA_ISOLADA'
    ELSE 'OK'
  END as status_verificacao
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
JOIN public.companies c ON tr.company_id = c.id
WHERE e.nome ILIKE '%GILCIMAR%'
  AND tr.data_registro BETWEEN '2026-01-20' AND '2026-01-23'
ORDER BY tr.data_registro;
