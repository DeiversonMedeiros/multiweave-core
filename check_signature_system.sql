-- =====================================================
-- ANÁLISE DO SISTEMA DE ASSINATURA DE PONTO
-- =====================================================

-- 1. Verificar configuração da empresa
SELECT 
  id,
  company_id,
  is_enabled,
  signature_period_days,
  reminder_days,
  require_manager_approval,
  auto_close_month,
  created_at,
  updated_at
FROM rh.time_record_signature_config
WHERE company_id = 'a9784891-9d58-4cc4-8404-18032105c335'; -- Substitua pelo ID da empresa

-- 2. Verificar se há assinaturas criadas
SELECT 
  trs.id,
  trs.company_id,
  trs.employee_id,
  e.nome as employee_nome,
  trs.month_year,
  trs.status,
  trs.expires_at,
  trs.signature_timestamp,
  trs.created_at
FROM rh.time_record_signatures trs
LEFT JOIN rh.employees e ON e.id = trs.employee_id
WHERE trs.company_id = 'a9784891-9d58-4cc4-8404-18032105c335' -- Substitua pelo ID da empresa
ORDER BY trs.month_year DESC, e.nome;

-- 3. Verificar funcionários ativos com registros de ponto no mês atual
SELECT 
  e.id,
  e.nome,
  e.user_id,
  COUNT(DISTINCT tr.id) as total_registros,
  MIN(tr.data_registro) as primeira_marcacao,
  MAX(tr.data_registro) as ultima_marcacao
FROM rh.employees e
INNER JOIN rh.time_records tr ON tr.employee_id = e.id
WHERE e.company_id = 'a9784891-9d58-4cc4-8404-18032105c335' -- Substitua pelo ID da empresa
  AND e.status = 'ativo'
  AND tr.data_registro >= DATE_TRUNC('month', CURRENT_DATE)
  AND tr.data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY e.id, e.nome, e.user_id
ORDER BY e.nome;

-- 4. Verificar se há registros de ponto no mês atual
SELECT 
  DATE_TRUNC('month', data_registro) as mes,
  COUNT(*) as total_registros,
  COUNT(DISTINCT employee_id) as funcionarios_com_registros
FROM rh.time_records
WHERE company_id = 'a9784891-9d58-4cc4-8404-18032105c335' -- Substitua pelo ID da empresa
  AND data_registro >= DATE_TRUNC('month', CURRENT_DATE)
  AND data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY DATE_TRUNC('month', data_registro);

-- 5. Verificar funcionário específico (substitua pelo employee_id)
SELECT 
  e.id,
  e.nome,
  e.user_id,
  e.company_id,
  e.status,
  COUNT(trs.id) as total_assinaturas
FROM rh.employees e
LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id
WHERE e.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac' -- Substitua pelo user_id
GROUP BY e.id, e.nome, e.user_id, e.company_id, e.status;

-- 6. Testar criação de assinaturas para o mês atual (substitua pelo company_id e month_year)
-- SELECT create_monthly_signature_records(
--   'a9784891-9d58-4cc4-8404-18032105c335'::uuid, -- company_id
--   TO_CHAR(CURRENT_DATE, 'YYYY-MM') -- month_year (formato: YYYY-MM)
-- );

-- 7. Verificar mês anterior também (caso o mês atual não tenha registros)
SELECT 
  DATE_TRUNC('month', data_registro) as mes,
  COUNT(*) as total_registros,
  COUNT(DISTINCT employee_id) as funcionarios_com_registros
FROM rh.time_records
WHERE company_id = 'a9784891-9d58-4cc4-8404-18032105c335' -- Substitua pelo ID da empresa
  AND data_registro >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
  AND data_registro < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', data_registro);









