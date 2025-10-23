-- =====================================================
-- INTEGRAÇÕES DO MÓDULO COMPRAS
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Funções de integração entre compras e outros módulos
-- =====================================================

-- =====================================================
-- FUNÇÃO: CRIAR ENTRADA NO ALMOXARIFADO
-- =====================================================

CREATE OR REPLACE FUNCTION compras.criar_entrada_almoxarifado(
    p_pedido_id UUID,
    p_company_id UUID,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_entrada_id UUID;
    v_pedido compras.pedidos_compra%ROWTYPE;
    v_item compras.pedido_itens%ROWTYPE;
BEGIN
    -- Buscar dados do pedido
    SELECT * INTO v_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado';
    END IF;
    
    -- Criar entrada de material
    INSERT INTO almoxarifado.entradas_materiais (
        id, company_id, fornecedor_id, numero_documento, data_entrada,
        tipo_entrada, status, observacoes, created_by
    ) VALUES (
        gen_random_uuid(), p_company_id, v_pedido.fornecedor_id, 
        v_pedido.numero_pedido, CURRENT_DATE, 'compra', 'pendente',
        'Entrada automática do pedido ' || v_pedido.numero_pedido, p_created_by
    ) RETURNING id INTO v_entrada_id;
    
    -- Criar itens da entrada
    FOR v_item IN 
        SELECT pi.*, pi.quantidade as quantidade_entrada
        FROM compras.pedido_itens pi
        WHERE pi.pedido_id = p_pedido_id
    LOOP
        INSERT INTO almoxarifado.entrada_itens (
            id, entrada_id, material_id, quantidade, valor_unitario,
            valor_total, observacoes, created_by
        ) VALUES (
            gen_random_uuid(), v_entrada_id, v_item.material_id,
            v_item.quantidade, v_item.valor_unitario, v_item.valor_total,
            'Item do pedido ' || v_pedido.numero_pedido, p_created_by
        );
    END LOOP;
    
    -- Atualizar status do pedido
    UPDATE compras.pedidos_compra
    SET status = 'confirmado', updated_at = NOW()
    WHERE id = p_pedido_id;
    
    RETURN v_entrada_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.criar_entrada_almoxarifado IS 'Cria entrada automática no almoxarifado quando pedido é aprovado';

-- =====================================================
-- FUNÇÃO: CRIAR CONTA A PAGAR
-- =====================================================

CREATE OR REPLACE FUNCTION compras.criar_conta_pagar(
    p_pedido_id UUID,
    p_company_id UUID,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_conta_id UUID;
    v_pedido compras.pedidos_compra%ROWTYPE;
    v_fornecedor compras.fornecedores_dados%ROWTYPE;
    v_partner public.partners%ROWTYPE;
BEGIN
    -- Buscar dados do pedido
    SELECT * INTO v_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado';
    END IF;
    
    -- Buscar dados do fornecedor
    SELECT * INTO v_fornecedor
    FROM compras.fornecedores_dados
    WHERE id = v_pedido.fornecedor_id;
    
    -- Buscar dados do partner
    SELECT * INTO v_partner
    FROM public.partners
    WHERE id = v_fornecedor.partner_id;
    
    -- Criar conta a pagar
    INSERT INTO financeiro.contas_pagar (
        id, company_id, fornecedor_id, descricao, valor_original,
        valor_atual, data_vencimento, status, observacoes, created_by
    ) VALUES (
        gen_random_uuid(), p_company_id, v_partner.id,
        'Pedido de Compra ' || v_pedido.numero_pedido,
        v_pedido.valor_final, v_pedido.valor_final,
        CURRENT_DATE + INTERVAL '30 days', 'pendente',
        'Conta gerada automaticamente do pedido ' || v_pedido.numero_pedido,
        p_created_by
    ) RETURNING id INTO v_conta_id;
    
    RETURN v_conta_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.criar_conta_pagar IS 'Cria conta a pagar automaticamente quando pedido é aprovado';

-- =====================================================
-- FUNÇÃO: ATUALIZAR HISTÓRICO DE PREÇOS
-- =====================================================

CREATE OR REPLACE FUNCTION compras.atualizar_historico_precos(
    p_cotacao_id UUID,
    p_company_id UUID
) RETURNS VOID AS $$
DECLARE
    v_cotacao compras.cotacoes%ROWTYPE;
    v_item compras.cotacao_itens%ROWTYPE;
BEGIN
    -- Buscar dados da cotação
    SELECT * INTO v_cotacao
    FROM compras.cotacoes
    WHERE id = p_cotacao_id AND status = 'aprovada';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotação aprovada não encontrada';
    END IF;
    
    -- Inserir preços no histórico
    FOR v_item IN 
        SELECT ci.*
        FROM compras.cotacao_itens ci
        WHERE ci.cotacao_id = p_cotacao_id
    LOOP
        INSERT INTO compras.historico_precos (
            id, material_id, fornecedor_id, company_id, valor_unitario,
            quantidade, cotacao_id, data_cotacao, observacoes
        ) VALUES (
            gen_random_uuid(), v_item.material_id, v_cotacao.fornecedor_id,
            p_company_id, v_item.valor_unitario, v_item.quantidade,
            p_cotacao_id, v_cotacao.data_cotacao,
            'Preço da cotação ' || v_cotacao.numero_cotacao
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.atualizar_historico_precos IS 'Atualiza histórico de preços quando cotação é aprovada';

-- =====================================================
-- FUNÇÃO: ATUALIZAR AVALIAÇÃO DE FORNECEDOR
-- =====================================================

CREATE OR REPLACE FUNCTION compras.atualizar_avaliacao_fornecedor(
    p_pedido_id UUID,
    p_avaliador_id UUID,
    p_nota_prazo DECIMAL,
    p_nota_qualidade DECIMAL,
    p_nota_preco DECIMAL,
    p_nota_atendimento DECIMAL,
    p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_avaliacao_id UUID;
    v_pedido compras.pedidos_compra%ROWTYPE;
    v_media DECIMAL;
BEGIN
    -- Buscar dados do pedido
    SELECT * INTO v_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado';
    END IF;
    
    -- Calcular média
    v_media := (p_nota_prazo + p_nota_qualidade + p_nota_preco + p_nota_atendimento) / 4;
    
    -- Criar avaliação
    INSERT INTO compras.avaliacoes_fornecedor (
        id, fornecedor_id, pedido_id, avaliador_id, company_id,
        nota_prazo, nota_qualidade, nota_preco, nota_atendimento,
        observacoes, data_avaliacao
    ) VALUES (
        gen_random_uuid(), v_pedido.fornecedor_id, p_pedido_id, p_avaliador_id,
        v_pedido.company_id, p_nota_prazo, p_nota_qualidade, p_nota_preco,
        p_nota_atendimento, p_observacoes, CURRENT_DATE
    ) RETURNING id INTO v_avaliacao_id;
    
    -- Atualizar média do fornecedor
    UPDATE compras.fornecedores_dados
    SET 
        nota_media = (
            SELECT AVG(media_geral) 
            FROM compras.avaliacoes_fornecedor 
            WHERE fornecedor_id = v_pedido.fornecedor_id
        ),
        total_avaliacoes = (
            SELECT COUNT(*) 
            FROM compras.avaliacoes_fornecedor 
            WHERE fornecedor_id = v_pedido.fornecedor_id
        ),
        updated_at = NOW()
    WHERE id = v_pedido.fornecedor_id;
    
    RETURN v_avaliacao_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.atualizar_avaliacao_fornecedor IS 'Atualiza avaliação de fornecedor após entrega do pedido';

-- =====================================================
-- FUNÇÃO: SUGERIR FORNECEDORES POR UF
-- =====================================================

CREATE OR REPLACE FUNCTION compras.sugerir_fornecedores_uf(
    p_uf VARCHAR(2),
    p_company_id UUID,
    p_material_id UUID DEFAULT NULL
) RETURNS TABLE (
    fornecedor_id UUID,
    partner_id UUID,
    nome VARCHAR,
    email_cotacao VARCHAR,
    telefone VARCHAR,
    cidade VARCHAR,
    nota_media DECIMAL,
    total_avaliacoes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fd.id as fornecedor_id,
        fd.partner_id,
        p.nome,
        fd.email_cotacao,
        fd.telefone,
        fd.cidade,
        fd.nota_media,
        fd.total_avaliacoes
    FROM compras.fornecedores_dados fd
    JOIN public.partners p ON p.id = fd.partner_id
    WHERE fd.uf = p_uf 
    AND fd.company_id = p_company_id
    AND fd.status = 'ativo'
    AND (p_material_id IS NULL OR EXISTS (
        SELECT 1 FROM compras.historico_precos hp
        WHERE hp.fornecedor_id = fd.id 
        AND hp.material_id = p_material_id
    ))
    ORDER BY fd.nota_media DESC, fd.total_avaliacoes DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.sugerir_fornecedores_uf IS 'Sugere fornecedores por UF e material específico';

-- =====================================================
-- FUNÇÃO: CONSOLIDAR REQUISIÇÕES SIMILARES
-- =====================================================

CREATE OR REPLACE FUNCTION compras.consolidar_requisicoes_similares(
    p_material_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    requisicao_id UUID,
    solicitante_id UUID,
    quantidade_total DECIMAL,
    data_necessidade DATE,
    observacoes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ri.requisicao_id,
        rc.solicitante_id,
        SUM(ri.quantidade) as quantidade_total,
        MIN(rc.data_necessidade) as data_necessidade,
        STRING_AGG(ri.observacoes, '; ') as observacoes
    FROM compras.requisicao_itens ri
    JOIN compras.requisicoes_compra rc ON rc.id = ri.requisicao_id
    WHERE ri.material_id = p_material_id
    AND rc.company_id = p_company_id
    AND rc.status IN ('aprovada', 'em_cotacao')
    AND ri.status = 'pendente'
    GROUP BY ri.requisicao_id, rc.solicitante_id
    ORDER BY MIN(rc.data_necessidade);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.consolidar_requisicoes_similares IS 'Consolida requisições com o mesmo material para cotação conjunta';

-- =====================================================
-- FUNÇÃO: GERAR LINK DE COTAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION compras.gerar_link_cotacao(
    p_cotacao_id UUID,
    p_base_url TEXT DEFAULT 'https://app.estrategicengenharia.com.br'
) RETURNS TEXT AS $$
DECLARE
    v_cotacao compras.cotacoes%ROWTYPE;
    v_link TEXT;
BEGIN
    -- Buscar dados da cotação
    SELECT * INTO v_cotacao
    FROM compras.cotacoes
    WHERE id = p_cotacao_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotação não encontrada';
    END IF;
    
    -- Gerar link único
    v_link := p_base_url || '/compras/cotacao/' || p_cotacao_id || '?token=' || 
              encode(gen_random_bytes(32), 'hex');
    
    -- Atualizar link na cotação
    UPDATE compras.cotacoes
    SET link_fornecedor = v_link, updated_at = NOW()
    WHERE id = p_cotacao_id;
    
    RETURN v_link;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.gerar_link_cotacao IS 'Gera link único para fornecedor preencher cotação';

-- =====================================================
-- TRIGGER: ATUALIZAR VALORES AUTOMATICAMENTE
-- =====================================================

-- Trigger para atualizar valor total da requisição
CREATE OR REPLACE FUNCTION compras.atualizar_valor_requisicao()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_total DECIMAL(15,2);
BEGIN
    -- Calcular valor total dos itens
    SELECT COALESCE(SUM(quantidade * COALESCE(valor_unitario_estimado, 0)), 0)
    INTO v_valor_total
    FROM compras.requisicao_itens
    WHERE requisicao_id = COALESCE(NEW.requisicao_id, OLD.requisicao_id);
    
    -- Atualizar valor total da requisição
    UPDATE compras.requisicoes_compra
    SET 
        valor_total_estimado = v_valor_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.requisicao_id, OLD.requisicao_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
CREATE TRIGGER trigger_atualizar_valor_requisicao
    AFTER INSERT OR UPDATE OR DELETE ON compras.requisicao_itens
    FOR EACH ROW EXECUTE FUNCTION compras.atualizar_valor_requisicao();

-- =====================================================
-- VIEWS PARA DASHBOARDS
-- =====================================================

-- View: Dashboard de Compras
CREATE VIEW compras.dashboard_compras AS
SELECT 
    rc.company_id,
    COUNT(CASE WHEN rc.status = 'pendente_aprovacao' THEN 1 END) as requisicoes_pendentes,
    COUNT(CASE WHEN c.status = 'enviada' THEN 1 END) as cotacoes_enviadas,
    COUNT(CASE WHEN pc.status = 'enviado' THEN 1 END) as pedidos_enviados,
    COALESCE(SUM(rc.valor_total_estimado), 0) as valor_total_estimado,
    COALESCE(SUM(pc.valor_final), 0) as valor_total_pedidos,
    COUNT(DISTINCT fd.id) as total_fornecedores
FROM compras.requisicoes_compra rc
LEFT JOIN compras.cotacoes c ON c.requisicao_id = rc.id
LEFT JOIN compras.pedidos_compra pc ON pc.cotacao_id = c.id
LEFT JOIN compras.fornecedores_dados fd ON fd.company_id = rc.company_id
WHERE rc.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY rc.company_id;

COMMENT ON VIEW compras.dashboard_compras IS 'Dashboard principal do módulo de compras';

-- View: Performance de Fornecedores
CREATE VIEW compras.performance_fornecedores AS
SELECT 
    fd.id as fornecedor_id,
    p.nome as fornecedor_nome,
    fd.uf,
    fd.cidade,
    fd.nota_media,
    fd.total_avaliacoes,
    COUNT(pc.id) as total_pedidos,
    COALESCE(SUM(pc.valor_final), 0) as valor_total_compras,
    AVG(CASE WHEN pc.data_entrega_real IS NOT NULL 
        THEN pc.data_entrega_real - pc.data_entrega_prevista 
        END) as atraso_medio_dias
FROM compras.fornecedores_dados fd
JOIN public.partners p ON p.id = fd.partner_id
LEFT JOIN compras.pedidos_compra pc ON pc.fornecedor_id = fd.id
WHERE fd.status = 'ativo'
GROUP BY fd.id, p.nome, fd.uf, fd.cidade, fd.nota_media, fd.total_avaliacoes
ORDER BY fd.nota_media DESC;

COMMENT ON VIEW compras.performance_fornecedores IS 'Performance e estatísticas dos fornecedores';

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA compras IS 'Módulo de Compras com integrações completas para almoxarifado, financeiro e RH';


