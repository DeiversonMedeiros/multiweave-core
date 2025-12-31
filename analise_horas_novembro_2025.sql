-- =====================================================
-- ANÁLISE: Horas Noturnas, Negativas, Extras 50% e 100%
-- Funcionário: VITOR ALVES DA COSTA NETO (Matrícula: 03027)
-- Período: Novembro/2025
-- =====================================================

-- 1. Buscar dados do funcionário
SELECT 
  id,
  nome,
  matricula,
  company_id
FROM rh.employees
WHERE matricula = '03027'
LIMIT 1;

-- 2. Analisar registros de ponto de novembro/2025
-- (Substituir {employee_id} e {company_id} pelos valores encontrados acima)
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.horas_trabalhadas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.horas_negativas,
  tr.horas_noturnas,
  tr.status,
  tr.updated_at,
  -- Verificar eventos
  (SELECT COUNT(*) FROM rh.time_record_events tre WHERE tre.time_record_id = tr.id) as eventos_count,
  -- Verificar se há correções
  (SELECT COUNT(*) FROM rh.time_record_corrections trc WHERE trc.time_record_id = tr.id) as correcoes_count
FROM rh.time_records tr
WHERE tr.employee_id = '{employee_id}'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;

-- 3. Verificar eventos de ponto de novembro/2025
SELECT 
  tre.id,
  tre.time_record_id,
  tre.event_type,
  tre.event_at,
  tr.data_registro
FROM rh.time_record_events tre
INNER JOIN rh.time_records tr ON tr.id = tre.time_record_id
WHERE tr.employee_id = '{employee_id}'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC, tre.event_at ASC;

-- 4. Verificar correções de ponto de novembro/2025
SELECT 
  trc.id,
  trc.time_record_id,
  trc.motivo,
  trc.created_at,
  tr.data_registro,
  tr.horas_noturnas as horas_noturnas_antes,
  tr.horas_negativas as horas_negativas_antes,
  tr.horas_extras_50 as extras_50_antes,
  tr.horas_extras_100 as extras_100_antes
FROM rh.time_record_corrections trc
INNER JOIN rh.time_records tr ON tr.id = trc.time_record_id
WHERE tr.employee_id = '{employee_id}'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY trc.created_at DESC;

-- 5. Verificar se a função calculate_night_hours está funcionando
-- Testar com um registro específico
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_noturnas as horas_noturnas_calculadas,
  rh.calculate_night_hours(tr.entrada, tr.saida, tr.data_registro) as horas_noturnas_teste
FROM rh.time_records tr
WHERE tr.employee_id = '{employee_id}'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
  AND tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL
ORDER BY tr.data_registro DESC;

-- 6. Verificar quando os registros foram recalculados pela última vez
SELECT 
  tr.id,
  tr.data_registro,
  tr.updated_at,
  tr.horas_trabalhadas,
  tr.horas_noturnas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  -- Verificar se há trigger que recalcula
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%time_record%') as triggers_count
FROM rh.time_records tr
WHERE tr.employee_id = '{employee_id}'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.updated_at DESC;

-- 7. Verificar a função recalculate_time_record_hours
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'recalculate_time_record_hours'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'rh');

-- 8. Verificar se horas_noturnas está sendo atualizada na função
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE proname IN ('recalculate_time_record_hours', 'calculate_overtime_by_scale')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'rh');

