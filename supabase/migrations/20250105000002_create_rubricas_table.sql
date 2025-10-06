-- =====================================================
-- CRIAÇÃO DA TABELA RUBRICAS (RUBRICAS DE FOLHA)
-- =====================================================

-- Criar tabela de rubricas
CREATE TABLE IF NOT EXISTS rh.rubricas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('provento', 'desconto', 'base_calculo', 'informacao')),
    categoria VARCHAR(100),
    natureza VARCHAR(50) DEFAULT 'normal' CHECK (natureza IN ('normal', 'eventual', 'fixo', 'variavel')),
    calculo_automatico BOOLEAN DEFAULT false,
    formula_calculo TEXT,
    valor_fixo DECIMAL(12,2),
    percentual DECIMAL(5,4), -- 0.0000 a 99.9999
    base_calculo VARCHAR(50) DEFAULT 'salario_base', -- salario_base, salario_familia, etc.
    incidencia_ir BOOLEAN DEFAULT false,
    incidencia_inss BOOLEAN DEFAULT false,
    incidencia_fgts BOOLEAN DEFAULT false,
    incidencia_contribuicao_sindical BOOLEAN DEFAULT false,
    ordem_exibicao INTEGER DEFAULT 0,
    obrigatorio BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_rubrica_codigo_company UNIQUE (codigo, company_id),
    CONSTRAINT check_rubrica_valor_formula CHECK (
        (valor_fixo IS NOT NULL AND formula_calculo IS NULL) OR
        (valor_fixo IS NULL AND formula_calculo IS NOT NULL) OR
        (valor_fixo IS NULL AND formula_calculo IS NULL)
    ),
    CONSTRAINT check_rubrica_percentual CHECK (percentual IS NULL OR (percentual >= 0 AND percentual <= 100))
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_rubricas_company_id ON rh.rubricas(company_id);
CREATE INDEX IF NOT EXISTS idx_rubricas_codigo ON rh.rubricas(codigo);
CREATE INDEX IF NOT EXISTS idx_rubricas_tipo ON rh.rubricas(tipo);
CREATE INDEX IF NOT EXISTS idx_rubricas_categoria ON rh.rubricas(categoria);
CREATE INDEX IF NOT EXISTS idx_rubricas_ativo ON rh.rubricas(ativo);
CREATE INDEX IF NOT EXISTS idx_rubricas_ordem ON rh.rubricas(ordem_exibicao);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_rubricas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rubricas_updated_at
    BEFORE UPDATE ON rh.rubricas
    FOR EACH ROW
    EXECUTE FUNCTION update_rubricas_updated_at();

-- Habilitar RLS
ALTER TABLE rh.rubricas ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view rubricas from their company" ON rh.rubricas
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'rubricas', 'read')
    );

CREATE POLICY "Users can insert rubricas in their company" ON rh.rubricas
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'rubricas', 'create')
    );

CREATE POLICY "Users can update rubricas from their company" ON rh.rubricas
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'rubricas', 'edit')
    );

CREATE POLICY "Users can delete rubricas from their company" ON rh.rubricas
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'rubricas', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.rubricas IS 'Tabela de rubricas para folha de pagamento';
COMMENT ON COLUMN rh.rubricas.tipo IS 'Tipo da rubrica: provento, desconto, base_calculo, informacao';
COMMENT ON COLUMN rh.rubricas.natureza IS 'Natureza da rubrica: normal, eventual, fixo, variavel';
COMMENT ON COLUMN rh.rubricas.formula_calculo IS 'Fórmula para cálculo automático da rubrica';
COMMENT ON COLUMN rh.rubricas.base_calculo IS 'Base para cálculo: salario_base, salario_familia, etc.';
COMMENT ON COLUMN rh.rubricas.incidencia_ir IS 'Se a rubrica incide no cálculo do IR';
COMMENT ON COLUMN rh.rubricas.incidencia_inss IS 'Se a rubrica incide no cálculo do INSS';
COMMENT ON COLUMN rh.rubricas.incidencia_fgts IS 'Se a rubrica incide no cálculo do FGTS';

