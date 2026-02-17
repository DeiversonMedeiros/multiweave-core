-- =====================================================
-- BACKFILL: Inserir itens faltantes no PED-000006
-- Data: 2026-02-17
-- Contexto: PED-000006 foi criado sem itens devido ao bug corrigido em
--           20260217000001. Esta migration insere os itens que o fornecedor
--           venceu na cotação COT-000057.
-- =====================================================

DO $$
DECLARE
    v_pedido_id UUID;
    v_fornecedor_id UUID;
    v_cf_id UUID;
    v_item RECORD;
BEGIN
    -- PED-000006: fornecedor a921826c
    SELECT id, fornecedor_id INTO v_pedido_id, v_fornecedor_id
    FROM compras.pedidos_compra
    WHERE numero_pedido = 'PED-000006'
    LIMIT 1;

    IF v_pedido_id IS NULL THEN
        RAISE NOTICE '[backfill_pedido_006] PED-000006 não encontrado, pulando.';
        RETURN;
    END IF;

    -- Cotacao_fornecedor deste fornecedor em COT-000057 com itens vencedores
    SELECT cf.id INTO v_cf_id
    FROM compras.cotacao_fornecedores cf
    JOIN compras.cotacao_ciclos cc ON cc.id = cf.cotacao_id
    WHERE cf.fornecedor_id = v_fornecedor_id
      AND cc.numero_cotacao = 'COT-000057'
      AND EXISTS (
          SELECT 1 FROM compras.cotacao_item_fornecedor cif
          WHERE cif.cotacao_fornecedor_id = cf.id AND cif.is_vencedor = true
      )
    LIMIT 1;

    IF v_cf_id IS NULL THEN
        RAISE NOTICE '[backfill_pedido_006] Cotacao_fornecedor não encontrado para PED-000006.';
        RETURN;
    END IF;

    -- Inserir itens vencedores que ainda não estão no pedido
    FOR v_item IN
        SELECT
            ri.material_id,
            COALESCE(cif.quantidade_ofertada, ri.quantidade) AS quantidade,
            COALESCE(cif.valor_unitario, ri.valor_unitario_estimado, 0) AS valor_unitario,
            COALESCE(cif.valor_total_calculado, 0) + COALESCE(cif.valor_frete, 0) AS valor_total
        FROM compras.requisicao_itens ri
        INNER JOIN compras.cotacao_item_fornecedor cif
            ON cif.requisicao_item_id = ri.id
            AND cif.cotacao_fornecedor_id = v_cf_id
            AND cif.is_vencedor = true
    LOOP
        INSERT INTO compras.pedido_itens (
            id, pedido_id, material_id, quantidade, valor_unitario, valor_total, created_at
        ) VALUES (
            gen_random_uuid(), v_pedido_id, v_item.material_id,
            v_item.quantidade, v_item.valor_unitario, v_item.valor_total, NOW()
        );
        RAISE NOTICE '[backfill_pedido_006] Item inserido: material_id=%, qtd=%, valor_total=%', 
            v_item.material_id, v_item.quantidade, v_item.valor_total;
    END LOOP;

    RAISE NOTICE '[backfill_pedido_006] Backfill concluído para PED-000006 (pedido_id=%).', v_pedido_id;
END;
$$;
