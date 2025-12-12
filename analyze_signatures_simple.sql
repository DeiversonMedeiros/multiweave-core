-- =====================================================
-- ANÁLISE RÁPIDA DO SISTEMA DE ASSINATURA DE PONTO
-- Execute este arquivo no Supabase SQL Editor
-- =====================================================

-- 1. Verificar TODAS as configurações
SELECT 
  'CONFIGURAÇÕES' as tipo,
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
ORDER BY updated_at DESC;

-- 2. Contar assinaturas por empresa
SELECT 
  'ASSINATURAS POR EMPRESA' as tipo,
  trs.company_id,
  COUNT(*) as total_assinaturas,
  COUNT(CASE WHEN trs.status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN trs.status = 'signed' THEN 1 END) as assinadas,
  COUNT(CASE WHEN trs.status = 'expired' THEN 1 END) as expiradas
FROM rh.time_record_signatures trs
GROUP BY trs.company_id
ORDER BY total_assinaturas DESC;

-- 3. Verificar funcionário específico
SELECT 
  'FUNCIONÁRIO ESPECÍFICO' as tipo,
  e.id,
  e.nome,
  e.user_id,
  e.company_id,
  e.status,
  COUNT(trs.id) as total_assinaturas,
  STRING_AGG(trs.month_year || ' (' || trs.status || ')', ', ') as assinaturas
FROM rh.employees e
LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id
WHERE e.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'
GROUP BY e.id, e.nome, e.user_id, e.company_id, e.status;

-- 4. Verificar registros de ponto recentes
SELECT 
  'REGISTROS DE PONTO RECENTES' as tipo,
  DATE_TRUNC('month', data_registro) as mes,
  COUNT(*) as total_registros,
  COUNT(DISTINCT employee_id) as funcionarios_com_registros
FROM rh.time_records
WHERE data_registro >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
  AND data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY DATE_TRUNC('month', data_registro)
ORDER BY mes DESC;

-- 5. Verificar funcionários ativos com registros mas sem assinaturas
SELECT 
  'FUNCIONÁRIOS SEM ASSINATURAS' as tipo,
  e.id,
  e.nome,
  e.company_id,
  COUNT(DISTINCT tr.id) as total_registros_mes_atual,
  COUNT(trs.id) as total_assinaturas
FROM rh.employees e
INNER JOIN rh.time_records tr ON tr.employee_id = e.id
LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id
WHERE e.status = 'ativo'
  AND tr.data_registro >= DATE_TRUNC('month', CURRENT_DATE)
  AND tr.data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY e.id, e.nome, e.company_id
HAVING COUNT(trs.id) = 0
ORDER BY e.nome
LIMIT 10;

-- 6. Verificar se a função create_monthly_signature_records existe
SELECT 
  'FUNÇÕES DISPONÍVEIS' as tipo,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%signature%'
ORDER BY routine_name;









