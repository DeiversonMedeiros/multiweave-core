-- =====================================================
-- CRIAÇÃO DA TABELA ABSENCE_TYPES (TIPOS DE AFASTAMENTO)
-- =====================================================

-- Criar tabela de tipos de afastamento
CREATE TABLE IF NOT EXISTS rh.absence_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ferias', 'licenca_medica', 'licenca_maternidade', 'licenca_paternidade', 'licenca_casamento', 'licenca_luto', 'afastamento_medico', 'suspensao', 'afastamento_sem_vencimento')),
    maximo_dias INTEGER,
    remunerado BOOLEAN DEFAULT false,
    desconta_salario BOOLEAN DEFAULT false,
    desconta_ferias BOOLEAN DEFAULT false,
    desconta_13_salario BOOLEAN DEFAULT false,
    requer_anexo BOOLEAN DEFAULT false,
    requer_aprovacao BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_absence_type_codigo_company UNIQUE (codigo, company_id),
    CONSTRAINT check_absence_type_maximo_dias CHECK (maximo_dias IS NULL OR maximo_dias > 0)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_absence_types_company_id ON rh.absence_types(company_id);
CREATE INDEX IF NOT EXISTS idx_absence_types_codigo ON rh.absence_types(codigo);
CREATE INDEX IF NOT EXISTS idx_absence_types_tipo ON rh.absence_types(tipo);
CREATE INDEX IF NOT EXISTS idx_absence_types_ativo ON rh.absence_types(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_absence_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_absence_types_updated_at
    BEFORE UPDATE ON rh.absence_types
    FOR EACH ROW
    EXECUTE FUNCTION update_absence_types_updated_at();

-- Habilitar RLS
ALTER TABLE rh.absence_types ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view absence_types from their company" ON rh.absence_types
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'absence_types', 'read')
    );

CREATE POLICY "Users can insert absence_types in their company" ON rh.absence_types
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'absence_types', 'create')
    );

CREATE POLICY "Users can update absence_types from their company" ON rh.absence_types
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'absence_types', 'edit')
    );

CREATE POLICY "Users can delete absence_types from their company" ON rh.absence_types
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'absence_types', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.absence_types IS 'Tabela de tipos de afastamento e licenças';
COMMENT ON COLUMN rh.absence_types.tipo IS 'Tipo do afastamento: ferias, licenca_medica, licenca_maternidade, etc.';
COMMENT ON COLUMN rh.absence_types.maximo_dias IS 'Número máximo de dias permitidos para este tipo de afastamento';
COMMENT ON COLUMN rh.absence_types.remunerado IS 'Se o afastamento é remunerado';
COMMENT ON COLUMN rh.absence_types.desconta_salario IS 'Se desconta do salário mensal';
COMMENT ON COLUMN rh.absence_types.desconta_ferias IS 'Se desconta do período de férias';
COMMENT ON COLUMN rh.absence_types.requer_aprovacao IS 'Se requer aprovação prévia';

