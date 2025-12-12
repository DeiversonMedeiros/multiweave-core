-- =====================================================
-- CORREÇÃO: Tratar NULL em data_necessidade no trigger criar_cotacao_automatica
-- Data: 2025-12-12
-- Descrição:
--   - Corrige o trigger criar_cotacao_automatica para tratar casos onde
--     data_necessidade é NULL (permitido para rascunhos pela migration 20251211215450)
--   - Quando data_necessidade é NULL, usa 30 dias a partir de hoje como prazo_resposta padrão
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
    -- Verificar se a requisição foi aprovada (status mudou para 'aprovada')
    IF NEW.status = 'aprovada'::compras.status_requisicao 
       AND (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_requisicao) THEN
        
        -- Obter dados da requisição
        SELECT * INTO v_requisicao
        FROM compras.requisicoes_compra
        WHERE id = NEW.id;
        
        -- Verificar se já existe um ciclo de cotação para esta requisição
        SELECT id INTO v_cotacao_ciclo_id
        FROM compras.cotacao_ciclos
        WHERE requisicao_id = NEW.id
        LIMIT 1;
        
        -- Se não existe, criar o ciclo de cotação
        IF v_cotacao_ciclo_id IS NULL THEN
            -- Gerar número de cotação
            v_numero_cotacao := compras.gerar_numero_cotacao(v_requisicao.company_id);
            
            -- Calcular prazo_resposta: usar data_necessidade se disponível, 
            -- caso contrário usar 30 dias a partir de hoje como padrão
            -- Isso trata o caso onde rascunhos podem ter data_necessidade NULL
            IF v_requisicao.data_necessidade IS NOT NULL THEN
                v_prazo_resposta := v_requisicao.data_necessidade;
            ELSE
                -- Se data_necessidade é NULL, usar 30 dias a partir de hoje como padrão
                v_prazo_resposta := CURRENT_DATE + INTERVAL '30 days';
            END IF;
            
            -- Criar ciclo de cotação
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
            
            -- Atualizar workflow_state da requisição para 'em_cotacao'
            UPDATE compras.requisicoes_compra
            SET workflow_state = 'em_cotacao',
                updated_at = NOW()
            WHERE id = NEW.id;
            
            -- Registrar no log de workflow
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
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_cotacao_automatica() IS 
'Cria automaticamente um ciclo de cotação quando uma requisição é aprovada. Trata casos onde data_necessidade é NULL usando 30 dias como prazo padrão.';

