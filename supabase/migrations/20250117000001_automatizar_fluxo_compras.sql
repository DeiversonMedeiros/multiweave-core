-- =====================================================
-- AUTOMATIZAÇÃO DO FLUXO DE COMPRAS
-- Data: 2025-01-17
-- Descrição: Implementa automatização completa do fluxo de compras:
--   1. Requisição aprovada → Cria cotação automaticamente
--   2. Cotação aprovada → Cria pedido e conta a pagar automaticamente
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: CRIAR COTAÇÃO AUTOMATICAMENTE APÓS APROVAÇÃO DA REQUISIÇÃO
-- =====================================================
-- Esta função será chamada quando uma requisição for totalmente aprovada
-- e o workflow_state mudar para 'em_cotacao'
-- 
-- NOTA: A criação automática de cotação requer que o usuário tenha
-- selecionado fornecedores. Por isso, esta função cria uma "cotação base"
-- que pode ser completada pelo comprador na página de cotações.
-- 
-- Alternativa: Podemos criar apenas um registro de "cotação pendente" 
-- que será preenchido manualmente, ou podemos criar cotações para 
-- fornecedores sugeridos automaticamente.

-- Por enquanto, vamos criar uma função que prepara a requisição para cotação
-- mas não cria a cotação automaticamente, pois requer seleção de fornecedores.
-- A requisição ficará em 'em_cotacao' e o comprador criará as cotações manualmente.

-- =====================================================
-- 2. FUNÇÃO: CRIAR PEDIDO AUTOMATICAMENTE APÓS APROVAÇÃO DA COTAÇÃO
-- =====================================================
CREATE OR REPLACE FUNCTION compras.criar_pedido_apos_aprovacao_cotacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id UUID;
    v_cotacao RECORD;
    v_item RECORD;
    v_numero_pedido VARCHAR(50);
    v_valor_total DECIMAL(15,2) := 0;
    v_valor_final DECIMAL(15,2) := 0;
BEGIN
    -- Só processa se o status mudou para 'aprovada'
    IF NEW.status = 'aprovada'::compras.status_cotacao 
       AND (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_cotacao) THEN
        
        -- Buscar dados da cotação e da requisição (para obter company_id)
        SELECT 
            c.*,
            rc.company_id,
            rc.created_by as requisicao_created_by
        INTO v_cotacao
        FROM compras.cotacoes c
        JOIN compras.requisicoes_compra rc ON rc.id = c.requisicao_id
        WHERE c.id = NEW.id;
        
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;
        
        -- Verificar se já existe pedido para esta cotação
        SELECT id INTO v_pedido_id
        FROM compras.pedidos_compra
        WHERE cotacao_id = NEW.id;
        
        -- Se já existe pedido, não criar novamente
        IF v_pedido_id IS NOT NULL THEN
            RETURN NEW;
        END IF;
        
        -- Gerar número do pedido
        SELECT compras.gerar_numero_pedido(v_cotacao.company_id) INTO v_numero_pedido;
        
        -- Calcular valor total dos itens
        SELECT COALESCE(SUM(quantidade * valor_unitario), 0) INTO v_valor_total
        FROM compras.cotacao_itens
        WHERE cotacao_id = NEW.id;
        
        -- Calcular valor final (com desconto)
        v_valor_final := v_valor_total * (1 - COALESCE(v_cotacao.desconto_percentual, 0) / 100);
        
        -- Criar pedido de compra
        INSERT INTO compras.pedidos_compra (
            id,
            cotacao_id,
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
            NEW.id,
            v_cotacao.fornecedor_id,
            v_cotacao.company_id,
            v_numero_pedido,
            CURRENT_DATE,
            CASE 
                WHEN v_cotacao.prazo_entrega IS NOT NULL 
                THEN CURRENT_DATE + (v_cotacao.prazo_entrega || ' days')::INTERVAL
                ELSE CURRENT_DATE + INTERVAL '30 days'
            END,
            'rascunho'::compras.status_pedido,
            v_valor_total,
            COALESCE(v_cotacao.desconto_percentual, 0),
            v_valor_final,
            COALESCE(v_cotacao.observacoes, 'Pedido gerado automaticamente da cotação ' || COALESCE(v_cotacao.numero_cotacao, 'N/A')),
            COALESCE(v_cotacao.created_by, v_cotacao.requisicao_created_by),
            'aberto'
        ) RETURNING id INTO v_pedido_id;
        
        -- Copiar itens da cotação para o pedido
        FOR v_item IN
            SELECT * FROM compras.cotacao_itens
            WHERE cotacao_id = NEW.id
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
                v_item.material_id,
                v_item.quantidade,
                v_item.valor_unitario,
                v_item.valor_total,
                COALESCE(v_item.observacoes, 'Item da cotação'),
                COALESCE(v_cotacao.created_by, v_cotacao.requisicao_created_by)
            );
        END LOOP;
        
        -- Criar conta a pagar automaticamente
        PERFORM compras.criar_conta_pagar(
            v_pedido_id,
            v_cotacao.company_id,
            COALESCE(v_cotacao.created_by, v_cotacao.requisicao_created_by)
        );
        
        -- Atualizar status da requisição para 'em_pedido' se todas as cotações foram processadas
        UPDATE compras.requisicoes_compra
        SET 
            status = 'em_pedido'::compras.status_requisicao,
            workflow_state = 'em_pedido',
            updated_at = NOW()
        WHERE id = v_cotacao.requisicao_id
        AND NOT EXISTS (
            SELECT 1 FROM compras.cotacoes c
            WHERE c.requisicao_id = v_cotacao.requisicao_id
            AND c.status != 'aprovada'::compras.status_cotacao
            AND c.status != 'rejeitada'::compras.status_cotacao
        );
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_pedido_apos_aprovacao_cotacao IS 
'Cria pedido de compra e conta a pagar automaticamente quando cotação é aprovada';

