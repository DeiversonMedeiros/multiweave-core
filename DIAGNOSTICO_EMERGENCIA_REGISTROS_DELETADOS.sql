-- =====================================================
-- DIAGNÓSTICO DE EMERGÊNCIA: Registros Deletados
-- Funcionário: VITOR ALVES DA COSTA NETO (Matrícula: 03027)
-- Período: Novembro/2025
-- =====================================================
-- Este script verifica o que aconteceu com os registros
-- e tenta recuperar informações dos logs/audit se disponível
-- =====================================================

-- 1. VERIFICAR SE OS REGISTROS AINDA EXISTEM
SELECT 
  'REGISTROS ATUAIS' as tipo,
  COUNT(*) as total,
  MIN(data_registro) as primeira_data,
  MAX(data_registro) as ultima_data
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30';

-- 2. LISTAR TODOS OS REGISTROS ATUAIS (se existirem)
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_trabalhadas,
  tr.status,
  tr.created_at,
  tr.updated_at,
  (SELECT COUNT(*) FROM rh.time_record_events tre WHERE tre.time_record_id = tr.id) as eventos_count
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;

-- 3. VERIFICAR SE HÁ EVENTOS DE PONTO SEM REGISTRO (registros podem ter sido deletados)
SELECT 
  'EVENTOS SEM REGISTRO' as tipo,
  COUNT(DISTINCT tre.time_record_id) as registros_faltando,
  COUNT(*) as eventos_orfos
FROM rh.time_record_events tre
INNER JOIN rh.employees e ON e.id = tre.employee_id
WHERE e.matricula = '03027'
  AND (tre.event_at AT TIME ZONE 'UTC')::date >= '2025-11-01'
  AND (tre.event_at AT TIME ZONE 'UTC')::date <= '2025-11-30'
  AND NOT EXISTS (
    SELECT 1 FROM rh.time_records tr 
    WHERE tr.id = tre.time_record_id
  );

-- 4. LISTAR EVENTOS DE PONTO QUE PODEM TER REGISTROS DELETADOS
SELECT 
  (tre.event_at AT TIME ZONE 'UTC')::date as data_evento,
  tre.event_type,
  tre.event_at,
  tre.time_record_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM rh.time_records tr WHERE tr.id = tre.time_record_id)
    THEN '✅ Registro existe'
    ELSE '❌ REGISTRO DELETADO!'
  END as status_registro
FROM rh.time_record_events tre
INNER JOIN rh.employees e ON e.id = tre.employee_id
WHERE e.matricula = '03027'
  AND (tre.event_at AT TIME ZONE 'UTC')::date >= '2025-11-01'
  AND (tre.event_at AT TIME ZONE 'UTC')::date <= '2025-11-30'
ORDER BY tre.event_at DESC
LIMIT 100;

-- 5. VERIFICAR SE HÁ LOGS DE AUDIT (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'rh' AND table_name = 'audit_logs') THEN
    RAISE NOTICE 'Tabela audit_logs encontrada. Verificando logs...';
  ELSE
    RAISE NOTICE 'Tabela audit_logs NÃO encontrada.';
  END IF;
END $$;

-- Se audit_logs existir, verificar logs de DELETE
SELECT 
  al.id,
  al.table_name,
  al.action,
  al.old_data,
  al.new_data,
  al.changed_at,
  al.changed_by
FROM rh.audit_logs al
WHERE al.table_name = 'time_records'
  AND al.action = 'DELETE'
  AND (al.old_data->>'data_registro')::date >= '2025-11-01'
  AND (al.old_data->>'data_registro')::date <= '2025-11-30'
  AND EXISTS (
    SELECT 1 FROM rh.employees e
    WHERE e.matricula = '03027'
      AND (al.old_data->>'employee_id')::uuid = e.id
  )
ORDER BY al.changed_at DESC
LIMIT 50;

-- 6. VERIFICAR TRIGGERS QUE PODEM ESTAR DELETANDO REGISTROS
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'rh.time_records'::regclass
  AND tgisinternal = false
ORDER BY tgname;

-- 7. VERIFICAR RLS POLICIES QUE PODEM ESTAR BLOQUEANDO
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'rh'
  AND tablename = 'time_records'
ORDER BY policyname;

-- 8. VERIFICAR SE HÁ BACKUP OU SNAPSHOT DOS DADOS
-- (Verificar se há tabelas de backup ou histórico)
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'rh'
  AND (
    table_name LIKE '%backup%' OR
    table_name LIKE '%history%' OR
    table_name LIKE '%historico%' OR
    table_name LIKE '%snapshot%'
  )
ORDER BY table_name;

