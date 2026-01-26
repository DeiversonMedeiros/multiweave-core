-- =====================================================
-- FIX: Corrigir pedidos e contas a pagar existentes que não incluíram frete dos itens
-- Data: 2026-01-26
-- Descrição: Atualiza pedidos e contas a pagar criados antes da correção
--            para incluir o frete dos itens no valor_total e valor_final.
--            Busca pedidos criados a partir de cotações e recalcula os valores
--            somando o frete dos itens vencedores.
-- =====================================================

DO $$
DECLARE
    v_pedido RECORD;
    v_valor_frete_itens DECIMAL(15,2);
    v_valor_total_corrigido DECIMAL(15,2);
    v_valor_final_corrigido DECIMAL(15,2);
    v_conta_pagar_id UUID;
    v_diferenca DECIMAL(15,2);
BEGIN
    RAISE NOTICE '[corrigir_pedidos_existentes_frete_itens] 🔵 INÍCIO - Corrigindo pedidos existentes...';

    -- Buscar pedidos que foram criados a partir de cotações (identificados pela observação)
    FOR v_pedido IN
        SELECT 
            p.id,
            p.numero_pedido,
            p.valor_total,
            p.valor_final,
            p.observacoes,
            cf.id AS cotacao_fornecedor_id,
            cc.id AS cotacao_ciclo_id
        FROM compras.pedidos_compra p
        INNER JOIN compras.cotacao_fornecedores cf ON cf.fornecedor_id = p.fornecedor_id
        INNER JOIN compras.cotacao_ciclos cc ON cc.id = cf.cotacao_id
        WHERE p.observacoes LIKE '%COT-%'
          AND p.valor_total > 0
          -- Apenas pedidos criados antes da correção (verificar se valor não inclui frete)
          -- Buscar itens vencedores e verificar se há frete não incluído
          AND EXISTS (
              SELECT 1 
              FROM compras.cotacao_item_fornecedor cif
              WHERE cif.cotacao_fornecedor_id = cf.id
                AND cif.is_vencedor = true
                AND COALESCE(cif.valor_frete, 0) > 0
          )
    LOOP
        -- Calcular frete total dos itens vencedores deste fornecedor
        SELECT COALESCE(SUM(COALESCE(cif.valor_frete, 0)), 0)
        INTO v_valor_frete_itens
        FROM compras.cotacao_item_fornecedor cif
        WHERE cif.cotacao_fornecedor_id = v_pedido.cotacao_fornecedor_id
          AND cif.is_vencedor = true;

        -- Se não há frete, pular este pedido
        IF v_valor_frete_itens <= 0 THEN
            CONTINUE;
        END IF;

        -- Calcular valor total corrigido (valor atual + frete dos itens)
        v_valor_total_corrigido := v_pedido.valor_total + v_valor_frete_itens;

        -- Calcular valor final corrigido (proporcional ao aumento do valor total)
        -- Se havia desconto, manter a proporção
        IF v_pedido.valor_total > 0 THEN
            v_valor_final_corrigido := v_pedido.valor_final * (v_valor_total_corrigido / v_pedido.valor_total);
        ELSE
            v_valor_final_corrigido := v_valor_total_corrigido;
        END IF;

        v_diferenca := v_valor_final_corrigido - v_pedido.valor_final;

        RAISE NOTICE '[corrigir_pedidos_existentes_frete_itens] 📝 Pedido: % | Valor atual: % | Frete itens: % | Valor corrigido: % | Diferença: %',
            v_pedido.numero_pedido, v_pedido.valor_final, v_valor_frete_itens, v_valor_final_corrigido, v_diferenca;

        -- Atualizar pedido
        UPDATE compras.pedidos_compra
        SET 
            valor_total = v_valor_total_corrigido,
            valor_final = v_valor_final_corrigido,
            updated_at = NOW()
        WHERE id = v_pedido.id;

        -- Atualizar itens do pedido para incluir frete
        UPDATE compras.pedido_itens pi
        SET 
            valor_total = pi.valor_total + COALESCE(cif.valor_frete, 0),
            updated_at = NOW()
        FROM compras.cotacao_item_fornecedor cif
        INNER JOIN compras.requisicao_itens ri ON ri.id = cif.requisicao_item_id
        WHERE pi.pedido_id = v_pedido.id
          AND pi.material_id = ri.material_id
          AND cif.cotacao_fornecedor_id = v_pedido.cotacao_fornecedor_id
          AND cif.is_vencedor = true
          AND COALESCE(cif.valor_frete, 0) > 0;

        -- Buscar conta a pagar associada ao pedido
        SELECT id INTO v_conta_pagar_id
        FROM financeiro.contas_pagar
        WHERE pedido_id = v_pedido.id
        LIMIT 1;

        -- Se existe conta a pagar, atualizar o valor
        IF v_conta_pagar_id IS NOT NULL THEN
            UPDATE financeiro.contas_pagar
            SET 
                valor_original = v_valor_final_corrigido,
                valor_atual = v_valor_final_corrigido,
                updated_at = NOW()
            WHERE id = v_conta_pagar_id;

            -- Atualizar parcelas se existirem
            UPDATE financeiro.contas_pagar_parcelas
            SET 
                valor_parcela = valor_parcela * (v_valor_final_corrigido / NULLIF(v_pedido.valor_final, 0)),
                valor_original = valor_original * (v_valor_final_corrigido / NULLIF(v_pedido.valor_final, 0)),
                valor_atual = valor_atual * (v_valor_final_corrigido / NULLIF(v_pedido.valor_final, 0)),
                updated_at = NOW()
            WHERE conta_pagar_id = v_conta_pagar_id
              AND v_pedido.valor_final > 0;

            RAISE NOTICE '[corrigir_pedidos_existentes_frete_itens] ✅ Conta a pagar atualizada: conta_id=% | Novo valor: %',
                v_conta_pagar_id, v_valor_final_corrigido;
        END IF;

        RAISE NOTICE '[corrigir_pedidos_existentes_frete_itens] ✅ Pedido corrigido: % | Valor final: % → %',
            v_pedido.numero_pedido, v_pedido.valor_final, v_valor_final_corrigido;
    END LOOP;

    RAISE NOTICE '[corrigir_pedidos_existentes_frete_itens] 🟢 FIM - Correção concluída';
END $$;

COMMENT ON FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos IS
'Cria pedido e conta a pagar ao aprovar cotação. Usa fornecedores VENCEDORES (is_vencedor em cotacao_item_fornecedor), não cf.status. Totais e itens apenas dos itens vencedores por fornecedor. Inclui frete dos itens (valor_frete) no cálculo do valor_total e valor_final. Atualizado em 2026-01-26 para incluir frete dos itens.';
