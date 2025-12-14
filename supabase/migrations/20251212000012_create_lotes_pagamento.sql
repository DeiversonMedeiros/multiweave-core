-- =====================================================
-- MIGRAÇÃO: CRIAR ESTRUTURA DE LOTES DE PAGAMENTO
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria tabelas para montagem e gestão de lotes de pagamento
--            com agrupamento por critérios e workflow de aprovação
-- Autor: Sistema MultiWeave Core
-- Módulo: M2 - Contas a Pagar

-- =====================================================
-- 1. TABELA: LOTES DE PAGAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.lotes_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação do lote
    numero_lote VARCHAR(50) NOT NULL,
    descricao TEXT,
    
    -- Conta bancária de origem
    conta_bancaria_id UUID REFERENCES financeiro.contas_bancarias(id),
    
    -- Critérios de agrupamento (para referência)
    criterio_agrupamento JSONB, -- Armazena critérios usados: {"data_vencimento": "2025-12-31", "fornecedor_id": "...", "tipo_despesa": "..."}
    
    -- Valores do lote
    valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    valor_total_retencoes DECIMAL(15,2) DEFAULT 0, -- Total de retenções dos títulos
    valor_liquido DECIMAL(15,2) GENERATED ALWAYS AS (valor_total - valor_total_retencoes) STORED,
    quantidade_titulos INTEGER NOT NULL DEFAULT 0,
    
    -- Status e workflow
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN (
        'rascunho',      -- Lote em montagem
        'pendente_aprovacao', -- Aguardando aprovação
        'aprovado',      -- Aprovado, pronto para execução
        'rejeitado',     -- Rejeitado na aprovação
        'enviado',       -- Enviado para banco
        'processado',    -- Processado pelo banco
        'cancelado'      -- Cancelado
    )),
    
    -- Datas
    data_prevista_pagamento DATE,
    data_envio DATE,
    data_processamento DATE,
    
    -- Aprovação
    aprovado_por UUID REFERENCES public.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes_aprovacao TEXT,
    
    -- Execução bancária
    arquivo_remessa TEXT, -- Caminho/ID do arquivo CNAB/OFX gerado
    numero_remessa VARCHAR(50), -- Número da remessa bancária
    retorno_bancario_id UUID REFERENCES financeiro.retornos_bancarios(id),
    
    -- Observações gerais
    observacoes TEXT,
    
    -- Metadados
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única: número de lote único por empresa
    CONSTRAINT lotes_pagamento_numero_unique UNIQUE (company_id, numero_lote)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lotes_pagamento_company_id ON financeiro.lotes_pagamento(company_id);
