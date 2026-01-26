-- =====================================================
-- FIX: Incluir frete dos itens no cálculo do valor total do pedido
-- Data: 2026-01-26
-- Descrição: A função criar_pedido_apos_aprovacao_cotacao_ciclos não estava
--            incluindo o valor_frete dos itens (cotacao_item_fornecedor.valor_frete)
--            no cálculo do valor_total e valor_final do pedido.
--            O valor_total_calculado não inclui frete, então precisamos somar
--            o valor_frete separadamente.
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
    v_item_vencedor RECORD;
    v_numero_pedido VARCHAR(50);
    v_valor_total DECIMAL(15,2) := 0;
    v_valor_frete_itens DECIMAL(15,2) := 0;
    v_valor_final DECIMAL(15,2) := 0;
BEGIN
    IF NEW.status = 'aprovada'
       AND NEW.workflow_state = 'aprovada'
       AND (OLD.status IS NULL OR OLD.status != 'aprovada' OR OLD.workflow_state != 'aprovada') THEN

        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] 🔵 INÍCIO - Cotação aprovada: cotacao_ciclo_id=%, numero_cotacao=%',
            NEW.id, NEW.numero_cotacao;

        SELECT cc.*, rc.company_id, rc.created_by AS requisicao_created_by
        INTO v_cotacao_ciclo
        FROM compras.cotacao_ciclos cc
        JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id
        WHERE cc.id = NEW.id;

        IF NOT FOUND THEN
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ⚠️ Cotação não encontrada: cotacao_ciclo_id=%', NEW.id;
            RETURN NEW;
        END IF;

        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Dados da cotação: requisicao_id=%, company_id=%, requisicao_created_by=%',
            v_cotacao_ciclo.requisicao_id, v_cotacao_ciclo.company_id, v_cotacao_ciclo.requisicao_created_by;

        -- Fornecedores VENCEDORES = pelo menos um cotacao_item_fornecedor com is_vencedor = true
        -- (não usar cf.status = 'aprovada', pois não é definido na aprovação)
        FOR v_fornecedor IN
            SELECT
                cf.*,
                p.razao_social,
                p.nome_fantasia
            FROM compras.cotacao_fornecedores cf
            JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
            JOIN public.partners p ON p.id = fd.partner_id AND p.company_id = fd.company_id
            WHERE cf.cotacao_id = NEW.id
              AND EXISTS (
                  SELECT 1 FROM compras.cotacao_item_fornecedor cif
                  WHERE cif.cotacao_fornecedor_id = cf.id AND cif.is_vencedor = true
              )
        LOOP
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] 🔄 Processando fornecedor vencedor: fornecedor_id=%, razao_social=%, forma_pagamento=%, is_parcelada=%',
                v_fornecedor.fornecedor_id, v_fornecedor.razao_social, v_fornecedor.forma_pagamento, v_fornecedor.is_parcelada;

            SELECT id INTO v_pedido_id
            FROM compras.pedidos_compra
            WHERE observacoes LIKE '%' || v_cotacao_ciclo.numero_cotacao || '%'
              AND fornecedor_id = v_fornecedor.fornecedor_id
              AND company_id = v_cotacao_ciclo.company_id
            LIMIT 1;

            IF v_pedido_id IS NOT NULL THEN
                RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ⚠️ Pedido já existe: pedido_id=%', v_pedido_id;
                CONTINUE;
            END IF;

            SELECT compras.gerar_numero_pedido(v_cotacao_ciclo.company_id) INTO v_numero_pedido;

            -- ✅ CORREÇÃO: Valor total = soma dos itens VENCEDORES + frete dos itens
            -- valor_total_calculado não inclui frete, então precisamos somar valor_frete separadamente
            SELECT 
                COALESCE(SUM(cif.valor_total_calculado), 0),
                COALESCE(SUM(COALESCE(cif.valor_frete, 0)), 0)
            INTO v_valor_total, v_valor_frete_itens
            FROM compras.cotacao_item_fornecedor cif
            WHERE cif.cotacao_fornecedor_id = v_fornecedor.id AND cif.is_vencedor = true;

            -- Se não encontrou itens, usar preco_total do fornecedor como fallback
            IF v_valor_total <= 0 AND v_fornecedor.preco_total IS NOT NULL AND v_fornecedor.preco_total > 0 THEN
                v_valor_total := v_fornecedor.preco_total;
            END IF;

            -- ✅ CORREÇÃO: Incluir frete dos itens no valor total
            v_valor_total := v_valor_total + v_valor_frete_itens;

            -- Calcular valor final aplicando descontos do fornecedor
            v_valor_final := v_valor_total;
            IF v_fornecedor.desconto_percentual IS NOT NULL AND v_fornecedor.desconto_percentual > 0 THEN
                v_valor_final := v_valor_total * (1 - v_fornecedor.desconto_percentual / 100);
            END IF;
            IF v_fornecedor.desconto_valor IS NOT NULL AND v_fornecedor.desconto_valor > 0 THEN
                v_valor_final := v_valor_final - v_fornecedor.desconto_valor;
            END IF;

            -- ✅ CORREÇÃO: Aplicar descontos da cotação (cotacao_ciclos) após descontos do fornecedor
            IF v_cotacao_ciclo.desconto_percentual IS NOT NULL AND v_cotacao_ciclo.desconto_percentual > 0 THEN
                v_valor_final := v_valor_final * (1 - v_cotacao_ciclo.desconto_percentual / 100);
            END IF;
            IF v_cotacao_ciclo.desconto_valor IS NOT NULL AND v_cotacao_ciclo.desconto_valor > 0 THEN
                v_valor_final := v_valor_final - v_cotacao_ciclo.desconto_valor;
            END IF;

            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] 📝 Criando pedido: numero_pedido=%, fornecedor_id=%, valor_total=%, valor_frete_itens=%, valor_final=%',
                v_numero_pedido, v_fornecedor.fornecedor_id, v_valor_total, v_valor_frete_itens, v_valor_final;

            INSERT INTO compras.pedidos_compra (
                id, cotacao_id, fornecedor_id, company_id, numero_pedido, data_pedido, data_entrega_prevista,
                status, valor_total, desconto_percentual, valor_final, observacoes, created_by, workflow_state,
                forma_pagamento, is_parcelada, numero_parcelas, intervalo_parcelas
            ) VALUES (
                gen_random_uuid(), NULL, v_fornecedor.fornecedor_id, v_cotacao_ciclo.company_id, v_numero_pedido,
                CURRENT_DATE,
                CASE
                    WHEN v_fornecedor.prazo_entrega IS NOT NULL
                    THEN CURRENT_DATE + (v_fornecedor.prazo_entrega || ' days')::INTERVAL
                    ELSE CURRENT_DATE + INTERVAL '30 days'
                END,
                'rascunho'::compras.status_pedido, v_valor_total, COALESCE(v_fornecedor.desconto_percentual, 0),
                v_valor_final,
                COALESCE(v_cotacao_ciclo.observacoes,
                    'Pedido gerado automaticamente da cotação ' || COALESCE(v_cotacao_ciclo.numero_cotacao, 'N/A')
                ) || E'\n' || COALESCE(v_fornecedor.condicoes_comerciais, ''),
                v_cotacao_ciclo.requisicao_created_by, 'aberto',
                v_fornecedor.forma_pagamento, COALESCE(v_fornecedor.is_parcelada, false),
                COALESCE(v_fornecedor.numero_parcelas, 1), COALESCE(v_fornecedor.intervalo_parcelas, '30')
            ) RETURNING id INTO v_pedido_id;

            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Pedido criado: pedido_id=%, numero_pedido=%, data_pedido=%',
                v_pedido_id, v_numero_pedido, CURRENT_DATE;

            -- ✅ CORREÇÃO: Copiar itens VENCEDORES incluindo frete no valor_total do item
            FOR v_item_vencedor IN
                SELECT
                    ri.id AS requisicao_item_id,
                    ri.material_id,
                    COALESCE(cif.quantidade_ofertada, ri.quantidade) AS quantidade,
                    COALESCE(cif.valor_unitario, ri.valor_unitario_estimado, 0) AS valor_unitario,
                    -- ✅ CORREÇÃO: Incluir frete no valor_total do item
                    COALESCE(cif.valor_total_calculado, 0) + COALESCE(cif.valor_frete, 0) AS valor_total
                FROM compras.requisicao_itens ri
                INNER JOIN compras.cotacao_item_fornecedor cif
                    ON cif.requisicao_item_id = ri.id
                    AND cif.cotacao_fornecedor_id = v_fornecedor.id
                    AND cif.is_vencedor = true
                WHERE ri.requisicao_id = v_cotacao_ciclo.requisicao_id
            LOOP
                INSERT INTO compras.pedido_itens (
                    id, pedido_id, material_id, quantidade, valor_unitario, valor_total, created_at
                ) VALUES (
                    gen_random_uuid(), v_pedido_id, v_item_vencedor.material_id,
                    v_item_vencedor.quantidade, v_item_vencedor.valor_unitario, v_item_vencedor.valor_total, NOW()
                );
            END LOOP;

            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Itens do pedido criados para pedido_id=%', v_pedido_id;

            -- ✅ NOVO: Logs detalhados antes de criar conta a pagar
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] 💰 Chamando criar_conta_pagar: pedido_id=%, company_id=%, created_by=%', 
                v_pedido_id, v_cotacao_ciclo.company_id, v_cotacao_ciclo.requisicao_created_by;
            
            BEGIN
                PERFORM compras.criar_conta_pagar(
                    v_pedido_id, v_cotacao_ciclo.company_id,
                    v_cotacao_ciclo.requisicao_created_by
                );
                RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Conta a pagar criada com sucesso para pedido_id=%', v_pedido_id;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE EXCEPTION '[criar_pedido_apos_aprovacao_cotacao_ciclos] ❌ ERRO ao criar conta a pagar para pedido_id=%: % (SQLSTATE: %)', 
                        v_pedido_id, SQLERRM, SQLSTATE;
            END;
        END LOOP;

        UPDATE compras.requisicoes_compra
        SET status = 'em_pedido'::compras.status_requisicao, workflow_state = 'em_pedido', updated_at = NOW()
        WHERE id = v_cotacao_ciclo.requisicao_id
          AND NOT EXISTS (
              SELECT 1 FROM compras.cotacao_ciclos cc
              WHERE cc.requisicao_id = v_cotacao_ciclo.requisicao_id
                AND (cc.status != 'aprovada' OR cc.workflow_state != 'aprovada')
                AND cc.status != 'reprovada'
          );
          
        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] 🟢 FIM - Processamento concluído para cotacao_ciclo_id=%', NEW.id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[criar_pedido_apos_aprovacao_cotacao_ciclos] ❌ ERRO CRÍTICO: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos IS
'Cria pedido e conta a pagar ao aprovar cotação. Usa fornecedores VENCEDORES (is_vencedor em cotacao_item_fornecedor), não cf.status. Totais e itens apenas dos itens vencedores por fornecedor. Inclui frete dos itens (valor_frete) no cálculo do valor_total e valor_final. Aplica descontos do fornecedor e da cotação (cotacao_ciclos). Atualizado em 2026-01-26 para incluir frete dos itens e descontos da cotação.';
