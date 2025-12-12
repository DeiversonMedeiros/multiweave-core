-- =====================================================
-- CORREÇÃO: Resetar status de requisições rejeitadas ao editar
-- Data: 2025-01-17
-- Descrição: Quando uma requisição rejeitada é editada, o status
--            deve ser resetado para "pendente_aprovacao" e as
--            aprovações devem ser recriadas
-- =====================================================

-- =====================================================
-- FUNÇÃO ATUALIZADA: reset_approvals_after_edit
-- =====================================================
-- Esta versão também reseta o status da requisição quando ela está rejeitada
CREATE OR REPLACE FUNCTION public.reset_approvals_after_edit(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
    v_workflow_state TEXT;
BEGIN
    -- Se for requisição de compra, verificar e resetar status se estiver rejeitada/cancelada
    IF p_processo_tipo = 'requisicao_compra' THEN
        -- Verificar status atual e workflow_state
        SELECT status::text, COALESCE(workflow_state::text, '') 
        INTO v_current_status, v_workflow_state
        FROM compras.requisicoes_compra
        WHERE id = p_processo_id;
        
        -- Se estiver cancelada, rejeitada, ou workflow_state for reprovada, resetar para pendente_aprovacao
        -- Também resetar se o status não for um dos estados válidos de aprovação
        IF v_current_status IN ('cancelada', 'rejeitada') OR 
           v_current_status = 'reprovada' OR
           v_workflow_state = 'reprovada' OR
           (v_current_status NOT IN ('rascunho', 'pendente_aprovacao', 'aprovada', 'em_cotacao', 'cotada', 'em_pedido', 'finalizada') 
            AND v_current_status IS NOT NULL 
            AND v_current_status != '') THEN
            UPDATE compras.requisicoes_compra
            SET status = 'pendente_aprovacao',
                workflow_state = 'pendente_aprovacao',
                aprovado_por = NULL,
                data_aprovacao = NULL,
                observacoes_aprovacao = NULL,
                updated_at = NOW()
            WHERE id = p_processo_id;
        END IF;
    END IF;
    
    -- Limpar aprovações existentes
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id;
    
    -- Criar novas aprovações
    PERFORM public.create_approvals_for_process(p_processo_tipo, p_processo_id, p_company_id);
    
    -- Marcar como resetado no histórico
    UPDATE public.historico_edicoes_solicitacoes
    SET aprovacoes_resetadas = true,
        data_reset = NOW()
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id
    AND aprovacoes_resetadas = false;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.reset_approvals_after_edit IS 
'Reseta aprovações após edição e também reseta o status de requisições rejeitadas para pendente_aprovacao.';

-- =====================================================
-- TRIGGER ATUALIZADO: record_edit_and_reset_approvals
-- =====================================================
-- Garantir que requisições rejeitadas possam ser editadas e resetadas
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
    campos_ignorados TEXT[] := ARRAY['updated_at', 'created_at', 'aprovado_por', 'data_aprovacao'];
    v_usuario_editor_id UUID;
    v_app_user_id TEXT;
    entity_status TEXT;
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
        -- Cotacoes não tem company_id diretamente, buscar via requisição
        SELECT rc.company_id INTO company_id
        FROM compras.requisicoes_compra rc
        WHERE rc.id = COALESCE(NEW.requisicao_id, OLD.requisicao_id);
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
    -- Comparar campos relevantes individualmente (evita row expansion)
    FOR campo IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND table_schema = TG_TABLE_SCHEMA
        AND column_name != ALL(campos_ignorados)
        ORDER BY ordinal_position
    LOOP
        BEGIN
            -- Obter valores usando EXECUTE format para evitar row expansion
            EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_anterior USING OLD;
            EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_novo USING NEW;
            
            -- Se os valores são diferentes
            IF valor_anterior IS DISTINCT FROM valor_novo THEN
                campos_alterados := array_append(campos_alterados, campo);
                valores_anteriores := valores_anteriores || jsonb_build_object(campo, COALESCE(valor_anterior, 'NULL'));
                valores_novos := valores_novos || jsonb_build_object(campo, COALESCE(valor_novo, 'NULL'));
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Se houver erro ao acessar o campo (ex: tipo não suportado), ignorar
                CONTINUE;
        END;
    END LOOP;

    -- Se não houve mudanças significativas, não fazer nada
    IF array_length(campos_alterados, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Registrar a edição no histórico
    -- Obter usuario_editor_id com fallback seguro
    -- Tentar obter o ID do usuário em ordem de prioridade:
    -- 1. NEW.updated_by (se a tabela tiver esse campo)
    -- 2. NEW.created_by (se a tabela tiver esse campo)
    -- 3. app.current_user_id (se estiver definido)
    -- 4. auth.uid() como último recurso
    
    BEGIN
        -- Tentar obter updated_by ou created_by usando EXECUTE format
        BEGIN
            EXECUTE format('SELECT ($1).%I', 'updated_by') INTO v_usuario_editor_id USING NEW;
        EXCEPTION
            WHEN OTHERS THEN
                BEGIN
                    EXECUTE format('SELECT ($1).%I', 'created_by') INTO v_usuario_editor_id USING NEW;
                EXCEPTION
                    WHEN OTHERS THEN
                        v_usuario_editor_id := NULL;
                END;
        END;
    EXCEPTION
        WHEN OTHERS THEN
            v_usuario_editor_id := NULL;
    END;
    
    -- Se ainda não tem, tentar app.current_user_id
    IF v_usuario_editor_id IS NULL THEN
        BEGIN
            v_app_user_id := current_setting('app.current_user_id', true);
            IF v_app_user_id IS NOT NULL AND v_app_user_id != '' THEN
                v_usuario_editor_id := v_app_user_id::uuid;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_usuario_editor_id := NULL;
        END;
    END IF;
    
    -- Se ainda não tem, tentar auth.uid() como último recurso
    IF v_usuario_editor_id IS NULL THEN
        BEGIN
            v_usuario_editor_id := auth.uid();
        EXCEPTION
            WHEN OTHERS THEN
                v_usuario_editor_id := NULL;
        END;
    END IF;
    
    -- Se ainda não tem usuario_editor_id, não inserir no histórico
    -- (evita erro de constraint NOT NULL)
    IF v_usuario_editor_id IS NULL THEN
        RAISE WARNING 'Não foi possível determinar usuario_editor_id para histórico de edição. Processo: %, ID: %', processo_tipo, processo_id;
    ELSE
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
            v_usuario_editor_id,
            NOW(),
            to_jsonb(campos_alterados), -- Converter array para JSONB
            valores_anteriores,
            valores_novos
        )
        ON CONFLICT DO NOTHING; -- Evitar duplicatas
    END IF;

    -- Resetar aprovações e status se necessário
    -- Para requisições de compra, sempre resetar se não estiver cancelada
    CASE processo_tipo
        WHEN 'requisicao_compra' THEN
            SELECT status::text INTO entity_status
            FROM compras.requisicoes_compra
            WHERE id = processo_id;
            -- Resetar aprovações e status se não estiver cancelada
            -- (inclui rejeitadas, que serão resetadas para pendente_aprovacao)
            IF entity_status != 'cancelada' THEN
                PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
            END IF;
        WHEN 'cotacao_compra' THEN
            SELECT status::text INTO entity_status
            FROM compras.cotacoes
            WHERE id = processo_id;
            -- Não resetar se estiver rejeitada
            IF entity_status != 'rejeitada' THEN
                PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
            END IF;
        ELSE
            -- Para outros tipos, verificar se status não é cancelado
            IF COALESCE(NEW.status::text, '') != 'cancelado' THEN
                PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
            END IF;
    END CASE;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_edit_and_reset_approvals IS 
'Registra edições e reseta aprovações quando há mudanças significativas. Para requisições rejeitadas, reseta o status para pendente_aprovacao. Evita row expansion usando comparação campo por campo.';

