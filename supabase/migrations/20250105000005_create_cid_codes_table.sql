-- =====================================================
-- CRIAÇÃO DA TABELA CID_CODES (CÓDIGOS CID)
-- =====================================================

-- Criar tabela de códigos CID
CREATE TABLE IF NOT EXISTS rh.cid_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    descricao VARCHAR(500) NOT NULL,
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_cid_code_company UNIQUE (codigo, company_id),
    CONSTRAINT check_cid_code_format CHECK (codigo ~ '^[A-Z][0-9]{2}(\.[0-9])?$')
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_cid_codes_company_id ON rh.cid_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_cid_codes_codigo ON rh.cid_codes(codigo);
CREATE INDEX IF NOT EXISTS idx_cid_codes_categoria ON rh.cid_codes(categoria);
CREATE INDEX IF NOT EXISTS idx_cid_codes_ativo ON rh.cid_codes(ativo);
CREATE INDEX IF NOT EXISTS idx_cid_codes_descricao ON rh.cid_codes USING gin(to_tsvector('portuguese', descricao));

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_cid_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cid_codes_updated_at
    BEFORE UPDATE ON rh.cid_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_cid_codes_updated_at();

-- Habilitar RLS
ALTER TABLE rh.cid_codes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view cid_codes from their company" ON rh.cid_codes
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert cid_codes in their company" ON rh.cid_codes
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update cid_codes from their company" ON rh.cid_codes
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete cid_codes from their company" ON rh.cid_codes
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.cid_codes IS 'Tabela de códigos CID (Classificação Internacional de Doenças)';
COMMENT ON COLUMN rh.cid_codes.codigo IS 'Código CID (ex: F32.1, G43.9, etc.)';
COMMENT ON COLUMN rh.cid_codes.descricao IS 'Descrição da doença/condição médica';
COMMENT ON COLUMN rh.cid_codes.categoria IS 'Categoria da doença (ex: Mental, Neurológica, etc.)';
COMMENT ON COLUMN rh.cid_codes.subcategoria IS 'Subcategoria da doença';

