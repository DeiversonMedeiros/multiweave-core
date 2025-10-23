-- =====================================================
-- CRIAÇÃO DA TABELA INSS_BRACKETS (FAIXAS INSS)
-- =====================================================

-- Criar tabela de faixas INSS
CREATE TABLE IF NOT EXISTS rh.inss_brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    ano_vigencia INTEGER NOT NULL,
    mes_vigencia INTEGER NOT NULL,
    valor_minimo DECIMAL(12,2) NOT NULL,
    valor_maximo DECIMAL(12,2),
    aliquota DECIMAL(5,4) NOT NULL, -- 0.0000 a 1.0000 (0% a 100%)
    valor_deducao DECIMAL(12,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_inss_bracket_company_ano_mes_codigo UNIQUE (codigo, company_id, ano_vigencia, mes_vigencia),
    CONSTRAINT check_inss_bracket_valores CHECK (valor_maximo IS NULL OR valor_minimo <= valor_maximo),
    CONSTRAINT check_inss_bracket_aliquota CHECK (aliquota >= 0 AND aliquota <= 1),
    CONSTRAINT check_inss_bracket_ano CHECK (ano_vigencia >= 2020 AND ano_vigencia <= 2030),
    CONSTRAINT check_inss_bracket_mes CHECK (mes_vigencia >= 1 AND mes_vigencia <= 12)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_inss_brackets_company_id ON rh.inss_brackets(company_id);
CREATE INDEX IF NOT EXISTS idx_inss_brackets_ano_mes ON rh.inss_brackets(ano_vigencia, mes_vigencia);
CREATE INDEX IF NOT EXISTS idx_inss_brackets_codigo ON rh.inss_brackets(codigo);
CREATE INDEX IF NOT EXISTS idx_inss_brackets_ativo ON rh.inss_brackets(ativo);
CREATE INDEX IF NOT EXISTS idx_inss_brackets_vigencia ON rh.inss_brackets(ano_vigencia, mes_vigencia, ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_inss_brackets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inss_brackets_updated_at
    BEFORE UPDATE ON rh.inss_brackets
    FOR EACH ROW
    EXECUTE FUNCTION update_inss_brackets_updated_at();

-- Habilitar RLS
ALTER TABLE rh.inss_brackets ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view inss_brackets from their company" ON rh.inss_brackets
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert inss_brackets in their company" ON rh.inss_brackets
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update inss_brackets from their company" ON rh.inss_brackets
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete inss_brackets from their company" ON rh.inss_brackets
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.inss_brackets IS 'Tabela de faixas do INSS para cálculo de contribuição previdenciária';
COMMENT ON COLUMN rh.inss_brackets.ano_vigencia IS 'Ano de vigência da faixa INSS';
COMMENT ON COLUMN rh.inss_brackets.mes_vigencia IS 'Mês de vigência da faixa INSS';
COMMENT ON COLUMN rh.inss_brackets.valor_minimo IS 'Valor mínimo da faixa salarial';
COMMENT ON COLUMN rh.inss_brackets.valor_maximo IS 'Valor máximo da faixa salarial (NULL = sem limite)';
COMMENT ON COLUMN rh.inss_brackets.aliquota IS 'Alíquota do INSS (0.075 = 7,5%)';
COMMENT ON COLUMN rh.inss_brackets.valor_deducao IS 'Valor a ser deduzido do cálculo';
