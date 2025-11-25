-- =====================================================
-- ANÁLISE COMPLETA DO BANCO DE DADOS
-- MultiWeave Core - Sistema ERP
-- =====================================================

-- 1. LISTAR TODOS OS SCHEMAS
SELECT 
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- 2. LISTAR TODAS AS TABELAS POR SCHEMA
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

-- 3. LISTAR TODAS AS FUNÇÕES RPC (PROCEDURES)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- 4. LISTAR TODOS OS TRIGGERS
SELECT 
    n.nspname as schema_name,
    t.tgname as trigger_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
ORDER BY n.nspname, c.relname, t.tgname;

-- 5. LISTAR TODAS AS POLÍTICAS RLS (Row Level Security)
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
ORDER BY schemaname, tablename, policyname;

-- 6. LISTAR TODOS OS ÍNDICES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, indexname;

-- 7. LISTAR TODAS AS VIEWS MATERIALIZADAS
SELECT 
    schemaname,
    matviewname,
    pg_get_viewdef('"' || schemaname || '"."' || matviewname || '"', true) as definition
FROM pg_matviews
ORDER BY schemaname, matviewname;

-- 8. LISTAR TODAS AS VIEWS NORMAIS
SELECT 
    table_schema,
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

-- 9. LISTAR RELACIONAMENTOS (FOREIGN KEYS)
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name;

-- 10. CONTAR REGISTROS POR TABELA (principais schemas)
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'rh', 'frota', 'almoxarifado', 'financeiro', 'compras')
ORDER BY schemaname, n_live_tup DESC;

-- 11. LISTAR SEQUENCES
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.sequences
WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY sequence_schema, sequence_name;

-- 12. LISTAR ENUMS (TYPES)
SELECT 
    n.nspname as schema_name,
    t.typname as type_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;

