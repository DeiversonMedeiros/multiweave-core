-- =====================================================
-- CRIAÇÃO DA TABELA DELAY_REASONS (MOTIVOS DE ATRASO)
-- =====================================================

-- Criar tabela de motivos de atraso
CREATE TABLE IF NOT EXISTS rh.delay_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('atraso', 'falta', 'saida_antecipada', 'justificado', 'injustificado')),
    desconta_salario BOOLEAN DEFAULT false,
    desconta_horas BOOLEAN DEFAULT false,
    requer_justificativa BOOLEAN DEFAULT false,
    requer_anexo BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_delay_reason_codigo_company UNIQUE (codigo, company_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_delay_reasons_company_id ON rh.delay_reasons(company_id);
CREATE INDEX IF NOT EXISTS idx_delay_reasons_codigo ON rh.delay_reasons(codigo);
CREATE INDEX IF NOT EXISTS idx_delay_reasons_tipo ON rh.delay_reasons(tipo);
CREATE INDEX IF NOT EXISTS idx_delay_reasons_ativo ON rh.delay_reasons(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_delay_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delay_reasons_updated_at
    BEFORE UPDATE ON rh.delay_reasons
    FOR EACH ROW
    EXECUTE FUNCTION update_delay_reasons_updated_at();

-- Habilitar RLS
ALTER TABLE rh.delay_reasons ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view delay_reasons from their company" ON rh.delay_reasons
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert delay_reasons in their company" ON rh.delay_reasons
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update delay_reasons from their company" ON rh.delay_reasons
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete delay_reasons from their company" ON rh.delay_reasons
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.delay_reasons IS 'Tabela de motivos de atraso e faltas';
COMMENT ON COLUMN rh.delay_reasons.tipo IS 'Tipo do motivo: atraso, falta, saida_antecipada, justificado, injustificado';
COMMENT ON COLUMN rh.delay_reasons.desconta_salario IS 'Se o motivo desconta do salário';
COMMENT ON COLUMN rh.delay_reasons.desconta_horas IS 'Se o motivo desconta horas trabalhadas';
COMMENT ON COLUMN rh.delay_reasons.requer_justificativa IS 'Se requer justificativa do funcionário';
COMMENT ON COLUMN rh.delay_reasons.requer_anexo IS 'Se requer anexo/documento comprobatório';

