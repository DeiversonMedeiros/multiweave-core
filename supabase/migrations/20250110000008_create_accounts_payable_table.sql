-- =====================================================
-- TABELA: ACCOUNTS PAYABLE (Contas a Pagar)
-- =====================================================
-- Armazena contas a pagar geradas a partir da folha de pagamento

CREATE TABLE IF NOT EXISTS financeiro.accounts_payable (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Fornecedor/Funcionário
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    
    -- Documento
    document_number VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('invoice', 'payroll', 'expense', 'other')),
    
    -- Descrição e valores
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    
    -- Datas
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    
    -- Categorização
    category VARCHAR(100) NOT NULL,
    cost_center_id VARCHAR(100),
    
    -- Relacionamentos com folha
    payroll_id UUID,
    employee_id UUID,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT accounts_payable_pkey PRIMARY KEY (id),
    CONSTRAINT accounts_payable_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_id ON financeiro.accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_supplier_id ON financeiro.accounts_payable(supplier_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON financeiro.accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_document_type ON financeiro.accounts_payable(document_type);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON financeiro.accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_category ON financeiro.accounts_payable(category);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_cost_center_id ON financeiro.accounts_payable(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_payroll_id ON financeiro.accounts_payable(payroll_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_employee_id ON financeiro.accounts_payable(employee_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_created_at ON financeiro.accounts_payable(created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_updated_at ON financeiro.accounts_payable(updated_at);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_created_by ON financeiro.accounts_payable(created_by);

-- Comentários
COMMENT ON TABLE financeiro.accounts_payable IS 'Contas a pagar geradas a partir da folha de pagamento';
COMMENT ON COLUMN financeiro.accounts_payable.supplier_id IS 'ID do fornecedor/funcionário';
COMMENT ON COLUMN financeiro.accounts_payable.supplier_name IS 'Nome do fornecedor/funcionário';
COMMENT ON COLUMN financeiro.accounts_payable.document_number IS 'Número do documento';
COMMENT ON COLUMN financeiro.accounts_payable.document_type IS 'Tipo do documento: invoice, payroll, expense, other';
COMMENT ON COLUMN financeiro.accounts_payable.description IS 'Descrição da conta a pagar';
COMMENT ON COLUMN financeiro.accounts_payable.amount IS 'Valor da conta a pagar';
COMMENT ON COLUMN financeiro.accounts_payable.due_date IS 'Data de vencimento';
COMMENT ON COLUMN financeiro.accounts_payable.status IS 'Status da conta: pending, approved, paid, cancelled';
COMMENT ON COLUMN financeiro.accounts_payable.category IS 'Categoria da conta a pagar';
COMMENT ON COLUMN financeiro.accounts_payable.cost_center_id IS 'Centro de custo associado';
COMMENT ON COLUMN financeiro.accounts_payable.payroll_id IS 'ID da folha de pagamento relacionada';
COMMENT ON COLUMN financeiro.accounts_payable.employee_id IS 'ID do funcionário relacionado';

-- =====================================================
-- TABELA: FINANCIAL INTEGRATION CONFIG
-- =====================================================
-- Configurações de integração com o módulo financeiro

CREATE TABLE IF NOT EXISTS rh.financial_integration_config (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Configurações
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT financial_integration_config_pkey PRIMARY KEY (id),
    CONSTRAINT financial_integration_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT financial_integration_config_company_id_unique UNIQUE (company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financial_integration_config_company_id ON rh.financial_integration_config(company_id);

-- Comentários
COMMENT ON TABLE rh.financial_integration_config IS 'Configurações de integração com o módulo financeiro';
COMMENT ON COLUMN rh.financial_integration_config.config IS 'Configurações JSON da integração';

-- =====================================================
-- FUNÇÕES PARA CONTAS A PAGAR
-- =====================================================

-- Função para buscar contas a pagar por período
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_period(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.due_date >= p_start_date
        AND ap.due_date <= p_end_date
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por status
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_status(
    p_company_id UUID,
    p_status VARCHAR(20)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.status = p_status
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por funcionário
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_employee(
    p_company_id UUID,
    p_employee_id UUID
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.employee_id = p_employee_id
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por centro de custo
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_cost_center(
    p_company_id UUID,
    p_cost_center_id VARCHAR(100)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.cost_center_id = p_cost_center_id
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por categoria
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_category(
    p_company_id UUID,
    p_category VARCHAR(100)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.category = p_category
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por valor
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_amount(
    p_company_id UUID,
    p_min_amount DECIMAL(15,2),
    p_max_amount DECIMAL(15,2)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.amount >= p_min_amount
        AND ap.amount <= p_max_amount
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por documento
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_document(
    p_company_id UUID,
    p_document_number VARCHAR(255)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.document_number ILIKE '%' || p_document_number || '%'
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por tipo de documento
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_document_type(
    p_company_id UUID,
    p_document_type VARCHAR(50)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.document_type = p_document_type
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por fornecedor
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_supplier(
    p_company_id UUID,
    p_supplier_id UUID
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.supplier_id = p_supplier_id
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por criador
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_creator(
    p_company_id UUID,
    p_created_by UUID
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.created_by = p_created_by
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por data de criação
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_created_date(
    p_company_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.created_at >= p_start_date
        AND ap.created_at <= p_end_date
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contas a pagar por data de atualização
CREATE OR REPLACE FUNCTION financeiro.get_accounts_payable_by_updated_date(
    p_company_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    document_number VARCHAR(255),
    document_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    category VARCHAR(100),
    cost_center_id VARCHAR(100),
    payroll_id UUID,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id, ap.company_id, ap.supplier_id, ap.supplier_name,
        ap.document_number, ap.document_type, ap.description, ap.amount,
        ap.due_date, ap.status, ap.category, ap.cost_center_id,
        ap.payroll_id, ap.employee_id, ap.created_at, ap.updated_at, ap.created_by
    FROM financeiro.accounts_payable ap
    WHERE ap.company_id = p_company_id
        AND ap.updated_at >= p_start_date
        AND ap.updated_at <= p_end_date
    ORDER BY ap.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION financeiro.update_accounts_payable_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_accounts_payable_updated_at
    BEFORE UPDATE ON financeiro.accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.update_accounts_payable_updated_at();

-- Trigger para atualizar updated_at da configuração
CREATE OR REPLACE FUNCTION rh.update_financial_integration_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_financial_integration_config_updated_at
    BEFORE UPDATE ON rh.financial_integration_config
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_financial_integration_config_updated_at();

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE financeiro.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.financial_integration_config ENABLE ROW LEVEL SECURITY;

-- Política para contas a pagar
CREATE POLICY "Users can access their company's accounts payable" ON financeiro.accounts_payable
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Política para configuração de integração
CREATE POLICY "Users can access their company's integration config" ON rh.financial_integration_config
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );
