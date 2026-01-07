-- =====================================================
-- MIGRAÇÃO: Implementar Opção 3 - Cotações Separadas + Finalização Automática
-- Data: 2026-01-06
-- Descrição:
--   - Remove constraint única que impede múltiplas cotações ativas
--   - Adiciona status 'finalizada' e 'finalizado' para cotações e pedidos
--   - Cria trigger de finalização automática quando conta a pagar é paga
--   - Modifica criação de pedidos para incluir apenas itens do ciclo específico
-- =====================================================

-- =====================================================
-- 1. REMOVER CONSTRAINT ÚNICA PARCIAL
-- =====================================================
-- Remove a constraint que impede múltiplas cotações ativas por requisição
-- Agora permitiremos múltiplas cotações desde que sejam para itens diferentes
DROP INDEX IF EXISTS compras.idx_cotacao_ciclos_requisicao_ativa;

COMMENT ON INDEX compras.idx_cotacao_ciclos_requisicao_ativa IS 
'Índice removido para permitir múltiplas cotações ativas por requisição (para itens diferentes). Validação agora é feita na aplicação.';

-- =====================================================
-- 2. ADICIONAR STATUS 'finalizada' E 'finalizado'
-- =====================================================

-- Adicionar 'finalizada' ao CHECK constraint de cotacao_ciclos
ALTER TABLE compras.cotacao_ciclos
DROP CONSTRAINT IF EXISTS cotacao_ciclos_status_check;

ALTER TABLE compras.cotacao_ciclos
ADD CONSTRAINT cotacao_ciclos_status_check 
CHECK (status = ANY(ARRAY['aberta','completa','em_aprovacao','aprovada','reprovada','em_pedido','finalizada']));

COMMENT ON CONSTRAINT cotacao_ciclos_status_check ON compras.cotacao_ciclos IS 
'Status da cotação: aberta, completa, em_aprovacao, aprovada, reprovada, em_pedido, finalizada';

-- Adicionar 'finalizado' ao CHECK constraint de pedidos_compra
-- Primeiro, verificar se o tipo existe
DO $$
BEGIN
    -- Verificar se o tipo status_pedido existe e adicionar 'finalizado' se necessário
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'status_pedido' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'compras')
    ) THEN
        -- Se o tipo existe, precisamos alterá-lo
        -- Mas como é um ENUM, precisamos adicionar o valor
        ALTER TYPE compras.status_pedido ADD VALUE IF NOT EXISTS 'finalizado';
    ELSE
        -- Se não existe, verificar se é um CHECK constraint
        -- Adicionar 'finalizado' ao CHECK constraint se existir
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'pedidos_compra_status_check'
            AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'compras')
        ) THEN
            ALTER TABLE compras.pedidos_compra
            DROP CONSTRAINT IF EXISTS pedidos_compra_status_check;
            
            ALTER TABLE compras.pedidos_compra
            ADD CONSTRAINT pedidos_compra_status_check
            CHECK (status = ANY(ARRAY['rascunho','pendente','aprovado','em_andamento','entregue','cancelado','finalizado']));
        END IF;
    END IF;
END $$;

-- Garantir que a coluna workflow_state também aceite 'finalizado'
-- Se workflow_state for TEXT, não precisa de alteração
-- Se for um tipo ENUM, precisamos adicionar o valor

-- =====================================================
-- 3. ADICIONAR CAMPO cotacao_ciclo_id EM pedidos_compra
-- =====================================================
-- Adicionar campo para rastreabilidade (obrigatório para nova funcionalidade)
ALTER TABLE compras.pedidos_compra
ADD COLUMN IF NOT EXISTS cotacao_ciclo_id UUID REFERENCES compras.cotacao_ciclos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_cotacao_ciclo_id 
ON compras.pedidos_compra(cotacao_ciclo_id);

COMMENT ON COLUMN compras.pedidos_compra.cotacao_ciclo_id IS 
'Referência ao ciclo de cotação que gerou este pedido. Permite rastreabilidade completa. Obrigatório para nova funcionalidade de cotações separadas.';

