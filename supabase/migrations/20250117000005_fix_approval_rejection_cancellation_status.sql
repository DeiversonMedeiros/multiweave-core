-- =====================================================
-- CORREÇÃO: Status de rejeição e cancelamento com observações
-- Data: 2025-01-17
-- Descrição: 
--   1. Adiciona status 'rejeitada' ao enum status_requisicao
--   2. Atualiza process_approval para salvar observações na requisição
--   3. Diferencia rejeição (permite edição) de cancelamento (não permite)
-- =====================================================

-- =====================================================
-- 1. ADICIONAR STATUS 'rejeitada' AO ENUM
-- =====================================================
-- Adiciona o status 'rejeitada' ao enum se não existir
DO $$ 
BEGIN
    -- Verificar se o valor já existe antes de adicionar
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'rejeitada' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_requisicao')
    ) THEN
        ALTER TYPE compras.status_requisicao ADD VALUE 'rejeitada';
    END IF;
END $$;

-- =====================================================
-- 2. ATUALIZAR FUNÇÃO process_approval
-- =====================================================
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
            -- Atualizar status da entidade baseado no tipo
            CASE approval_record.processo_tipo
                WHEN 'conta_pagar' THEN
                    UPDATE financeiro.contas_pagar
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'requisicao_compra' THEN
                    -- Após aprovação completa, mudar para 'aprovada' e workflow_state para 'em_cotacao'
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada'::compras.status_requisicao,
                        workflow_state = 'em_cotacao',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        observacoes_aprovacao = NULL, -- Limpar observações de rejeição se houver
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                    -- Log para debug
                    RAISE NOTICE 'Requisição % aprovada. Status atualizado para aprovada, workflow_state para em_cotacao', approval_record.processo_id;
                    
                WHEN 'cotacao_compra' THEN
                    UPDATE compras.cotacoes
                    SET status = 'aprovada'::compras.status_cotacao,
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'solicitacao_saida_material' THEN
                    UPDATE public.solicitacoes_saida_materiais
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'solicitacao_transferencia_material' THEN
                    UPDATE almoxarifado.transferencias
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovador_id = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
            END CASE;
        ELSE
            -- Log para debug quando ainda há aprovações pendentes
            RAISE NOTICE 'Ainda há aprovações pendentes. Total: %, Aprovadas: %, Rejeitadas: %', 
                total_approvals, approved_count, rejected_count;
        END IF;
    END IF;
    
    -- Se foi rejeitado ou cancelado, atualizar status da entidade
    IF p_status IN ('rejeitado', 'cancelado') THEN
        CASE approval_record.processo_tipo
            WHEN 'conta_pagar' THEN
                UPDATE financeiro.contas_pagar
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'requisicao_compra' THEN
                -- Rejeição: status 'rejeitada' (permite edição e reenvio)
                -- Cancelamento: status 'cancelada' (não permite edição)
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
                    observacoes_aprovacao = COALESCE(p_observacoes, observacoes_aprovacao),
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
                -- Log para debug
                RAISE NOTICE 'Requisição % % com observações: %', 
                    approval_record.processo_id, 
                    CASE WHEN p_status = 'rejeitado' THEN 'rejeitada' ELSE 'cancelada' END,
                    COALESCE(p_observacoes, 'sem observações');
                
            WHEN 'cotacao_compra' THEN
                UPDATE compras.cotacoes
                SET status = 'rejeitada'::compras.status_cotacao,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'solicitacao_saida_material' THEN
                UPDATE public.solicitacoes_saida_materiais
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'solicitacao_transferencia_material' THEN
                UPDATE almoxarifado.transferencias
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
        END CASE;
    END IF;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.process_approval IS 
'Processa aprovação unificada. Para requisições: 
- Aprovado: status = aprovada, workflow_state = em_cotacao
- Rejeitado: status = rejeitada (permite edição), workflow_state = reprovada, salva observações
- Cancelado: status = cancelada (não permite edição), workflow_state = cancelada, salva observações';

-- =====================================================
-- 3. ATUALIZAR TRIGGER record_edit_and_reset_approvals
-- =====================================================
-- Garantir que requisições rejeitadas possam ser editadas
-- (não resetar aprovações quando status for 'rejeitada')
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
    campos_ignorados TEXT[] := ARRAY['updated_at', 'created_at', 'aprovado_por', 'data_aprovacao', 'observacoes_aprovacao'];
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
            to_jsonb(campos_alterados),
            valores_anteriores,
            valores_novos
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Resetar aprovações se a solicitação não estiver cancelada/rejeitada
    -- Verificar status baseado no tipo de processo
    CASE processo_tipo
        WHEN 'requisicao_compra' THEN
            SELECT status::text INTO entity_status
            FROM compras.requisicoes_compra
            WHERE id = processo_id;
            -- Não resetar se estiver cancelada (mas permitir reset se estiver rejeitada para reenvio)
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
'Registra edições e reseta aprovações quando há mudanças significativas. 
Requisições rejeitadas podem ser editadas e reenviadas (resetam aprovações).
Requisições canceladas não podem ser editadas (não resetam aprovações).';

