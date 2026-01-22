-- Script de diagnóstico para o problema do gestor não ver registros de ponto
-- Gestor: JANE LILIAN SANTOS DE MIRANDA (user_id: a81daf27-f713-4a6c-9c50-d9c3a4664e51)
-- Funcionária: DANIELA ALVES QUEIROZ DE SOUZA (employee_id: 1cdec633-282e-4de4-9462-6c46dce63a75)
-- Company: dc060329-50cd-4114-922f-624a6ab036d6

-- 1. Verificar dados do gestor
SELECT 
    '=== DADOS DO GESTOR ===' as secao,
    u.id as user_id,
    u.email,
    e.id as employee_id,
    e.nome as employee_nome,
    e.user_id as employee_user_id,
    e.gestor_imediato_id as employee_gestor_imediato_id
FROM auth.users u
LEFT JOIN rh.employees e ON e.user_id = u.id
WHERE u.email = 'jane.miranda@estrategicengenharia.com.br';

-- 2. Verificar dados da funcionária
SELECT 
    '=== DADOS DA FUNCIONÁRIA ===' as secao,
    e.id as employee_id,
    e.nome,
    e.user_id,
    e.gestor_imediato_id,
    e.company_id,
    CASE 
        WHEN e.gestor_imediato_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51' THEN '✅ Caso 1: gestor_imediato_id = user_id da JANE'
        ELSE '❌ Caso 1: gestor_imediato_id NÃO é user_id da JANE'
    END as verificacao_caso_1
FROM rh.employees e
WHERE e.nome ILIKE '%daniela%queiroz%' OR e.nome ILIKE '%daniela%souza%';

-- 3. Verificar se há employee do gestor que corresponde ao gestor_imediato_id (Caso 2)
SELECT 
    '=== VERIFICAÇÃO CASO 2 ===' as secao,
    e.id as funcionaria_id,
    e.nome as funcionaria_nome,
    e.gestor_imediato_id,
    gestor_emp.id as gestor_employee_id,
    gestor_emp.nome as gestor_employee_nome,
    gestor_emp.user_id as gestor_employee_user_id,
    CASE 
        WHEN gestor_emp.user_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51' THEN '✅ Caso 2: gestor_imediato_id aponta para employee com user_id da JANE'
        ELSE '❌ Caso 2: gestor_imediato_id NÃO aponta para employee com user_id da JANE'
    END as verificacao_caso_2
FROM rh.employees e
LEFT JOIN rh.employees gestor_emp ON gestor_emp.id = e.gestor_imediato_id
WHERE e.nome ILIKE '%daniela%queiroz%' OR e.nome ILIKE '%daniela%souza%';

-- 4. Verificar permissões do perfil Gestor
SELECT 
    '=== PERMISSÕES DO PERFIL GESTOR ===' as secao,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    p.nome as perfil_nome
FROM public.entity_permissions ep
JOIN public.profiles p ON p.id = ep.profile_id
WHERE ep.profile_id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e'
  AND ep.entity_name IN ('time_tracking_management', 'time_records', 'registros_ponto');

-- 5. Verificar acesso do usuário à empresa
SELECT 
    '=== ACESSO DO USUÁRIO À EMPRESA ===' as secao,
    uc.user_id,
    uc.company_id,
    uc.profile_id,
    uc.ativo,
    p.nome as perfil_nome
FROM public.user_companies uc
JOIN public.profiles p ON p.id = uc.profile_id
WHERE uc.user_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
  AND uc.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND uc.ativo = true;

-- 6. Contar registros de ponto que deveriam aparecer
SELECT 
    '=== CONTAGEM DE REGISTROS ===' as secao,
    COUNT(*) as total_registros
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

-- 7. Listar alguns registros que deveriam aparecer
SELECT 
    '=== REGISTROS QUE DEVERIAM APARECER ===' as secao,
    tr.id,
    tr.data_registro,
    e.nome as funcionario_nome,
    e.gestor_imediato_id,
    tr.status,
    tr.created_at
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

-- 8. Verificar registros no mês atual (janeiro 2026)
SELECT 
    '=== REGISTROS EM JANEIRO 2026 ===' as secao,
    COUNT(*) as registros_jan_2026
FROM rh.time_records tr
INNER JOIN rh.employees e ON tr.employee_id = e.id
WHERE tr.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND tr.data_registro >= '2026-01-01'
  AND tr.data_registro <= '2026-01-31'
  AND (
    e.gestor_imediato_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
    OR
    EXISTS (
      SELECT 1 
      FROM rh.employees gestor_employee
      WHERE gestor_employee.id = e.gestor_imediato_id
        AND gestor_employee.user_id = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51'
    )
  );
