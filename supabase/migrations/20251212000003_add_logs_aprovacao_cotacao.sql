-- =====================================================
-- MIGRAÇÃO: Adicionar logs para rastrear criação de cotação após aprovação
-- Data: 2025-12-12
-- Descrição:
--   - Adiciona logs detalhados na função process_approval quando aprova requisição de compra
--   - Adiciona logs detalhados na função criar_cotacao_automatica para rastrear criação da cotação
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO process_approval COM LOGS
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
    entity_company_id UUID;
    v_requisicao_id UUID;
    v_requisicao_numero VARCHAR(50);
    v_requisicao_status_atual compras.status_requisicao;
    v_requisicao_data_necessidade DATE;
    v_requisicao_data_solicitacao DATE;
BEGIN
    RAISE NOTICE '[process_approval] INÍCIO - Parâmetros: aprovacao_id=%, status=%, aprovador_id=%', 
        p_aprovacao_id, p_status, p_aprovador_id;
    
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RAISE NOTICE '[process_approval] AVISO: Aprovação não encontrada ou não está pendente. aprovacao_id=%', p_aprovacao_id;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE '[process_approval] Aprovação encontrada: processo_tipo=%, processo_id=%, company_id=%', 
        approval_record.processo_tipo, approval_record.processo_id, approval_record.company_id;
    
    -- Atualizar status da aprovação
    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    RAISE NOTICE '[process_approval] Status da aprovação atualizado para: %', p_status;
    
    -- Se foi aprovado, verificar se todas as aprovações foram concluídas
    IF p_status = 'aprovado' THEN
        -- Verificar se todas as aprovações foram aprovadas
        SELECT NOT EXISTS(
            SELECT 1 FROM public.aprovacoes_unificada
            WHERE processo_tipo = approval_record.processo_tipo
            AND processo_id = approval_record.processo_id
            AND company_id = approval_record.company_id
            AND status = 'pendente'
        ) INTO all_approved;
        
        RAISE NOTICE '[process_approval] Verificação de aprovações completas: all_approved=%, processo_tipo=%', 
            all_approved, approval_record.processo_tipo;
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            RAISE NOTICE '[process_approval] ✅ Todas as aprovações foram concluídas! Atualizando status da entidade...';
            
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
                    -- Obter informações da requisição para logs ANTES do UPDATE
                    SELECT 
                        id, 
                        numero_requisicao,
                        status,
                        data_necessidade,
                        data_solicitacao
                    INTO 
                        v_requisicao_id, 
                        v_requisicao_numero,
                        v_requisicao_status_atual,
                        v_requisicao_data_necessidade,
                        v_requisicao_data_solicitacao
                    FROM compras.requisicoes_compra
                    WHERE id = approval_record.processo_id;
                    
                    RAISE NOTICE '[process_approval] 🛒 REQUISIÇÃO DE COMPRA: Dados ANTES do UPDATE';
                    RAISE NOTICE '[process_approval] 🛒 requisicao_id=%, numero_requisicao=%', 
                        v_requisicao_id, v_requisicao_numero;
                    RAISE NOTICE '[process_approval] 🛒 status_atual=%, status_novo=''aprovada''', 
                        v_requisicao_status_atual;
                    RAISE NOTICE '[process_approval] 🛒 data_necessidade=%, data_solicitacao=%', 
                        v_requisicao_data_necessidade, v_requisicao_data_solicitacao;
                    RAISE NOTICE '[process_approval] 🛒 Verificando constraint: data_necessidade IS NULL? %, status=''rascunho''? %, data_necessidade >= data_solicitacao? %', 
                        v_requisicao_data_necessidade IS NULL,
                        v_requisicao_status_atual = 'rascunho'::compras.status_requisicao,
                        CASE WHEN v_requisicao_data_necessidade IS NOT NULL THEN v_requisicao_data_necessidade >= v_requisicao_data_solicitacao ELSE NULL END;
                    
                    -- CORREÇÃO: Se data_necessidade está no passado em relação a data_solicitacao,
                    -- ajustar para data_solicitacao para evitar violação de constraint
                    IF v_requisicao_data_necessidade IS NOT NULL 
                       AND v_requisicao_data_solicitacao IS NOT NULL
                       AND v_requisicao_data_necessidade < v_requisicao_data_solicitacao THEN
                        RAISE NOTICE '[process_approval] 🛒 ⚠️ AVISO: data_necessidade (%) está no passado em relação a data_solicitacao (%). Ajustando para data_solicitacao...', 
                            v_requisicao_data_necessidade, v_requisicao_data_solicitacao;
                        v_requisicao_data_necessidade := v_requisicao_data_solicitacao;
                    END IF;
                    
                    -- status_requisicao usa 'aprovada' (feminino)
                    -- workflow_state deve ir direto para 'em_cotacao' após aprovação completa
                    -- conforme regra de negócio: após aprovação, vai para cotação
                    RAISE NOTICE '[process_approval] 🛒 Executando UPDATE: SET status=''aprovada'', workflow_state=''em_cotacao'', data_necessidade=%...', 
                        v_requisicao_data_necessidade;
                    
                    BEGIN
                        UPDATE compras.requisicoes_compra
                        SET status = 'aprovada'::compras.status_requisicao,
                            workflow_state = 'em_cotacao',
                            data_necessidade = v_requisicao_data_necessidade,
                            data_aprovacao = NOW(),
                            aprovado_por = p_aprovador_id,
                            updated_at = NOW()
                        WHERE id = approval_record.processo_id;
                        
                        RAISE NOTICE '[process_approval] ✅ Requisição atualizada com sucesso! Status=''aprovada'', workflow_state=''em_cotacao''. O trigger trigger_criar_cotacao_automatica será executado.';
                        RAISE NOTICE '[process_approval] 📋 Aguardando execução do trigger para criar cotação automaticamente...';
                    EXCEPTION
                        WHEN check_violation THEN
                            RAISE NOTICE '[process_approval] ❌ ERRO DE CONSTRAINT! Violação de check constraint requisicoes_compra_check';
                            RAISE NOTICE '[process_approval] ❌ Dados que causaram o erro:';
                            RAISE NOTICE '[process_approval] ❌   - data_necessidade: %', v_requisicao_data_necessidade;
                            RAISE NOTICE '[process_approval] ❌   - data_solicitacao: %', v_requisicao_data_solicitacao;
                            RAISE NOTICE '[process_approval] ❌   - status atual: %', v_requisicao_status_atual;
                            RAISE NOTICE '[process_approval] ❌   - status novo: aprovada';
                            RAISE NOTICE '[process_approval] ❌   - Constraint permite NULL? SIM (deveria passar)';
                            RAISE;
                    END;
                    
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
            RAISE NOTICE '[process_approval] ⏳ Ainda há aprovações pendentes. Aguardando aprovações restantes...';
        END IF;
    END IF;
    
    -- Se foi rejeitado ou cancelado, atualizar status da entidade
    IF p_status IN ('rejeitado', 'cancelado') THEN
        RAISE NOTICE '[process_approval] ❌ Status de rejeição/cancelamento. Atualizando entidade...';
        CASE approval_record.processo_tipo
            WHEN 'conta_pagar' THEN
                UPDATE financeiro.contas_pagar
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'requisicao_compra' THEN
                RAISE NOTICE '[process_approval] 🛒 REQUISIÇÃO DE COMPRA: Rejeitada/Cancelada. requisicao_id=%', approval_record.processo_id;
                -- status_requisicao não tem 'rejeitado', apenas 'cancelada'
                -- workflow_state também deve ser atualizado
                UPDATE compras.requisicoes_compra
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'cancelada'::compras.status_requisicao
                    ELSE 'cancelada'::compras.status_requisicao  -- 'cancelado' -> 'cancelada'
                END,
                    workflow_state = CASE 
                    WHEN p_status = 'rejeitado' THEN 'reprovada'
                    ELSE 'cancelada'  -- 'cancelado' -> 'cancelada'
                END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'cotacao_compra' THEN
                -- status_cotacao tem 'rejeitada' (feminino), mas não tem 'cancelada'
                -- Para cancelado, usar 'rejeitada' como fallback
                UPDATE compras.cotacoes
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'rejeitada'::compras.status_cotacao
                    ELSE 'rejeitada'::compras.status_cotacao  -- 'cancelado' -> 'rejeitada' (não existe 'cancelada' em status_cotacao)
                END,
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
    
    RAISE NOTICE '[process_approval] ✅ FIM - Retornando TRUE';
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.process_approval IS 'Processa aprovação e atualiza workflow_state para em_cotacao quando requisição é totalmente aprovada. Inclui logs detalhados para rastreamento.';

