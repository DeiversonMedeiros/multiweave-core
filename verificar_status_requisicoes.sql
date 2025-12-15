-- =====================================================
-- VERIFICAÇÃO DO STATUS DAS REQUISIÇÕES
-- =====================================================

-- TESTE 1: Requisição com TODAS aprovações concluídas
-- Este é o caso problemático - todas aprovadas mas status não mudou
SELECT 
    rc.id,
    rc.numero_requisicao,
    rc.status as status_atual,
    rc.workflow_state,
    rc.data_aprovacao,
    rc.aprovado_por,
    rc.created_at,
    rc.updated_at,
    -- Resumo das aprovações
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id) as total_aprovacoes,
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id 
     AND au.status = 'aprovado') as aprovaroes_aprovadas,
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id 
     AND au.status = 'pendente') as aprovaroes_pendentes
FROM compras.requisicoes_compra rc
WHERE rc.id = '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid;

-- Detalhes das aprovações dessa requisição
SELECT 
    au.id as aprovacao_id,
    au.nivel_aprovacao,
    au.aprovador_id,
    au.status as status_aprovacao,
    au.data_aprovacao,
    au.observacoes,
    au.created_at,
    au.updated_at
FROM public.aprovacoes_unificada au
WHERE au.processo_tipo = 'requisicao_compra'
AND au.processo_id = '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid
ORDER BY au.nivel_aprovacao;

-- TESTE 2: Requisição com aprovação pendente (normal)
SELECT 
    rc.id,
    rc.numero_requisicao,
    rc.status as status_atual,
    rc.workflow_state,
    (SELECT COUNT(*) FROM public.aprovacoes_unificada au 
     WHERE au.processo_tipo = 'requisicao_compra' 
     AND au.processo_id = rc.id 
     AND au.status = 'pendente') as aprovaroes_pendentes
FROM compras.requisicoes_compra rc
WHERE rc.id = 'd77817d5-e9f2-4750-82ef-383aeeb0847c'::uuid;

-- =====================================================
-- DIAGNÓSTICO: Verificar o que pode estar impedindo
-- =====================================================

-- Verificar se a função está sendo chamada corretamente
-- Simular o que a função faz internamente para a requisição problemática
DO $$
DECLARE
    v_processo_id UUID := '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid;
    v_has_pendentes BOOLEAN;
    v_total_aprovacoes INTEGER;
    v_aprovadas INTEGER;
BEGIN
    -- Verificar se há pendentes (mesma lógica da função)
    SELECT EXISTS(
        SELECT 1 FROM public.aprovacoes_unificada
        WHERE processo_tipo = 'requisicao_compra'
        AND processo_id = v_processo_id
        AND company_id = (SELECT company_id FROM compras.requisicoes_compra WHERE id = v_processo_id)
        AND status = 'pendente'
    ) INTO v_has_pendentes;
    
    SELECT COUNT(*) INTO v_total_aprovacoes
    FROM public.aprovacoes_unificada
    WHERE processo_tipo = 'requisicao_compra'
    AND processo_id = v_processo_id;
    
    SELECT COUNT(*) INTO v_aprovadas
    FROM public.aprovacoes_unificada
    WHERE processo_tipo = 'requisicao_compra'
    AND processo_id = v_processo_id
    AND status = 'aprovado';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNÓSTICO DA REQUISIÇÃO:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ID: %', v_processo_id;
    RAISE NOTICE 'Total de aprovações: %', v_total_aprovacoes;
    RAISE NOTICE 'Aprovadas: %', v_aprovadas;
    RAISE NOTICE 'Tem pendentes: %', v_has_pendentes;
    RAISE NOTICE '';
    
    IF NOT v_has_pendentes AND v_aprovadas > 0 THEN
        RAISE NOTICE '✅ CONDIÇÃO ATENDIDA - Status deveria mudar para aprovada';
        RAISE NOTICE '❓ Por que não mudou? Possíveis causas:';
        RAISE NOTICE '   1. Função não foi chamada após última aprovação';
        RAISE NOTICE '   2. Trigger está bloqueando a atualização';
        RAISE NOTICE '   3. Constraint está impedindo o valor';
        RAISE NOTICE '   4. Problema com company_id na verificação';
    ELSIF v_has_pendentes THEN
        RAISE NOTICE '⏳ AINDA TEM PENDENTES - Status não muda até aprovar todas';
    ELSE
        RAISE NOTICE '⚠️  CASO ESPECIAL - Verificar';
    END IF;
END $$;

-- Verificar company_id nas aprovações vs requisição
SELECT 
    'Requisição' as origem,
    rc.company_id
FROM compras.requisicoes_compra rc
WHERE rc.id = '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid
UNION ALL
SELECT 
    'Aprovação' as origem,
    au.company_id
FROM public.aprovacoes_unificada au
WHERE au.processo_tipo = 'requisicao_compra'
AND au.processo_id = '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid
GROUP BY au.company_id;










