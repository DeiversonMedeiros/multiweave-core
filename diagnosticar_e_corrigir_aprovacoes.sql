-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO DE APROVAÇÕES DE REQUISIÇÕES
-- =====================================================
-- Este script ajuda a identificar e corrigir requisições que
-- foram aprovadas mas não tiveram o status atualizado
-- =====================================================

-- =====================================================
-- 1. DIAGNÓSTICO: Requisições com aprovações completas mas status incorreto
-- =====================================================
SELECT 
    rc.id,
    rc.numero_requisicao,
    rc.status as status_atual,
    rc.workflow_state,
    rc.data_aprovacao,
    rc.aprovado_por,
    -- Contadores de aprovações
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id) as total_aprovacoes,
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id 
     AND au.status = 'aprovado') as aprovacoes_aprovadas,
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id 
     AND au.status = 'pendente') as aprovacoes_pendentes,
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id 
     AND au.status IN ('rejeitado', 'cancelado')) as aprovacoes_rejeitadas,
    -- Verificar se todas foram aprovadas
    CASE 
        WHEN (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
              WHERE au.processo_tipo = 'requisicao_compra' 
              AND au.processo_id = rc.id 
              AND au.status = 'pendente') = 0
        AND (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
             WHERE au.processo_tipo = 'requisicao_compra' 
             AND au.processo_id = rc.id 
             AND au.status = 'aprovado') > 0
        AND (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
             WHERE au.processo_tipo = 'requisicao_compra' 
             AND au.processo_id = rc.id 
             AND au.status = 'aprovado') = 
            (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
             WHERE au.processo_tipo = 'requisicao_compra' 
             AND au.processo_id = rc.id)
        THEN 'SIM - Deveria estar aprovada'
        ELSE 'NÃO'
    END as deveria_estar_aprovada
FROM compras.requisicoes_compra rc
WHERE EXISTS (
    SELECT 1 FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.processo_id = rc.id
)
ORDER BY rc.created_at DESC;

-- =====================================================
-- 2. CORREÇÃO MANUAL: Atualizar requisições que foram aprovadas
-- =====================================================
-- Execute este UPDATE apenas se o diagnóstico acima mostrar
-- que há requisições que deveriam estar aprovadas

UPDATE compras.requisicoes_compra rc
SET 
    status = 'aprovada'::compras.status_requisicao,
    workflow_state = 'em_cotacao',
    data_aprovacao = (
        SELECT MAX(au.data_aprovacao)
        FROM public.aprovacoes_unificada au
        WHERE au.processo_tipo = 'requisicao_compra'
        AND au.processo_id = rc.id
        AND au.status = 'aprovado'
    ),
    aprovado_por = (
        SELECT au.aprovador_id
        FROM public.aprovacoes_unificada au
        WHERE au.processo_tipo = 'requisicao_compra'
        AND au.processo_id = rc.id
        AND au.status = 'aprovado'
        ORDER BY au.data_aprovacao DESC
        LIMIT 1
    ),
    updated_at = NOW()
WHERE rc.status != 'aprovada'::compras.status_requisicao
AND NOT EXISTS (
    -- Não há aprovações pendentes
    SELECT 1 FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.processo_id = rc.id
    AND au.status = 'pendente'
)
AND EXISTS (
    -- Existe pelo menos uma aprovação aprovada
    SELECT 1 FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.processo_id = rc.id
    AND au.status = 'aprovado'
)
AND (
    -- Todas as aprovações foram aprovadas (não há rejeitadas/canceladas)
    SELECT COUNT(*) FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.processo_id = rc.id
    AND au.status IN ('rejeitado', 'cancelado')
) = 0
AND (
    -- Total de aprovadas = total de aprovações
    SELECT COUNT(*) FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.processo_id = rc.id
    AND au.status = 'aprovado'
) = (
    SELECT COUNT(*) FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.processo_id = rc.id
);

-- =====================================================
-- 3. VERIFICAR APROVAÇÕES DE UMA REQUISIÇÃO ESPECÍFICA
-- =====================================================
-- Substitua o UUID abaixo pelo ID da requisição que você quer verificar
/*
SELECT 
    au.id,
    au.nivel_aprovacao,
    au.aprovador_id,
    u.nome as aprovador_nome,
    au.status,
    au.data_aprovacao,
    au.observacoes,
    au.created_at,
    au.updated_at
FROM public.aprovacoes_unificada au
LEFT JOIN public.users u ON u.id = au.aprovador_id
WHERE au.processo_tipo = 'requisicao_compra'
AND au.processo_id = 'SEU_UUID_AQUI'::uuid
ORDER BY au.nivel_aprovacao, au.created_at;
*/

-- =====================================================
-- 4. TESTAR FUNÇÃO process_approval MANUALMENTE
-- =====================================================
-- Use este exemplo para testar a função manualmente
-- (substitua os valores pelos corretos)
/*
SELECT public.process_approval(
    'ID_DA_APROVACAO'::uuid,  -- p_aprovacao_id
    'aprovado',                -- p_status
    'Aprovado manualmente',    -- p_observacoes
    'ID_DO_APROVADOR'::uuid    -- p_aprovador_id
);
*/