-- 2. ATUALIZAR FUNÇÃO criar_cotacao_automatica COM LOGS DETALHADOS
-- =====================================================
CREATE OR REPLACE FUNCTION compras.criar_cotacao_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cotacao_ciclo_id UUID;
    v_numero_cotacao VARCHAR(50);
    v_requisicao RECORD;
    v_prazo_resposta DATE;
BEGIN
    RAISE NOTICE '[criar_cotacao_automatica] 🔔 TRIGGER DISPARADO - Verificando se requisição foi aprovada...';
    RAISE NOTICE '[criar_cotacao_automatica] Status anterior (OLD.status): %', OLD.status;
    RAISE NOTICE '[criar_cotacao_automatica] Status atual (NEW.status): %', NEW.status;
    RAISE NOTICE '[criar_cotacao_automatica] Requisição ID: %', NEW.id;
    
    -- Verificar se a requisição foi aprovada (status mudou para 'aprovada')
    IF NEW.status = 'aprovada'::compras.status_requisicao 
       AND (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_requisicao) THEN
        
        RAISE NOTICE '[criar_cotacao_automatica] ✅ Requisição foi APROVADA! Iniciando processo de criação de cotação...';
        
        -- Obter dados da requisição
        SELECT * INTO v_requisicao
        FROM compras.requisicoes_compra
        WHERE id = NEW.id;
        
        IF NOT FOUND THEN
            RAISE WARNING '[criar_cotacao_automatica] ⚠️ ERRO: Requisição não encontrada! ID: %', NEW.id;
            RETURN NEW;
        END IF;
        
        RAISE NOTICE '[criar_cotacao_automatica] 📋 Dados da requisição obtidos: numero_requisicao=%, company_id=%, data_necessidade=%', 
            v_requisicao.numero_requisicao, v_requisicao.company_id, v_requisicao.data_necessidade;
        
        -- Verificar se já existe um ciclo de cotação para esta requisição
        SELECT id INTO v_cotacao_ciclo_id
        FROM compras.cotacao_ciclos
        WHERE requisicao_id = NEW.id
        LIMIT 1;
        
        IF v_cotacao_ciclo_id IS NOT NULL THEN
            RAISE NOTICE '[criar_cotacao_automatica] ⚠️ AVISO: Já existe um ciclo de cotação para esta requisição! cotacao_ciclo_id=%. Pulando criação.', 
                v_cotacao_ciclo_id;
            RETURN NEW;
        END IF;
        
        RAISE NOTICE '[criar_cotacao_automatica] ✅ Nenhum ciclo de cotação existente. Prosseguindo com criação...';
        
        -- Gerar número de cotação
        v_numero_cotacao := compras.gerar_numero_cotacao(v_requisicao.company_id);
        RAISE NOTICE '[criar_cotacao_automatica] 📝 Número de cotação gerado: %', v_numero_cotacao;
        
        -- Calcular prazo_resposta: usar data_necessidade se disponível, 
        -- caso contrário usar 30 dias a partir de hoje como padrão
        -- Isso trata o caso onde rascunhos podem ter data_necessidade NULL
        IF v_requisicao.data_necessidade IS NOT NULL THEN
            v_prazo_resposta := v_requisicao.data_necessidade;
            RAISE NOTICE '[criar_cotacao_automatica] 📅 Usando data_necessidade da requisição como prazo_resposta: %', v_prazo_resposta;
        ELSE
            -- Se data_necessidade é NULL, usar 30 dias a partir de hoje como padrão
            v_prazo_resposta := CURRENT_DATE + INTERVAL '30 days';
            RAISE NOTICE '[criar_cotacao_automatica] 📅 data_necessidade é NULL. Usando prazo padrão de 30 dias: %', v_prazo_resposta;
        END IF;
        
        -- Criar ciclo de cotação
        RAISE NOTICE '[criar_cotacao_automatica] 💾 Criando ciclo de cotação...';
        INSERT INTO compras.cotacao_ciclos (
            company_id,
            requisicao_id,
            numero_cotacao,
            status,
            workflow_state,
            prazo_resposta,
            observacoes
        ) VALUES (
            v_requisicao.company_id,
            NEW.id,
            v_numero_cotacao,
            'aberta',
            'aberta',
            v_prazo_resposta,
            'Ciclo de cotação criado automaticamente após aprovação da requisição ' || v_requisicao.numero_requisicao
        )
        RETURNING id INTO v_cotacao_ciclo_id;
        
        RAISE NOTICE '[criar_cotacao_automatica] ✅ Ciclo de cotação criado com sucesso! cotacao_ciclo_id=%, numero_cotacao=%', 
            v_cotacao_ciclo_id, v_numero_cotacao;
        
        -- Atualizar workflow_state da requisição para 'em_cotacao'
        RAISE NOTICE '[criar_cotacao_automatica] 🔄 Atualizando workflow_state da requisição para ''em_cotacao''...';
        UPDATE compras.requisicoes_compra
        SET workflow_state = 'em_cotacao',
            updated_at = NOW()
        WHERE id = NEW.id;
        
        RAISE NOTICE '[criar_cotacao_automatica] ✅ workflow_state atualizado!';
        
        -- Registrar no log de workflow
        RAISE NOTICE '[criar_cotacao_automatica] 📝 Registrando no workflow_logs...';
        INSERT INTO compras.workflow_logs (
            entity_type,
            entity_id,
            from_state,
            to_state,
            actor_id,
            payload
        ) VALUES (
            'requisicao_compra',
            NEW.id,
            'aprovada',
            'em_cotacao',
            NEW.aprovado_por,
            jsonb_build_object(
                'cotacao_ciclo_id', v_cotacao_ciclo_id,
                'numero_cotacao', v_numero_cotacao,
                'criado_automaticamente', true
            )
        );
        
        RAISE NOTICE '[criar_cotacao_automatica] ✅✅✅ PROCESSO CONCLUÍDO COM SUCESSO! Cotação criada automaticamente.';
        RAISE NOTICE '[criar_cotacao_automatica] 📊 Resumo: cotacao_ciclo_id=%, numero_cotacao=%, prazo_resposta=%', 
            v_cotacao_ciclo_id, v_numero_cotacao, v_prazo_resposta;
    ELSE
        RAISE NOTICE '[criar_cotacao_automatica] ⏭️ Requisição não foi aprovada ou já estava aprovada. Nenhuma ação necessária.';
        RAISE NOTICE '[criar_cotacao_automatica] Condição: NEW.status=''aprovada''? %, OLD.status diferente? %', 
            NEW.status = 'aprovada'::compras.status_requisicao,
            (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_requisicao);
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_cotacao_automatica() IS 
'Cria automaticamente um ciclo de cotação quando uma requisição é aprovada. Trata casos onde data_necessidade é NULL usando 30 dias como prazo padrão. Inclui logs detalhados para rastreamento.';
