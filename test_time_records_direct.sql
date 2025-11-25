-- =====================================================
-- TESTE DIRETO DOS REGISTROS DE PONTO
-- =====================================================

-- 1. Verificar se há registros para o funcionário e data
SELECT 
  id,
  employee_id,
  company_id,
  data_registro,
  entrada,
  entrada_almoco,
  saida_almoco,
  saida,
  entrada_extra1,
  saida_extra1,
  status,
  created_at,
  updated_at
FROM rh.time_records
WHERE employee_id = '14303884-98e9-4ea0-935a-763bc1d8f613'
  AND company_id = 'a9784891-9d58-4cc4-8404-18032105c335'
  AND data_registro >= '2025-10-29'
  AND data_registro <= '2025-10-30'
ORDER BY data_registro DESC;

-- 2. Verificar se há registro exatamente para 2025-10-30
SELECT 
  id,
  employee_id,
  company_id,
  data_registro::text,
  entrada::text,
  entrada_almoco::text,
  saida_almoco::text,
  saida::text,
  entrada_extra1::text,
  saida_extra1::text,
  status
FROM rh.time_records
WHERE employee_id = '14303884-98e9-4ea0-935a-763bc1d8f613'
  AND company_id = 'a9784891-9d58-4cc4-8404-18032105c335'
  AND data_registro = '2025-10-30'::date;

-- 3. Testar a função get_entity_data diretamente
SELECT 
  id,
  data,
  total_count
FROM get_entity_data(
  'rh'::text,
  'time_records'::text,
  'a9784891-9d58-4cc4-8404-18032105c335'::text,
  '{"employee_id": "14303884-98e9-4ea0-935a-763bc1d8f613", "data_registro": "2025-10-30"}'::jsonb,
  100::integer,
  0::integer,
  'id'::text,
  'DESC'::text
);

-- 4. Verificar última marcação registrada
SELECT 
  id,
  employee_id,
  data_registro,
  entrada,
  entrada_almoco,
  saida_almoco,
  saida,
  entrada_extra1,
  saida_extra1,
  status,
  created_at
FROM rh.time_records
WHERE employee_id = '14303884-98e9-4ea0-935a-763bc1d8f613'
ORDER BY created_at DESC
LIMIT 5;

