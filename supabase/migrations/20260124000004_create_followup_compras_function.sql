-- =====================================================
-- FUNÇÃO: GET FOLLOW-UP DE COMPRAS
-- Data: 2026-01-24
-- Descrição: Retorna dados completos do follow-up de compras
-- incluindo requisição, cotação, pedido, conta a pagar e entrada em estoque
-- =====================================================

-- Remover funções existentes se houver
DROP FUNCTION IF EXISTS public.get_followup_compras(UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS compras.get_followup_compras(UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION compras.get_followup_compras(
    p_company_id UUID,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_status_requisicao TEXT DEFAULT NULL,
    p_status_cotacao TEXT DEFAULT NULL,
    p_status_pedido TEXT DEFAULT NULL,
    p_status_conta TEXT DEFAULT NULL,
    p_fornecedor_id UUID DEFAULT NULL,
    p_solicitante_id UUID DEFAULT NULL
)
RETURNS TABLE (
    -- Requisição
    requisicao_id UUID,
    numero_requisicao VARCHAR,
    data_solicitacao DATE,
    data_necessidade DATE,
    requisicao_status TEXT,
    requisicao_workflow_state TEXT,
    valor_total_estimado DECIMAL,
    solicitante_nome TEXT,
    solicitante_email TEXT,
    requisicao_created_at TIMESTAMP WITH TIME ZONE,
    requisicao_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Cotação
    cotacao_id UUID,
    numero_cotacao VARCHAR,
    data_cotacao DATE,
    cotacao_status TEXT,
    cotacao_workflow_state TEXT,
    prazo_resposta DATE,
    cotacao_created_at TIMESTAMP WITH TIME ZONE,
    cotacao_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Pedido
    pedido_id UUID,
    numero_pedido VARCHAR,
    data_pedido DATE,
    data_entrega_prevista DATE,
    data_entrega_real DATE,
    pedido_status TEXT,
    pedido_workflow_state TEXT,
    pedido_valor_total DECIMAL,
    pedido_valor_final DECIMAL,
    fornecedor_nome TEXT,
    pedido_created_at TIMESTAMP WITH TIME ZONE,
    pedido_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Conta a Pagar
    conta_id UUID,
    conta_descricao TEXT,
    conta_valor_original DECIMAL,
    conta_valor_atual DECIMAL,
    data_vencimento DATE,
    conta_status TEXT,
    numero_nota_fiscal VARCHAR,
    conta_created_at TIMESTAMP WITH TIME ZONE,
    conta_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Entrada em Estoque
    entrada_id UUID,
    entrada_numero_documento VARCHAR,
    data_entrada DATE,
    entrada_status TEXT,
    entrada_created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE NOTICE 'get_followup_compras chamada com company_id: %, data_inicio: %, data_fim: %', p_company_id, p_data_inicio, p_data_fim;
    RETURN QUERY
    WITH requisicoes AS (
        SELECT 
            rc.id,
            rc.company_id,
            rc.numero_requisicao,
            rc.data_solicitacao,
            rc.data_necessidade,
            rc.status::TEXT as requisicao_status,
            rc.workflow_state as requisicao_workflow_state,
            rc.valor_total_estimado,
            u.nome as solicitante_nome,
            u.email as solicitante_email,
            rc.created_at as requisicao_created_at,
            rc.updated_at as requisicao_updated_at
        FROM compras.requisicoes_compra rc
        LEFT JOIN public.users u ON u.id = rc.solicitante_id
        WHERE rc.company_id = p_company_id
        AND (p_data_inicio IS NULL OR rc.data_solicitacao >= p_data_inicio)
        AND (p_data_fim IS NULL OR rc.data_solicitacao <= p_data_fim)
        AND (p_status_requisicao IS NULL OR rc.workflow_state = p_status_requisicao OR rc.status::TEXT = p_status_requisicao)
        AND (p_solicitante_id IS NULL OR rc.solicitante_id = p_solicitante_id)
    ),
    cotacoes AS (
        SELECT 
            cc.id as cotacao_id,
            cc.requisicao_id,
            cc.numero_cotacao,
            cc.created_at::DATE as data_cotacao,
            cc.status::TEXT as cotacao_status,
            cc.workflow_state as cotacao_workflow_state,
            cc.prazo_resposta,
            cc.created_at as cotacao_created_at,
            cc.updated_at as cotacao_updated_at
        FROM compras.cotacao_ciclos cc
        WHERE (p_status_cotacao IS NULL OR cc.workflow_state = p_status_cotacao OR cc.status::TEXT = p_status_cotacao)
    ),
    pedidos AS (
        SELECT 
            pc.id as pedido_id,
            pc.cotacao_id,
            pc.numero_pedido,
            pc.data_pedido,
            pc.data_entrega_prevista,
            pc.data_entrega_real,
            pc.status::TEXT as pedido_status,
            pc.workflow_state as pedido_workflow_state,
            pc.valor_total as pedido_valor_total,
            pc.valor_final as pedido_valor_final,
            pt.razao_social as fornecedor_nome,
            pc.created_at as pedido_created_at,
            pc.updated_at as pedido_updated_at
        FROM compras.pedidos_compra pc
        LEFT JOIN compras.fornecedores_dados fd ON fd.id = pc.fornecedor_id
        LEFT JOIN public.partners pt ON pt.id = fd.partner_id
        WHERE (p_status_pedido IS NULL OR pc.workflow_state = p_status_pedido OR pc.status::TEXT = p_status_pedido)
        AND (p_fornecedor_id IS NULL OR pc.fornecedor_id = p_fornecedor_id)
    ),
    contas_pagar AS (
        SELECT 
            cp.id as conta_id,
            cp.pedido_id,
            cp.descricao as conta_descricao,
            cp.valor_original as conta_valor_original,
            cp.valor_atual as conta_valor_atual,
            cp.data_vencimento,
            cp.status::TEXT as conta_status,
            cp.numero_nota_fiscal,
            cp.created_at as conta_created_at,
            cp.updated_at as conta_updated_at
        FROM financeiro.contas_pagar cp
        WHERE (p_status_conta IS NULL OR cp.status = p_status_conta)
    ),
    entradas_estoque AS (
        SELECT 
            em.id as entrada_id,
            em.numero_nota as numero_documento,
            em.data_entrada,
            em.status::TEXT as entrada_status,
            em.created_at as entrada_created_at
        FROM almoxarifado.entradas_materiais em
        WHERE em.numero_nota IS NOT NULL
    )
    SELECT 
        r.id as requisicao_id,
        r.numero_requisicao,
        r.data_solicitacao,
        r.data_necessidade,
        r.requisicao_status,
        r.requisicao_workflow_state,
        r.valor_total_estimado,
        r.solicitante_nome,
        r.solicitante_email,
        r.requisicao_created_at,
        r.requisicao_updated_at,
        
        -- Cotação
        c.cotacao_id,
        c.numero_cotacao,
        c.data_cotacao,
        c.cotacao_status,
        c.cotacao_workflow_state,
        c.prazo_resposta,
        c.cotacao_created_at,
        c.cotacao_updated_at,
        
        -- Pedido
        p.pedido_id,
        p.numero_pedido,
        p.data_pedido,
        p.data_entrega_prevista,
        p.data_entrega_real,
        p.pedido_status,
        p.pedido_workflow_state,
        p.pedido_valor_total,
        p.pedido_valor_final,
        p.fornecedor_nome,
        p.pedido_created_at,
        p.pedido_updated_at,
        
        -- Conta a Pagar
        cp.conta_id,
        cp.conta_descricao,
        cp.conta_valor_original,
        cp.conta_valor_atual,
        cp.data_vencimento,
        cp.conta_status,
        cp.numero_nota_fiscal,
        cp.conta_created_at,
        cp.conta_updated_at,
        
        -- Entrada em Estoque
        e.entrada_id,
        e.numero_documento as entrada_numero_documento,
        e.data_entrada,
        e.entrada_status,
        e.entrada_created_at
        
    FROM requisicoes r
    LEFT JOIN cotacoes c ON c.requisicao_id = r.id
    LEFT JOIN pedidos p ON p.cotacao_id = c.cotacao_id
    LEFT JOIN contas_pagar cp ON cp.pedido_id = p.pedido_id
    LEFT JOIN entradas_estoque e ON e.numero_documento = p.numero_pedido OR e.numero_documento LIKE '%' || p.numero_pedido || '%'
    ORDER BY r.data_solicitacao DESC, c.data_cotacao DESC, p.data_pedido DESC;
    
    RAISE NOTICE 'get_followup_compras retornou resultados';
END;
$$;

COMMENT ON FUNCTION compras.get_followup_compras IS 'Retorna dados completos do follow-up de compras com todas as etapas do processo';

-- =====================================================
-- FUNÇÃO WRAPPER NO SCHEMA PUBLIC
-- =====================================================
-- Cria função wrapper no schema public para permitir chamada via RPC
-- (PostgREST só expõe funções do schema public)

CREATE OR REPLACE FUNCTION public.get_followup_compras(
    p_company_id UUID,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_status_requisicao TEXT DEFAULT NULL,
    p_status_cotacao TEXT DEFAULT NULL,
    p_status_pedido TEXT DEFAULT NULL,
    p_status_conta TEXT DEFAULT NULL,
    p_fornecedor_id UUID DEFAULT NULL,
    p_solicitante_id UUID DEFAULT NULL
)
RETURNS TABLE (
    -- Requisição
    requisicao_id UUID,
    numero_requisicao VARCHAR,
    data_solicitacao DATE,
    data_necessidade DATE,
    requisicao_status TEXT,
    requisicao_workflow_state TEXT,
    valor_total_estimado DECIMAL,
    solicitante_nome TEXT,
    solicitante_email TEXT,
    requisicao_created_at TIMESTAMP WITH TIME ZONE,
    requisicao_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Cotação
    cotacao_id UUID,
    numero_cotacao VARCHAR,
    data_cotacao DATE,
    cotacao_status TEXT,
    cotacao_workflow_state TEXT,
    prazo_resposta DATE,
    cotacao_created_at TIMESTAMP WITH TIME ZONE,
    cotacao_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Pedido
    pedido_id UUID,
    numero_pedido VARCHAR,
    data_pedido DATE,
    data_entrega_prevista DATE,
    data_entrega_real DATE,
    pedido_status TEXT,
    pedido_workflow_state TEXT,
    pedido_valor_total DECIMAL,
    pedido_valor_final DECIMAL,
    fornecedor_nome TEXT,
    pedido_created_at TIMESTAMP WITH TIME ZONE,
    pedido_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Conta a Pagar
    conta_id UUID,
    conta_descricao TEXT,
    conta_valor_original DECIMAL,
    conta_valor_atual DECIMAL,
    data_vencimento DATE,
    conta_status TEXT,
    numero_nota_fiscal VARCHAR,
    conta_created_at TIMESTAMP WITH TIME ZONE,
    conta_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Entrada em Estoque
    entrada_id UUID,
    entrada_numero_documento VARCHAR,
    data_entrada DATE,
    entrada_status TEXT,
    entrada_created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM compras.get_followup_compras(
        p_company_id,
        p_data_inicio,
        p_data_fim,
        p_status_requisicao,
        p_status_cotacao,
        p_status_pedido,
        p_status_conta,
        p_fornecedor_id,
        p_solicitante_id
    );
END;
$$;

COMMENT ON FUNCTION public.get_followup_compras IS 'Wrapper para compras.get_followup_compras - permite chamada via RPC do Supabase';

GRANT EXECUTE ON FUNCTION public.get_followup_compras(UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_requisicoes_compra_company_data ON compras.requisicoes_compra(company_id, data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_cotacao_ciclos_requisicao ON compras.cotacao_ciclos(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_cotacao ON compras.pedidos_compra(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_pedido ON financeiro.contas_pagar(pedido_id);
CREATE INDEX IF NOT EXISTS idx_entradas_materiais_numero_nota ON almoxarifado.entradas_materiais(numero_nota) WHERE numero_nota IS NOT NULL;
