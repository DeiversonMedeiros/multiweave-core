-- =====================================================
-- DEBUG: Verificar registros de ponto e conexões
-- =====================================================

-- 1. Verificar se existe a tabela time_records
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'rh' 
  AND table_name = 'time_records'
ORDER BY ordinal_position;

-- 2. Verificar total de registros
SELECT COUNT(*) as total FROM rh.time_records;

-- 3. Verificar últimos 10 registros
SELECT 
    tr.id,
    tr.data_registro,
    tr.entrada,
    tr.saida,
    tr.status,
    e.nome as employee_name,
    e.matricula
FROM rh.time_records tr
LEFT JOIN rh.employees e ON tr.employee_id = e.id
ORDER BY tr.data_registro DESC
LIMIT 10;

-- 4. Verificar funcionários cadastrados
SELECT 
    e.id,
    e.nome,
    e.matricula,
    e.user_id,
    e.company_id,
    e.ativo,
    u.email
FROM rh.employees e
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE e.ativo = true
ORDER BY e.created_at DESC
LIMIT 10;

-- 5. Verificar registros de ponto por mês/ano
SELECT 
    DATE_TRUNC('month', data_registro)::date as mes,
    COUNT(*) as total_registros
FROM rh.time_records
GROUP BY DATE_TRUNC('month', data_registro)
ORDER BY mes DESC
LIMIT 12;

-- 6. Verificar se a função get_entity_data existe
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_entity_data';

-- 7. Verificar permissões de correção
SELECT 
    ecp.id,
    ecp.employee_id,
    e.nome as employee_name,
    ecp.mes_ano,
    ecp.liberado,
    ecp.liberado_em
FROM rh.employee_correction_permissions ecp
JOIN rh.employees e ON ecp.employee_id = e.id
ORDER BY ecp.liberado_em DESC
LIMIT 10;

