-- =====================================================
-- MIGRAÇÃO: Corrigir função criar_pre_entrada_almoxarifado
-- Data: 2025-01-25
-- Descrição: 
--   - Corrige a busca de material_equipamento_id
--   - O material_id em pedido_itens referencia diretamente o ID de materiais_equipamentos
--   - Não deve buscar pelo campo material_id, mas sim pelo ID diretamente
-- =====================================================

CREATE OR REPLACE FUNCTION compras.criar_pre_entrada_almoxarifado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entrada_id UUID;
    v_pedido_item RECORD;
    v_fornecedor_dados RECORD;
    v_partner_id UUID;
    v_material_equipamento_id UUID;
    v_valor_total DECIMAL(15,2) := 0;
BEGIN
    -- Só processa se o pedido foi criado (INSERT) ou se mudou para status que indica que deve criar entrada
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'rascunho'::compras.status_pedido) THEN
        
        RAISE NOTICE '[criar_pre_entrada_almoxarifado] 🔵 INÍCIO - Criando pré-entrada para pedido: pedido_id=%, numero_pedido=%', 
            NEW.id, NEW.numero_pedido;
        
        -- Verificar se já existe entrada para este pedido
        SELECT id INTO v_entrada_id
        FROM almoxarifado.entradas_materiais
        WHERE pedido_id = NEW.id;
        
        IF v_entrada_id IS NOT NULL THEN
            RAISE NOTICE '[criar_pre_entrada_almoxarifado] ⚠️ Pré-entrada já existe para este pedido: entrada_id=%', v_entrada_id;
            RETURN NEW;
        END IF;
        
        -- Buscar dados do fornecedor para obter partner_id
        SELECT 
            fd.*,
            fd.partner_id
        INTO v_fornecedor_dados
        FROM compras.fornecedores_dados fd
        WHERE fd.id = NEW.fornecedor_id;
        
        IF NOT FOUND THEN
            RAISE WARNING '[criar_pre_entrada_almoxarifado] ⚠️ Fornecedor não encontrado: fornecedor_id=%', NEW.fornecedor_id;
            RETURN NEW;
        END IF;
        
        v_partner_id := v_fornecedor_dados.partner_id;
        
        IF v_partner_id IS NULL THEN
            RAISE WARNING '[criar_pre_entrada_almoxarifado] ⚠️ Fornecedor não tem partner_id associado: fornecedor_id=%', NEW.fornecedor_id;
            RETURN NEW;
        END IF;
        
        -- Calcular valor total dos itens do pedido
        SELECT COALESCE(SUM(valor_total), 0) INTO v_valor_total
        FROM compras.pedido_itens
        WHERE pedido_id = NEW.id;
        
        -- Criar pré-entrada de material (status = 'pendente' indica pré-entrada)
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
            NEW.company_id,
            NEW.id,
            v_partner_id,
            NULL, -- Número da nota será preenchido quando o material chegar
            COALESCE(NEW.data_entrega_prevista, CURRENT_DATE), -- Data prevista de entrega
            v_valor_total,
            'pendente', -- Status pendente = pré-entrada aguardando confirmação
            'Pré-entrada automática do pedido ' || NEW.numero_pedido || 
            CASE 
                WHEN NEW.observacoes IS NOT NULL THEN E'\n' || NEW.observacoes 
                ELSE '' 
            END,
            NOW()
        ) RETURNING id INTO v_entrada_id;
        
        RAISE NOTICE '[criar_pre_entrada_almoxarifado] ✅ Pré-entrada criada: entrada_id=%', v_entrada_id;
        
        -- Criar itens da pré-entrada baseados nos itens do pedido
        FOR v_pedido_item IN
            SELECT 
                pi.*,
                pi.material_id,
                pi.quantidade,
                pi.valor_unitario,
                pi.valor_total
            FROM compras.pedido_itens pi
            WHERE pi.pedido_id = NEW.id
        LOOP
            -- CORREÇÃO: O material_id em pedido_itens referencia diretamente o ID de materiais_equipamentos
            -- Verificar se o material_equipamento existe e pertence à empresa
            SELECT id INTO v_material_equipamento_id
            FROM almoxarifado.materiais_equipamentos
            WHERE id = v_pedido_item.material_id  -- Buscar pelo ID diretamente, não pelo campo material_id
            AND company_id = NEW.company_id
            AND status = 'ativo'
            LIMIT 1;
            
            -- Se não encontrou ativo, tentar buscar qualquer um (ativo ou inativo)
            IF v_material_equipamento_id IS NULL THEN
                SELECT id INTO v_material_equipamento_id
                FROM almoxarifado.materiais_equipamentos
                WHERE id = v_pedido_item.material_id  -- Buscar pelo ID diretamente
                AND company_id = NEW.company_id
                LIMIT 1;
            END IF;
            
            IF v_material_equipamento_id IS NULL THEN
                RAISE WARNING '[criar_pre_entrada_almoxarifado] ⚠️ Material equipamento não encontrado para material_id=%, pedido_item_id=%', 
                    v_pedido_item.material_id, v_pedido_item.id;
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
                COALESCE(v_pedido_item.observacoes, 'Item do pedido ' || NEW.numero_pedido),
                NEW.company_id
            );
            
            RAISE NOTICE '[criar_pre_entrada_almoxarifado] ✅ Item criado: material_equipamento_id=%, quantidade=%', 
                v_material_equipamento_id, v_pedido_item.quantidade;
        END LOOP;
        
        RAISE NOTICE '[criar_pre_entrada_almoxarifado] ✅ Pré-entrada criada com sucesso: entrada_id=%, pedido_id=%', 
            v_entrada_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_pre_entrada_almoxarifado() IS 
'Cria pré-entrada de materiais automaticamente quando um pedido de compra é criado. O material_id em pedido_itens referencia diretamente o ID de materiais_equipamentos.';