-- =====================================================
-- 3. TRIGGER: CRIAR PEDIDO APÓS APROVAÇÃO DA COTAÇÃO
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_criar_pedido_apos_aprovacao_cotacao
    AFTER UPDATE ON compras.cotacoes
    FOR EACH ROW
    WHEN (NEW.status = 'aprovada'::compras.status_cotacao 
          AND (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_cotacao))
    EXECUTE FUNCTION compras.criar_pedido_apos_aprovacao_cotacao();

-- =====================================================
-- 4. FUNÇÃO: CRIAR CONTA A PAGAR AUTOMATICAMENTE APÓS CRIAÇÃO DO PEDIDO
-- =====================================================
-- Esta função já existe (compras.criar_conta_pagar), mas vamos criar
-- um trigger que a chama automaticamente quando um pedido é criado
-- com status 'aprovado' ou quando muda para 'aprovado'

CREATE OR REPLACE FUNCTION compras.criar_conta_pagar_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conta_id UUID;
BEGIN
    -- Só cria conta a pagar se o pedido está aprovado
    -- e não foi criado a partir de uma cotação (já tem conta criada)
    IF NEW.status = 'aprovado'::compras.status_pedido THEN
        -- Verificar se já existe conta a pagar para este pedido
        SELECT id INTO v_conta_id
        FROM financeiro.contas_pagar
        WHERE observacoes LIKE '%Pedido de Compra ' || NEW.numero_pedido || '%'
        LIMIT 1;
        
        -- Se não existe, criar
        IF v_conta_id IS NULL THEN
            PERFORM compras.criar_conta_pagar(
                NEW.id,
                NEW.company_id,
                NEW.created_by
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_conta_pagar_automatica IS 
'Cria conta a pagar automaticamente quando pedido é aprovado';

-- =====================================================
-- 5. TRIGGER: CRIAR CONTA A PAGAR APÓS APROVAÇÃO DO PEDIDO
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_criar_conta_pagar_apos_aprovacao_pedido
    AFTER INSERT OR UPDATE ON compras.pedidos_compra
    FOR EACH ROW
    WHEN (NEW.status = 'aprovado'::compras.status_pedido)
    EXECUTE FUNCTION compras.criar_conta_pagar_automatica();

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. A criação automática de COTAÇÃO após aprovação da requisição
--    não foi implementada porque requer seleção manual de fornecedores.
--    A requisição ficará em 'em_cotacao' e o comprador criará as cotações
--    manualmente na página de cotações.
--
-- 2. A criação automática de PEDIDO após aprovação da cotação foi
--    implementada. Cada cotação aprovada gera um pedido automaticamente.
--
-- 3. A criação automática de CONTA A PAGAR após criação do pedido foi
--    implementada. Quando um pedido é criado ou aprovado, uma conta
--    a pagar é criada automaticamente.
--
-- 4. O status da requisição é atualizado para 'em_pedido' quando todas
--    as cotações da requisição foram aprovadas ou rejeitadas.

