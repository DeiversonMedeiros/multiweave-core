-- =====================================================
-- ANÁLISE COMPLETA DO SISTEMA DE ASSINATURA DE PONTO
-- Execute no Supabase SQL Editor
-- =====================================================

-- ============================================
-- 1. CONFIGURAÇÕES DE ASSINATURA
-- ============================================
SELECT 
  '1. CONFIGURAÇÕES' as secao,
  cfg.id,
  c.nome_fantasia as empresa,
  cfg.company_id,
  cfg.is_enabled as habilitado,
  cfg.signature_period_days as dias_prazo,
  cfg.reminder_days as dias_lembrete,
  cfg.require_manager_approval as requer_aprovacao,
  cfg.auto_close_month as fechamento_automatico,
  cfg.created_at,
  cfg.updated_at
FROM rh.time_record_signature_config cfg
LEFT JOIN companies c ON c.id = cfg.company_id
ORDER BY cfg.updated_at DESC;

-- ============================================
-- 2. ASSINATURAS EXISTENTES
-- ============================================
SELECT 
  '2. ASSINATURAS' as secao,
  trs.id,
  c.nome_fantasia as empresa,
  e.nome as funcionario,
  trs.month_year as mes_ano,
  trs.status,
  trs.expires_at as expira_em,
  trs.signature_timestamp as assinado_em,
  trs.created_at as criado_em
FROM rh.time_record_signatures trs
LEFT JOIN rh.employees e ON e.id = trs.employee_id
LEFT JOIN companies c ON c.id = trs.company_id
ORDER BY trs.month_year DESC, e.nome
LIMIT 50;

-- ============================================
-- 3. RESUMO DE ASSINATURAS POR EMPRESA
-- ============================================
SELECT 
  '3. RESUMO POR EMPRESA' as secao,
  c.nome_fantasia as empresa,
  trs.company_id,
  COUNT(*) as total_assinaturas,
  COUNT(CASE WHEN trs.status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN trs.status = 'signed' THEN 1 END) as assinadas,
  COUNT(CASE WHEN trs.status = 'expired' THEN 1 END) as expiradas,
  COUNT(CASE WHEN trs.status = 'approved' THEN 1 END) as aprovadas
FROM rh.time_record_signatures trs
LEFT JOIN companies c ON c.id = trs.company_id
GROUP BY trs.company_id, c.nome_fantasia
ORDER BY total_assinaturas DESC;

-- ============================================
-- 4. FUNCIONÁRIO ESPECÍFICO (user_id do log)
-- ============================================
SELECT 
  '4. FUNCIONÁRIO ESPECÍFICO' as secao,
  e.id as employee_id,
  e.nome,
  e.user_id,
  c.nome_fantasia as empresa,
  e.company_id,
  e.status,
  COUNT(trs.id) as total_assinaturas,
  STRING_AGG(
    trs.month_year || ' (' || trs.status || ')', 
    ', ' 
    ORDER BY trs.month_year DESC
  ) as assinaturas_detalhes
FROM rh.employees e
LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id
LEFT JOIN companies c ON c.id = e.company_id
WHERE e.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'
GROUP BY e.id, e.nome, e.user_id, e.company_id, e.status, c.nome_fantasia;

-- ============================================
-- 5. REGISTROS DE PONTO RECENTES
-- ============================================
SELECT 
  '5. REGISTROS DE PONTO' as secao,
  DATE_TRUNC('month', tr.data_registro)::date as mes,
  COUNT(*) as total_registros,
  COUNT(DISTINCT tr.employee_id) as funcionarios_com_registros,
  COUNT(DISTINCT tr.company_id) as empresas
FROM rh.time_records tr
WHERE tr.data_registro >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
  AND tr.data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY DATE_TRUNC('month', tr.data_registro)
ORDER BY mes DESC;

-- ============================================
-- 6. FUNCIONÁRIOS ATIVOS COM REGISTROS MAS SEM ASSINATURAS
-- ============================================
SELECT 
  '6. SEM ASSINATURAS' as secao,
  e.id,
  e.nome,
  c.nome_fantasia as empresa,
  e.company_id,
  COUNT(DISTINCT tr.id) as registros_mes_atual,
  COUNT(trs.id) as total_assinaturas,
  MIN(tr.data_registro) as primeira_marcacao,
  MAX(tr.data_registro) as ultima_marcacao
FROM rh.employees e
INNER JOIN rh.time_records tr ON tr.employee_id = e.id
LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id
WHERE e.status = 'ativo'
  AND tr.data_registro >= DATE_TRUNC('month', CURRENT_DATE)
  AND tr.data_registro < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY e.id, e.nome, e.company_id, c.nome_fantasia
HAVING COUNT(trs.id) = 0
ORDER BY registros_mes_atual DESC, e.nome
LIMIT 20;

-- ============================================
-- 7. VERIFICAR FUNÇÕES DISPONÍVEIS
-- ============================================
SELECT 
  '7. FUNÇÕES DISPONÍVEIS' as secao,
  routine_name as nome_funcao,
  routine_type as tipo,
  routine_schema as schema
FROM information_schema.routines
WHERE routine_schema IN ('public', 'rh')
  AND (
    routine_name LIKE '%signature%' 
    OR routine_name LIKE '%assinatura%'
    OR routine_name LIKE '%monthly%'
  )
ORDER BY routine_schema, routine_name;

-- ============================================
-- 8. TESTE: CRIAR ASSINATURAS PARA MÊS ATUAL
-- ============================================
-- Descomente para executar (substitua o company_id)
/*
SELECT 
  '8. CRIANDO ASSINATURAS' as secao,
  create_monthly_signature_records(
    'a9784891-9d58-4cc4-8404-18032105c335'::uuid,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  ) as registros_criados_mes_atual,
  create_monthly_signature_records(
    'a9784891-9d58-4cc4-8404-18032105c335'::uuid,
    TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')
  ) as registros_criados_mes_anterior;
*/




