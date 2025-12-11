-- =====================================================
-- DEBUG: Por que o status não está mudando para 'aprovada'?
-- =====================================================

-- 1. Verificar se existem aprovações pendentes para uma requisição
-- Substitua 'SEU_PROCESSO_ID' pelo ID de uma requisição de compra
SELECT 
    id,
    processo_tipo,
    processo_id,
    nivel_aprovacao,
    aprovador_id,
    status,
    data_aprovacao,
    created_at
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'SEU_PROCESSO_ID'::uuid  -- SUBSTITUA PELO ID REAL
ORDER BY nivel_aprovacao, created_at;

-- 2. Verificar status atual da requisição
-- Substitua 'SEU_PROCESSO_ID' pelo ID de uma requisição de compra
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao,
    aprovado_por
FROM compras.requisicoes_compra
WHERE id = 'SEU_PROCESSO_ID'::uuid;  -- SUBSTITUA PELO ID REAL

-- 3. Verificar se TODAS as aprovações foram aprovadas
-- (Esta é a verificação que a função faz)
-- Substitua 'SEU_PROCESSO_ID' pelo ID de uma requisição de compra
SELECT 
    processo_tipo,
    processo_id,
    COUNT(*) as total_aprovacoes,
    COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as aprovadas,
    COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status IN ('rejeitado', 'cancelado') THEN 1 END) as rejeitadas_canceladas,
    CASE 
        WHEN COUNT(CASE WHEN status = 'pendente' THEN 1 END) = 0 
         AND COUNT(CASE WHEN status IN ('rejeitado', 'cancelado') THEN 1 END) = 0
        THEN 'TODAS APROVADAS'
        ELSE 'AINDA TEM PENDENTES/REJEITADAS'
    END as status_geral
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'SEU_PROCESSO_ID'::uuid  -- SUBSTITUA PELO ID REAL
GROUP BY processo_tipo, processo_id;

-- 4. Testar a função process_approval manualmente
-- Substitua os valores pelos reais:
-- - 'APROVACAO_ID': ID da aprovação que você quer aprovar
-- - 'APROVADOR_ID': ID do usuário que está aprovando
-- 
-- IMPORTANTE: Execute apenas uma aprovação por vez e veja o resultado
SELECT public.process_approval(
    'APROVACAO_ID'::uuid,      -- SUBSTITUA pelo ID da aprovação
    'aprovado'::varchar,        -- Status da aprovação
    'Teste de aprovação'::text, -- Observações (pode ser NULL)
    'APROVADOR_ID'::uuid        -- SUBSTITUA pelo ID do aprovador
) as resultado;

-- Depois de executar, verifique novamente o status da requisição:
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao
FROM compras.requisicoes_compra
WHERE id = 'SEU_PROCESSO_ID'::uuid;  -- SUBSTITUA PELO ID REAL

-- 5. Verificar logs de erro (se houver)
-- Se a função retornou FALSE, pode haver um erro silencioso
-- Verifique se:
-- - O aprovador_id está correto
-- - A aprovação está com status 'pendente'
-- - O aprovador tem permissão

-- 6. Verificar se há triggers que podem estar interferindo
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'compras'
AND event_object_table = 'requisicoes_compra';

-- 7. Verificar constraints na tabela
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'compras'
AND tc.table_name = 'requisicoes_compra';

