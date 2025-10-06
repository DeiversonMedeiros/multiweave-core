-- =====================================================
-- CRIAÇÃO DA TABELA EMPLOYMENT_CONTRACTS (CONTRATOS DE TRABALHO)
-- =====================================================

-- Criar tabela de contratos de trabalho
CREATE TABLE IF NOT EXISTS rh.employment_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    numero_contrato VARCHAR(100) NOT NULL,
    tipo_contrato VARCHAR(50) NOT NULL, -- CLT, PJ, Estagiário, Terceirizado, etc.
    data_inicio DATE NOT NULL,
    data_fim DATE,
    periodo_experiencia INTEGER DEFAULT 90, -- dias
    salario_base DECIMAL(10,2) NOT NULL,
    carga_horaria_semanal INTEGER DEFAULT 40,
    regime_trabalho VARCHAR(50) DEFAULT 'tempo_integral', -- tempo_integral, meio_periodo, etc.
    tipo_jornada VARCHAR(50) DEFAULT 'normal', -- normal, noturna, especial
    beneficios JSONB DEFAULT '{}',
    clausulas_especiais TEXT,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'encerrado', 'rescisao')),
    data_rescisao DATE,
    motivo_rescisao VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_employment_contracts_employee_id FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE CASCADE,
    CONSTRAINT check_employment_contracts_data_fim CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT check_employment_contracts_salario CHECK (salario_base > 0),
    CONSTRAINT check_employment_contracts_carga_horaria CHECK (carga_horaria_semanal > 0 AND carga_horaria_semanal <= 168)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_employment_contracts_company_id ON rh.employment_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_employee_id ON rh.employment_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_numero ON rh.employment_contracts(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_tipo ON rh.employment_contracts(tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_status ON rh.employment_contracts(status);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_data_inicio ON rh.employment_contracts(data_inicio);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_employment_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employment_contracts_updated_at
    BEFORE UPDATE ON rh.employment_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_employment_contracts_updated_at();

-- Habilitar RLS
ALTER TABLE rh.employment_contracts ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view employment_contracts from their company" ON rh.employment_contracts
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'employment_contracts', 'read')
    );

CREATE POLICY "Users can insert employment_contracts in their company" ON rh.employment_contracts
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'employment_contracts', 'create')
    );

CREATE POLICY "Users can update employment_contracts from their company" ON rh.employment_contracts
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'employment_contracts', 'edit')
    );

CREATE POLICY "Users can delete employment_contracts from their company" ON rh.employment_contracts
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'employment_contracts', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.employment_contracts IS 'Tabela de contratos de trabalho';
COMMENT ON COLUMN rh.employment_contracts.tipo_contrato IS 'Tipo do contrato: CLT, PJ, Estagiário, Terceirizado, etc.';
COMMENT ON COLUMN rh.employment_contracts.regime_trabalho IS 'Regime de trabalho: tempo_integral, meio_periodo, etc.';
COMMENT ON COLUMN rh.employment_contracts.beneficios IS 'JSON com benefícios do contrato';

