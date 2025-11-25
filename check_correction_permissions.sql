-- =====================================================
-- VERIFICAÇÃO DE PERMISSÕES DE CORREÇÃO
-- =====================================================

-- 1. Verificar se existem permissões para outubro de 2025
SELECT 
  ecp.id,
  ecp.employee_id,
  e.nome as employee_name,
  e.matricula as employee_matricula,
  ecp.mes_ano,
  ecp.liberado,
  ecp.liberado_por,
  ecp.liberado_em,
  ecp.observacoes,
  ecp.created_at,
  ecp.updated_at
FROM rh.employee_correction_permissions ecp
JOIN rh.employees e ON ecp.employee_id = e.id
WHERE ecp.mes_ano = '2025-10'
ORDER BY ecp.created_at DESC;

-- 2. Verificar se a função get_correction_status está funcionando
--    (Substitua o employee_id pelo ID real do funcionário)
SELECT get_correction_status(
  (SELECT id FROM rh.employees WHERE user_id = auth.uid() LIMIT 1),
  2025,
  10
);

-- 3. Listar todos os funcionários e seus user_id
SELECT 
  id,
  nome,
  matricula,
  user_id,
  company_id
FROM rh.employees
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar se existem time_records para outubro de 2025
SELECT 
  tr.id,
  tr.employee_id,
  e.nome as employee_name,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_trabalhadas,
  tr.status,
  tr.created_at
FROM rh.time_records tr
JOIN rh.employees e ON tr.employee_id = e.id
WHERE tr.data_registro >= '2025-10-01' 
  AND tr.data_registro < '2025-11-01'
ORDER BY tr.data_registro DESC, e.nome;

-- 5. Contar quantos registros existem por mês
SELECT 
  DATE_TRUNC('month', data_registro) as mes,
  COUNT(*) as total_registros
FROM rh.time_records
WHERE data_registro >= '2025-01-01'
GROUP BY DATE_TRUNC('month', data_registro)
ORDER BY mes DESC;
