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
ORDER BY updated_at DESC
LIMIT 10;

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
ORDER BY trs.month_year DESC, e.nome
LIMIT 20;

-- 3. Verificar funcionários ativos com registros de ponto no mês atual
SELECT 
  e.id,
  e.nome,
  e.user_id,
  e.company_id,
  COUNT(DISTINCT tr.id) as total_registros,
  MIN(tr.data_registro) as primeira_marcacao,
  MAX(tr.data_registro) as ultima_marcacao
FROM rh.employees e
INNER JOIN rh.time_records tr ON tr.employee_id = e.id
WHERE e.status = 'ativo'
  AND tr.data_registro >= DATE_TRUNC('month', CURRENT_DATE)
  AND tr.data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY e.id, e.nome, e.user_id, e.company_id
ORDER BY e.nome
LIMIT 20;

-- 4. Verificar se há registros de ponto no mês atual
SELECT 
  DATE_TRUNC('month', data_registro) as mes,
  COUNT(*) as total_registros,
  COUNT(DISTINCT employee_id) as funcionarios_com_registros
FROM rh.time_records
WHERE data_registro >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
  AND data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY DATE_TRUNC('month', data_registro)
ORDER BY mes DESC;

-- 5. Verificar funcionário específico pelo user_id
SELECT 
  e.id,
  e.nome,
  e.user_id,
  e.company_id,
  e.status,
  COUNT(trs.id) as total_assinaturas
FROM rh.employees e
LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id
WHERE e.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'
GROUP BY e.id, e.nome, e.user_id, e.company_id, e.status;

-- 6. Verificar empresas com configuração habilitada
SELECT 
  c.id as company_id,
  c.nome_fantasia,
  cfg.is_enabled,
  cfg.signature_period_days,
  cfg.auto_close_month
FROM companies c
LEFT JOIN rh.time_record_signature_config cfg ON cfg.company_id = c.id
WHERE cfg.is_enabled = true
ORDER BY c.nome_fantasia;






