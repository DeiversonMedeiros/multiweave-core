-- =====================================================
-- CRIAÇÃO DA TABELA IRRF_BRACKETS (FAIXAS IRRF)
-- =====================================================

-- Criar tabela de faixas IRRF
CREATE TABLE IF NOT EXISTS rh.irrf_brackets (
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
    numero_dependentes INTEGER DEFAULT 0,
    valor_por_dependente DECIMAL(10,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_irrf_bracket_company_ano_mes_codigo UNIQUE (codigo, company_id, ano_vigencia, mes_vigencia),
    CONSTRAINT check_irrf_bracket_valores CHECK (valor_maximo IS NULL OR valor_minimo <= valor_maximo),
    CONSTRAINT check_irrf_bracket_aliquota CHECK (aliquota >= 0 AND aliquota <= 1),
    CONSTRAINT check_irrf_bracket_ano CHECK (ano_vigencia >= 2020 AND ano_vigencia <= 2030),
    CONSTRAINT check_irrf_bracket_mes CHECK (mes_vigencia >= 1 AND mes_vigencia <= 12),
    CONSTRAINT check_irrf_bracket_dependentes CHECK (numero_dependentes >= 0),
    CONSTRAINT check_irrf_bracket_valor_dependente CHECK (valor_por_dependente >= 0)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_irrf_brackets_company_id ON rh.irrf_brackets(company_id);
CREATE INDEX IF NOT EXISTS idx_irrf_brackets_ano_mes ON rh.irrf_brackets(ano_vigencia, mes_vigencia);
CREATE INDEX IF NOT EXISTS idx_irrf_brackets_codigo ON rh.irrf_brackets(codigo);
CREATE INDEX IF NOT EXISTS idx_irrf_brackets_ativo ON rh.irrf_brackets(ativo);
CREATE INDEX IF NOT EXISTS idx_irrf_brackets_vigencia ON rh.irrf_brackets(ano_vigencia, mes_vigencia, ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_irrf_brackets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_irrf_brackets_updated_at
    BEFORE UPDATE ON rh.irrf_brackets
    FOR EACH ROW
    EXECUTE FUNCTION update_irrf_brackets_updated_at();

-- Habilitar RLS
ALTER TABLE rh.irrf_brackets ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view irrf_brackets from their company" ON rh.irrf_brackets
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'irrf_brackets', 'read')
    );

CREATE POLICY "Users can insert irrf_brackets in their company" ON rh.irrf_brackets
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'irrf_brackets', 'create')
    );

CREATE POLICY "Users can update irrf_brackets from their company" ON rh.irrf_brackets
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'irrf_brackets', 'edit')
    );

CREATE POLICY "Users can delete irrf_brackets from their company" ON rh.irrf_brackets
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'irrf_brackets', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.irrf_brackets IS 'Tabela de faixas do IRRF para cálculo de imposto de renda';
COMMENT ON COLUMN rh.irrf_brackets.ano_vigencia IS 'Ano de vigência da faixa IRRF';
COMMENT ON COLUMN rh.irrf_brackets.mes_vigencia IS 'Mês de vigência da faixa IRRF';
COMMENT ON COLUMN rh.irrf_brackets.valor_minimo IS 'Valor mínimo da faixa salarial';
COMMENT ON COLUMN rh.irrf_brackets.valor_maximo IS 'Valor máximo da faixa salarial (NULL = sem limite)';
COMMENT ON COLUMN rh.irrf_brackets.aliquota IS 'Alíquota do IRRF (0.075 = 7,5%)';
COMMENT ON COLUMN rh.irrf_brackets.valor_deducao IS 'Valor a ser deduzido do cálculo';
COMMENT ON COLUMN rh.irrf_brackets.numero_dependentes IS 'Número de dependentes considerados na faixa';
COMMENT ON COLUMN rh.irrf_brackets.valor_por_dependente IS 'Valor de dedução por dependente';
