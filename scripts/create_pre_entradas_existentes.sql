-- =====================================================
-- SCRIPT: Criar pré-entradas para pedidos de compra existentes
-- Data: 2025-01-25
-- Descrição: 
--   - Cria pré-entradas de materiais para todos os pedidos de compra
--     que já existem mas ainda não têm pré-entrada associada
--   - Segue a mesma lógica da função criar_pre_entrada_almoxarifado()
-- =====================================================

DO $$
DECLARE
    v_pedido RECORD;
    v_entrada_id UUID;
    v_pedido_item RECORD;
    v_fornecedor_dados RECORD;
    v_partner_id UUID;
    v_material_equipamento_id UUID;
    v_valor_total DECIMAL(15,2) := 0;
    v_entradas_criadas INTEGER := 0;
    v_entradas_ignoradas INTEGER := 0;
    v_erros INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INICIANDO CRIAÇÃO DE PRÉ-ENTRADAS';
    RAISE NOTICE '========================================';
    
    -- Processar cada pedido de compra que não tem pré-entrada
    FOR v_pedido IN
        SELECT 
            pc.*
        FROM compras.pedidos_compra pc
        WHERE NOT EXISTS (
            SELECT 1 
            FROM almoxarifado.entradas_materiais em
            WHERE em.pedido_id = pc.id
        )
        ORDER BY pc.created_at
    LOOP
        BEGIN
            RAISE NOTICE '----------------------------------------';
            RAISE NOTICE 'Processando pedido: id=%, numero_pedido=%, company_id=%', 
                v_pedido.id, v_pedido.numero_pedido, v_pedido.company_id;
            
            -- Buscar dados do fornecedor para obter partner_id
            SELECT 
                fd.*,
                fd.partner_id
            INTO v_fornecedor_dados
            FROM compras.fornecedores_dados fd
            WHERE fd.id = v_pedido.fornecedor_id;
            
            IF NOT FOUND THEN
                RAISE WARNING '⚠️ Fornecedor não encontrado: fornecedor_id=% (pedido: %)', 
                    v_pedido.fornecedor_id, v_pedido.numero_pedido;
                v_erros := v_erros + 1;
                CONTINUE;
            END IF;
            
            v_partner_id := v_fornecedor_dados.partner_id;
            
            IF v_partner_id IS NULL THEN
                RAISE WARNING '⚠️ Fornecedor não tem partner_id associado: fornecedor_id=% (pedido: %)', 
                    v_pedido.fornecedor_id, v_pedido.numero_pedido;
                v_erros := v_erros + 1;
                CONTINUE;
            END IF;
            
            -- Calcular valor total dos itens do pedido
            SELECT COALESCE(SUM(valor_total), 0) INTO v_valor_total
            FROM compras.pedido_itens
            WHERE pedido_id = v_pedido.id;
            
            -- Criar pré-entrada de material
            INSERT INTO almoxarifado.entradas_materiais (
                id,
                company_id,
                pedido_id,
                fornecedor_id,
                numero_nota,
                data_entrada,
                valor_total,
                status,
                observacoes,
                created_at
            ) VALUES (
                gen_random_uuid(),
                v_pedido.company_id,
                v_pedido.id,
                v_partner_id,
                NULL, -- Número da nota será preenchido quando o material chegar
                COALESCE(v_pedido.data_entrega_prevista, v_pedido.data_pedido, CURRENT_DATE),
                v_valor_total,
                'pendente', -- Status pendente = pré-entrada aguardando confirmação
                'Pré-entrada automática do pedido ' || v_pedido.numero_pedido || 
                CASE 
                    WHEN v_pedido.observacoes IS NOT NULL THEN E'\n' || v_pedido.observacoes 
                    ELSE '' 
                END,
                v_pedido.created_at -- Usar data de criação do pedido
            ) RETURNING id INTO v_entrada_id;
            
            RAISE NOTICE '✅ Pré-entrada criada: entrada_id=%', v_entrada_id;
            
            -- Criar itens da pré-entrada baseados nos itens do pedido
            FOR v_pedido_item IN
                SELECT 
                    pi.*,
                    pi.material_id,
                    pi.quantidade,
                    pi.valor_unitario,
                    pi.valor_total
                FROM compras.pedido_itens pi
                WHERE pi.pedido_id = v_pedido.id
            LOOP
                -- Buscar material_equipamento_id através do material_id
                -- Pode haver múltiplos materiais_equipamentos para o mesmo material_id
                -- Vamos pegar o primeiro ativo da mesma empresa
                SELECT id INTO v_material_equipamento_id
                FROM almoxarifado.materiais_equipamentos
                WHERE material_id = v_pedido_item.material_id
                AND company_id = v_pedido.company_id
                AND status = 'ativo'
                ORDER BY created_at DESC
                LIMIT 1;
                
                -- Se não encontrou, tentar buscar qualquer um (ativo ou inativo)
                IF v_material_equipamento_id IS NULL THEN
                    SELECT id INTO v_material_equipamento_id
                    FROM almoxarifado.materiais_equipamentos
                    WHERE material_id = v_pedido_item.material_id
                    AND company_id = v_pedido.company_id
                    ORDER BY created_at DESC
                    LIMIT 1;
                END IF;
                
                IF v_material_equipamento_id IS NULL THEN
                    RAISE WARNING '⚠️ Material equipamento não encontrado para material_id=%, pedido_item_id=% (pedido: %)', 
                        v_pedido_item.material_id, v_pedido_item.id, v_pedido.numero_pedido;
                    -- Continuar mesmo sem material_equipamento_id, mas não criar o item
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
                    v_entrada_id,
                    v_material_equipamento_id,
                    v_pedido_item.quantidade::INTEGER, -- Converter DECIMAL para INTEGER
                    0, -- Quantidade aprovada será preenchida quando o material chegar
                    v_pedido_item.valor_unitario,
                    v_pedido_item.valor_total,
                    COALESCE(v_pedido_item.observacoes, 'Item do pedido ' || v_pedido.numero_pedido),
                    v_pedido.company_id
                );
                
                RAISE NOTICE '  ✅ Item criado: material_equipamento_id=%, quantidade=%', 
                    v_material_equipamento_id, v_pedido_item.quantidade;
            END LOOP;
            
            v_entradas_criadas := v_entradas_criadas + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING '❌ Erro ao processar pedido %: %', v_pedido.numero_pedido, SQLERRM;
                v_erros := v_erros + 1;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMO:';
    RAISE NOTICE '  ✅ Pré-entradas criadas: %', v_entradas_criadas;
    RAISE NOTICE '  ⚠️  Erros encontrados: %', v_erros;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- VERIFICAÇÃO: Listar pedidos que ainda não têm pré-entrada
-- =====================================================
SELECT 
    pc.id,
    pc.numero_pedido,
    pc.company_id,
    pc.data_pedido,
    pc.status as status_pedido,
    CASE 
        WHEN em.id IS NOT NULL THEN '✅ Tem pré-entrada'
        ELSE '❌ Sem pré-entrada'
    END as status_pre_entrada,
    em.id as entrada_id,
    em.status as status_entrada
FROM compras.pedidos_compra pc
LEFT JOIN almoxarifado.entradas_materiais em ON em.pedido_id = pc.id
ORDER BY pc.created_at DESC;
