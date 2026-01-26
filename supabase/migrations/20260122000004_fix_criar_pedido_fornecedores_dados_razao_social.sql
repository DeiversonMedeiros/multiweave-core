-- =====================================================
-- FIX: column fd.razao_social does not exist
-- Data: 2026-01-22
-- Descrição: A tabela compras.fornecedores_dados NÃO possui razao_social nem
--            nome_fantasia. Esses campos estão em public.partners (via partner_id).
--            Corrige criar_pedido_apos_aprovacao_cotacao_ciclos para fazer JOIN
--            com partners e obter razao_social/nome_fantasia de lá.
-- Erro original: process_approval → trigger em cotacao_ciclos → criar_pedido...
--                → SELECT fd.razao_social → 42703 undefined_column
-- =====================================================

CREATE OR REPLACE FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id UUID;
    v_cotacao_ciclo RECORD;
    v_fornecedor RECORD;
    v_requisicao_item RECORD;
    v_numero_pedido VARCHAR(50);
    v_valor_total DECIMAL(15,2) := 0;
    v_valor_final DECIMAL(15,2) := 0;
    v_requisicao RECORD;
BEGIN
    -- Só processa se o status mudou para 'aprovada'
    IF NEW.status = 'aprovada' 
       AND NEW.workflow_state = 'aprovada'
       AND (OLD.status IS NULL OR OLD.status != 'aprovada' OR OLD.workflow_state != 'aprovada') THEN
        
        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Cotação aprovada: cotacao_ciclo_id=%, numero_cotacao=%', 
            NEW.id, NEW.numero_cotacao;
        
        -- Buscar dados do ciclo de cotação e da requisição
        SELECT 
            cc.*,
            rc.company_id,
            rc.created_by as requisicao_created_by
        INTO v_cotacao_ciclo
        FROM compras.cotacao_ciclos cc
        JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id
        WHERE cc.id = NEW.id;
        
        IF NOT FOUND THEN
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ⚠️ Cotação não encontrada: cotacao_ciclo_id=%', NEW.id;
            RETURN NEW;
        END IF;
        
        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Dados da cotação: requisicao_id=%, company_id=%', 
            v_cotacao_ciclo.requisicao_id, v_cotacao_ciclo.company_id;
        
        -- Buscar fornecedores aprovados nesta cotação
        -- FIX: razao_social e nome_fantasia vêm de partners (fd só tem partner_id, não esses campos)
        FOR v_fornecedor IN
            SELECT 
                cf.*,
                p.razao_social,
                p.nome_fantasia
            FROM compras.cotacao_fornecedores cf
            JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
            JOIN public.partners p ON p.id = fd.partner_id AND p.company_id = fd.company_id
            WHERE cf.cotacao_id = NEW.id
            AND cf.status = 'aprovada'
        LOOP
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Processando fornecedor aprovado: fornecedor_id=%, razao_social=%', 
                v_fornecedor.fornecedor_id, v_fornecedor.razao_social;
            
            -- Verificar se já existe pedido para este fornecedor nesta cotação
            SELECT id INTO v_pedido_id
            FROM compras.pedidos_compra
            WHERE observacoes LIKE '%' || v_cotacao_ciclo.numero_cotacao || '%'
            AND fornecedor_id = v_fornecedor.fornecedor_id
            AND company_id = v_cotacao_ciclo.company_id
            LIMIT 1;
            
            -- Se já existe pedido, pular
            IF v_pedido_id IS NOT NULL THEN
                RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ⚠️ Pedido já existe para este fornecedor: pedido_id=%', v_pedido_id;
                CONTINUE;
            END IF;
            
            -- Gerar número do pedido
            SELECT compras.gerar_numero_pedido(v_cotacao_ciclo.company_id) INTO v_numero_pedido;
            
            -- Calcular valor total dos itens da requisição
            IF v_fornecedor.preco_total IS NOT NULL AND v_fornecedor.preco_total > 0 THEN
                v_valor_total := v_fornecedor.preco_total;
            ELSE
                SELECT COALESCE(SUM(quantidade * COALESCE(valor_unitario_estimado, 0)), 0) INTO v_valor_total
                FROM compras.requisicao_itens
                WHERE requisicao_id = v_cotacao_ciclo.requisicao_id;
            END IF;
            
            -- Calcular valor final (com desconto se houver)
            v_valor_final := v_valor_total;
            IF v_fornecedor.desconto_percentual IS NOT NULL AND v_fornecedor.desconto_percentual > 0 THEN
                v_valor_final := v_valor_total * (1 - v_fornecedor.desconto_percentual / 100);
            END IF;
            IF v_fornecedor.desconto_valor IS NOT NULL AND v_fornecedor.desconto_valor > 0 THEN
                v_valor_final := v_valor_final - v_fornecedor.desconto_valor;
            END IF;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Criando pedido: numero_pedido=%, fornecedor_id=%, valor_total=%, valor_final=%', 
                v_numero_pedido, v_fornecedor.fornecedor_id, v_valor_total, v_valor_final;
            
            -- Criar pedido de compra com condições de pagamento
            INSERT INTO compras.pedidos_compra (
                id,
                cotacao_id,
                fornecedor_id,
                company_id,
                numero_pedido,
                data_pedido,
                data_entrega_prevista,
                status,
                valor_total,
                desconto_percentual,
                valor_final,
                observacoes,
                created_by,
                workflow_state,
                forma_pagamento,
                is_parcelada,
                numero_parcelas,
                intervalo_parcelas
            ) VALUES (
                gen_random_uuid(),
                NULL,
                v_fornecedor.fornecedor_id,
                v_cotacao_ciclo.company_id,
                v_numero_pedido,
                CURRENT_DATE,
                CASE 
                    WHEN v_fornecedor.prazo_entrega IS NOT NULL 
                    THEN CURRENT_DATE + (v_fornecedor.prazo_entrega || ' days')::INTERVAL
                    ELSE CURRENT_DATE + INTERVAL '30 days'
                END,
                'rascunho'::compras.status_pedido,
                v_valor_total,
                COALESCE(v_fornecedor.desconto_percentual, 0),
                v_valor_final,
                COALESCE(
                    v_cotacao_ciclo.observacoes, 
                    'Pedido gerado automaticamente da cotação ' || COALESCE(v_cotacao_ciclo.numero_cotacao, 'N/A')
                ) || E'\n' || 
                COALESCE(v_fornecedor.condicoes_comerciais, ''),
                COALESCE(v_cotacao_ciclo.created_by, v_cotacao_ciclo.requisicao_created_by),
                'aberto',
                v_fornecedor.forma_pagamento,
                COALESCE(v_fornecedor.is_parcelada, false),
                COALESCE(v_fornecedor.numero_parcelas, 1),
                COALESCE(v_fornecedor.intervalo_parcelas, '30')
            ) RETURNING id INTO v_pedido_id;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Pedido criado: pedido_id=%, numero_pedido=%, forma_pagamento=%, is_parcelada=%', 
                v_pedido_id, v_numero_pedido, v_fornecedor.forma_pagamento, v_fornecedor.is_parcelada;
            
            -- Copiar itens da requisição para o pedido
            FOR v_requisicao_item IN
                SELECT 
                    ri.*,
                    ri.quantidade,
                    ri.valor_unitario_estimado as valor_unitario
                FROM compras.requisicao_itens ri
                WHERE ri.requisicao_id = v_cotacao_ciclo.requisicao_id
            LOOP
                INSERT INTO compras.pedido_itens (
                    id,
                    pedido_id,
                    requisicao_item_id,
                    material_id,
                    quantidade,
                    valor_unitario,
                    valor_total,
                    created_at
                ) VALUES (
                    gen_random_uuid(),
                    v_pedido_id,
                    v_requisicao_item.id,
                    v_requisicao_item.material_id,
                    v_requisicao_item.quantidade,
                    COALESCE(v_requisicao_item.valor_unitario, 0),
                    v_requisicao_item.quantidade * COALESCE(v_requisicao_item.valor_unitario, 0),
                    NOW()
                );
            END LOOP;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Itens do pedido criados para pedido_id=%', v_pedido_id;
            
            -- Criar conta a pagar automaticamente
            PERFORM compras.criar_conta_pagar(
                v_pedido_id,
                v_cotacao_ciclo.company_id,
                COALESCE(v_cotacao_ciclo.created_by, v_cotacao_ciclo.requisicao_created_by)
            );
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Conta a pagar criada para pedido_id=%', v_pedido_id;
        END LOOP;
        
        -- Atualizar status da requisição para 'em_pedido' se todas as cotações foram processadas
        UPDATE compras.requisicoes_compra
        SET 
            status = 'em_pedido'::compras.status_requisicao,
            workflow_state = 'em_pedido',
            updated_at = NOW()
        WHERE id = v_cotacao_ciclo.requisicao_id
        AND NOT EXISTS (
            SELECT 1 FROM compras.cotacao_ciclos cc
            WHERE cc.requisicao_id = v_cotacao_ciclo.requisicao_id
            AND (cc.status != 'aprovada' OR cc.workflow_state != 'aprovada')
            AND cc.status != 'rejeitada'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos IS 
'Cria pedido de compra e conta a pagar automaticamente quando cotação é aprovada. Inclui propagação de condições de pagamento. Fix: razao_social/nome_fantasia vêm de partners (fornecedores_dados não possui esses campos).';
