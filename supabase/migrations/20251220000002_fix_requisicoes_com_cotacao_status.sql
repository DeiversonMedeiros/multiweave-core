-- =====================================================
-- MIGRAÇÃO: Corrigir workflow_state de requisições com cotações já criadas
-- Data....: 2025-12-20
-- Objetivo:
--   - Atualizar workflow_state para 'em_cotacao' em requisições que já têm
--     cotações criadas mas ainda estão com status incorreto
--   - Registrar no log de workflow para auditoria
-- =====================================================

DO $$
DECLARE
    v_requisicao RECORD;
    v_updated_count INTEGER := 0;
    v_cotacao_ciclo_id UUID;
    v_actor_id UUID;
BEGIN
    RAISE NOTICE 'Iniciando correção de workflow_state de requisições com cotações...';
    
    -- Buscar requisições que têm cotações criadas mas workflow_state não é 'em_cotacao'
    FOR v_requisicao IN
        SELECT DISTINCT ON (rc.id)
            rc.id,
            rc.workflow_state,
            rc.company_id,
            rc.created_by,
            cc.id as cotacao_ciclo_id,
            rc.created_at
        FROM compras.requisicoes_compra rc
        INNER JOIN compras.cotacao_ciclos cc ON cc.requisicao_id = rc.id
        WHERE rc.workflow_state != 'em_cotacao'
          AND rc.workflow_state IN ('aprovada', 'encaminhada', 'pendente_aprovacao')
        ORDER BY rc.id, rc.created_at DESC
    LOOP
        -- Obter o ID do ciclo de cotação (usar o primeiro se houver múltiplos)
        SELECT id INTO v_cotacao_ciclo_id
        FROM compras.cotacao_ciclos
        WHERE requisicao_id = v_requisicao.id
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Usar created_by da requisição como actor_id, ou usar um usuário admin se não houver
        v_actor_id := COALESCE(
            v_requisicao.created_by,
            (SELECT id FROM public.users WHERE email LIKE '%admin%' LIMIT 1),
            (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1)
        );
        
        -- Atualizar workflow_state da requisição
        UPDATE compras.requisicoes_compra
        SET workflow_state = 'em_cotacao',
            updated_at = NOW()
        WHERE id = v_requisicao.id;
        
        -- Registrar no log de workflow
        INSERT INTO compras.workflow_logs (
            entity_type,
            entity_id,
            from_state,
            to_state,
            actor_id,
            payload,
            created_at
        ) VALUES (
            'requisicao_compra',
            v_requisicao.id,
            v_requisicao.workflow_state,
            'em_cotacao',
            v_actor_id,
            jsonb_build_object(
                'cotacao_ciclo_id', v_cotacao_ciclo_id,
                'corrigido_automaticamente', true,
                'data_correcao', NOW()
            ),
            NOW()
        )
        ON CONFLICT DO NOTHING; -- Evitar duplicatas se já existir
        
        v_updated_count := v_updated_count + 1;
        
        RAISE NOTICE 'Requisição % atualizada: % → em_cotacao (cotacao_ciclo_id: %)', 
            v_requisicao.id, 
            v_requisicao.workflow_state,
            v_cotacao_ciclo_id;
    END LOOP;
    
    RAISE NOTICE 'Correção concluída! Total de requisições atualizadas: %', v_updated_count;
END $$;

-- Verificar resultado
SELECT 
    COUNT(*) as total_requisicoes_com_cotacao,
    COUNT(CASE WHEN rc.workflow_state = 'em_cotacao' THEN 1 END) as com_status_correto,
    COUNT(CASE WHEN rc.workflow_state != 'em_cotacao' THEN 1 END) as com_status_incorreto
FROM compras.requisicoes_compra rc
INNER JOIN compras.cotacao_ciclos cc ON cc.requisicao_id = rc.id;

COMMENT ON FUNCTION (SELECT routine_name FROM information_schema.routines 
    WHERE routine_schema = 'compras' 
    AND routine_name LIKE '%fix%' 
    LIMIT 1) IS 
'Corrige workflow_state de requisições que já têm cotações criadas mas não estão com status correto';

