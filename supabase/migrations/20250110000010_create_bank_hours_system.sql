-- =====================================================
-- SISTEMA DE BANCO DE HORAS
-- =====================================================

-- 1. CONFIGURAÇÃO DE BANCO DE HORAS POR COLABORADOR
-- =====================================================
CREATE TABLE rh.bank_hours_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Configuração do banco de horas
  has_bank_hours BOOLEAN NOT NULL DEFAULT false,
  accumulation_period_months INTEGER NOT NULL DEFAULT 12, -- Período de acumulação em meses
  max_accumulation_hours DECIMAL(5,2) DEFAULT 40.00, -- Máximo de horas que pode acumular
  compensation_rate DECIMAL(4,2) DEFAULT 1.00, -- Taxa de compensação (1.0 = 1:1, 1.5 = 1.5:1)
  
  -- Configurações de compensação
  auto_compensate BOOLEAN DEFAULT false, -- Se deve compensar automaticamente
  compensation_priority VARCHAR(20) DEFAULT 'fifo' CHECK (compensation_priority IN ('fifo', 'lifo', 'manual')),
  
  -- Configurações de expiração
  expires_after_months INTEGER DEFAULT 12, -- Horas expiram após X meses
  allow_negative_balance BOOLEAN DEFAULT false, -- Permite saldo negativo
  
  -- Status e controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, company_id)
);

-- 2. SALDO ATUAL DO BANCO DE HORAS
-- =====================================================
CREATE TABLE rh.bank_hours_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Saldo atual
  current_balance DECIMAL(6,2) DEFAULT 0.00, -- Saldo atual em horas
  accumulated_hours DECIMAL(6,2) DEFAULT 0.00, -- Total de horas acumuladas
  compensated_hours DECIMAL(6,2) DEFAULT 0.00, -- Total de horas compensadas
  expired_hours DECIMAL(6,2) DEFAULT 0.00, -- Total de horas expiradas
  
  -- Controle de período
  last_calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_expiration_date DATE, -- Próxima data de expiração
  
  -- Status
  is_locked BOOLEAN DEFAULT false, -- Se o saldo está bloqueado para alterações
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, company_id)
);

-- 3. MOVIMENTAÇÕES DO BANCO DE HORAS
-- =====================================================
CREATE TABLE rh.bank_hours_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados da transação
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('accumulation', 'compensation', 'expiration', 'adjustment', 'transfer')),
  transaction_date DATE NOT NULL,
  hours_amount DECIMAL(5,2) NOT NULL, -- Quantidade de horas (positiva ou negativa)
  
  -- Referências
  time_record_id UUID REFERENCES rh.time_records(id), -- Se originou de um registro de ponto
  reference_period_start DATE, -- Período de referência para acumulação
  reference_period_end DATE,
  
  -- Detalhes
  description TEXT,
  compensation_rate DECIMAL(4,2) DEFAULT 1.00, -- Taxa aplicada na compensação
  
  -- Controle
  is_automatic BOOLEAN DEFAULT false, -- Se foi gerada automaticamente
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HISTÓRICO DE CÁLCULOS
-- =====================================================
CREATE TABLE rh.bank_hours_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Estatísticas do cálculo
  employees_processed INTEGER DEFAULT 0,
  hours_accumulated DECIMAL(8,2) DEFAULT 0.00,
  hours_compensated DECIMAL(8,2) DEFAULT 0.00,
  hours_expired DECIMAL(8,2) DEFAULT 0.00,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índices para bank_hours_config
CREATE INDEX idx_bank_hours_config_employee ON rh.bank_hours_config(employee_id);
CREATE INDEX idx_bank_hours_config_company ON rh.bank_hours_config(company_id);
CREATE INDEX idx_bank_hours_config_active ON rh.bank_hours_config(is_active) WHERE is_active = true;

-- Índices para bank_hours_balance
CREATE INDEX idx_bank_hours_balance_employee ON rh.bank_hours_balance(employee_id);
CREATE INDEX idx_bank_hours_balance_company ON rh.bank_hours_balance(company_id);
CREATE INDEX idx_bank_hours_balance_calculation_date ON rh.bank_hours_balance(last_calculation_date);

-- Índices para bank_hours_transactions
CREATE INDEX idx_bank_hours_transactions_employee ON rh.bank_hours_transactions(employee_id);
CREATE INDEX idx_bank_hours_transactions_company ON rh.bank_hours_transactions(company_id);
CREATE INDEX idx_bank_hours_transactions_date ON rh.bank_hours_transactions(transaction_date);
CREATE INDEX idx_bank_hours_transactions_type ON rh.bank_hours_transactions(transaction_type);
CREATE INDEX idx_bank_hours_transactions_time_record ON rh.bank_hours_transactions(time_record_id);

-- Índices para bank_hours_calculations
CREATE INDEX idx_bank_hours_calculations_company ON rh.bank_hours_calculations(company_id);
CREATE INDEX idx_bank_hours_calculations_date ON rh.bank_hours_calculations(calculation_date);
CREATE INDEX idx_bank_hours_calculations_status ON rh.bank_hours_calculations(status);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_bank_hours_config_updated_at 
    BEFORE UPDATE ON rh.bank_hours_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_hours_balance_updated_at 
    BEFORE UPDATE ON rh.bank_hours_balance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_hours_transactions_updated_at 
    BEFORE UPDATE ON rh.bank_hours_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE rh.bank_hours_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.bank_hours_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.bank_hours_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.bank_hours_calculations ENABLE ROW LEVEL SECURITY;

-- Policies para bank_hours_config
CREATE POLICY "Users can view bank hours config for their companies" ON rh.bank_hours_config
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can manage bank hours config for their companies" ON rh.bank_hours_config
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Policies para bank_hours_balance
CREATE POLICY "Users can view bank hours balance for their companies" ON rh.bank_hours_balance
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can manage bank hours balance for their companies" ON rh.bank_hours_balance
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Policies para bank_hours_transactions
CREATE POLICY "Users can view bank hours transactions for their companies" ON rh.bank_hours_transactions
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can manage bank hours transactions for their companies" ON rh.bank_hours_transactions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Policies para bank_hours_calculations
CREATE POLICY "Users can view bank hours calculations for their companies" ON rh.bank_hours_calculations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can manage bank hours calculations for their companies" ON rh.bank_hours_calculations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );
