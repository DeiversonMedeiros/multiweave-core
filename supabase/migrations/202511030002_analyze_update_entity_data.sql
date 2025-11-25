-- =====================================================
-- ANÁLISE E TESTE DA FUNÇÃO update_entity_data
-- Data: 2025-11-03
-- Descrição: Script para análise e teste da função
-- =====================================================

-- Verificar se a função existe
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_entity_data';

-- Verificar permissões da função
SELECT 
    routine_name,
    routine_schema,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'update_entity_data';

-- Verificar estrutura da tabela work_shifts
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'rh'
  AND table_name = 'work_shifts'
ORDER BY ordinal_position;

-- Verificar um registro de exemplo da tabela work_shifts
SELECT 
    id,
    nome,
    dias_semana,
    pg_typeof(dias_semana) as dias_semana_type,
    tipo_escala,
    regras_clt,
    pg_typeof(regras_clt) as regras_clt_type
FROM rh.work_shifts
LIMIT 1;

-- Testar conversão de array JSONB para integer[]
-- (simulação do que a função precisa fazer)
DO $$
DECLARE
    test_jsonb JSONB := '[1,2,3,4,5]'::jsonb;
    test_array integer[];
    array_values TEXT;
BEGIN
    -- Simular a conversão que a função faz
    SELECT string_agg((elem.value #>> '{}'), ',' ORDER BY elem.ord) INTO array_values
    FROM jsonb_array_elements(test_jsonb) WITH ORDINALITY AS elem(value, ord);
    
    RAISE NOTICE 'JSONB Array: %', test_jsonb;
    RAISE NOTICE 'Array Values String: %', array_values;
    RAISE NOTICE 'PostgreSQL Array: ARRAY[%]::integer[]', array_values;
    
    -- Testar a conversão real
    EXECUTE format('SELECT ARRAY[%s]::integer[]', array_values) INTO test_array;
    
    RAISE NOTICE 'Converted Array: %', test_array;
END $$;

-- Listar últimos logs da função (se houver)
SELECT 
    NOW() as current_time,
    'Para ver logs detalhados, verifique os logs do PostgreSQL ou execute a função com RAISE NOTICE habilitado' as note;

