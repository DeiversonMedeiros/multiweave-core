-- Diagnóstico rápido: Verificar situação dos registros
SELECT 
  'REGISTROS ATUAIS' as tipo,
  COUNT(*) as total
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30';

-- Verificar eventos de ponto
SELECT 
  'EVENTOS DE PONTO' as tipo,
  COUNT(*) as total,
  COUNT(DISTINCT (event_at AT TIME ZONE 'UTC')::date) as dias_com_eventos
FROM rh.time_record_events tre
INNER JOIN rh.employees e ON e.id = tre.employee_id
WHERE e.matricula = '03027'
  AND (tre.event_at AT TIME ZONE 'UTC')::date >= '2025-11-01'
  AND (tre.event_at AT TIME ZONE 'UTC')::date <= '2025-11-30';

-- Verificar eventos órfãos (sem registro)
SELECT 
  'EVENTOS ORFÃOS' as tipo,
  COUNT(*) as total
FROM rh.time_record_events tre
INNER JOIN rh.employees e ON e.id = tre.employee_id
WHERE e.matricula = '03027'
  AND (tre.event_at AT TIME ZONE 'UTC')::date >= '2025-11-01'
  AND (tre.event_at AT TIME ZONE 'UTC')::date <= '2025-11-30'
  AND (tre.time_record_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM rh.time_records tr WHERE tr.id = tre.time_record_id
  ));

