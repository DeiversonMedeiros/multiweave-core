-- =====================================================
-- CRIAÇÃO DA TABELA VACATION_ENTITLEMENTS (PERÍODOS AQUISITIVOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.vacation_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ano_aquisitivo INTEGER NOT NULL CHECK (ano_aquisitivo >= 2000 AND ano_aquisitivo <= 2100),
    data_inicio_periodo DATE NOT NULL,
    data_fim_periodo DATE NOT NULL,
    dias_disponiveis INTEGER NOT NULL DEFAULT 30 CHECK (dias_disponiveis >= 0 AND dias_disponiveis <= 30),
    dias_gozados INTEGER DEFAULT 0 CHECK (dias_gozados >= 0),
    dias_restantes INTEGER GENERATED ALWAYS AS (dias_disponiveis - dias_gozados) STORED,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'gozado', 'parcialmente_gozado')),
    data_vencimento DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_entitlement_period_dates CHECK (data_fim_periodo >= data_inicio_periodo),
    CONSTRAINT check_entitlement_days_gozados CHECK (dias_gozados <= dias_disponiveis),
    CONSTRAINT unique_employee_year_entitlement UNIQUE (employee_id, ano_aquisitivo)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vacation_entitlements_employee_id ON rh.vacation_entitlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_entitlements_company_id ON rh.vacation_entitlements(company_id);
CREATE INDEX IF NOT EXISTS idx_vacation_entitlements_ano_aquisitivo ON rh.vacation_entitlements(ano_aquisitivo);
CREATE INDEX IF NOT EXISTS idx_vacation_entitlements_status ON rh.vacation_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_vacation_entitlements_data_vencimento ON rh.vacation_entitlements(data_vencimento);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_vacation_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vacation_entitlements_updated_at
    BEFORE UPDATE ON rh.vacation_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_entitlements_updated_at();

-- Trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION update_vacation_entitlement_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar status baseado nos dias gozados
    IF NEW.dias_gozados = 0 THEN
        NEW.status = 'ativo';
    ELSIF NEW.dias_gozados = NEW.dias_disponiveis THEN
        NEW.status = 'gozado';
    ELSIF NEW.dias_gozados > 0 AND NEW.dias_gozados < NEW.dias_disponiveis THEN
        NEW.status = 'parcialmente_gozado';
    END IF;
    
    -- Verificar se venceu (2 anos após o fim do período aquisitivo)
    IF NEW.data_vencimento IS NULL THEN
        NEW.data_vencimento = NEW.data_fim_periodo + INTERVAL '2 years';
    END IF;
    
    -- Marcar como vencido se passou da data de vencimento
    IF NEW.data_vencimento < CURRENT_DATE AND NEW.status != 'gozado' THEN
        NEW.status = 'vencido';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vacation_entitlement_status
    BEFORE INSERT OR UPDATE ON rh.vacation_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_entitlement_status();

-- Comentários das colunas
COMMENT ON TABLE rh.vacation_entitlements IS 'Períodos aquisitivos de férias dos funcionários';
COMMENT ON COLUMN rh.vacation_entitlements.employee_id IS 'Funcionário proprietário do direito';
COMMENT ON COLUMN rh.vacation_entitlements.ano_aquisitivo IS 'Ano do período aquisitivo';
COMMENT ON COLUMN rh.vacation_entitlements.data_inicio_periodo IS 'Data de início do período aquisitivo';
COMMENT ON COLUMN rh.vacation_entitlements.data_fim_periodo IS 'Data de fim do período aquisitivo';
COMMENT ON COLUMN rh.vacation_entitlements.dias_disponiveis IS 'Total de dias de férias disponíveis (máximo 30)';
COMMENT ON COLUMN rh.vacation_entitlements.dias_gozados IS 'Dias de férias já gozados';
COMMENT ON COLUMN rh.vacation_entitlements.dias_restantes IS 'Dias de férias restantes (calculado automaticamente)';
COMMENT ON COLUMN rh.vacation_entitlements.status IS 'Status do direito: ativo, vencido, gozado, parcialmente_gozado';
COMMENT ON COLUMN rh.vacation_entitlements.data_vencimento IS 'Data de vencimento do direito (2 anos após fim do período)';