-- =====================================================
-- 4. FUNÇÃO: FINALIZAR COTAÇÃO E PEDIDO QUANDO CONTA É PAGA
-- =====================================================
CREATE OR REPLACE FUNCTION compras.finalizar_cotacao_ao_pagar_conta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id UUID;
    v_cotacao_ciclo_id UUID;
    v_pedidos_pendentes INTEGER;
    v_descricao_pedido TEXT;
    v_numero_pedido_extraido TEXT;
BEGIN
    -- Só processa se o status mudou para 'pago'
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago') THEN
        RAISE NOTICE '[finalizar_cotacao_ao_pagar_conta] Conta a pagar marcada como paga: conta_id=%', NEW.id;
        
        -- Buscar pedido relacionado pela descrição
        -- A descrição geralmente contém "Pedido de Compra {numero_pedido}"
        v_descricao_pedido := NEW.descricao;
        
        -- Extrair número do pedido da descrição (formato: "Pedido de Compra {numero}")
        IF v_descricao_pedido LIKE 'Pedido de Compra%' THEN
            -- Tentar extrair número do pedido da descrição
            -- Formato esperado: "Pedido de Compra {numero_pedido}"
            BEGIN
                -- Extrair número do pedido (tudo após "Pedido de Compra ")
                v_numero_pedido_extraido := TRIM(SUBSTRING(v_descricao_pedido FROM 'Pedido de Compra (.+)'));
                
                -- Buscar pedido pelo número extraído ou pela descrição nas observações
                SELECT p.id, p.cotacao_ciclo_id
                INTO v_pedido_id, v_cotacao_ciclo_id
                FROM compras.pedidos_compra p
                WHERE (p.numero_pedido = v_numero_pedido_extraido
                   OR p.observacoes LIKE '%' || v_descricao_pedido || '%'
                   OR p.observacoes LIKE '%' || v_numero_pedido_extraido || '%')
                LIMIT 1;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Se falhar, tentar busca mais simples
                    SELECT id INTO v_pedido_id
                    FROM compras.pedidos_compra
                    WHERE observacoes LIKE '%' || v_descricao_pedido || '%'
                    LIMIT 1;
                    
                    -- Se encontrou, buscar cotacao_ciclo_id (pode não existir em pedidos antigos)
                    IF v_pedido_id IS NOT NULL THEN
                        BEGIN
                            SELECT cotacao_ciclo_id INTO v_cotacao_ciclo_id
                            FROM compras.pedidos_compra
                            WHERE id = v_pedido_id;
                        EXCEPTION
                            WHEN undefined_column THEN
                                v_cotacao_ciclo_id := NULL;
                        END;
                    END IF;
            END;
            
            -- Se encontrou pedido, finalizá-lo
            IF v_pedido_id IS NOT NULL THEN
                RAISE NOTICE '[finalizar_cotacao_ao_pagar_conta] Pedido encontrado: pedido_id=%, cotacao_ciclo_id=%', 
                    v_pedido_id, v_cotacao_ciclo_id;
                
                -- Finalizar pedido
                UPDATE compras.pedidos_compra
                SET 
                    status = CASE 
                        WHEN status::text = ANY(ARRAY['rascunho','pendente','aprovado','em_andamento']) 
                        THEN 'finalizado'::compras.status_pedido
                        ELSE status
                    END,
                    workflow_state = CASE 
                        WHEN workflow_state IN ('aberto', 'aprovado', 'em_andamento')
                        THEN 'finalizado'
                        ELSE workflow_state
                    END,
                    updated_at = NOW()
                WHERE id = v_pedido_id
                AND status NOT IN ('finalizado', 'cancelado');
                
                RAISE NOTICE '[finalizar_cotacao_ao_pagar_conta] ✅ Pedido finalizado: pedido_id=%', v_pedido_id;
                
                -- Se temos cotacao_ciclo_id, verificar se todos os pedidos da cotação foram finalizados
                IF v_cotacao_ciclo_id IS NOT NULL THEN
                    -- Contar pedidos pendentes desta cotação
                    SELECT COUNT(*) INTO v_pedidos_pendentes
                    FROM compras.pedidos_compra
                    WHERE cotacao_ciclo_id = v_cotacao_ciclo_id
                    AND status NOT IN ('finalizado', 'cancelado');
                    
                    RAISE NOTICE '[finalizar_cotacao_ao_pagar_conta] Pedidos pendentes da cotação: %', v_pedidos_pendentes;
                    
                    -- Se todos os pedidos foram finalizados, finalizar a cotação
                    IF v_pedidos_pendentes = 0 THEN
                        UPDATE compras.cotacao_ciclos
                        SET 
                            status = 'finalizada',
                            workflow_state = 'finalizada',
                            updated_at = NOW()
                        WHERE id = v_cotacao_ciclo_id
                        AND status != 'finalizada';
                        
                        RAISE NOTICE '[finalizar_cotacao_ao_pagar_conta] ✅ Cotação finalizada: cotacao_ciclo_id=%', v_cotacao_ciclo_id;
                    END IF;
                END IF;
            ELSE
                RAISE NOTICE '[finalizar_cotacao_ao_pagar_conta] ⚠️ Pedido não encontrado para conta: conta_id=%', NEW.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.finalizar_cotacao_ao_pagar_conta() IS 
'Finaliza automaticamente pedido e cotação quando conta a pagar é marcada como paga. Garante rastreabilidade e histórico.';

-- =====================================================
-- 5. CRIAR TRIGGER PARA FINALIZAÇÃO AUTOMÁTICA
-- =====================================================
DROP TRIGGER IF EXISTS trigger_finalizar_cotacao_ao_pagar_conta ON financeiro.contas_pagar;

CREATE TRIGGER trigger_finalizar_cotacao_ao_pagar_conta
    AFTER UPDATE OF status ON financeiro.contas_pagar
    FOR EACH ROW
    WHEN (NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago'))
    EXECUTE FUNCTION compras.finalizar_cotacao_ao_pagar_conta();

COMMENT ON TRIGGER trigger_finalizar_cotacao_ao_pagar_conta ON financeiro.contas_pagar IS 
'Finaliza automaticamente pedido e cotação quando conta a pagar é paga.';

-- =====================================================
-- 6. MODIFICAR FUNÇÃO criar_pedido_apos_aprovacao_cotacao_ciclos
-- =====================================================
-- Atualizar para criar pedidos apenas com itens do ciclo específico
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
            SELECT id INTO v_pedido_id
            FROM compras.pedidos_compra
            WHERE cotacao_ciclo_id = NEW.id
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
            
            -- ✅ MUDANÇA: Calcular valor total apenas dos itens COTADOS neste ciclo específico
            -- Usar cotacao_item_fornecedor para identificar quais itens foram cotados
            SELECT COALESCE(SUM(cif.valor_total_calculado), 0) INTO v_valor_total
            FROM compras.cotacao_item_fornecedor cif
            INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
            WHERE cf.cotacao_id = NEW.id
            AND cf.fornecedor_id = v_fornecedor.fornecedor_id
            AND cf.status = 'aprovada';
            
            -- Se não encontrou valor em cotacao_item_fornecedor, usar preco_total do fornecedor
            IF v_valor_total = 0 AND v_fornecedor.preco_total IS NOT NULL AND v_fornecedor.preco_total > 0 THEN
                v_valor_total := v_fornecedor.preco_total;
            END IF;
            
            -- Calcular valor final (sem desconto por enquanto)
            v_valor_final := v_valor_total;
            
            RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] Criando pedido: numero_pedido=%, fornecedor_id=%, valor_total=%, valor_final=%', 
                v_numero_pedido, v_fornecedor.fornecedor_id, v_valor_total, v_valor_final;
            
            -- Criar pedido de compra
            INSERT INTO compras.pedidos_compra (
                id,
                cotacao_id, -- Pode ser NULL
                cotacao_ciclo_id, -- ✅ NOVO: Referência ao ciclo de cotação
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
                NULL,
                NEW.id, -- ✅ NOVO: Referência ao ciclo
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
            
            -- ✅ MUDANÇA CRÍTICA: Copiar apenas itens que foram COTADOS neste ciclo específico
            -- Filtrar por cotacao_item_fornecedor vinculado aos fornecedores aprovados
            FOR v_requisicao_item IN
                SELECT DISTINCT
                    ri.id,
                    ri.material_id,
                    ri.quantidade,
                    COALESCE(cif.valor_unitario, ri.valor_unitario_estimado, 0) as valor_unitario,
                    COALESCE(
                        cif.valor_total_calculado,
                        (ri.quantidade * COALESCE(cif.valor_unitario, ri.valor_unitario_estimado, 0))
                    ) as valor_total,
                    ri.observacoes
                FROM compras.requisicao_itens ri
                INNER JOIN compras.cotacao_item_fornecedor cif ON cif.requisicao_item_id = ri.id
                INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
                WHERE cf.cotacao_id = NEW.id
                AND cf.fornecedor_id = v_fornecedor.fornecedor_id
                AND cf.status = 'aprovada'
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
                    COALESCE(v_requisicao_item.observacoes, 'Item da cotação ' || v_cotacao_ciclo.numero_cotacao),
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
        
        -- Atualizar status da cotação para 'em_pedido' após criar os pedidos
        UPDATE compras.cotacao_ciclos
        SET 
            status = 'em_pedido',
            workflow_state = 'em_pedido',
            updated_at = NOW()
        WHERE id = NEW.id;
        
        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Status da cotação atualizado para em_pedido: cotacao_ciclo_id=%', NEW.id;
        
        -- ✅ MUDANÇA: Atualizar status da requisição apenas se TODOS os itens foram cotados e processados
        -- Verificar se todos os itens da requisição têm status 'cotado' ou estão em pedidos finalizados
        UPDATE compras.requisicoes_compra
        SET 
            status = 'em_pedido'::compras.status_requisicao,
            workflow_state = 'em_pedido',
            updated_at = NOW()
        WHERE id = v_cotacao_ciclo.requisicao_id
        AND NOT EXISTS (
            -- Verificar se há itens que ainda não foram cotados
            SELECT 1 
            FROM compras.requisicao_itens ri
            WHERE ri.requisicao_id = v_cotacao_ciclo.requisicao_id
            AND ri.status NOT IN ('cotado', 'aprovado')
            AND NOT EXISTS (
                -- Verificar se o item está em alguma cotação ativa
                SELECT 1
                FROM compras.cotacao_item_fornecedor cif
                INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
                INNER JOIN compras.cotacao_ciclos cc ON cc.id = cf.cotacao_id
                WHERE cif.requisicao_item_id = ri.id
                AND cc.workflow_state NOT IN ('finalizada', 'reprovada', 'cancelada')
            )
        );
        
        RAISE NOTICE '[criar_pedido_apos_aprovacao_cotacao_ciclos] ✅ Processamento concluído para cotacao_ciclo_id=%', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_pedido_apos_aprovacao_cotacao_ciclos() IS 
'Cria pedido de compra e conta a pagar automaticamente quando cotacao_ciclos é aprovada. Cria pedidos apenas com itens cotados no ciclo específico. Atualizado para suportar múltiplas cotações por requisição.';

-- =====================================================
-- 7. ATUALIZAR STATUS DOS ITENS DE REQUISIÇÃO
-- =====================================================
-- Função auxiliar para atualizar status dos itens quando são cotados
CREATE OR REPLACE FUNCTION compras.atualizar_status_item_requisicao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Quando um item é adicionado a uma cotação (cotacao_item_fornecedor),
    -- atualizar o status do item da requisição para 'cotado'
    IF TG_OP = 'INSERT' THEN
        UPDATE compras.requisicao_itens
        SET status = 'cotado',
            updated_at = NOW()
        WHERE id = NEW.requisicao_item_id
        AND status != 'cotado';
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.atualizar_status_item_requisicao() IS 
'Atualiza status do item de requisição para "cotado" quando é adicionado a uma cotação.';

-- Criar trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_status_item_requisicao ON compras.cotacao_item_fornecedor;

CREATE TRIGGER trigger_atualizar_status_item_requisicao
    AFTER INSERT ON compras.cotacao_item_fornecedor
    FOR EACH ROW
    EXECUTE FUNCTION compras.atualizar_status_item_requisicao();

COMMENT ON TRIGGER trigger_atualizar_status_item_requisicao ON compras.cotacao_item_fornecedor IS 
'Atualiza status do item de requisição automaticamente quando é adicionado a uma cotação.';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

