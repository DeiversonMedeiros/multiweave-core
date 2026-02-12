-- =====================================================
-- DIAGNÓSTICO COMPLETO: Cálculo de horas do GILCIMAR 21/01/2026
-- =====================================================

-- 1. Verificar registro
SELECT 
  '=== REGISTRO ===' as info,
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras,
  tr.horas_faltas
FROM rh.time_records tr
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro = '2026-01-21';

-- 2. Verificar eventos com timestamps completos
SELECT 
  '=== EVENTOS COM TIMESTAMPS ===' as info,
  tre.event_type,
  tre.event_at as event_at_utc,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' as event_at_local,
  (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::date as event_date_local,
  (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::time as event_time_local
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro = '2026-01-21'
ORDER BY tre.event_at;

-- 3. Calcular manualmente o que deveria ser
SELECT 
  '=== CÁLCULO MANUAL ===' as info,
  -- Entrada até Saída (considerando saída no dia seguinte)
  EXTRACT(EPOCH FROM (
    ('2026-01-22 00:02:42'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
    - ('2026-01-21 17:04:58'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
  )) / 3600 as horas_entrada_saida,
  -- Tempo de almoço
  EXTRACT(EPOCH FROM (
    ('2026-01-21 22:12:47'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
    - ('2026-01-21 21:03:32'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
  )) / 3600 as horas_almoco,
  -- Total (entrada-saída menos almoço)
  EXTRACT(EPOCH FROM (
    ('2026-01-22 00:02:42'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
    - ('2026-01-21 17:04:58'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
  )) / 3600 
  - EXTRACT(EPOCH FROM (
    ('2026-01-21 22:12:47'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
    - ('2026-01-21 21:03:32'::timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamptz
  )) / 3600 as total_horas_esperado;

-- 4. Contar marcações (para verificar se é ímpar)
SELECT 
  '=== CONTAGEM DE MARCAÇÕES ===' as info,
  COUNT(*) FILTER (WHERE entrada IS NOT NULL) as tem_entrada,
  COUNT(*) FILTER (WHERE entrada_almoco IS NOT NULL) as tem_entrada_almoco,
  COUNT(*) FILTER (WHERE saida_almoco IS NOT NULL) as tem_saida_almoco,
  COUNT(*) FILTER (WHERE saida IS NOT NULL) as tem_saida,
  COUNT(*) FILTER (WHERE entrada_extra1 IS NOT NULL) as tem_entrada_extra1,
  COUNT(*) FILTER (WHERE saida_extra1 IS NOT NULL) as tem_saida_extra1,
  (
    CASE WHEN entrada IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN entrada_almoco IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN saida_almoco IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN saida IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN entrada_extra1 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN saida_extra1 IS NOT NULL THEN 1 ELSE 0 END
  ) as total_marcacoes
FROM rh.time_records tr
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro = '2026-01-21';

-- 5. Verificar turno e horas esperadas
SELECT 
  '=== TURNO E HORAS ESPERADAS ===' as info,
  e.work_shift_id,
  ws.horas_diarias,
  ws.nome as turno_nome
FROM rh.employees e
LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d';
