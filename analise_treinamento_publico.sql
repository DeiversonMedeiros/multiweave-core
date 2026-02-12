-- =====================================================
-- ANÁLISE: Treinamento Público não aparecendo
-- Usuário: deiverson.medeiros
-- Treinamento: POL-TIN-001 - Política de Segurança da Informação
-- =====================================================

-- 1. Verificar se o treinamento existe e está ativo
SELECT 
    id,
    nome,
    modalidade,
    is_active,
    company_id
FROM rh.trainings
WHERE nome LIKE '%POL-TIN-001%'
   OR nome LIKE '%Política de Segurança%';

-- 2. Verificar atribuições públicas para este treinamento
SELECT 
    ta.id,
    ta.training_id,
    ta.company_id,
    ta.tipo_atribuicao,
    ta.employee_id,
    ta.position_id,
    ta.unit_id,
    ta.data_limite,
    ta.notificar,
    t.nome as training_name,
    t.is_active as training_active,
    t.modalidade
FROM rh.training_assignments ta
INNER JOIN rh.trainings t ON ta.training_id = t.id
WHERE t.nome LIKE '%POL-TIN-001%'
   OR t.nome LIKE '%Política de Segurança%'
ORDER BY ta.created_at DESC;

-- 3. Verificar se o usuário existe
SELECT 
    id,
    username,
    email,
    ativo
FROM public.users
WHERE username = 'deiverson.medeiros'
   OR email LIKE '%deiverson%';

-- 4. Verificar funcionários vinculados a este usuário
SELECT 
    e.id,
    e.nome,
    e.company_id,
    e.user_id,
    e.status,
    e.position_id,
    e.unit_id,
    u.username,
    u.email,
    c.nome_fantasia as company_name
FROM rh.employees e
INNER JOIN public.users u ON e.user_id = u.id
INNER JOIN public.companies c ON e.company_id = c.id
WHERE u.username = 'deiverson.medeiros'
   OR u.email LIKE '%deiverson%';

-- 5. Verificar empresas do usuário
SELECT 
    uc.user_id,
    uc.company_id,
    uc.ativo,
    c.nome_fantasia,
    c.razao_social,
    u.username
FROM public.user_companies uc
INNER JOIN public.companies c ON uc.company_id = c.id
INNER JOIN public.users u ON uc.user_id = u.id
WHERE u.username = 'deiverson.medeiros'
   OR u.email LIKE '%deiverson%';

-- 6. Verificar se há atribuições públicas em todas as empresas
SELECT 
    ta.id,
    ta.training_id,
    ta.company_id,
    ta.tipo_atribuicao,
    t.nome as training_name,
    t.is_active as training_active,
    t.modalidade,
    c.nome_fantasia as company_name
FROM rh.training_assignments ta
INNER JOIN rh.trainings t ON ta.training_id = t.id
INNER JOIN public.companies c ON ta.company_id = c.id
WHERE ta.tipo_atribuicao = 'publica'
ORDER BY ta.created_at DESC
LIMIT 10;

-- 7. Verificar se o treinamento tem conteúdo ativo
SELECT 
    t.id as training_id,
    t.nome as training_name,
    t.is_active as training_active,
    COUNT(tc.id) as total_content,
    COUNT(CASE WHEN tc.is_active = true THEN 1 END) as active_content
FROM rh.trainings t
LEFT JOIN rh.training_content tc ON t.id = tc.training_id
WHERE t.nome LIKE '%POL-TIN-001%'
   OR t.nome LIKE '%Política de Segurança%'
GROUP BY t.id, t.nome, t.is_active;
