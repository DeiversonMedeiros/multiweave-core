-- =====================================================
-- CRIAÇÃO DA TABELA ALLOWANCE_TYPES (TIPOS DE ADICIONAIS)
-- =====================================================

-- Criar tabela de tipos de adicionais
CREATE TABLE IF NOT EXISTS rh.allowance_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('adicional', 'bonus', 'comissao', 'gratificacao', 'horas_extras', 'adicional_noturno', 'adicional_periculosidade', 'adicional_insalubridade')),
    calculo_automatico BOOLEAN DEFAULT false,
    percentual_base DECIMAL(5,4), -- 0.0000 a 99.9999
    valor_fixo DECIMAL(10,2),
    incidencia_ferias BOOLEAN DEFAULT true,
    incidencia_13_salario BOOLEAN DEFAULT true,
    incidencia_aviso_previo BOOLEAN DEFAULT true,
    incidencia_fgts BOOLEAN DEFAULT true,
    incidencia_inss BOOLEAN DEFAULT true,
    incidencia_ir BOOLEAN DEFAULT true,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_allowance_type_codigo_company UNIQUE (codigo, company_id),
    CONSTRAINT check_allowance_type_valor_percentual CHECK (
        (percentual_base IS NOT NULL AND valor_fixo IS NULL) OR
        (percentual_base IS NULL AND valor_fixo IS NOT NULL) OR
        (percentual_base IS NULL AND valor_fixo IS NULL)
    )
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_allowance_types_company_id ON rh.allowance_types(company_id);
CREATE INDEX IF NOT EXISTS idx_allowance_types_codigo ON rh.allowance_types(codigo);
CREATE INDEX IF NOT EXISTS idx_allowance_types_tipo ON rh.allowance_types(tipo);
CREATE INDEX IF NOT EXISTS idx_allowance_types_ativo ON rh.allowance_types(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_allowance_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_allowance_types_updated_at
    BEFORE UPDATE ON rh.allowance_types
    FOR EACH ROW
    EXECUTE FUNCTION update_allowance_types_updated_at();

-- Habilitar RLS
ALTER TABLE rh.allowance_types ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view allowance_types from their company" ON rh.allowance_types
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'allowance_types', 'read')
    );

CREATE POLICY "Users can insert allowance_types in their company" ON rh.allowance_types
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'allowance_types', 'create')
    );

CREATE POLICY "Users can update allowance_types from their company" ON rh.allowance_types
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'allowance_types', 'edit')
    );

CREATE POLICY "Users can delete allowance_types from their company" ON rh.allowance_types
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'allowance_types', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.allowance_types IS 'Tabela de tipos de adicionais salariais';
COMMENT ON COLUMN rh.allowance_types.tipo IS 'Tipo do adicional: adicional, bonus, comissao, gratificacao, horas_extras, etc.';
COMMENT ON COLUMN rh.allowance_types.percentual_base IS 'Percentual sobre a base de cálculo';
COMMENT ON COLUMN rh.allowance_types.incidencia_ferias IS 'Se o adicional incide no cálculo de férias';
COMMENT ON COLUMN rh.allowance_types.incidencia_13_salario IS 'Se o adicional incide no 13º salário';

