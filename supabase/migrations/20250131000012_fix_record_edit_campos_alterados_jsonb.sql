-- =====================================================
-- CORREÇÃO: record_edit_and_reset_approvals - cast de campos_alterados para JSONB
-- Data: 2025-01-31
-- Erro: column "campos_alterados" is of type jsonb but expression is of type text[]
-- Descrição: A função está tentando inserir um TEXT[] no campo campos_alterados que é JSONB
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
    v_usuario_editor_id UUID;
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
    -- CORREÇÃO: Converter campos_alterados (TEXT[]) para JSONB usando to_jsonb()
    -- CORREÇÃO: Obter usuario_editor_id de forma segura, usando app.current_user_id como fallback
    DECLARE
        v_usuario_editor_id UUID;
    BEGIN
        -- Tentar obter updated_by ou created_by de forma segura
        BEGIN
            EXECUTE format('SELECT ($1).%I', 'updated_by') INTO v_usuario_editor_id USING NEW;
        EXCEPTION WHEN OTHERS THEN
            v_usuario_editor_id := NULL;
        END;
        
        IF v_usuario_editor_id IS NULL THEN
            BEGIN
                EXECUTE format('SELECT ($1).%I', 'created_by') INTO v_usuario_editor_id USING NEW;
            EXCEPTION WHEN OTHERS THEN
                v_usuario_editor_id := NULL;
            END;
        END IF;
        
        -- Se ainda não encontrou, usar app.current_user_id
        -- IMPORTANTE: process_approval define app.current_user_id antes do UPDATE usando set_config
        IF v_usuario_editor_id IS NULL THEN
            BEGIN
                -- Tentar obter app.current_user_id (definido por process_approval)
                -- Primeiro com missing_ok=true (não lança erro se não existir)
                DECLARE
                    v_config_value TEXT;
                BEGIN
                    -- Tentar obter o valor da configuração
                    v_config_value := current_setting('app.current_user_id', true);
                    
                    -- Converter para UUID se não for NULL ou vazio
                    IF v_config_value IS NOT NULL AND v_config_value != '' THEN
                        v_usuario_editor_id := v_config_value::uuid;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Se falhar, tentar sem missing_ok (pode lançar erro)
                    BEGIN
                        v_config_value := current_setting('app.current_user_id');
                        IF v_config_value IS NOT NULL AND v_config_value != '' THEN
                            v_usuario_editor_id := v_config_value::uuid;
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        v_usuario_editor_id := NULL;
                    END;
                END;
            EXCEPTION WHEN OTHERS THEN
                v_usuario_editor_id := NULL;
            END;
        END IF;
        
        -- Se ainda não encontrou, não inserir no histórico (pular registro)
        -- Isso evita o erro de NOT NULL constraint, mas também não registra a edição
        IF v_usuario_editor_id IS NULL THEN
            RAISE WARNING '[record_edit_and_reset_approvals] usuario_editor_id é NULL, pulando registro do histórico. app.current_user_id deve ser definido antes do UPDATE.';
            -- Retornar sem inserir no histórico (mas ainda pode resetar aprovações se necessário)
            -- Não fazemos RETURN aqui porque ainda precisamos verificar se deve resetar aprovações
        ELSE
            -- Só inserir se tivermos usuario_editor_id válido
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
                to_jsonb(campos_alterados), -- CAST: TEXT[] -> JSONB
                valores_anteriores,
                valores_novos
            );
        END IF;
    END; -- Fecha o bloco BEGIN da linha 99

    -- Resetar aprovações se a solicitação não estiver cancelada
    -- IMPORTANTE: Não resetar quando apenas status, aprovado_por ou data_aprovacao mudam
    -- (já que esses campos estão na lista de campos_ignorados acima)
    -- CORREÇÃO: Converter enum para TEXT antes de usar COALESCE para evitar erro de enum
    IF COALESCE(NEW.status::TEXT, '') != 'cancelado' AND COALESCE(NEW.status::TEXT, '') != 'cancelada' THEN
        PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_edit_and_reset_approvals() IS 
'Registra edições e reseta aprovações quando necessário. CORRIGIDO: campos_alterados (TEXT[]) é convertido para JSONB usando to_jsonb().';