CREATE INDEX IF NOT EXISTS idx_lotes_pagamento_status ON financeiro.lotes_pagamento(status);
CREATE INDEX IF NOT EXISTS idx_lotes_pagamento_conta_bancaria ON financeiro.lotes_pagamento(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_lotes_pagamento_data_prevista ON financeiro.lotes_pagamento(data_prevista_pagamento);
CREATE INDEX IF NOT EXISTS idx_lotes_pagamento_created_at ON financeiro.lotes_pagamento(created_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lotes_pagamento_updated_at
    BEFORE UPDATE ON financeiro.lotes_pagamento
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 2. TABELA: ITENS DO LOTE (TÍTULOS INCLUÍDOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.lote_pagamento_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Vinculação
    lote_pagamento_id UUID NOT NULL REFERENCES financeiro.lotes_pagamento(id) ON DELETE CASCADE,
    conta_pagar_id UUID NOT NULL REFERENCES financeiro.contas_pagar(id) ON DELETE CASCADE,
    
    -- Valores do item
    valor_titulo DECIMAL(15,2) NOT NULL,
    valor_retencoes DECIMAL(15,2) DEFAULT 0, -- Retenções deste título
    valor_liquido DECIMAL(15,2) GENERATED ALWAYS AS (valor_titulo - valor_retencoes) STORED,
    
    -- Ordem no lote
    ordem INTEGER NOT NULL DEFAULT 0,
    
    -- Status específico do item no lote
    status_item VARCHAR(20) DEFAULT 'incluido' CHECK (status_item IN (
        'incluido',      -- Incluído no lote
        'removido',      -- Removido do lote
        'pago',          -- Pago com sucesso
        'rejeitado',     -- Rejeitado pelo banco
        'cancelado'      -- Cancelado
    )),
    
    -- Observações do item
    observacoes TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: não permitir mesmo título em múltiplos lotes ativos
    CONSTRAINT lote_pagamento_itens_unique UNIQUE (conta_pagar_id, lote_pagamento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lote_pagamento_itens_lote ON financeiro.lote_pagamento_itens(lote_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_lote_pagamento_itens_conta_pagar ON financeiro.lote_pagamento_itens(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_lote_pagamento_itens_status ON financeiro.lote_pagamento_itens(status_item);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lote_pagamento_itens_updated_at
    BEFORE UPDATE ON financeiro.lote_pagamento_itens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 3. FUNÇÃO: CALCULAR VALORES DO LOTE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.calcular_valores_lote(
    p_lote_pagamento_id UUID
)
RETURNS TABLE (
    valor_total DECIMAL(15,2),
    valor_total_retencoes DECIMAL(15,2),
    valor_liquido DECIMAL(15,2),
    quantidade_titulos INTEGER
) AS $$
DECLARE
    v_valor_total DECIMAL(15,2);
    v_valor_retencoes DECIMAL(15,2);
    v_quantidade INTEGER;
BEGIN
    -- Calcular valores dos itens ativos
    SELECT 
        COALESCE(SUM(lpi.valor_titulo), 0),
        COALESCE(SUM(lpi.valor_retencoes), 0),
        COUNT(*)
    INTO v_valor_total, v_valor_retencoes, v_quantidade
    FROM financeiro.lote_pagamento_itens lpi
    WHERE lpi.lote_pagamento_id = p_lote_pagamento_id
    AND lpi.status_item IN ('incluido', 'pago');
    
    -- Atualizar lote
    UPDATE financeiro.lotes_pagamento
    SET 
        valor_total = v_valor_total,
        valor_total_retencoes = v_valor_retencoes,
        quantidade_titulos = v_quantidade,
        updated_at = NOW()
    WHERE id = p_lote_pagamento_id;
    
    RETURN QUERY
    SELECT 
        v_valor_total,
        v_valor_retencoes,
        v_valor_total - v_valor_retencoes,
        v_quantidade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.calcular_valores_lote(UUID) IS 'Calcula e atualiza valores totais do lote de pagamento';

-- =====================================================
-- 4. FUNÇÃO: ADICIONAR TÍTULO AO LOTE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.adicionar_titulo_ao_lote(
    p_lote_pagamento_id UUID,
    p_conta_pagar_id UUID,
    p_company_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_item_id UUID;
    v_valor_titulo DECIMAL(15,2);
    v_valor_retencoes DECIMAL(15,2);
    v_ordem INTEGER;
    v_lote_status VARCHAR(20);
BEGIN
    -- Verificar se lote existe e está em rascunho
    SELECT status INTO v_lote_status
    FROM financeiro.lotes_pagamento
    WHERE id = p_lote_pagamento_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lote não encontrado';
    END IF;
    
    IF v_lote_status != 'rascunho' THEN
        RAISE EXCEPTION 'Apenas lotes em rascunho podem receber novos títulos';
    END IF;
    
    -- Verificar se título já está em outro lote ativo
    IF EXISTS (
        SELECT 1 FROM financeiro.lote_pagamento_itens lpi
        JOIN financeiro.lotes_pagamento lp ON lp.id = lpi.lote_pagamento_id
        WHERE lpi.conta_pagar_id = p_conta_pagar_id
        AND lp.id != p_lote_pagamento_id
        AND lp.status NOT IN ('cancelado', 'processado')
        AND lpi.status_item != 'removido'
    ) THEN
        RAISE EXCEPTION 'Título já está incluído em outro lote ativo';
    END IF;
    
    -- Buscar valores do título
    SELECT valor_atual INTO v_valor_titulo
    FROM financeiro.contas_pagar
    WHERE id = p_conta_pagar_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta a pagar não encontrada';
    END IF;
    
    -- Calcular retenções
    SELECT COALESCE(SUM(valor_retencao), 0) INTO v_valor_retencoes
    FROM financeiro.retencoes_fonte
    WHERE conta_pagar_id = p_conta_pagar_id
    AND status != 'cancelado';
    
    -- Obter próxima ordem
    SELECT COALESCE(MAX(ordem), 0) + 1 INTO v_ordem
    FROM financeiro.lote_pagamento_itens
    WHERE lote_pagamento_id = p_lote_pagamento_id;
    
    -- Inserir item
    INSERT INTO financeiro.lote_pagamento_itens (
        company_id,
        lote_pagamento_id,
        conta_pagar_id,
        valor_titulo,
        valor_retencoes,
        ordem,
        status_item
    ) VALUES (
        p_company_id,
        p_lote_pagamento_id,
        p_conta_pagar_id,
        v_valor_titulo,
        v_valor_retencoes,
        v_ordem,
        'incluido'
    ) RETURNING id INTO v_item_id;
    
    -- Recalcular valores do lote
    PERFORM financeiro.calcular_valores_lote(p_lote_pagamento_id);
    
    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.adicionar_titulo_ao_lote(UUID, UUID, UUID, UUID) IS 'Adiciona um título a pagar ao lote, calculando automaticamente retenções';

-- =====================================================
-- 5. FUNÇÃO: REMOVER TÍTULO DO LOTE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.remover_titulo_do_lote(
    p_lote_pagamento_id UUID,
    p_conta_pagar_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_lote_status VARCHAR(20);
BEGIN
    -- Verificar se lote existe e está em rascunho
    SELECT status INTO v_lote_status
    FROM financeiro.lotes_pagamento
    WHERE id = p_lote_pagamento_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lote não encontrado';
    END IF;
    
    IF v_lote_status != 'rascunho' THEN
        RAISE EXCEPTION 'Apenas lotes em rascunho podem ter títulos removidos';
    END IF;
    
    -- Marcar item como removido
    UPDATE financeiro.lote_pagamento_itens
    SET status_item = 'removido', updated_at = NOW()
    WHERE lote_pagamento_id = p_lote_pagamento_id
    AND conta_pagar_id = p_conta_pagar_id
    AND status_item = 'incluido';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Recalcular valores do lote
    PERFORM financeiro.calcular_valores_lote(p_lote_pagamento_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.remover_titulo_do_lote(UUID, UUID, UUID) IS 'Remove um título do lote (marca como removido)';

-- =====================================================
-- 6. VIEW: RESUMO DE LOTES
-- =====================================================

CREATE OR REPLACE VIEW financeiro.view_lotes_resumo AS
SELECT 
    lp.id,
    lp.company_id,
    lp.numero_lote,
    lp.descricao,
    lp.status,
    lp.valor_total,
    lp.valor_total_retencoes,
    lp.valor_liquido,
    lp.quantidade_titulos,
    lp.data_prevista_pagamento,
    lp.data_envio,
    lp.data_processamento,
    COUNT(CASE WHEN lpi.status_item = 'pago' THEN 1 END) as titulos_pagos,
    COUNT(CASE WHEN lpi.status_item = 'rejeitado' THEN 1 END) as titulos_rejeitados,
    COUNT(CASE WHEN lpi.status_item = 'incluido' THEN 1 END) as titulos_pendentes
FROM financeiro.lotes_pagamento lp
LEFT JOIN financeiro.lote_pagamento_itens lpi ON lpi.lote_pagamento_id = lp.id
GROUP BY lp.id, lp.company_id, lp.numero_lote, lp.descricao, lp.status, 
         lp.valor_total, lp.valor_total_retencoes, lp.valor_liquido, 
         lp.quantidade_titulos, lp.data_prevista_pagamento, lp.data_envio, lp.data_processamento;

COMMENT ON VIEW financeiro.view_lotes_resumo IS 'Resumo de lotes de pagamento com estatísticas';

-- =====================================================
-- 7. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE financeiro.lotes_pagamento IS 'Lotes de pagamento agrupados por critérios (data vencimento, fornecedor, conta bancária, tipo despesa)';
COMMENT ON TABLE financeiro.lote_pagamento_itens IS 'Itens (títulos) incluídos em cada lote de pagamento';
COMMENT ON COLUMN financeiro.lotes_pagamento.criterio_agrupamento IS 'JSON com critérios usados para agrupar títulos no lote';
COMMENT ON COLUMN financeiro.lotes_pagamento.valor_liquido IS 'Valor total menos retenções (calculado automaticamente)';

