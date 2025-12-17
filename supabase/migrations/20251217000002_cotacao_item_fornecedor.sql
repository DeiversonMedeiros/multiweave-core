-- =====================================================
-- MIGRAÇÃO: Mapa de cotação item x fornecedor
-- Data....: 2025-12-17
-- Objetivo:
--   - Criar tabela de detalhamento por item e fornecedor
--   - Calcular totais por fornecedor a partir dos itens cotados
--   - Manter compatibilidade com a estrutura atual de cotacao_fornecedores
-- =====================================================

-- 1) Tabela de itens por fornecedor (cada célula do mapa)
CREATE TABLE IF NOT EXISTS compras.cotacao_item_fornecedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_fornecedor_id UUID NOT NULL REFERENCES compras.cotacao_fornecedores(id) ON DELETE CASCADE,
    requisicao_item_id UUID NOT NULL REFERENCES compras.requisicao_itens(id) ON DELETE CASCADE,
    -- Referenciar a tabela correta de materiais (almoxarifado.materiais_equipamentos)
    material_id UUID REFERENCES almoxarifado.materiais_equipamentos(id),

    quantidade_ofertada NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_ofertada >= 0),
    valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
    desconto_percentual NUMERIC(7,4) DEFAULT 0 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
    desconto_valor NUMERIC(14,2) DEFAULT 0 CHECK (desconto_valor >= 0),

    valor_total_calculado NUMERIC(15,2) GENERATED ALWAYS AS (
        GREATEST(
            COALESCE(quantidade_ofertada, 0) * COALESCE(valor_unitario, 0)
            - (
                COALESCE(quantidade_ofertada, 0) * COALESCE(valor_unitario, 0) * COALESCE(desconto_percentual, 0) / 100
                + COALESCE(desconto_valor, 0)
            ),
            0
        )
    ) STORED,

    prazo_entrega_dias INTEGER,
    condicao_pagamento TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status = ANY(ARRAY['pendente','cotado','rejeitado','vencedor'])),
    is_vencedor BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cotacao_item_fornecedor_un UNIQUE (cotacao_fornecedor_id, requisicao_item_id)
);

COMMENT ON TABLE compras.cotacao_item_fornecedor IS 'Mapa de cotação: detalha preços e condições por item e fornecedor';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.quantidade_ofertada IS 'Quantidade que o fornecedor oferta para o item da requisição';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.valor_unitario IS 'Preço unitário cotado pelo fornecedor';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.desconto_percentual IS 'Desconto percentual aplicado pelo fornecedor';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.desconto_valor IS 'Desconto absoluto aplicado pelo fornecedor';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.valor_total_calculado IS 'Total do item após desconto (quantidade * preço - descontos)';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.prazo_entrega_dias IS 'Prazo de entrega informado pelo fornecedor, em dias';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.condicao_pagamento IS 'Condição de pagamento específica para o item/fornecedor';
COMMENT ON COLUMN compras.cotacao_item_fornecedor.is_vencedor IS 'Marca se este item/fornecedor foi o vencedor';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cotacao_item_fornecedor_cotacao_fornecedor_id
    ON compras.cotacao_item_fornecedor (cotacao_fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_item_fornecedor_requisicao_item_id
    ON compras.cotacao_item_fornecedor (requisicao_item_id);

-- 2) Trigger de updated_at
CREATE OR REPLACE FUNCTION compras.cotacao_item_fornecedor_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotacao_item_fornecedor_set_updated_at ON compras.cotacao_item_fornecedor;
CREATE TRIGGER trg_cotacao_item_fornecedor_set_updated_at
BEFORE UPDATE ON compras.cotacao_item_fornecedor
FOR EACH ROW
EXECUTE FUNCTION compras.cotacao_item_fornecedor_set_updated_at();

-- 3) Função e triggers para recalcular totais por fornecedor
CREATE OR REPLACE FUNCTION compras.recalcular_cotacao_fornecedor_totais()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cotacao_fornecedor_id UUID;
    v_total NUMERIC(15,2);
BEGIN
    v_cotacao_fornecedor_id := COALESCE(NEW.cotacao_fornecedor_id, OLD.cotacao_fornecedor_id);

    IF v_cotacao_fornecedor_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(SUM(valor_total_calculado), 0)
      INTO v_total
      FROM compras.cotacao_item_fornecedor
     WHERE cotacao_fornecedor_id = v_cotacao_fornecedor_id;

    UPDATE compras.cotacao_fornecedores
       SET preco_total = v_total,
           updated_at = NOW()
     WHERE id = v_cotacao_fornecedor_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cotacao_item_fornecedor_recalc_totais ON compras.cotacao_item_fornecedor;
CREATE TRIGGER trg_cotacao_item_fornecedor_recalc_totais
AFTER INSERT OR UPDATE OR DELETE ON compras.cotacao_item_fornecedor
FOR EACH ROW
EXECUTE FUNCTION compras.recalcular_cotacao_fornecedor_totais();

-- 4) Comentário explicativo para cotacao_fornecedores
COMMENT ON COLUMN compras.cotacao_fornecedores.preco_total IS 'Total calculado a partir de compras.cotacao_item_fornecedor';

