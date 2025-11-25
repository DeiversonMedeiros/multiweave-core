-- =====================================================
-- TESTE DE BUSCA DE REGISTROS DE PONTO
-- =====================================================

-- 1. Verificar qual funcionário está vinculado ao usuário
SELECT 
  e.id as employee_id,
  e.nome as employee_name,
  e.matricula,
  e.user_id
FROM rh.employees e
WHERE e.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'
  AND e.company_id = 'a9784891-9d58-4cc4-8404-18032105c335';

-- 2. Verificar registros para esse funcionário em outubro de 2025
SELECT 
  tr.id,
  tr.employee_id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.status
FROM rh.time_records tr
WHERE tr.company_id = 'a9784891-9d58-4cc4-8404-18032105c335'
  AND tr.data_registro >= '2025-10-01'
  AND tr.data_registro <= '2025-10-31'
ORDER BY tr.data_registro;

-- 3. Testar a função get_entity_data diretamente
SELECT 
  id,
  data,
  total_count
FROM get_entity_data(
  'rh'::text,
  'time_records'::text,
  'a9784891-9d58-4cc4-8404-18032105c335'::text,
  '{"employee_id": "SUBSTITUIR_COM_EMPLOYEE_ID_DO_USUARIO", "data_registro_gte": "2025-10-01", "data_registro_lte": "2025-10-31"}'::jsonb,
  1000::integer,
  0::integer,
  'data_registro'::text,
  'ASC'::text
) LIMIT 5;

-- 4. Ver todos os employee_ids que têm registros em outubro
SELECT DISTINCT
  tr.employee_id,
  e.nome as employee_name,
  e.user_id
FROM rh.time_records tr
JOIN rh.employees e ON tr.employee_id = e.id
WHERE tr.company_id = 'a9784891-9d58-4cc4-8404-18032105c335'
  AND tr.data_registro >= '2025-10-01'
  AND tr.data_registro <= '2025-10-31';






























































