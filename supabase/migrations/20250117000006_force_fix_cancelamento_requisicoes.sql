-- =====================================================
-- CORREÇÃO URGENTE: Forçar atualização de cancelamento
-- Data: 2025-01-17
-- Descrição: Garante que cancelamento atualize status e salve observações
-- =====================================================

-- 1. Garantir que o enum tem 'rejeitada'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'rejeitada' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_requisicao')
    ) THEN
        ALTER TYPE compras.status_requisicao ADD VALUE 'rejeitada';
        RAISE NOTICE 'Status "rejeitada" adicionado ao enum';
    ELSE
        RAISE NOTICE 'Status "rejeitada" já existe no enum';
    END IF;
END $$;

-- 2. FORÇAR ATUALIZAÇÃO DA FUNÇÃO process_approval
-- Garantir que a versão correta está aplicada
CREATE OR REPLACE FUNCTION public.process_approval(
    p_aprovacao_id UUID,
    p_status VARCHAR(20), -- 'aprovado', 'rejeitado', 'cancelado'
    p_observacoes TEXT,
    p_aprovador_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approval_record RECORD;
    all_approved BOOLEAN := false;
    total_approvals INTEGER := 0;
    approved_count INTEGER := 0;
    rejected_count INTEGER := 0;
    entity_company_id UUID;
BEGIN
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RAISE WARNING 'Aprovação não encontrada ou já processada: %', p_aprovacao_id;
        RETURN FALSE;
    END IF;
    
    -- Atualizar status da aprovação
    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    -- Se foi aprovado, verificar se todas as aprovações foram concluídas
    IF p_status = 'aprovado' THEN
        -- Contar total de aprovações necessárias
        SELECT COUNT(*) INTO total_approvals
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id;
        
        -- Contar aprovações aprovadas
        SELECT COUNT(*) INTO approved_count
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id
        AND status = 'aprovado';
        
        -- Contar aprovações rejeitadas/canceladas
        SELECT COUNT(*) INTO rejected_count
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = approval_record.processo_tipo
        AND processo_id = approval_record.processo_id
        AND company_id = approval_record.company_id
        AND status IN ('rejeitado', 'cancelado');
        
        -- Verificar se todas foram aprovadas (todas aprovadas E nenhuma pendente)
        all_approved := (approved_count = total_approvals) AND (approved_count > 0);
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            CASE approval_record.processo_tipo
                WHEN 'requisicao_compra' THEN
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada'::compras.status_requisicao,
                        workflow_state = 'em_cotacao',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        observacoes_aprovacao = NULL,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                ELSE
                    -- Outros tipos de processo...
                    NULL;
            END CASE;
        END IF;
    END IF;
    
    -- Se foi rejeitado ou cancelado, atualizar status da entidade
    IF p_status IN ('rejeitado', 'cancelado') THEN
        CASE approval_record.processo_tipo
            WHEN 'requisicao_compra' THEN
                -- IMPORTANTE: Sempre salvar observações e atualizar status
                UPDATE compras.requisicoes_compra
                SET status = CASE 
                        WHEN p_status = 'rejeitado' THEN 'rejeitada'::compras.status_requisicao
                        WHEN p_status = 'cancelado' THEN 'cancelada'::compras.status_requisicao
                        ELSE 'cancelada'::compras.status_requisicao
                    END,
                    workflow_state = CASE 
                        WHEN p_status = 'rejeitado' THEN 'reprovada'
                        ELSE 'cancelada'
                    END,
                    observacoes_aprovacao = p_observacoes, -- SEMPRE salvar, mesmo se NULL
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
                -- Log detalhado
                RAISE NOTICE 'Requisição % atualizada: status=%, workflow_state=%, observacoes_aprovacao=%', 
                    approval_record.processo_id, 
                    CASE WHEN p_status = 'rejeitado' THEN 'rejeitada' ELSE 'cancelada' END,
                    CASE WHEN p_status = 'rejeitado' THEN 'reprovada' ELSE 'cancelada' END,
                    COALESCE(p_observacoes, 'NULL');
            ELSE
                -- Outros tipos de processo...
                NULL;
        END CASE;
    END IF;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.process_approval IS 
'Processa aprovação unificada. CORRIGIDO: Garante que cancelamento/rejeição atualiza status e salva observações.';

-- 3. Verificar e corrigir requisições que foram canceladas mas não atualizadas
-- (Correção para dados já existentes)
UPDATE compras.requisicoes_compra rc
SET 
    status = 'cancelada'::compras.status_requisicao,
    workflow_state = 'cancelada',
    observacoes_aprovacao = COALESCE(
        (SELECT observacoes FROM public.aprovacoes_unificada au 
         WHERE au.processo_id = rc.id 
         AND au.processo_tipo = 'requisicao_compra'
         AND au.status = 'cancelado'
         ORDER BY au.updated_at DESC LIMIT 1),
        rc.observacoes_aprovacao
    )
WHERE rc.id IN (
    SELECT DISTINCT au.processo_id
    FROM public.aprovacoes_unificada au
    WHERE au.processo_tipo = 'requisicao_compra'
    AND au.status = 'cancelado'
    AND au.processo_id NOT IN (
        SELECT id FROM compras.requisicoes_compra 
        WHERE status = 'cancelada'
    )
);

-- 4. Log de verificação
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM compras.requisicoes_compra
    WHERE status = 'cancelada' OR status = 'rejeitada';
    
    RAISE NOTICE 'Total de requisições canceladas/rejeitadas: %', v_count;
END $$;










