-- =====================================================
-- DEBUG: Por que o status não está mudando para 'aprovada'?
-- Versão 2 - Sem necessidade de IDs (lista primeiro)
-- =====================================================

-- PASSO 1: Liste as requisições que estão em aprovação
-- Execute esta query primeiro para ver todas as requisições
SELECT 
    rc.id,
    rc.numero_requisicao,
    rc.status as status_requisicao,
    rc.workflow_state,
    rc.data_aprovacao,
    COUNT(au.id) as total_aprovacoes,
    COUNT(CASE WHEN au.status = 'pendente' THEN 1 END) as aprovaroes_pendentes,
    COUNT(CASE WHEN au.status = 'aprovado' THEN 1 END) as aprovaroes_aprovadas,
    COUNT(CASE WHEN au.status IN ('rejeitado', 'cancelado') THEN 1 END) as aprovaroes_rejeitadas
FROM compras.requisicoes_compra rc
LEFT JOIN public.aprovacoes_unificada au 
    ON au.processo_tipo = 'requisicao_compra' 
    AND au.processo_id = rc.id
WHERE rc.status IN ('pendente_aprovacao', 'rascunho', 'aprovada')
GROUP BY rc.id, rc.numero_requisicao, rc.status, rc.workflow_state, rc.data_aprovacao
ORDER BY rc.created_at DESC
LIMIT 20;

-- =====================================================
-- PASSO 2: Depois de escolher uma requisição, 
-- substitua 'AQUI_ID_DA_REQUISICAO' pelo ID real
-- =====================================================

-- 2.1. Ver detalhes das aprovações de uma requisição específica
-- SUBSTITUA 'AQUI_ID_DA_REQUISICAO' pelo ID que você escolheu acima
SELECT 
    au.id as aprovacao_id,
    au.processo_tipo,
    au.processo_id,
    au.nivel_aprovacao,
    au.aprovador_id,
    u.email as aprovador_email,
    au.status as status_aprovacao,
    au.data_aprovacao,
    au.observacoes,
    au.created_at
FROM public.aprovacoes_unificada au
LEFT JOIN auth.users u ON u.id = au.aprovador_id
WHERE au.processo_tipo = 'requisicao_compra'
AND au.processo_id = 'AQUI_ID_DA_REQUISICAO'::uuid  -- ⚠️ SUBSTITUA PELO ID REAL
ORDER BY au.nivel_aprovacao, au.created_at;

-- 2.2. Ver status atual da requisição
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao,
    aprovado_por,
    created_at,
    updated_at
FROM compras.requisicoes_compra
WHERE id = 'AQUI_ID_DA_REQUISICAO'::uuid;  -- ⚠️ SUBSTITUA PELO ID REAL

-- 2.3. Verificar resumo das aprovações (para ver se todas foram aprovadas)
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
         AND COUNT(CASE WHEN status = 'aprovado' THEN 1 END) > 0
        THEN '✅ TODAS APROVADAS - Status deveria mudar'
        WHEN COUNT(CASE WHEN status = 'pendente' THEN 1 END) > 0
        THEN '⏳ AINDA TEM PENDENTES - Status não muda até aprovar todas'
        WHEN COUNT(CASE WHEN status IN ('rejeitado', 'cancelado') THEN 1 END) > 0
        THEN '❌ TEM REJEITADAS/CANCELADAS - Status não muda para aprovada'
        ELSE '⚠️ VERIFICAR'
    END as diagnostico
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'AQUI_ID_DA_REQUISICAO'::uuid  -- ⚠️ SUBSTITUA PELO ID REAL
GROUP BY processo_tipo, processo_id;

-- =====================================================
-- PASSO 3: Testar aprovar manualmente (se necessário)
-- =====================================================

-- 3.1. Primeiro, liste as aprovações pendentes para essa requisição
SELECT 
    au.id as aprovacao_id,
    au.aprovador_id,
    u.email as aprovador_email,
    au.status,
    au.nivel_aprovacao
FROM public.aprovacoes_unificada au
LEFT JOIN auth.users u ON u.id = au.aprovador_id
WHERE au.processo_tipo = 'requisicao_compra'
AND au.processo_id = 'AQUI_ID_DA_REQUISICAO'::uuid  -- ⚠️ SUBSTITUA PELO ID REAL
AND au.status = 'pendente'
ORDER BY au.nivel_aprovacao;

-- 3.2. Testar aprovar uma aprovação específica
-- SUBSTITUA:
-- - 'AQUI_ID_APROVACAO': ID da aprovação (da query 3.1 acima)
-- - 'AQUI_ID_APROVADOR': ID do aprovador (da query 3.1 acima)
SELECT public.process_approval(
    'AQUI_ID_APROVACAO'::uuid,      -- ⚠️ SUBSTITUA pelo ID da aprovação
    'aprovado'::varchar,             -- Status
    'Teste manual de aprovação'::text, -- Observações
    'AQUI_ID_APROVADOR'::uuid        -- ⚠️ SUBSTITUA pelo ID do aprovador
) as resultado_aprovacao;

-- 3.3. Verificar status após aprovar
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao,
    updated_at
FROM compras.requisicoes_compra
WHERE id = 'AQUI_ID_DA_REQUISICAO'::uuid;  -- ⚠️ SUBSTITUA PELO ID REAL

-- =====================================================
-- PASSO 4: Verificar se há problemas estruturais
-- =====================================================

-- 4.1. Verificar triggers que podem estar interferindo
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'compras'
AND event_object_table = 'requisicoes_compra'
ORDER BY trigger_name;

-- 4.2. Verificar constraints na tabela
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_schema = cc.constraint_schema
    AND tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'compras'
AND tc.table_name = 'requisicoes_compra'
ORDER BY tc.constraint_type, tc.constraint_name;




