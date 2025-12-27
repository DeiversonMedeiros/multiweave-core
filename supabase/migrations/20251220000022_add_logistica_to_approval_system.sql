-- =====================================================
-- ADICIONAR LOGÍSTICA AO SISTEMA DE APROVAÇÕES
-- Sistema ERP MultiWeave Core
-- =====================================================

-- 1. Adicionar 'logistica' ao CHECK constraint da tabela configuracoes_aprovacao_unificada
-- =====================================================

-- Primeiro, remover o constraint antigo
ALTER TABLE public.configuracoes_aprovacao_unificada 
DROP CONSTRAINT IF EXISTS configuracoes_aprovacao_unificada_processo_tipo_check;

-- Adicionar novo constraint com 'logistica' incluído
ALTER TABLE public.configuracoes_aprovacao_unificada 
ADD CONSTRAINT configuracoes_aprovacao_unificada_processo_tipo_check 
CHECK (processo_tipo IN (
    'conta_pagar', 
    'requisicao_compra', 
    'cotacao_compra', 
    'solicitacao_saida_material', 
    'solicitacao_transferencia_material',
    'logistica'
));

-- 2. Criar trigger para criar aprovações automaticamente quando solicitação de logística é criada
-- =====================================================

CREATE OR REPLACE FUNCTION logistica.create_approvals_for_logistics_request()
RETURNS TRIGGER AS $$
DECLARE
    v_approval_configs RECORD;
    v_approver RECORD;
    v_approval_id UUID;
    v_config_count INTEGER := 0;
    v_approval_count INTEGER := 0;
BEGIN
    -- Log inicial
    RAISE NOTICE '[LOGISTICA] create_approvals_for_logistics_request - Iniciando para request_id: %, status: %', NEW.id, NEW.status;
    
    -- Só criar aprovações se o status for 'pendente'
    IF NEW.status != 'pendente' THEN
        RAISE NOTICE '[LOGISTICA] Status não é pendente (%), pulando criação de aprovações', NEW.status;
        RETURN NEW;
    END IF;

    RAISE NOTICE '[LOGISTICA] Buscando configurações de aprovação para company_id: %, processo_tipo: logistica', NEW.company_id;

    -- Buscar configurações de aprovação para logística
    FOR v_approval_configs IN
        SELECT *
        FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = NEW.company_id
        AND processo_tipo = 'logistica'
        AND ativo = true
        AND (
            -- Sem critérios específicos (aplica a todos)
            (centro_custo_id IS NULL AND (classe_financeiras IS NULL OR array_length(classe_financeiras, 1) IS NULL) AND usuario_id IS NULL AND valor_limite IS NULL)
            OR
            -- Critérios específicos
            (centro_custo_id IS NULL OR centro_custo_id = NEW.cost_center_id)
            AND (usuario_id IS NULL OR usuario_id = NEW.solicitado_por)
            AND (valor_limite IS NULL OR COALESCE(NEW.km_estimado, 0) <= valor_limite)
        )
        ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
    LOOP
        v_config_count := v_config_count + 1;
        RAISE NOTICE '[LOGISTICA] Configuração encontrada: id=%, nivel_aprovacao=%, aprovadores_count=%', 
            v_approval_configs.id, 
            v_approval_configs.nivel_aprovacao,
            jsonb_array_length(v_approval_configs.aprovadores);
        
        -- Criar aprovação para cada aprovador
        FOR v_approver IN
            SELECT * FROM jsonb_array_elements(v_approval_configs.aprovadores) AS approver
        LOOP
            BEGIN
                INSERT INTO public.aprovacoes_unificada (
                    company_id,
                    processo_tipo,
                    processo_id,
                    nivel_aprovacao,
                    aprovador_id,
                    status,
                    created_at
                ) VALUES (
                    NEW.company_id,
                    'logistica',
                    NEW.id,
                    v_approval_configs.nivel_aprovacao,
                    (v_approver->>'user_id')::UUID,
                    'pendente',
                    NOW()
                ) RETURNING id INTO v_approval_id;
                
                v_approval_count := v_approval_count + 1;
                RAISE NOTICE '[LOGISTICA] Aprovação criada: id=%, aprovador_id=%', 
                    v_approval_id, 
                    (v_approver->>'user_id')::UUID;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '[LOGISTICA] Erro ao criar aprovação: %', SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE '[LOGISTICA] Finalizado: % configurações processadas, % aprovações criadas', v_config_count, v_approval_count;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_create_approvals_logistics_request ON logistica.logistics_requests;
CREATE TRIGGER trigger_create_approvals_logistics_request
    AFTER INSERT ON logistica.logistics_requests
    FOR EACH ROW
    WHEN (NEW.status = 'pendente')
    EXECUTE FUNCTION logistica.create_approvals_for_logistics_request();

-- 3. Atualizar função process_approval para incluir logística
-- =====================================================

-- A função process_approval já existe e deve funcionar, mas vamos verificar se precisa de ajustes
-- Ela já trata diferentes processo_tipo, então só precisamos garantir que 'logistica' seja tratado

-- Função auxiliar para atualizar status da solicitação de logística após aprovação
CREATE OR REPLACE FUNCTION logistica.update_request_status_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_request_id UUID;
    v_all_approved BOOLEAN;
BEGIN
    -- Só processar se for aprovação de logística
    IF NEW.processo_tipo != 'logistica' OR OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_request_id := NEW.processo_id;

    -- Verificar se todas as aprovações foram concluídas
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = 'logistica'
        AND processo_id = v_request_id
        AND status = 'pendente'
    ) INTO v_all_approved;

    -- Se todas aprovações foram concluídas e pelo menos uma foi aprovada
    IF v_all_approved AND NEW.status = 'aprovado' THEN
        UPDATE logistica.logistics_requests
        SET status = 'aprovado',
            updated_at = NOW()
        WHERE id = v_request_id
        AND status = 'pendente';
    ELSIF NEW.status = 'rejeitado' THEN
        -- Se foi rejeitado, atualizar status da solicitação
        UPDATE logistica.logistics_requests
        SET status = 'rejeitado',
            updated_at = NOW()
        WHERE id = v_request_id
        AND status = 'pendente';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar status quando aprovação é processada
DROP TRIGGER IF EXISTS trigger_update_logistics_request_status ON public.aprovacoes_unificada;
CREATE TRIGGER trigger_update_logistics_request_status
    AFTER UPDATE OF status ON public.aprovacoes_unificada
    FOR EACH ROW
    WHEN (NEW.processo_tipo = 'logistica' AND OLD.status != NEW.status)
    EXECUTE FUNCTION logistica.update_request_status_on_approval();

-- 4. Comentários
-- =====================================================

COMMENT ON FUNCTION logistica.create_approvals_for_logistics_request() IS 'Cria aprovações automaticamente quando uma solicitação de logística é criada';
COMMENT ON FUNCTION logistica.update_request_status_on_approval() IS 'Atualiza status da solicitação de logística quando aprovações são processadas';

