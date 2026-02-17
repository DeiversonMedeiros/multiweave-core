-- =====================================================
-- ANALISE: Aprovacao Horas Extras (portal-gestor)
-- Usuario: deiverson.medeiros | Funcionario: VINICIUS ALVES RODRIGUES
-- =====================================================
-- CONCLUSOES (via psql em 2026-02-13):
-- 1. deiverson tem acesso a ESTRATEGIC e e gestor imediato do Vinicius.
-- 2. Vinicius tem registros com horas_extras_50 (ex.: 0.60, 0.64) mas TODOS com status 'aprovado'.
-- 3. Nao existe NENHUM registro pendente de horas extras em nenhuma empresa (count = 0).
-- 4. Causa: migration 20260206000002_auto_approve_all_time_records.sql passou a aprovar
--    automaticamente TODOS os registros (incluindo com hora extra). A pagina so lista status='pendente'.
-- Solucao: Ajustar recalculate_time_record_hours para manter status='pendente' quando
--          horas_extras_50 ou horas_extras_100 > 0, e aprovar automaticamente apenas os demais.
-- =====================================================

-- 1. Usuario deiverson.medeiros (id, company)
SELECT u.id AS user_id, u.nome, u.username, u.company_id AS user_company_id, c.nome_fantasia AS user_company_name
FROM public.users u
LEFT JOIN public.companies c ON c.id = u.company_id
WHERE u.username = 'deiverson.medeiros';

-- 2. Empresas às quais deiverson tem acesso (user_companies)
SELECT uc.user_id, uc.company_id, c.nome_fantasia, uc.ativo
FROM public.user_companies uc
JOIN public.users u ON u.id = uc.user_id
JOIN public.companies c ON c.id = uc.company_id
WHERE u.username = 'deiverson.medeiros';

-- 3. Funcionario VINICIUS ALVES RODRIGUES (employee)
SELECT e.id AS employee_id, e.nome, e.matricula, e.company_id AS emp_company_id, e.user_id AS emp_user_id,
       e.gestor_imediato_id,
       gu.nome AS gestor_imediato_nome,
       gu.username AS gestor_imediato_username
FROM rh.employees e
LEFT JOIN public.users gu ON gu.id = e.gestor_imediato_id
WHERE e.nome ILIKE '%VINICIUS%RODRIGUES%' OR e.nome ILIKE '%VINICIUS ALVES%';

-- 4. Gestores de ponto (employee_ponto_gestores) do Vinicius
SELECT epg.employee_id, epg.user_id, u.nome AS gestor_ponto_nome, u.username AS gestor_ponto_username, epg.company_id
FROM rh.employee_ponto_gestores epg
JOIN public.users u ON u.id = epg.user_id
JOIN rh.employees e ON e.id = epg.employee_id
WHERE e.nome ILIKE '%VINICIUS%RODRIGUES%' OR e.nome ILIKE '%VINICIUS ALVES%';

-- 5. Registros de ponto do Vinicius com hora extra
SELECT tr.id, tr.employee_id, tr.data_registro, tr.status,
       tr.horas_extras, tr.horas_extras_50, tr.horas_extras_100,
       tr.company_id
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE (e.nome ILIKE '%VINICIUS%RODRIGUES%' OR e.nome ILIKE '%VINICIUS ALVES%')
  AND (COALESCE(tr.horas_extras,0) > 0 OR COALESCE(tr.horas_extras_50,0) > 0 OR COALESCE(tr.horas_extras_100,0) > 0)
ORDER BY tr.data_registro DESC
LIMIT 15;

-- 6. Pendentes de aprovacao (horas extras) do Vinicius
SELECT tr.id, tr.data_registro, tr.status, tr.horas_extras_50, tr.horas_extras_100, tr.company_id
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE (e.nome ILIKE '%VINICIUS%RODRIGUES%' OR e.nome ILIKE '%VINICIUS ALVES%')
  AND tr.status = 'pendente'
  AND (COALESCE(tr.horas_extras,0) > 0 OR COALESCE(tr.horas_extras_50,0) > 0 OR COALESCE(tr.horas_extras_100,0) > 0);

-- 7. RPC para gestor=deiverson, company=ESTRATEGIC
SELECT id, employee_id, funcionario_nome, data_registro, status, horas_extras_50, horas_extras_100
FROM public.get_pending_overtime_records_for_manager(
  (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%ESTRATEGIC%' LIMIT 1),
  (SELECT id FROM public.users WHERE username = 'deiverson.medeiros' LIMIT 1)
)
LIMIT 20;

-- 8. RPC para gestor=deiverson, company=Empresa Teste
SELECT id, employee_id, funcionario_nome, data_registro, status, horas_extras_50, horas_extras_100
FROM public.get_pending_overtime_records_for_manager(
  (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Empresa Teste%' OR nome_fantasia ILIKE '%Nova Empresa%' LIMIT 1),
  (SELECT id FROM public.users WHERE username = 'deiverson.medeiros' LIMIT 1)
)
LIMIT 20;

-- 9. Todos pendentes de horas extras na ESTRATEGIC (sem filtro gestor)
SELECT tr.id, e.nome, tr.data_registro, tr.status, tr.horas_extras_50, tr.horas_extras_100
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE tr.company_id = (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%ESTRATEGIC%' LIMIT 1)
  AND tr.status = 'pendente'
  AND (COALESCE(tr.horas_extras,0) > 0 OR COALESCE(tr.horas_extras_50,0) > 0 OR COALESCE(tr.horas_extras_100,0) > 0)
ORDER BY tr.data_registro DESC
LIMIT 20;
