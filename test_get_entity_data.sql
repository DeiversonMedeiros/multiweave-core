-- =====================================================
-- TESTE DA FUNÇÃO get_entity_data
-- =====================================================

-- 1. Verificar se existem registros de ponto
SELECT COUNT(*) as total_registros 
FROM rh.time_records;

-- 2. Listar alguns registros
SELECT 
  id,
  employee_id,
  data_registro,
  entrada,
  saida,
  status,
  created_at
FROM rh.time_records
ORDER BY data_registro DESC
LIMIT 5;

-- 3. Verificar funcionários cadastrados
SELECT 
  id,
  nome,
  matricula,
  user_id,
  company_id
FROM rh.employees
WHERE ativo = true
LIMIT 5;

-- 4. Testar a função get_entity_data com um exemplo
-- NOTA: Este teste requer autenticação, mas serve para verificar a sintaxe
SELECT get_entity_data(
  'rh'::text,
  'time_records'::text,
  (SELECT id::text FROM companies LIMIT 1),
  '{"employee_id": "' || (SELECT id FROM rh.employees LIMIT 1) || '", "data_registro_gte": "2025-10-01", "data_registro_lte": "2025-10-31"}'::jsonb,
  100,
  0,
  'data_registro'::text,
  'ASC'::text
);

