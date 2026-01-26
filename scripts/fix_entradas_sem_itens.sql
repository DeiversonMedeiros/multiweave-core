-- =====================================================
-- Script para corrigir entradas sem itens
-- Data: 2025-01-25
-- Descrição: Cria os itens faltantes para entradas que já existem
-- =====================================================

DO $$
DECLARE
    v_entrada RECORD;
    v_pedido_item RECORD;
    v_material_equipamento_id UUID;
    v_item_count INTEGER;
BEGIN
    -- Iterar sobre todas as entradas que têm pedido_id mas não têm itens
    FOR v_entrada IN
        SELECT 
            e.id as entrada_id,
            e.pedido_id,
            e.company_id
        FROM almoxarifado.entradas_materiais e
        WHERE e.pedido_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM almoxarifado.entrada_itens ei 
            WHERE ei.entrada_id = e.id
        )
    LOOP
        RAISE NOTICE 'Processando entrada: entrada_id=%, pedido_id=%', v_entrada.entrada_id, v_entrada.pedido_id;
        
        v_item_count := 0;
        
        -- Buscar itens do pedido
        FOR v_pedido_item IN
            SELECT 
                pi.id as pedido_item_id,
                pi.material_id,
                pi.quantidade,
                pi.valor_unitario,
                pi.valor_total,
                pi.observacoes
            FROM compras.pedido_itens pi
            WHERE pi.pedido_id = v_entrada.pedido_id
        LOOP
            -- Verificar se o material_equipamento existe
            SELECT id INTO v_material_equipamento_id
            FROM almoxarifado.materiais_equipamentos
            WHERE id = v_pedido_item.material_id
            AND company_id = v_entrada.company_id
            LIMIT 1;
            
            IF v_material_equipamento_id IS NULL THEN
                RAISE WARNING 'Material equipamento não encontrado: material_id=%, pedido_item_id=%', 
                    v_pedido_item.material_id, v_pedido_item.pedido_item_id;
                CONTINUE;
            END IF;
            
            -- Verificar se o item já existe
            IF EXISTS (
                SELECT 1 
                FROM almoxarifado.entrada_itens ei 
                WHERE ei.entrada_id = v_entrada.entrada_id
                AND ei.material_equipamento_id = v_material_equipamento_id
            ) THEN
                RAISE NOTICE 'Item já existe: entrada_id=%, material_equipamento_id=%', 
                    v_entrada.entrada_id, v_material_equipamento_id;
                CONTINUE;
            END IF;
            
            -- Criar item da entrada
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
                v_entrada.entrada_id,
                v_material_equipamento_id,
                v_pedido_item.quantidade::INTEGER,
                0,
                v_pedido_item.valor_unitario,
                v_pedido_item.valor_total,
                COALESCE(v_pedido_item.observacoes, 'Item do pedido'),
                v_entrada.company_id
            );
            
            v_item_count := v_item_count + 1;
            RAISE NOTICE 'Item criado: entrada_id=%, material_equipamento_id=%, quantidade=%', 
                v_entrada.entrada_id, v_material_equipamento_id, v_pedido_item.quantidade;
        END LOOP;
        
        RAISE NOTICE 'Entrada processada: entrada_id=%, itens_criados=%', v_entrada.entrada_id, v_item_count;
    END LOOP;
    
    RAISE NOTICE 'Processamento concluído!';
END $$;

-- Verificar resultados
SELECT 
    e.id as entrada_id,
    e.numero_nota,
    e.status,
    COUNT(ei.id) as total_itens
FROM almoxarifado.entradas_materiais e
LEFT JOIN almoxarifado.entrada_itens ei ON ei.entrada_id = e.id
WHERE e.pedido_id IS NOT NULL
GROUP BY e.id, e.numero_nota, e.status
ORDER BY e.created_at DESC;
