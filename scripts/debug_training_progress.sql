-- =====================================================
-- SCRIPT DE DEBUG: Verificar progresso de treinamento
-- Execute este script substituindo os UUIDs pelos valores corretos
-- =====================================================

-- Substitua estes valores pelos UUIDs reais:
-- p_training_id: UUID do treinamento (ex: '109c3f89-7b5a-4368-96ea-3ca8d9f0497f')
-- p_employee_id: UUID do funcionário
-- p_company_id: UUID da empresa

-- 1. Verificar se existem conteúdos cadastrados para o treinamento
SELECT 
    'Conteúdos do treinamento' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as ativos,
    COUNT(*) FILTER (WHERE is_active = false) as inativos
FROM rh.training_content
WHERE training_id = '109c3f89-7b5a-4368-96ea-3ca8d9f0497f'::uuid;

-- 2. Listar todos os conteúdos do treinamento
SELECT 
    id,
    titulo,
    ordem,
    is_active,
    tipo_conteudo
FROM rh.training_content
WHERE training_id = '109c3f89-7b5a-4368-96ea-3ca8d9f0497f'::uuid
ORDER BY ordem;

-- 3. Verificar registros de progresso (substitua p_employee_id)
SELECT 
    'Registros de progresso' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE concluido = true) as concluidos_true,
    COUNT(*) FILTER (WHERE percentual_concluido >= 100) as percentual_100,
    COUNT(*) FILTER (WHERE status = 'concluido') as status_concluido,
    COUNT(*) FILTER (WHERE concluido = true OR percentual_concluido >= 100 OR status = 'concluido') as qualquer_forma_concluido
FROM rh.training_progress
WHERE training_id = '109c3f89-7b5a-4368-96ea-3ca8d9f0497f'::uuid
-- AND employee_id = 'SUBSTITUA_PELO_EMPLOYEE_ID'::uuid
;

-- 4. Listar todos os registros de progresso com detalhes
SELECT 
    tp.id,
    tp.content_id,
    tc.titulo as conteudo_titulo,
    tp.employee_id,
    tp.concluido,
    tp.percentual_concluido,
    tp.status,
    tp.tempo_assistido_segundos,
    tp.data_conclusao,
    tp.data_ultima_atualizacao
FROM rh.training_progress tp
LEFT JOIN rh.training_content tc ON tp.content_id = tc.id
WHERE tp.training_id = '109c3f89-7b5a-4368-96ea-3ca8d9f0497f'::uuid
-- AND tp.employee_id = 'SUBSTITUA_PELO_EMPLOYEE_ID'::uuid
ORDER BY tc.ordem;

-- 5. Testar a função calculate_training_progress diretamente
-- (substitua os UUIDs pelos valores corretos)
SELECT rh.calculate_training_progress(
    '109c3f89-7b5a-4368-96ea-3ca8d9f0497f'::uuid,  -- training_id
    'SUBSTITUA_PELO_EMPLOYEE_ID'::uuid,            -- employee_id
    'SUBSTITUA_PELO_COMPANY_ID'::uuid               -- company_id
);

-- 6. Verificar se há enrollment para o funcionário
SELECT 
    id,
    training_id,
    employee_id,
    status,
    is_active,
    created_at
FROM rh.training_enrollments
WHERE training_id = '109c3f89-7b5a-4368-96ea-3ca8d9f0497f'::uuid
-- AND employee_id = 'SUBSTITUA_PELO_EMPLOYEE_ID'::uuid
;
