-- =====================================================
-- DEBUG SIMPLES - Execute estas queries na ordem
-- =====================================================

-- QUERY 1: Veja todas as requisições em aprovação
-- Execute esta PRIMEIRO para escolher uma requisição
SELECT 
    rc.id,
    rc.numero_requisicao,
    rc.status,
    rc.workflow_state,
    COUNT(au.id) as total_aprovacoes,
    COUNT(CASE WHEN au.status = 'pendente' THEN 1 END) as pendentes,
    COUNT(CASE WHEN au.status = 'aprovado' THEN 1 END) as aprovadas
FROM compras.requisicoes_compra rc
LEFT JOIN public.aprovacoes_unificada au 
    ON au.processo_tipo = 'requisicao_compra' 
    AND au.processo_id = rc.id
GROUP BY rc.id, rc.numero_requisicao, rc.status, rc.workflow_state
HAVING COUNT(au.id) > 0
ORDER BY rc.created_at DESC;

-- QUERY 2: Escolha um ID da query acima e substitua aqui
-- Exemplo: se o ID for '123e4567-e89b-12d3-a456-426614174000'
-- Copie e cole este ID no lugar de 'COLE_O_ID_AQUI'

-- 2a. Ver aprovações dessa requisição
SELECT 
    id as aprovacao_id,
    nivel_aprovacao,
    aprovador_id,
    status,
    data_aprovacao
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'COLE_O_ID_AQUI'::uuid
ORDER BY nivel_aprovacao;

-- 2b. Ver se todas foram aprovadas
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as aprovadas,
    COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
    CASE 
        WHEN COUNT(CASE WHEN status = 'pendente' THEN 1 END) = 0 
        THEN '✅ TODAS APROVADAS - Status deveria ser aprovada'
        ELSE '⏳ AINDA TEM PENDENTES'
    END as diagnostico
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'COLE_O_ID_AQUI'::uuid;

-- 2c. Ver status atual da requisição
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao
FROM compras.requisicoes_compra
WHERE id = 'COLE_O_ID_AQUI'::uuid;




