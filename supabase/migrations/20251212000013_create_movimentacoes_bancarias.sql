-- =====================================================
-- MIGRAÇÃO: CRIAR TABELA DE MOVIMENTAÇÕES BANCÁRIAS
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria tabela para armazenar movimentações bancárias importadas de extratos
--            (via API bancária, arquivo OFX ou CSV)
-- Autor: Sistema MultiWeave Core
-- Módulo: M4 - Conciliação Bancária

-- =====================================================
-- 1. TABELA: MOVIMENTAÇÕES BANCÁRIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.movimentacoes_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Conta bancária
    conta_bancaria_id UUID NOT NULL REFERENCES financeiro.contas_bancarias(id) ON DELETE CASCADE,
    
    -- Dados da movimentação (do extrato)
    data_movimento DATE NOT NULL,
    data_liquidacao DATE, -- Data de liquidação (pode ser diferente da data movimento)
    historico TEXT NOT NULL, -- Histórico/descrição da movimentação
    documento VARCHAR(100), -- Número do documento (cheque, DOC, TED, etc.)
    complemento TEXT, -- Complemento do histórico
    
    -- Valores
    valor DECIMAL(15,2) NOT NULL,
    tipo_movimento VARCHAR(20) NOT NULL CHECK (tipo_movimento IN ('credito', 'debito')),
    saldo_apos_movimento DECIMAL(15,2), -- Saldo após esta movimentação
    
    -- Classificação
    categoria VARCHAR(100), -- Categoria da movimentação (ex: "Tarifa", "Juros", "Pagamento", "Recebimento")
    tipo_operacao VARCHAR(50), -- Tipo de operação bancária (ex: "TED", "DOC", "Cheque", "Tarifa", "Juros")
    
    -- Origem da importação
    origem_importacao VARCHAR(50) NOT NULL CHECK (origem_importacao IN ('api_bancaria', 'arquivo_ofx', 'arquivo_csv', 'manual')),
    arquivo_origem VARCHAR(255), -- Nome do arquivo importado (quando aplicável)
    lote_importacao UUID, -- ID do lote de importação (para agrupar movimentações importadas juntas)
    
    -- Conciliação
    status_conciliacao VARCHAR(20) DEFAULT 'pendente' CHECK (status_conciliacao IN (
        'pendente',      -- Aguardando conciliação
        'conciliada',    -- Já conciliada com título
        'parcial',       -- Parcialmente conciliada
        'divergente',    -- Há divergência (valor diferente)
        'ignorada'       -- Ignorada (não precisa conciliar, ex: tarifas)
    )),
    
    -- Vinculação com títulos (quando conciliada)
    conta_pagar_id UUID REFERENCES financeiro.contas_pagar(id), -- Se for débito
    conta_receber_id UUID REFERENCES financeiro.contas_receber(id), -- Se for crédito
    lote_pagamento_id UUID REFERENCES financeiro.lotes_pagamento(id), -- Se for pagamento de lote
    
    -- Diferenças e ajustes
    valor_esperado DECIMAL(15,2), -- Valor esperado (do título)
    diferenca_valor DECIMAL(15,2), -- Diferença entre valor esperado e valor real
    motivo_diferenca TEXT, -- Motivo da diferença (retenções, tarifas, etc.)
    
    -- Observações
    observacoes TEXT,
    
    -- Metadados
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_company_id ON financeiro.movimentacoes_bancarias(company_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_conta_bancaria ON financeiro.movimentacoes_bancarias(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_movimento ON financeiro.movimentacoes_bancarias(data_movimento);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON financeiro.movimentacoes_bancarias(tipo_movimento);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_status_conciliacao ON financeiro.movimentacoes_bancarias(status_conciliacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_conta_pagar ON financeiro.movimentacoes_bancarias(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_conta_receber ON financeiro.movimentacoes_bancarias(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote_importacao ON financeiro.movimentacoes_bancarias(lote_importacao);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_movimentacoes_bancarias_updated_at
    BEFORE UPDATE ON financeiro.movimentacoes_bancarias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 2. TABELA: CONCILIAÇÕES (VINCULAÇÃO MOVIMENTAÇÃO ↔ TÍTULO)
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.conciliacoes_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Vinculação
    movimentacao_id UUID NOT NULL REFERENCES financeiro.movimentacoes_bancarias(id) ON DELETE CASCADE,
    conta_pagar_id UUID REFERENCES financeiro.contas_pagar(id),
    conta_receber_id UUID REFERENCES financeiro.contas_receber(id),
    lote_pagamento_id UUID REFERENCES financeiro.lotes_pagamento(id),
    
    -- Tipo de conciliação
    tipo_conciliacao VARCHAR(50) NOT NULL CHECK (tipo_conciliacao IN (
        'valor_exato',           -- Valor exato entre movimentação e título
        'valor_lote',            -- Movimentação quita múltiplos títulos (lote)
        'parcial',               -- Pagamento parcial
        'com_diferenca',         -- Há diferença (retenções, tarifas)
        'manual'                 -- Conciliação manual
    )),
    
    -- Valores
    valor_conciliado DECIMAL(15,2) NOT NULL,
    valor_diferenca DECIMAL(15,2) DEFAULT 0, -- Diferença entre valores
    motivo_diferenca TEXT, -- Motivo da diferença
    
    -- Status
    status VARCHAR(20) DEFAULT 'conciliada' CHECK (status IN ('conciliada', 'pendente_validacao', 'rejeitada')),
    
    -- Metadados
    conciliado_por UUID REFERENCES public.users(id),
    conciliado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: uma movimentação pode ter múltiplas conciliações (para lotes)
    -- mas não pode ter conciliações duplicadas com o mesmo título
    CONSTRAINT conciliacoes_movimentacoes_unique UNIQUE (movimentacao_id, conta_pagar_id, conta_receber_id, lote_pagamento_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conciliacoes_movimentacao ON financeiro.conciliacoes_movimentacoes(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_conta_pagar ON financeiro.conciliacoes_movimentacoes(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_conta_receber ON financeiro.conciliacoes_movimentacoes(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_lote ON financeiro.conciliacoes_movimentacoes(lote_pagamento_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_conciliacoes_movimentacoes_updated_at
    BEFORE UPDATE ON financeiro.conciliacoes_movimentacoes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 3. TABELA: PENDÊNCIAS DE CONCILIAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.conciliacoes_pendencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Tipo de pendência
    tipo_pendencia VARCHAR(50) NOT NULL CHECK (tipo_pendencia IN (
        'recebimento_menor',      -- Recebimento a menor
        'pagamento_incompleto',    -- Pagamento incompleto
        'tarifa_nao_prevista',     -- Tarifa bancária não prevista
        'movimentacao_sem_titulo', -- Movimentação sem título correspondente
        'titulo_sem_movimentacao', -- Título sem movimentação correspondente
        'divergencia_valor',       -- Divergência de valor
        'divergencia_data'         -- Divergência de data
    )),
    
    -- Referências
    movimentacao_id UUID REFERENCES financeiro.movimentacoes_bancarias(id),
    conta_pagar_id UUID REFERENCES financeiro.contas_pagar(id),
    conta_receber_id UUID REFERENCES financeiro.contas_receber(id),
    
    -- Detalhes
    descricao TEXT NOT NULL,
    valor_esperado DECIMAL(15,2),
    valor_real DECIMAL(15,2),
    diferenca DECIMAL(15,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'resolvida', 'ignorada')),
    
    -- Resolução
    resolvido_por UUID REFERENCES public.users(id),
    resolvido_em TIMESTAMP WITH TIME ZONE,
    solucao_aplicada TEXT, -- Descrição da solução aplicada
    
    -- Observações
    observacoes TEXT,
    
    -- Metadados
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conciliacoes_pendencias_company_id ON financeiro.conciliacoes_pendencias(company_id);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_pendencias_status ON financeiro.conciliacoes_pendencias(status);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_pendencias_tipo ON financeiro.conciliacoes_pendencias(tipo_pendencia);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_conciliacoes_pendencias_updated_at
    BEFORE UPDATE ON financeiro.conciliacoes_pendencias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 4. FUNÇÃO: ATUALIZAR STATUS DE CONCILIAÇÃO DA MOVIMENTAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.atualizar_status_conciliacao_movimentacao(
    p_movimentacao_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_total_conciliado DECIMAL(15,2);
    v_valor_movimentacao DECIMAL(15,2);
    v_status VARCHAR(20);
BEGIN
    -- Buscar valor da movimentação
    SELECT valor INTO v_valor_movimentacao
    FROM financeiro.movimentacoes_bancarias
    WHERE id = p_movimentacao_id;
    
    -- Calcular total conciliado
    SELECT COALESCE(SUM(valor_conciliado), 0) INTO v_total_conciliado
    FROM financeiro.conciliacoes_movimentacoes
    WHERE movimentacao_id = p_movimentacao_id
    AND status = 'conciliada';
    
    -- Determinar status
    IF v_total_conciliado = 0 THEN
        v_status := 'pendente';
    ELSIF ABS(v_total_conciliado - v_valor_movimentacao) < 0.01 THEN
        v_status := 'conciliada';
    ELSIF v_total_conciliado < v_valor_movimentacao THEN
        v_status := 'parcial';
    ELSE
        v_status := 'divergente';
    END IF;
    
    -- Atualizar status
    UPDATE financeiro.movimentacoes_bancarias
    SET 
        status_conciliacao = v_status,
        updated_at = NOW()
    WHERE id = p_movimentacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.atualizar_status_conciliacao_movimentacao(UUID) IS 'Atualiza status de conciliação de uma movimentação baseado nas conciliações existentes';

-- =====================================================
-- 5. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE financeiro.movimentacoes_bancarias IS 'Movimentações bancárias importadas de extratos (API, OFX, CSV)';
COMMENT ON TABLE financeiro.conciliacoes_movimentacoes IS 'Vinculação entre movimentações bancárias e títulos a pagar/receber';
COMMENT ON TABLE financeiro.conciliacoes_pendencias IS 'Fila de pendências de conciliação para análise manual';
COMMENT ON COLUMN financeiro.movimentacoes_bancarias.origem_importacao IS 'Origem: api_bancaria, arquivo_ofx, arquivo_csv, manual';
COMMENT ON COLUMN financeiro.movimentacoes_bancarias.status_conciliacao IS 'Status: pendente, conciliada, parcial, divergente, ignorada';

