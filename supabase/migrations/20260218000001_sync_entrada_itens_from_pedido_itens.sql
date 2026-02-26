-- =====================================================
-- MIGRAÇÃO: Sincronizar entrada_itens e valor_total a partir de pedido_itens
-- Data: 2026-02-18
-- Descrição:
--   - Trigger em pedido_itens para manter pré-entrada (entrada_itens + valor_total) em sync
--   - Quando itens do pedido são inseridos/alterados/removidos, a pré-entrada é atualizada no banco
--   - Garante que as informações fiquem gravadas mesmo quando itens são adicionados após a criação do pedido
-- =====================================================

-- =====================================================
-- FUNÇÃO: Sincronizar itens da pré-entrada com os itens do pedido
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

        INSERT INTO almoxarifado.entrada_itens (
            id,
            entrada_id,
            material_equipamento_id,
            quantidade_recebida,
            quantidade_aprovada,
            valor_unitario,
            valor_total,
            observacoes,
            company_id
        ) VALUES (
            gen_random_uuid(),
            v_entrada_id,
            v_material_equipamento_id,
            v_pedido_item.quantidade::INTEGER,
            0,
            v_pedido_item.valor_unitario,
            v_pedido_item.valor_total,
            COALESCE(v_pedido_item.observacoes, 'Item do pedido ' || COALESCE(v_numero_pedido, p_pedido_id::text)),
            v_company_id
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
'Sincroniza itens da pré-entrada (almoxarifado.entrada_itens) e valor_total com os itens do pedido (compras.pedido_itens). Chamado pelo trigger em pedido_itens.';

-- =====================================================
-- TRIGGER: Em INSERT/UPDATE/DELETE de pedido_itens
-- =====================================================
CREATE OR REPLACE FUNCTION compras.trg_sync_entrada_itens_on_pedido_itens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id UUID;
BEGIN
    v_pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);
    IF v_pedido_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    PERFORM compras.sync_entrada_itens_from_pedido(v_pedido_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_entrada_itens_on_pedido_itens ON compras.pedido_itens;

CREATE TRIGGER trg_sync_entrada_itens_on_pedido_itens
    AFTER INSERT OR UPDATE OR DELETE ON compras.pedido_itens
    FOR EACH ROW
    EXECUTE FUNCTION compras.trg_sync_entrada_itens_on_pedido_itens();

COMMENT ON TRIGGER trg_sync_entrada_itens_on_pedido_itens ON compras.pedido_itens IS
'Mantém almoxarifado.entrada_itens e entradas_materiais.valor_total sincronizados com compras.pedido_itens quando a pré-entrada já existe.';

-- =====================================================
-- BACKFILL: Sincronizar pré-entradas existentes que têm pedido_id mas estão sem itens
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT em.id AS entrada_id, em.pedido_id
        FROM almoxarifado.entradas_materiais em
        WHERE em.pedido_id IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM compras.pedido_itens pi WHERE pi.pedido_id = em.pedido_id
          )
    LOOP
        PERFORM compras.sync_entrada_itens_from_pedido(r.pedido_id);
        RAISE NOTICE '[backfill] Sincronizada pré-entrada entrada_id=%, pedido_id=%', r.entrada_id, r.pedido_id;
    END LOOP;
END;
$$;
