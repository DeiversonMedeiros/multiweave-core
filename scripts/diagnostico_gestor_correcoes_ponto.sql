-- Diagnóstico: por que clevison.nascimento não vê correções de KAIQUE e JOSE NILTON
-- Executar no banco Supabase (schema public + rh).
--
-- RESULTADO (2026-02-23):
-- - KAIQUE e JOSE NILTON têm gestor_imediato_id = user_id do Clevison (70817d7a-...). OK.
-- - Não existem registros em rh.attendance_corrections para esses dois funcionários (0 linhas).
-- - A RPC get_attendance_corrections_for_manager está correta: ao passar p_user_id = Clevison,
--   retorna correções de outros subordinados (MARCIO, GUSTAVO, etc.).
-- Conclusão: quando KAIQUE ou JOSE NILTON solicitarem correções, elas aparecerão para o Clevison.
-- Foi adicionada invalidação da query 'attendance-corrections-for-manager' ao salvar funcionário
-- (EmployeesPageNew) para que, ao alterar o gestor imediato, a lista do portal gestor atualize.

-- 1) Usuário clevison.nascimento (auth.users ou public.users)
SELECT '1. Usuário clevison.nascimento' AS passo;
SELECT id AS user_id, email, raw_user_meta_data->>'nome' AS nome
FROM auth.users
WHERE email ILIKE '%clevison%' OR raw_user_meta_data->>'nome' ILIKE '%clevison%';
-- Se não existir em auth.users, tentar public.users
SELECT id AS user_id, email, nome FROM public.users
WHERE email ILIKE '%clevison%' OR nome ILIKE '%clevison%';

-- 2) Funcionários KAIQUE SILVA SOUZA e JOSE NILTON PAIXAO SANTOS
SELECT '2. Funcionários (KAIQUE e JOSE NILTON)' AS passo;
SELECT e.id AS employee_id, e.nome, e.matricula, e.gestor_imediato_id, e.user_id AS employee_user_id
FROM rh.employees e
WHERE e.nome ILIKE '%KAIQUE%' OR e.nome ILIKE '%JOSE NILTON%' OR e.nome ILIKE '%PAIXAO SANTOS%';

-- 3) Quem é o gestor_imediato_id? (pode ser user_id ou employee_id)
-- Se for employee_id, qual o user_id desse employee?
SELECT '3. Gestor imediato (como employee) dos dois' AS passo;
SELECT g.id AS gestor_employee_id, g.nome AS gestor_nome, g.user_id AS gestor_user_id
FROM rh.employees g
WHERE g.id IN (
  SELECT e.gestor_imediato_id FROM rh.employees e
  WHERE e.nome ILIKE '%KAIQUE%' OR e.nome ILIKE '%JOSE NILTON%' OR e.nome ILIKE '%PAIXAO SANTOS%'
);

-- 4) Correções de ponto desses funcionários
SELECT '4. Correções de ponto (KAIQUE / JOSE NILTON)' AS passo;
SELECT ac.id, ac.employee_id, e.nome AS funcionario_nome, ac.status, ac.data_original, ac.created_at
FROM rh.attendance_corrections ac
JOIN rh.employees e ON e.id = ac.employee_id
WHERE e.nome ILIKE '%KAIQUE%' OR e.nome ILIKE '%JOSE NILTON%' OR e.nome ILIKE '%PAIXAO SANTOS%'
ORDER BY ac.created_at DESC;

-- 5) Simular filtro da RPC get_attendance_corrections_for_manager para o user_id do clevison
-- (substituir <CLEVISON_USER_ID> pelo id retornado no passo 1)
SELECT '5. Correções que a RPC retornaria para o gestor (exemplo com primeiro user_id encontrado)' AS passo;
WITH clevison_user AS (
  SELECT id FROM auth.users WHERE email ILIKE '%clevison%' LIMIT 1
),
emp_subordinados AS (
  SELECT e.id AS employee_id
  FROM rh.employees e
  WHERE e.company_id = (SELECT company_id FROM rh.employees WHERE nome ILIKE '%KAIQUE%' LIMIT 1)
  AND (
    e.gestor_imediato_id = (SELECT id FROM clevison_user)
    OR EXISTS (
      SELECT 1 FROM rh.employees gestor_employee
      WHERE gestor_employee.id = e.gestor_imediato_id AND gestor_employee.user_id = (SELECT id FROM clevison_user)
    )
  )
)
SELECT ac.id, ac.employee_id, emp.nome, ac.status
FROM rh.attendance_corrections ac
JOIN rh.employees emp ON emp.id = ac.employee_id
WHERE ac.employee_id IN (SELECT employee_id FROM emp_subordinados);
