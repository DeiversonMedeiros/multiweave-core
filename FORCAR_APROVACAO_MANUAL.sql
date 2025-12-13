-- =====================================================
-- FORÇAR APROVAÇÃO MANUAL - Para testar
-- Use apenas para teste/debug
-- =====================================================

-- Para a requisição que já tem todas as aprovações aprovadas
-- mas o status não mudou, vamos forçar a atualização manualmente

DO $$
DECLARE
    v_processo_id UUID := '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid;
    v_company_id UUID;
    v_aprovador_id UUID;
    v_has_pendentes BOOLEAN;
    v_has_rejeitadas BOOLEAN;
    v_all_approved BOOLEAN;
BEGIN
    -- Obter company_id da requisição
    SELECT company_id INTO v_company_id
    FROM compras.requisicoes_compra
    WHERE id = v_processo_id;
    
    -- Obter último aprovador
    SELECT aprovador_id INTO v_aprovador_id
    FROM public.aprovacoes_unificada
    WHERE processo_tipo = 'requisicao_compra'
    AND processo_id = v_processo_id
    AND status = 'aprovado'
    ORDER BY data_aprovacao DESC
    LIMIT 1;
    
    -- Verificar se todas foram aprovadas (mesma lógica da função)
    SELECT EXISTS(
        SELECT 1 FROM public.aprovacoes_unificada
        WHERE processo_tipo = 'requisicao_compra'
        AND processo_id = v_processo_id
        AND company_id = v_company_id
        AND status = 'pendente'
    ) INTO v_has_pendentes;
    
    SELECT EXISTS(
        SELECT 1 FROM public.aprovacoes_unificada
        WHERE processo_tipo = 'requisicao_compra'
        AND processo_id = v_processo_id
        AND company_id = v_company_id
        AND status IN ('rejeitado', 'cancelado')
    ) INTO v_has_rejeitadas;
    
    v_all_approved := NOT v_has_pendentes AND NOT v_has_rejeitadas;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FORÇANDO APROVAÇÃO MANUAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ID Requisição: %', v_processo_id;
    RAISE NOTICE 'Company ID: %', v_company_id;
    RAISE NOTICE 'Aprovador ID: %', v_aprovador_id;
    RAISE NOTICE 'Tem pendentes: %', v_has_pendentes;
    RAISE NOTICE 'Tem rejeitadas: %', v_has_rejeitadas;
    RAISE NOTICE 'Todas aprovadas: %', v_all_approved;
    
    IF v_all_approved THEN
        -- Forçar atualização (mesma lógica da função)
        UPDATE compras.requisicoes_compra
        SET status = 'aprovada'::compras.status_requisicao,
            workflow_state = 'em_cotacao',
            data_aprovacao = NOW(),
            aprovado_por = v_aprovador_id,
            updated_at = NOW()
        WHERE id = v_processo_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '✅ Status atualizado manualmente para: aprovada';
        RAISE NOTICE '✅ workflow_state atualizado para: em_cotacao';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ Não foi possível atualizar - condições não atendidas';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    data_aprovacao,
    updated_at
FROM compras.requisicoes_compra
WHERE id = '6fcea877-41b1-4128-9f07-87ebf4aa3de7'::uuid;




