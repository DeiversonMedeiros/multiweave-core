-- =====================================================
-- CRIAÇÃO DA TABELA FGTS_CONFIG (CONFIGURAÇÕES FGTS)
-- =====================================================

-- Criar tabela de configurações FGTS
CREATE TABLE IF NOT EXISTS rh.fgts_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    ano_vigencia INTEGER NOT NULL,
    mes_vigencia INTEGER NOT NULL,
    aliquota_fgts DECIMAL(5,4) NOT NULL, -- 0.0000 a 1.0000 (0% a 100%)
    aliquota_multa DECIMAL(5,4) DEFAULT 0, -- 0.0000 a 1.0000 (0% a 100%)
    aliquota_juros DECIMAL(5,4) DEFAULT 0, -- 0.0000 a 1.0000 (0% a 100%)
    teto_salario DECIMAL(12,2), -- Teto para incidência do FGTS
    valor_minimo_contribuicao DECIMAL(10,2) DEFAULT 0,
    multa_rescisao DECIMAL(5,4) DEFAULT 0, -- Multa de 40% sobre FGTS
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_fgts_config_company_ano_mes_codigo UNIQUE (codigo, company_id, ano_vigencia, mes_vigencia),
    CONSTRAINT check_fgts_config_aliquota_fgts CHECK (aliquota_fgts >= 0 AND aliquota_fgts <= 1),
    CONSTRAINT check_fgts_config_aliquota_multa CHECK (aliquota_multa >= 0 AND aliquota_multa <= 1),
    CONSTRAINT check_fgts_config_aliquota_juros CHECK (aliquota_juros >= 0 AND aliquota_juros <= 1),
    CONSTRAINT check_fgts_config_multa_rescisao CHECK (multa_rescisao >= 0 AND multa_rescisao <= 1),
    CONSTRAINT check_fgts_config_ano CHECK (ano_vigencia >= 2020 AND ano_vigencia <= 2030),
    CONSTRAINT check_fgts_config_mes CHECK (mes_vigencia >= 1 AND mes_vigencia <= 12)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_fgts_config_company_id ON rh.fgts_config(company_id);
CREATE INDEX IF NOT EXISTS idx_fgts_config_ano_mes ON rh.fgts_config(ano_vigencia, mes_vigencia);
CREATE INDEX IF NOT EXISTS idx_fgts_config_codigo ON rh.fgts_config(codigo);
CREATE INDEX IF NOT EXISTS idx_fgts_config_ativo ON rh.fgts_config(ativo);
CREATE INDEX IF NOT EXISTS idx_fgts_config_vigencia ON rh.fgts_config(ano_vigencia, mes_vigencia, ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_fgts_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fgts_config_updated_at
    BEFORE UPDATE ON rh.fgts_config
    FOR EACH ROW
    EXECUTE FUNCTION update_fgts_config_updated_at();

-- Habilitar RLS
ALTER TABLE rh.fgts_config ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view fgts_config from their company" ON rh.fgts_config
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'fgts_config', 'read')
    );

CREATE POLICY "Users can insert fgts_config in their company" ON rh.fgts_config
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'fgts_config', 'create')
    );

CREATE POLICY "Users can update fgts_config from their company" ON rh.fgts_config
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'fgts_config', 'edit')
    );

CREATE POLICY "Users can delete fgts_config from their company" ON rh.fgts_config
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'fgts_config', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.fgts_config IS 'Tabela de configurações do FGTS para cálculo de fundo de garantia';
COMMENT ON COLUMN rh.fgts_config.ano_vigencia IS 'Ano de vigência da configuração FGTS';
COMMENT ON COLUMN rh.fgts_config.mes_vigencia IS 'Mês de vigência da configuração FGTS';
COMMENT ON COLUMN rh.fgts_config.aliquota_fgts IS 'Alíquota do FGTS (0.08 = 8%)';
COMMENT ON COLUMN rh.fgts_config.aliquota_multa IS 'Alíquota de multa sobre FGTS';
COMMENT ON COLUMN rh.fgts_config.aliquota_juros IS 'Alíquota de juros sobre FGTS';
COMMENT ON COLUMN rh.fgts_config.teto_salario IS 'Teto salarial para incidência do FGTS';
COMMENT ON COLUMN rh.fgts_config.multa_rescisao IS 'Multa de rescisão (0.4 = 40%)';
