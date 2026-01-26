-- =====================================================
-- MIGRAÇÃO: Criar pré-entrada de materiais automaticamente quando pedido é criado
-- Data: 2025-01-25
-- Descrição: 
--   - Adiciona campo pedido_id em entradas_materiais para rastreabilidade
--   - Cria função que cria pré-entrada quando pedido é criado
--   - Cria trigger que chama a função automaticamente
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPO PEDIDO_ID EM ENTRADAS_MATERIAIS
-- =====================================================
ALTER TABLE almoxarifado.entradas_materiais
ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES compras.pedidos_compra(id) ON DELETE SET NULL;

COMMENT ON COLUMN almoxarifado.entradas_materiais.pedido_id IS 'ID do pedido de compra que originou esta entrada';

-- =====================================================
-- 2. FUNÇÃO: CRIAR PRÉ-ENTRADA AUTOMATICAMENTE APÓS CRIAÇÃO DO PEDIDO
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
    -- Por enquanto, vamos criar sempre que um pedido é criado
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
            -- Buscar material_equipamento_id através do material_id
            -- Pode haver múltiplos materiais_equipamentos para o mesmo material_id
            -- Vamos pegar o primeiro ativo da mesma empresa
            SELECT id INTO v_material_equipamento_id
            FROM almoxarifado.materiais_equipamentos
            WHERE material_id = v_pedido_item.material_id
            AND company_id = NEW.company_id
            AND status = 'ativo'
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- Se não encontrou, tentar buscar qualquer um (ativo ou inativo)
            IF v_material_equipamento_id IS NULL THEN
                SELECT id INTO v_material_equipamento_id
                FROM almoxarifado.materiais_equipamentos
                WHERE material_id = v_pedido_item.material_id
                AND company_id = NEW.company_id
                ORDER BY created_at DESC
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
'Cria pré-entrada de materiais automaticamente quando um pedido de compra é criado. A pré-entrada fica com status pendente aguardando confirmação quando o material chegar.';

-- =====================================================
-- 3. CRIAR TRIGGER PARA CRIAR PRÉ-ENTRADA APÓS CRIAÇÃO DO PEDIDO
-- =====================================================
DROP TRIGGER IF EXISTS trigger_criar_pre_entrada_almoxarifado ON compras.pedidos_compra;

CREATE TRIGGER trigger_criar_pre_entrada_almoxarifado
    AFTER INSERT ON compras.pedidos_compra
    FOR EACH ROW
    EXECUTE FUNCTION compras.criar_pre_entrada_almoxarifado();

COMMENT ON TRIGGER trigger_criar_pre_entrada_almoxarifado ON compras.pedidos_compra IS 
'Cria pré-entrada de materiais automaticamente quando um pedido de compra é criado. A pré-entrada permite que o almoxarifado confirme os itens quando o material chegar.';

-- =====================================================
-- 4. ADICIONAR COMPANY_ID EM ENTRADA_ITENS (se não existir)
-- =====================================================
ALTER TABLE almoxarifado.entrada_itens
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_entrada_itens_company_id ON almoxarifado.entrada_itens(company_id);
CREATE INDEX IF NOT EXISTS idx_entradas_materiais_pedido_id ON almoxarifado.entradas_materiais(pedido_id);

COMMENT ON COLUMN almoxarifado.entrada_itens.company_id IS 'ID da empresa para isolamento multi-tenant';
