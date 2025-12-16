-- =====================================================
-- MIGRAÇÃO: Atualizar criação de pedido para usar cotacao_ciclos
-- Data....: 2025-12-12
-- Descrição:
--   - Remove trigger antigo de compras.cotacoes
--   - Cria nova função que usa cotacao_ciclos e cotacao_fornecedores
--   - Cria pedido para cada fornecedor aprovado na cotação
-- =====================================================

-- =====================================================
-- 1. REMOVER TRIGGER ANTIGO
-- =====================================================
DROP TRIGGER IF EXISTS trigger_criar_pedido_apos_aprovacao_cotacao ON compras.cotacoes;

-- =====================================================
-- 2. NOVA FUNÇÃO: CRIAR PEDIDO APÓS APROVAÇÃO DE COTAÇÃO_CICLOS
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
        FOR v_fornecedor IN
            SELECT 
                cf.*,
                fd.razao_social,
                fd.nome_fantasia
            FROM compras.cotacao_fornecedores cf
            JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
            WHERE cf.cotacao_id = NEW.id
            AND cf.status = 'aprovada'
        LOOP
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Processando fornecedor aprovado: fornecedor_id=%, razao_social=%', 
                v_fornecedor.fornecedor_id, v_fornecedor.razao_social;
            
            -- Verificar se já existe pedido para este fornecedor nesta cotação
            -- Verificar por observações que contenham o número da cotação
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
            -- Usar o preço_total do fornecedor se disponível, senão calcular pela requisição
            IF v_fornecedor.preco_total IS NOT NULL AND v_fornecedor.preco_total > 0 THEN
                v_valor_total := v_fornecedor.preco_total;
            ELSE
                -- Calcular pela soma dos itens da requisição
                SELECT COALESCE(SUM(quantidade * COALESCE(valor_unitario_estimado, 0)), 0) INTO v_valor_total
                FROM compras.requisicao_itens
                WHERE requisicao_id = v_cotacao_ciclo.requisicao_id;
            END IF;
            
            -- Calcular valor final (sem desconto por enquanto, pois não há campo de desconto em cotacao_fornecedores)
            v_valor_final := v_valor_total;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Criando pedido: numero_pedido=%, fornecedor_id=%, valor_total=%, valor_final=%', 
                v_numero_pedido, v_fornecedor.fornecedor_id, v_valor_total, v_valor_final;
            
            -- Criar pedido de compra
            -- NOTA: A tabela pedidos_compra ainda referencia cotacoes.id, não cotacao_ciclos.id
            -- Por enquanto, vamos criar o pedido sem cotacao_id ou precisamos criar um registro em cotacoes
            -- Por enquanto, vamos deixar cotacao_id como NULL e adicionar uma observação
            INSERT INTO compras.pedidos_compra (
                id,
                cotacao_id, -- Pode ser NULL se não houver registro em cotacoes
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
                workflow_state
            ) VALUES (
                gen_random_uuid(),
                NULL, -- Não há registro em cotacoes para cotacao_ciclos
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
                0, -- desconto_percentual
                v_valor_final,
                COALESCE(
                    v_cotacao_ciclo.observacoes, 
                    'Pedido gerado automaticamente da cotação ' || COALESCE(v_cotacao_ciclo.numero_cotacao, 'N/A')
                ) || E'\n' || 
                COALESCE(v_fornecedor.condicoes_comerciais, ''),
                COALESCE(v_cotacao_ciclo.created_by, v_cotacao_ciclo.requisicao_created_by),
                'aberto'
            ) RETURNING id INTO v_pedido_id;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Pedido criado: pedido_id=%, numero_pedido=%', 
                v_pedido_id, v_numero_pedido;
            
            -- Copiar itens da requisição para o pedido
            FOR v_requisicao_item IN
                SELECT 
                    ri.*,
                    ri.quantidade,
                    COALESCE(ri.valor_unitario_estimado, 0) as valor_unitario,
                    (ri.quantidade * COALESCE(ri.valor_unitario_estimado, 0)) as valor_total
                FROM compras.requisicao_itens ri
                WHERE ri.requisicao_id = v_cotacao_ciclo.requisicao_id
            LOOP
                INSERT INTO compras.pedido_itens (
                    id,
                    pedido_id,
                    material_id,
                    quantidade,
                    valor_unitario,
                    valor_total,
                    observacoes,
                    created_by
                ) VALUES (
                    gen_random_uuid(),
                    v_pedido_id,
                    v_requisicao_item.material_id,
                    v_requisicao_item.quantidade,
                    v_requisicao_item.valor_unitario,
                    v_requisicao_item.valor_total,
                    COALESCE(v_requisicao_item.observacoes, 'Item da requisição ' || v_cotacao_ciclo.numero_cotacao),
                    COALESCE(v_cotacao_ciclo.created_by, v_cotacao_ciclo.requisicao_created_by)
                );
            END LOOP;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Itens do pedido criados para pedido_id=%', v_pedido_id;
            
            -- Criar conta a pagar automaticamente
            BEGIN
                PERFORM compras.criar_conta_pagar(
                    v_pedido_id,
                    v_cotacao_ciclo.company_id,
                    COALESCE(v_cotacao_ciclo.created_by, v_cotacao_ciclo.requisicao_created_by)
                );
                RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Conta a pagar criada para pedido_id=%', v_pedido_id;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ⚠️ Erro ao criar conta a pagar: %', SQLERRM;
            END;
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
            AND cc.status != 'aprovada'
            AND cc.status != 'reprovada'
        );
        
        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Processamento concluído para cotacao_ciclo_id=%', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos() IS 
'Cria pedido de compra e conta a pagar automaticamente quando cotacao_ciclos é aprovada. Cria um pedido para cada fornecedor aprovado na cotação.';

-- =====================================================
-- 3. CRIAR TRIGGER PARA COTAÇÃO_CICLOS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_criar_pedido_apos_aprovacao_cotacao_ciclos ON compras.cotacao_ciclos;

CREATE TRIGGER trigger_criar_pedido_apos_aprovacao_cotacao_ciclos
    AFTER UPDATE ON compras.cotacao_ciclos
    FOR EACH ROW
    WHEN (NEW.status = 'aprovada' 
          AND NEW.workflow_state = 'aprovada'
          AND (OLD.status IS NULL OR OLD.status != 'aprovada' OR OLD.workflow_state != 'aprovada'))
    EXECUTE FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos();

COMMENT ON TRIGGER trigger_criar_pedido_apos_aprovacao_cotacao_ciclos ON compras.cotacao_ciclos IS 
'Cria pedidos de compra automaticamente quando um ciclo de cotação é aprovado. Cria um pedido para cada fornecedor aprovado.';
