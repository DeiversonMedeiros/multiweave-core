-- Script para testar a função get_time_records_paginated com o gestor
-- Gestor: JANE LILIAN SANTOS DE MIRANDA (user_id: a81daf27-f713-4a6c-9c50-d9c3a4664e51)
-- Funcionária: DANIELA ALVES QUEIROZ DE SOUZA (employee_id: 1cdec633-282e-4de4-9462-6c46dce63a75)
-- Company: dc060329-50cd-4114-922f-624a6ab036d6

-- Verificar dados do gestor e funcionária
SELECT 
    'GESTOR' as tipo,
    u.id as user_id,
    u.email,
    e.id as employee_id,
    e.nome as employee_nome,
    e.gestor_imediato_id
FROM auth.users u
LEFT JOIN rh.employees e ON e.user_id = u.id
WHERE u.email = 'jane.miranda@estrategicengenharia.com.br';

SELECT 
    'FUNCIONARIA' as tipo,
    e.id as employee_id,
    e.nome,
    e.user_id,
    e.gestor_imediato_id,
    e.company_id,
    CASE 
        WHEN e.gestor_imediato_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51' THEN '✅ gestor_imediato_id = user_id da JANE'
        ELSE '❌ gestor_imediato_id NÃO é user_id da JANE'
    END as verificacao_caso_1,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
            AND gestor_employee.user_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
        ) THEN '✅ gestor_imediato_id aponta para employee com user_id da JANE'
        ELSE '❌ gestor_imediato_id NÃO aponta para employee com user_id da JANE'
    END as verificacao_caso_2
FROM rh.employees e
WHERE e.nome ILIKE '%daniela%queiroz%' OR e.nome ILIKE '%daniela%souza%';

-- Verificar quantos registros de ponto a DANIELA tem
SELECT 
    'REGISTROS DE PONTO' as tipo,
    COUNT(*) as total_registros
FROM rh.time_records tr
WHERE tr.employee_id = '1cdec633-282e-4de4-9462-6c46dce63a75';

-- Testar a query que a função usa (simulando o filtro de gestor)
SELECT 
    'TESTE FUNCAO - QUERY MANUAL' as tipo,
    COUNT(*) as total_registros_encontrados
FROM rh.time_records tr
INNER JOIN rh.employees e ON tr.employee_id = e.id
WHERE tr.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND (
    -- Caso 1: gestor_imediato_id é o user_id diretamente
    e.gestor_imediato_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
    OR
    -- Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
    EXISTS (
      SELECT 1 
      FROM rh.employees gestor_employee
      WHERE gestor_employee.id = e.gestor_imediato_id
        AND gestor_employee.user_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
    )
  );

-- Listar os registros encontrados
SELECT 
    tr.id,
    tr.data_registro,
    e.nome as funcionario_nome,
    e.gestor_imediato_id
FROM rh.time_records tr
INNER JOIN rh.employees e ON tr.employee_id = e.id
WHERE tr.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND (
    e.gestor_imediato_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
    OR
    EXISTS (
      SELECT 1 
      FROM rh.employees gestor_employee
      WHERE gestor_employee.id = e.gestor_imediato_id
        AND gestor_employee.user_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
    )
  )
ORDER BY tr.data_registro DESC
LIMIT 10;
