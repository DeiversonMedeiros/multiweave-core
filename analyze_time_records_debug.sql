-- =====================================================
-- SCRIPT DE ANÁLISE: Verificar fotos e localizações
-- de registros de ponto recentes
-- =====================================================

-- 1. Encontrar o registro mais recente do funcionário "Deiverson Jorge Honorato Medeiros"
-- (matricula 01005)
SELECT 
  tr.id as time_record_id,
  tr.employee_id,
  tr.data_registro,
  tr.created_at,
  e.nome as employee_nome,
  e.matricula,
  tr.entrada,
  tr.saida,
  tr.entrada_almoco,
  tr.saida_almoco
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '01005'
ORDER BY tr.data_registro DESC, tr.created_at DESC
LIMIT 1;

-- 2. Verificar TODOS os eventos desse registro de ponto
-- (substituir TIME_RECORD_ID pelo ID do passo 1)
WITH recent_record AS (
  SELECT tr.id, tr.data_registro, tr.employee_id
  FROM rh.time_records tr
  JOIN rh.employees e ON e.id = tr.employee_id
  WHERE e.matricula = '01005'
  ORDER BY tr.data_registro DESC, tr.created_at DESC
  LIMIT 1
)
SELECT 
  ee.id as event_id,
  ee.event_type,
  ee.event_at,
  ee.latitude,
  ee.longitude,
  ee.endereco,
  ee.source,
  ee.created_at as event_created_at
FROM rh.time_record_events ee
JOIN recent_record rr ON ee.time_record_id = rr.id
ORDER BY ee.event_at ASC;

-- 3. Verificar TODAS as fotos desses eventos
WITH recent_record AS (
  SELECT tr.id, tr.data_registro, tr.employee_id
  FROM rh.time_records tr
  JOIN rh.employees e ON e.id = tr.employee_id
  WHERE e.matricula = '01005'
  ORDER BY tr.data_registro DESC, tr.created_at DESC
  LIMIT 1
)
SELECT 
  ee.id as event_id,
  ee.event_type,
  ee.event_at,
  p.id as photo_id,
  p.photo_url,
  p.created_at as photo_created_at
FROM rh.time_record_events ee
JOIN recent_record rr ON ee.time_record_id = rr.id
LEFT JOIN rh.time_record_event_photos p ON p.event_id = ee.id
ORDER BY ee.event_at ASC, p.created_at ASC;

-- 4. Testar a função RPC diretamente (precisa do company_id)
-- (substituir COMPANY_ID pelo company_id do registro)
SELECT * FROM public.get_time_records_simple('COMPANY_ID')
WHERE employee_matricula = '01005'
ORDER BY data_registro DESC
LIMIT 1;

-- 5. Verificar o que a função RPC retorna para all_photos e all_locations
-- (substituir COMPANY_ID pelo company_id do registro)
SELECT 
  id,
  employee_nome,
  employee_matricula,
  data_registro,
  events_count,
  jsonb_array_length(all_photos) as total_photos,
  jsonb_array_length(all_locations) as total_locations,
  all_photos,
  all_locations
FROM public.get_time_records_simple('COMPANY_ID')
WHERE employee_matricula = '01005'
ORDER BY data_registro DESC
LIMIT 1;

-- 6. Verificar detalhamento de all_photos (expandir array)
-- (substituir COMPANY_ID pelo company_id do registro)
SELECT 
  id,
  employee_nome,
  data_registro,
  jsonb_array_elements(all_photos) as photo_item
FROM public.get_time_records_simple('COMPANY_ID')
WHERE employee_matricula = '01005'
ORDER BY data_registro DESC
LIMIT 1;

-- 7. Verificar detalhamento de all_locations (expandir array)
-- (substituir COMPANY_ID pelo company_id do registro)
SELECT 
  id,
  employee_nome,
  data_registro,
  jsonb_array_elements(all_locations) as location_item
FROM public.get_time_records_simple('COMPANY_ID')
WHERE employee_matricula = '01005'
ORDER BY data_registro DESC
LIMIT 1;

