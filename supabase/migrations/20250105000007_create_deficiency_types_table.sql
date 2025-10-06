-- =====================================================
-- CRIAÇÃO DA TABELA DEFICIENCY_TYPES (TIPOS DE DEFICIÊNCIA)
-- =====================================================

-- Criar tabela de tipos de deficiência
CREATE TABLE IF NOT EXISTS rh.deficiency_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('fisica', 'visual', 'auditiva', 'intelectual', 'mental', 'multipla', 'outra')),
    grau VARCHAR(50) CHECK (grau IN ('leve', 'moderada', 'severa', 'profunda')),
    beneficios_lei_8213 BOOLEAN DEFAULT false, -- Lei 8.213/91
    beneficios_lei_13146 BOOLEAN DEFAULT false, -- Lei 13.146/2015 (LBI)
    isento_contribuicao_sindical BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_deficiency_type_codigo_company UNIQUE (codigo, company_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_deficiency_types_company_id ON rh.deficiency_types(company_id);
CREATE INDEX IF NOT EXISTS idx_deficiency_types_codigo ON rh.deficiency_types(codigo);
CREATE INDEX IF NOT EXISTS idx_deficiency_types_tipo ON rh.deficiency_types(tipo);
CREATE INDEX IF NOT EXISTS idx_deficiency_types_grau ON rh.deficiency_types(grau);
CREATE INDEX IF NOT EXISTS idx_deficiency_types_ativo ON rh.deficiency_types(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_deficiency_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deficiency_types_updated_at
    BEFORE UPDATE ON rh.deficiency_types
    FOR EACH ROW
    EXECUTE FUNCTION update_deficiency_types_updated_at();

-- Habilitar RLS
ALTER TABLE rh.deficiency_types ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view deficiency_types from their company" ON rh.deficiency_types
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'deficiency_types', 'read')
    );

CREATE POLICY "Users can insert deficiency_types in their company" ON rh.deficiency_types
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'deficiency_types', 'create')
    );

CREATE POLICY "Users can update deficiency_types from their company" ON rh.deficiency_types
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'deficiency_types', 'edit')
    );

CREATE POLICY "Users can delete deficiency_types from their company" ON rh.deficiency_types
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'deficiency_types', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.deficiency_types IS 'Tabela de tipos de deficiência para PCDs';
COMMENT ON COLUMN rh.deficiency_types.tipo IS 'Tipo da deficiência: fisica, visual, auditiva, intelectual, mental, multipla, outra';
COMMENT ON COLUMN rh.deficiency_types.grau IS 'Grau da deficiência: leve, moderada, severa, profunda';
COMMENT ON COLUMN rh.deficiency_types.beneficios_lei_8213 IS 'Se tem benefícios da Lei 8.213/91';
COMMENT ON COLUMN rh.deficiency_types.beneficios_lei_13146 IS 'Se tem benefícios da Lei 13.146/2015 (LBI)';
COMMENT ON COLUMN rh.deficiency_types.isento_contribuicao_sindical IS 'Se está isento de contribuição sindical';

