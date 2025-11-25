-- =====================================================
-- VERIFICAR REGISTROS DE PONTO
-- =====================================================

-- 1. Verificar se existem registros de ponto
SELECT COUNT(*) as total_registros 
FROM rh.time_records;

-- 2. Verificar se existem registros para outubro de 2025
SELECT COUNT(*) as registros_outubro_2025
FROM rh.time_records
WHERE data_registro >= '2025-10-01' 
  AND data_registro < '2025-11-01';

-- 3. Listar funcionários ativos com seus user_id
SELECT 
  id,
  nome,
  matricula,
  user_id,
  company_id,
  ativo
FROM rh.employees
WHERE ativo = true
ORDER BY created_at DESC;

-- 4. Verificar últimas 5 marcações
SELECT 
  tr.id,
  tr.employee_id,
  e.nome as employee_name,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.status,
  tr.created_at
FROM rh.time_records tr
JOIN rh.employees e ON tr.employee_id = e.id
ORDER BY tr.data_registro DESC
LIMIT 5;

