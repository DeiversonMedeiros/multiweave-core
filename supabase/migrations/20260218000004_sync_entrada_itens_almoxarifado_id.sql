-- =====================================================
-- MIGRAÇÃO: Preencher almoxarifado_id no sync e backfill
-- Data: 2026-02-18
-- Descrição:
--   - Atualiza compras.sync_entrada_itens_from_pedido para preencher almoxarifado_id
--     ao inserir itens, usando requisição (destino_almoxarifado_id ou requisicao_itens.almoxarifado_id por material).
--   - Backfill: atualiza entrada_itens existentes com almoxarifado_id NULL onde o pedido tem requisição.
-- =====================================================

CREATE OR REPLACE FUNCTION compras.sync_entrada_itens_from_pedido(p_pedido_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entrada_id UUID;
    v_company_id UUID;
    v_numero_pedido TEXT;
    v_pedido_item RECORD;
    v_material_equipamento_id UUID;
    v_valor_total DECIMAL(15,2) := 0;
    v_requisicao_id UUID;
    v_destino_almoxarifado_id UUID;
    v_almoxarifado_id UUID;
BEGIN
    -- Buscar pré-entrada vinculada a este pedido
    SELECT id, company_id INTO v_entrada_id, v_company_id
    FROM almoxarifado.entradas_materiais
    WHERE pedido_id = p_pedido_id
    LIMIT 1;

    IF v_entrada_id IS NULL THEN
        RAISE NOTICE '[sync_entrada_itens_from_pedido] Nenhuma pré-entrada para pedido_id=%', p_pedido_id;
        RETURN;
    END IF;

    SELECT numero_pedido INTO v_numero_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id
    LIMIT 1;

    -- Obter requisição e destino_almoxarifado_id (cotacao_ciclo ou cotacao -> cotacao_ciclo)
    SELECT rc.id, rc.destino_almoxarifado_id INTO v_requisicao_id, v_destino_almoxarifado_id
    FROM compras.pedidos_compra p
    LEFT JOIN compras.cotacao_ciclos cc ON cc.id = p.cotacao_ciclo_id
    LEFT JOIN compras.cotacoes c ON c.id = p.cotacao_id
    LEFT JOIN compras.cotacao_ciclos cc2 ON cc2.id = c.cotacao_ciclo_id
    LEFT JOIN compras.requisicoes_compra rc ON rc.id = COALESCE(cc.requisicao_id, cc2.requisicao_id)
    WHERE p.id = p_pedido_id
    LIMIT 1;

    -- Remover itens atuais da pré-entrada (serão recriados a partir do pedido)
    DELETE FROM almoxarifado.entrada_itens
    WHERE entrada_id = v_entrada_id;

    -- Inserir itens a partir de pedido_itens (material_id = id de materiais_equipamentos)
    FOR v_pedido_item IN
        SELECT
            pi.id,
            pi.material_id,
            pi.quantidade,
            pi.valor_unitario,
            pi.valor_total,
            pi.observacoes
        FROM compras.pedido_itens pi
        WHERE pi.pedido_id = p_pedido_id
    LOOP
        -- material_id em pedido_itens referencia diretamente almoxarifado.materiais_equipamentos.id
        SELECT id INTO v_material_equipamento_id
        FROM almoxarifado.materiais_equipamentos
        WHERE id = v_pedido_item.material_id
          AND company_id = v_company_id
          AND status = 'ativo'
        LIMIT 1;

        IF v_material_equipamento_id IS NULL THEN
            SELECT id INTO v_material_equipamento_id
            FROM almoxarifado.materiais_equipamentos
            WHERE id = v_pedido_item.material_id
              AND company_id = v_company_id
            LIMIT 1;
        END IF;

        IF v_material_equipamento_id IS NULL THEN
            RAISE WARNING '[sync_entrada_itens_from_pedido] Material não encontrado: material_id=%, pedido_id=%',
                v_pedido_item.material_id, p_pedido_id;
            CONTINUE;
        END IF;

        -- Almoxarifado: por item (requisicao_itens.almoxarifado_id) ou destino da requisição
        IF v_requisicao_id IS NOT NULL THEN
            SELECT COALESCE(
                (SELECT ri.almoxarifado_id FROM compras.requisicao_itens ri
                 WHERE ri.requisicao_id = v_requisicao_id AND ri.material_id = v_pedido_item.material_id
                 LIMIT 1),
                v_destino_almoxarifado_id
            ) INTO v_almoxarifado_id;
        ELSE
            v_almoxarifado_id := NULL;
        END IF;

        INSERT INTO almoxarifado.entrada_itens (
            id,
            entrada_id,
            material_equipamento_id,
            quantidade_recebida,
            quantidade_aprovada,
            valor_unitario,
            valor_total,
            observacoes,
            company_id,
            almoxarifado_id
        ) VALUES (
            gen_random_uuid(),
            v_entrada_id,
            v_material_equipamento_id,
            v_pedido_item.quantidade::INTEGER,
            0,
            v_pedido_item.valor_unitario,
            v_pedido_item.valor_total,
            COALESCE(v_pedido_item.observacoes, 'Item do pedido ' || COALESCE(v_numero_pedido, p_pedido_id::text)),
            v_company_id,
            v_almoxarifado_id
        );

        v_valor_total := v_valor_total + COALESCE(v_pedido_item.valor_total, 0);
    END LOOP;

    -- Atualizar valor_total na pré-entrada
    SELECT COALESCE(SUM(valor_total), 0) INTO v_valor_total
    FROM compras.pedido_itens
    WHERE pedido_id = p_pedido_id;

    UPDATE almoxarifado.entradas_materiais
    SET valor_total = v_valor_total
    WHERE id = v_entrada_id;

    RAISE NOTICE '[sync_entrada_itens_from_pedido] Pré-entrada sincronizada: entrada_id=%, pedido_id=%, valor_total=%',
        v_entrada_id, p_pedido_id, v_valor_total;
END;
$$;

COMMENT ON FUNCTION compras.sync_entrada_itens_from_pedido(UUID) IS
'Sincroniza itens da pré-entrada (almoxarifado.entrada_itens) e valor_total com os itens do pedido (compras.pedido_itens). Preenche almoxarifado_id a partir da requisição (requisicao_itens.almoxarifado_id ou destino_almoxarifado_id).';

-- =====================================================
-- BACKFILL: Preencher almoxarifado_id em entrada_itens onde está NULL e o pedido tem requisição
-- =====================================================
UPDATE almoxarifado.entrada_itens ei
SET almoxarifado_id = sub.destino_almoxarifado_id
FROM (
    SELECT
        ei2.id AS entrada_item_id,
        COALESCE(
            (SELECT ri.almoxarifado_id
             FROM compras.requisicao_itens ri
             WHERE ri.requisicao_id = rc.id AND ri.material_id = ei2.material_equipamento_id
             LIMIT 1),
            rc.destino_almoxarifado_id
        ) AS destino_almoxarifado_id
    FROM almoxarifado.entrada_itens ei2
    JOIN almoxarifado.entradas_materiais em ON em.id = ei2.entrada_id
    JOIN compras.pedidos_compra p ON p.id = em.pedido_id
    LEFT JOIN compras.cotacao_ciclos cc ON cc.id = COALESCE(p.cotacao_ciclo_id, (SELECT cotacao_ciclo_id FROM compras.cotacoes c WHERE c.id = p.cotacao_id LIMIT 1))
    LEFT JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id
    WHERE em.pedido_id IS NOT NULL
      AND ei2.almoxarifado_id IS NULL
      AND rc.id IS NOT NULL
      AND (rc.destino_almoxarifado_id IS NOT NULL OR EXISTS (
          SELECT 1 FROM compras.requisicao_itens ri2 WHERE ri2.requisicao_id = rc.id AND ri2.material_id = ei2.material_equipamento_id AND ri2.almoxarifado_id IS NOT NULL
      ))
) sub
WHERE ei.id = sub.entrada_item_id AND sub.destino_almoxarifado_id IS NOT NULL;
