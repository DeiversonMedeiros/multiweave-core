-- =====================================================
-- ADICIONAR COMBUSTÍVEL AO SISTEMA DE APROVAÇÕES
-- Sistema ERP MultiWeave Core
-- =====================================================

-- 1. Adicionar 'combustivel' ao CHECK constraint da tabela configuracoes_aprovacao_unificada
-- =====================================================

-- Primeiro, remover o constraint antigo
ALTER TABLE public.configuracoes_aprovacao_unificada 
DROP CONSTRAINT IF EXISTS configuracoes_aprovacao_unificada_processo_tipo_check;

-- Adicionar novo constraint com 'combustivel' incluído
ALTER TABLE public.configuracoes_aprovacao_unificada 
ADD CONSTRAINT configuracoes_aprovacao_unificada_processo_tipo_check 
CHECK (processo_tipo IN (
    'conta_pagar', 
    'requisicao_compra', 
    'cotacao_compra', 
    'solicitacao_saida_material', 
    'solicitacao_transferencia_material',
    'logistica',
    'combustivel'
));

-- 2. Criar trigger para criar aprovações automaticamente quando solicitação de combustível é criada
-- =====================================================

CREATE OR REPLACE FUNCTION combustivel.create_approvals_for_refuel_request()
RETURNS TRIGGER AS $$
DECLARE
    v_approval_configs RECORD;
    v_approver RECORD;
    v_approval_id UUID;
    v_config_count INTEGER := 0;
    v_approval_count INTEGER := 0;
BEGIN
    -- Log inicial
    RAISE NOTICE '[COMBUSTIVEL] create_approvals_for_refuel_request - Iniciando para request_id: %, status: %', NEW.id, NEW.status;
    
    -- Só criar aprovações se o status for 'pendente'
    IF NEW.status != 'pendente' THEN
        RAISE NOTICE '[COMBUSTIVEL] Status não é pendente (%), pulando criação de aprovações', NEW.status;
        RETURN NEW;
    END IF;

    RAISE NOTICE '[COMBUSTIVEL] Buscando configurações de aprovação para company_id: %, processo_tipo: combustivel', NEW.company_id;

    -- Buscar configurações de aprovação para combustível
    FOR v_approval_configs IN
        SELECT *
        FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = NEW.company_id
        AND processo_tipo = 'combustivel'
        AND ativo = true
        AND (
            -- Sem critérios específicos (aplica a todos)
            (centro_custo_id IS NULL AND (classe_financeiras IS NULL OR array_length(classe_financeiras, 1) IS NULL) AND usuario_id IS NULL AND valor_limite IS NULL)
            OR
            -- Critérios específicos
            (centro_custo_id IS NULL OR centro_custo_id = NEW.centro_custo_id)
            AND (usuario_id IS NULL OR usuario_id = NEW.solicitado_por)
            AND (valor_limite IS NULL OR COALESCE(NEW.valor_solicitado, 0) <= valor_limite)
        )
        ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
    LOOP
        v_config_count := v_config_count + 1;
        RAISE NOTICE '[COMBUSTIVEL] Configuração encontrada: id=%, nivel_aprovacao=%, aprovadores_count=%', 
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
                    'combustivel',
                    NEW.id,
                    v_approval_configs.nivel_aprovacao,
                    (v_approver->>'user_id')::UUID,
                    'pendente',
                    NOW()
                ) RETURNING id INTO v_approval_id;
                
                v_approval_count := v_approval_count + 1;
                RAISE NOTICE '[COMBUSTIVEL] Aprovação criada: id=%, aprovador_id=%', 
                    v_approval_id, 
                    (v_approver->>'user_id')::UUID;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '[COMBUSTIVEL] Erro ao criar aprovação: %', SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE '[COMBUSTIVEL] Finalizado: % configurações processadas, % aprovações criadas', v_config_count, v_approval_count;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_create_approvals_refuel_request ON combustivel.refuel_requests;
CREATE TRIGGER trigger_create_approvals_refuel_request
    AFTER INSERT ON combustivel.refuel_requests
    FOR EACH ROW
    WHEN (NEW.status = 'pendente')
    EXECUTE FUNCTION combustivel.create_approvals_for_refuel_request();

-- 3. Função para atualizar status da solicitação quando aprovação é processada
-- =====================================================

CREATE OR REPLACE FUNCTION combustivel.update_request_status_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_request_id UUID;
    v_all_approved BOOLEAN;
BEGIN
    -- Só processar se for aprovação de combustível
    IF NEW.processo_tipo != 'combustivel' OR OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_request_id := NEW.processo_id;

    -- Verificar se todas as aprovações foram concluídas
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.aprovacoes_unificada
        WHERE processo_tipo = 'combustivel'
        AND processo_id = v_request_id
        AND status = 'pendente'
    ) INTO v_all_approved;

    -- Se todas aprovações foram concluídas e pelo menos uma foi aprovada
    IF v_all_approved AND NEW.status = 'aprovado' THEN
        UPDATE combustivel.refuel_requests
        SET status = 'aprovada',
            aprovado_por = NEW.aprovador_id,
            aprovado_em = NOW(),
            updated_at = NOW()
        WHERE id = v_request_id
        AND status = 'pendente';
    ELSIF NEW.status = 'rejeitado' THEN
        -- Se foi rejeitado, atualizar status da solicitação
        UPDATE combustivel.refuel_requests
        SET status = 'reprovada',
            observacoes_aprovacao = COALESCE(NEW.observacoes, 'Solicitação rejeitada'),
            updated_at = NOW()
        WHERE id = v_request_id
        AND status = 'pendente';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar status quando aprovação é processada
DROP TRIGGER IF EXISTS trigger_update_refuel_request_status ON public.aprovacoes_unificada;
CREATE TRIGGER trigger_update_refuel_request_status
    AFTER UPDATE OF status ON public.aprovacoes_unificada
    FOR EACH ROW
    WHEN (NEW.processo_tipo = 'combustivel' AND OLD.status != NEW.status)
    EXECUTE FUNCTION combustivel.update_request_status_on_approval();

-- 4. Comentários
-- =====================================================

COMMENT ON FUNCTION combustivel.create_approvals_for_refuel_request() IS 'Cria aprovações automaticamente quando uma solicitação de combustível é criada';
COMMENT ON FUNCTION combustivel.update_request_status_on_approval() IS 'Atualiza status da solicitação de combustível quando aprovações são processadas';

