-- =====================================================
-- MIGRATION: CAIXA DE ENTRADA DE OBRIGAÇÕES FISCAIS
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria estrutura para gerenciar obrigações fiscais centralizadas
-- Autor: Sistema MultiWeave Core
-- Módulo: M5 - Motor Tributário

-- Tabela de obrigações fiscais
CREATE TABLE IF NOT EXISTS tributario.obrigacoes_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação da obrigação
    tipo_obrigacao VARCHAR(50) NOT NULL, -- 'darf', 'gps', 'dctf', 'efd', 'sped', 'sefip', 'rais', 'caged', 'dirf', 'darf_anual', 'outros'
    codigo_receita VARCHAR(20), -- Código de receita (ex: 2880 para ISS)
    descricao VARCHAR(500) NOT NULL,
    periodo_referencia VARCHAR(20) NOT NULL, -- Ex: '2025-12', '2025-01', '2025'
    
    -- Datas importantes
    data_vencimento DATE NOT NULL,
    data_competencia DATE NOT NULL,
    data_apresentacao DATE, -- Data em que foi apresentada
    
    -- Valores
    valor_principal DECIMAL(15,2) DEFAULT 0,
    valor_multa DECIMAL(15,2) DEFAULT 0,
    valor_juros DECIMAL(15,2) DEFAULT 0,
    valor_total DECIMAL(15,2) DEFAULT 0,
    
    -- Status e controle
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'apresentada', 'paga', 'vencida', 'cancelada')),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'critica')),
    
    -- Vinculações
    conta_pagar_id UUID REFERENCES financeiro.contas_pagar(id),
    nfe_id UUID REFERENCES financeiro.nfe(id),
    nfse_id UUID REFERENCES financeiro.nfse(id),
    
    -- Informações adicionais
    observacoes TEXT,
    arquivo_anexo TEXT, -- URL do arquivo anexado
    protocolo_apresentacao VARCHAR(100), -- Número do protocolo de apresentação
    
    -- Controle
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fiscais_company_id ON tributario.obrigacoes_fiscais(company_id);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fiscais_status ON tributario.obrigacoes_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fiscais_data_vencimento ON tributario.obrigacoes_fiscais(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fiscais_periodo ON tributario.obrigacoes_fiscais(periodo_referencia);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fiscais_tipo ON tributario.obrigacoes_fiscais(tipo_obrigacao);

-- Função para calcular valores totais
CREATE OR REPLACE FUNCTION tributario.calcular_valor_total_obrigacao(p_obrigacao_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(valor_principal, 0) + COALESCE(valor_multa, 0) + COALESCE(valor_juros, 0)
    INTO v_total
    FROM tributario.obrigacoes_fiscais
    WHERE id = p_obrigacao_id;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar valor_total automaticamente
CREATE OR REPLACE FUNCTION tributario.trigger_atualizar_valor_total_obrigacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.valor_total = COALESCE(NEW.valor_principal, 0) + COALESCE(NEW.valor_multa, 0) + COALESCE(NEW.valor_juros, 0);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_valor_total_obrigacao ON tributario.obrigacoes_fiscais;
CREATE TRIGGER trigger_atualizar_valor_total_obrigacao
    BEFORE INSERT OR UPDATE ON tributario.obrigacoes_fiscais
    FOR EACH ROW
    EXECUTE FUNCTION tributario.trigger_atualizar_valor_total_obrigacao();

-- Trigger para atualizar status baseado em data de vencimento
CREATE OR REPLACE FUNCTION tributario.trigger_atualizar_status_obrigacao()
RETURNS TRIGGER AS $$
BEGIN
    -- Se está pendente e passou do vencimento, marcar como vencida
    IF NEW.status = 'pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
        NEW.status = 'vencida';
        NEW.prioridade = 'critica';
    END IF;
    
    -- Se foi apresentada, atualizar data_apresentacao
    IF NEW.status = 'apresentada' AND OLD.status != 'apresentada' THEN
        NEW.data_apresentacao = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_status_obrigacao ON tributario.obrigacoes_fiscais;
CREATE TRIGGER trigger_atualizar_status_obrigacao
    BEFORE INSERT OR UPDATE ON tributario.obrigacoes_fiscais
    FOR EACH ROW
    EXECUTE FUNCTION tributario.trigger_atualizar_status_obrigacao();

-- View para resumo de obrigações
CREATE OR REPLACE VIEW tributario.view_obrigacoes_resumo AS
SELECT 
    company_id,
    status,
    COUNT(*) as quantidade,
    SUM(valor_total) as valor_total,
    COUNT(*) FILTER (WHERE data_vencimento < CURRENT_DATE AND status IN ('pendente', 'em_analise')) as quantidade_vencidas,
    SUM(valor_total) FILTER (WHERE data_vencimento < CURRENT_DATE AND status IN ('pendente', 'em_analise')) as valor_vencido,
    COUNT(*) FILTER (WHERE data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND status IN ('pendente', 'em_analise')) as quantidade_vencendo_7_dias,
    SUM(valor_total) FILTER (WHERE data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND status IN ('pendente', 'em_analise')) as valor_vencendo_7_dias
FROM tributario.obrigacoes_fiscais
WHERE is_active = true
GROUP BY company_id, status;

-- RLS Policies
ALTER TABLE tributario.obrigacoes_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view obrigacoes_fiscais from their companies"
    ON tributario.obrigacoes_fiscais
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert obrigacoes_fiscais in their companies"
    ON tributario.obrigacoes_fiscais
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update obrigacoes_fiscais from their companies"
    ON tributario.obrigacoes_fiscais
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete obrigacoes_fiscais from their companies"
    ON tributario.obrigacoes_fiscais
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON tributario.obrigacoes_fiscais TO authenticated;
GRANT SELECT ON tributario.view_obrigacoes_resumo TO authenticated;

COMMENT ON TABLE tributario.obrigacoes_fiscais IS 'Caixa de entrada centralizada para obrigações fiscais';
COMMENT ON COLUMN tributario.obrigacoes_fiscais.tipo_obrigacao IS 'Tipo: DARF, GPS, DCTF, EFD, SPED, SEFIP, RAIS, CAGED, DIRF, DARF Anual, Outros';
COMMENT ON COLUMN tributario.obrigacoes_fiscais.periodo_referencia IS 'Período de referência no formato YYYY-MM ou YYYY';

