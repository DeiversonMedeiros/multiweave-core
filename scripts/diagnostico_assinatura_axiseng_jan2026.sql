-- Diagnóstico: assinatura de ponto axiseng janeiro/2026 - usuário gilvani.santos
-- Executar via: psql "postgresql://..." -f scripts/diagnostico_assinatura_axiseng_jan2026.sql

\echo '=== 1. Empresa axiseng ==='
SELECT id, nome_fantasia, razao_social FROM companies WHERE LOWER(nome_fantasia) LIKE '%axis%' OR LOWER(razao_social) LIKE '%axis%';

\echo ''
\echo '=== 2. Usuário gilvani.santos (auth.users + employees) ==='
SELECT u.id as user_id, u.email, u.raw_user_meta_data->>'full_name' as full_name
FROM auth.users u
WHERE u.email ILIKE '%gilvani%' OR u.raw_user_meta_data->>'full_name' ILIKE '%gilvani%';

\echo ''
\echo '=== 3. Colaborador gilvani na axiseng ==='
SELECT e.id as employee_id, e.nome, e.matricula, e.status, e.company_id
FROM rh.employees e
JOIN companies c ON c.id = e.company_id
WHERE (e.nome ILIKE '%gilvani%' OR e.user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%gilvani.santos%'))
  AND (c.nome_fantasia ILIKE '%axis%' OR c.razao_social ILIKE '%axis%');

\echo ''
\echo '=== 4. Controle do mês 2026-01 para axiseng (signature_month_control) ==='
SELECT smc.*, c.nome_fantasia as company_name
FROM rh.signature_month_control smc
JOIN companies c ON c.id = smc.company_id
WHERE smc.month_year = '2026-01'
  AND (c.nome_fantasia ILIKE '%axis%' OR c.razao_social ILIKE '%axis%');

\echo ''
\echo '=== 5. Assinaturas jan/2026 da axiseng (time_record_signatures) ==='
SELECT trs.id, trs.employee_id, trs.month_year, trs.status, trs.expires_at, trs.created_at,
       e.nome as employee_nome
FROM rh.time_record_signatures trs
JOIN rh.employees e ON e.id = trs.employee_id
JOIN companies c ON c.id = trs.company_id
WHERE trs.month_year = '2026-01'
  AND (c.nome_fantasia ILIKE '%axis%' OR c.razao_social ILIKE '%axis%')
ORDER BY e.nome;

\echo ''
\echo '=== 6. Config de assinatura da axiseng ==='
SELECT c.id, c.nome_fantasia, trsc.is_enabled, trsc.signature_period_days
FROM rh.time_record_signature_config trsc
JOIN companies c ON c.id = trsc.company_id
WHERE c.nome_fantasia ILIKE '%axis%' OR c.razao_social ILIKE '%axis%';

\echo ''
\echo '=== 7. expires_at vs NOW() (assinaturas pendentes jan/2026 axiseng) ==='
SELECT trs.id, e.nome, trs.expires_at,
       (trs.expires_at < NOW()) as ja_expirou,
       NOW() as agora
FROM rh.time_record_signatures trs
JOIN rh.employees e ON e.id = trs.employee_id
JOIN companies c ON c.id = trs.company_id
WHERE trs.month_year = '2026-01'
  AND trs.status = 'pending'
  AND (c.nome_fantasia ILIKE '%axis%' OR c.razao_social ILIKE '%axis%');
