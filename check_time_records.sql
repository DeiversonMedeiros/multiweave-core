-- Verificar registros de ponto no banco de dados

-- 1. Verificar se existem registros na tabela time_records
SELECT COUNT(*) as total_registros 
FROM rh.time_records;

-- 2. Verificar últimos registros
SELECT 
    id,
    employee_id,
    data_registro,
    entrada,
    saida,
    status,
    created_at
FROM rh.time_records
ORDER BY data_registro DESC
LIMIT 10;

-- 3. Verificar funcionários cadastrados
SELECT 
    id,
    nome,
    user_id,
    company_id,
    matricula,
    ativo
FROM rh.employees
WHERE ativo = true;

-- 4. Verificar se a função get_entity_data existe e sua assinatura
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_entity_data';

