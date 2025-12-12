-- =====================================================
-- MIGRAÇÃO: Criar cotação automaticamente ao aprovar requisição
-- Data....: 2025-12-11
-- Descrição:
--   - Cria função para gerar número de cotação
--   - Cria função que cria ciclo de cotação automaticamente
--   - Cria trigger que executa quando requisição é aprovada
-- =====================================================

-- 1. FUNÇÃO PARA GERAR NÚMERO DE COTAÇÃO
-- =====================================================
CREATE OR REPLACE FUNCTION compras.gerar_numero_cotacao(p_company_id UUID)
RETURNS VARCHAR(50) 
LANGUAGE plpgsql
AS $$
DECLARE
    proximo_numero INTEGER;
    numero_formatado VARCHAR(50);
BEGIN
    -- Buscar próximo número de ciclo de cotação
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_cotacao FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM compras.cotacao_ciclos
    WHERE company_id = p_company_id;
    
    -- Formatar número
    numero_formatado := 'COT-' || LPAD(proximo_numero::TEXT, 6, '0');
    
    RETURN numero_formatado;
END;
$$;

COMMENT ON FUNCTION compras.gerar_numero_cotacao(UUID) IS 'Gera número sequencial de cotação para uma empresa';

-- 2. FUNÇÃO PARA CRIAR CICLO DE COTAÇÃO AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION compras.criar_cotacao_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cotacao_ciclo_id UUID;
    v_numero_cotacao VARCHAR(50);
    v_requisicao RECORD;
BEGIN
    -- Verificar se a requisição foi aprovada (status mudou para 'aprovada')
    IF NEW.status = 'aprovada'::compras.status_requisicao 
       AND (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_requisicao) THEN
        
        -- Obter dados da requisição
        SELECT * INTO v_requisicao
        FROM compras.requisicoes_compra
        WHERE id = NEW.id;
        
        -- Verificar se já existe um ciclo de cotação para esta requisição
        SELECT id INTO v_cotacao_ciclo_id
        FROM compras.cotacao_ciclos
        WHERE requisicao_id = NEW.id
        LIMIT 1;
        
        -- Se não existe, criar o ciclo de cotação
        IF v_cotacao_ciclo_id IS NULL THEN
            -- Gerar número de cotação
            v_numero_cotacao := compras.gerar_numero_cotacao(v_requisicao.company_id);
            
            -- Criar ciclo de cotação
            INSERT INTO compras.cotacao_ciclos (
                company_id,
                requisicao_id,
                numero_cotacao,
                status,
                workflow_state,
                prazo_resposta,
                observacoes
            ) VALUES (
                v_requisicao.company_id,
                NEW.id,
                v_numero_cotacao,
                'aberta',
                'aberta',
                v_requisicao.data_necessidade, -- Usar data de necessidade como prazo de resposta
                'Ciclo de cotação criado automaticamente após aprovação da requisição ' || v_requisicao.numero_requisicao
            )
            RETURNING id INTO v_cotacao_ciclo_id;
            
            -- Atualizar workflow_state da requisição para 'em_cotacao'
            UPDATE compras.requisicoes_compra
            SET workflow_state = 'em_cotacao',
                updated_at = NOW()
            WHERE id = NEW.id;
            
            -- Registrar no log de workflow
            INSERT INTO compras.workflow_logs (
                entity_type,
                entity_id,
                from_state,
                to_state,
                actor_id,
                payload
            ) VALUES (
                'requisicao_compra',
                NEW.id,
                'aprovada',
                'em_cotacao',
                NEW.aprovado_por,
                jsonb_build_object(
                    'cotacao_ciclo_id', v_cotacao_ciclo_id,
                    'numero_cotacao', v_numero_cotacao,
                    'criado_automaticamente', true
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.criar_cotacao_automatica() IS 'Cria automaticamente um ciclo de cotação quando uma requisição é aprovada';

-- 3. TRIGGER PARA EXECUTAR A FUNÇÃO
-- =====================================================
DROP TRIGGER IF EXISTS trigger_criar_cotacao_automatica ON compras.requisicoes_compra;

CREATE TRIGGER trigger_criar_cotacao_automatica
    AFTER UPDATE ON compras.requisicoes_compra
    FOR EACH ROW
    WHEN (NEW.status = 'aprovada'::compras.status_requisicao 
          AND (OLD.status IS NULL OR OLD.status != 'aprovada'::compras.status_requisicao))
    EXECUTE FUNCTION compras.criar_cotacao_automatica();

COMMENT ON TRIGGER trigger_criar_cotacao_automatica ON compras.requisicoes_compra IS 
'Cria automaticamente um ciclo de cotação quando uma requisição de compra é aprovada';

