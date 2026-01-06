-- =====================================================
-- CORREÇÃO: Triggers de aprovação - Buscar company_id da requisição para cotações
-- Data: 2025-01-31
-- Descrição: A tabela compras.cotacoes não tem company_id diretamente,
--            mas está relacionada a compras.requisicoes_compra que tem.
--            Esta correção faz as funções de trigger buscarem o company_id
--            da requisição relacionada quando for uma cotação.
-- =====================================================

-- 1. CORRIGIR FUNÇÃO record_edit_and_reset_approvals
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_edit_and_reset_approvals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo VARCHAR(50);
    processo_id UUID;
    company_id UUID;
    campos_alterados TEXT[] := '{}';
    valores_anteriores JSONB := '{}';
    valores_novos JSONB := '{}';
    campo TEXT;
    valor_anterior TEXT;
    valor_novo TEXT;
BEGIN
    -- Determinar o tipo de processo baseado na tabela
    IF TG_TABLE_NAME = 'contas_pagar' THEN
        processo_tipo := 'conta_pagar';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'requisicoes_compra' THEN
        processo_tipo := 'requisicao_compra';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'cotacoes' THEN
        processo_tipo := 'cotacao_compra';
        processo_id := COALESCE(NEW.id, OLD.id);
        -- Buscar company_id da requisição relacionada
        SELECT r.company_id INTO company_id
        FROM compras.requisicoes_compra r
        WHERE r.id = COALESCE(NEW.requisicao_id, OLD.requisicao_id);
    ELSIF TG_TABLE_NAME = 'solicitacoes_saida_materiais' THEN
        processo_tipo := 'solicitacao_saida_material';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'transferencias' THEN
        processo_tipo := 'solicitacao_transferencia_material';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Se for INSERT, não há edição para registrar
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Se for DELETE, não resetar aprovações
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- Verificar se houve mudanças significativas
    -- Campos que não devem triggerar reset
    DECLARE
        campos_ignorados TEXT[] := ARRAY['updated_at', 'created_at', 'aprovado_por', 'data_aprovacao', 'status'];
    BEGIN
        -- Comparar campos relevantes
        FOR campo IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = TG_TABLE_NAME 
            AND table_schema = TG_TABLE_SCHEMA
            AND column_name != ALL(campos_ignorados)
        LOOP
            -- Obter valores
            EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_anterior USING OLD;
            EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_novo USING NEW;
            
            -- Se os valores são diferentes
            IF valor_anterior IS DISTINCT FROM valor_novo THEN
                campos_alterados := array_append(campos_alterados, campo);
                valores_anteriores := valores_anteriores || jsonb_build_object(campo, valor_anterior);
                valores_novos := valores_novos || jsonb_build_object(campo, valor_novo);
            END IF;
        END LOOP;
    END;

    -- Se não houve mudanças significativas, não fazer nada
    IF array_length(campos_alterados, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Registrar a edição no histórico
    INSERT INTO public.historico_edicoes_solicitacoes (
        company_id,
        processo_tipo,
        processo_id,
        usuario_editor_id,
        data_edicao,
        campos_alterados,
        valores_anteriores,
        valores_novos
    ) VALUES (
        company_id,
        processo_tipo,
        processo_id,
        COALESCE(NEW.updated_by, NEW.created_by, (SELECT current_setting('app.current_user_id', true)::uuid)),
        NOW(),
        campos_alterados,
        valores_anteriores,
        valores_novos
    );

    -- Resetar aprovações se a solicitação não estiver cancelada
    IF COALESCE(NEW.status, '') != 'cancelado' THEN
        PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
    END IF;

    RETURN NEW;
END;
$$;

-- 2. CORRIGIR FUNÇÃO create_approvals_on_insert
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_approvals_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo VARCHAR(50);
    company_id UUID;
BEGIN
    -- Determinar o tipo de processo baseado na tabela
    IF TG_TABLE_NAME = 'contas_pagar' THEN
        processo_tipo := 'conta_pagar';
        company_id := NEW.company_id;
    ELSIF TG_TABLE_NAME = 'requisicoes_compra' THEN
        processo_tipo := 'requisicao_compra';
        company_id := NEW.company_id;
    ELSIF TG_TABLE_NAME = 'cotacoes' THEN
        processo_tipo := 'cotacao_compra';
        -- Buscar company_id da requisição relacionada
        SELECT r.company_id INTO company_id
        FROM compras.requisicoes_compra r
        WHERE r.id = NEW.requisicao_id;
    ELSIF TG_TABLE_NAME = 'solicitacoes_saida_materiais' THEN
        processo_tipo := 'solicitacao_saida_material';
        company_id := NEW.company_id;
    ELSIF TG_TABLE_NAME = 'transferencias' THEN
        processo_tipo := 'solicitacao_transferencia_material';
        company_id := NEW.company_id;
    ELSE
        RETURN NEW;
    END IF;

    -- Criar aprovações automáticas apenas se company_id foi encontrado
    IF company_id IS NOT NULL THEN
        PERFORM public.create_approvals_for_process(processo_tipo, NEW.id, company_id);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_edit_and_reset_approvals() IS 
'Registra edições e reseta aprovações. Para cotações, busca o company_id da requisição relacionada.';

COMMENT ON FUNCTION public.create_approvals_on_insert() IS 
'Cria aprovações automáticas em novas solicitações. Para cotações, busca o company_id da requisição relacionada.';

