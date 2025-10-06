-- =====================================================
-- CRIAÇÃO DA TABELA TIME_BANK (BANCO DE HORAS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.time_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    data_registro DATE NOT NULL,
    tipo_hora VARCHAR(20) NOT NULL CHECK (tipo_hora IN ('extra', 'compensatoria', 'sobreaviso', 'adicional_noturno')),
    quantidade_horas DECIMAL(5,2) NOT NULL,
    motivo TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'negado', 'utilizado', 'expirado')),
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_expiracao DATE,
    utilizado_em DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_bank_company_id ON rh.time_bank(company_id);
CREATE INDEX IF NOT EXISTS idx_time_bank_employee_id ON rh.time_bank(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_bank_data_registro ON rh.time_bank(data_registro);
CREATE INDEX IF NOT EXISTS idx_time_bank_status ON rh.time_bank(status);
CREATE INDEX IF NOT EXISTS idx_time_bank_tipo_hora ON rh.time_bank(tipo_hora);

-- Comentários das colunas
COMMENT ON TABLE rh.time_bank IS 'Banco de horas dos funcionários - controle de horas extras e compensatórias';
COMMENT ON COLUMN rh.time_bank.tipo_hora IS 'Tipo da hora: extra, compensatoria, sobreaviso, adicional_noturno';
COMMENT ON COLUMN rh.time_bank.quantidade_horas IS 'Quantidade de horas em formato decimal (ex: 2.5 = 2h30min)';
COMMENT ON COLUMN rh.time_bank.status IS 'Status: pendente, aprovado, negado, utilizado, expirado';
COMMENT ON COLUMN rh.time_bank.data_expiracao IS 'Data limite para utilização das horas';
COMMENT ON COLUMN rh.time_bank.utilizado_em IS 'Data em que as horas foram utilizadas';
