-- =====================================================
-- CRIAÇÃO DAS TABELAS DE CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
-- =====================================================

-- Tabela de convênios médicos e odontológicos
CREATE TABLE IF NOT EXISTS rh.medical_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('medico', 'odontologico', 'ambos')),
    cnpj VARCHAR(14),
    razao_social VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    site VARCHAR(255),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(8),
    contato_responsavel VARCHAR(255),
    telefone_contato VARCHAR(20),
    email_contato VARCHAR(255),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, nome)
);

-- Tabela de planos dos convênios
CREATE TABLE IF NOT EXISTS rh.medical_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES rh.medical_agreements(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('basico', 'intermediario', 'premium', 'executivo', 'familia', 'individual')),
    cobertura TEXT, -- Descrição da cobertura do plano
    carencia_dias INTEGER DEFAULT 0, -- Carência em dias
    faixa_etaria_min INTEGER DEFAULT 0,
    faixa_etaria_max INTEGER DEFAULT 99,
    limite_dependentes INTEGER DEFAULT 0, -- 0 = ilimitado
    valor_titular DECIMAL(10,2) NOT NULL,
    valor_dependente DECIMAL(10,2) NOT NULL,
    valor_familia DECIMAL(10,2), -- Valor para família (se aplicável)
    desconto_funcionario DECIMAL(5,2) DEFAULT 0, -- Desconto percentual para funcionários
    desconto_dependente DECIMAL(5,2) DEFAULT 0, -- Desconto percentual para dependentes
    ativo BOOLEAN DEFAULT true,
    data_inicio_vigencia DATE,
    data_fim_vigencia DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agreement_id, nome)
);

-- Tabela de adesões dos funcionários aos planos
CREATE TABLE IF NOT EXISTS rh.employee_medical_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES rh.medical_plans(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'transferido')),
    valor_mensal DECIMAL(10,2) NOT NULL, -- Valor final com descontos aplicados
    desconto_aplicado DECIMAL(5,2) DEFAULT 0, -- Desconto aplicado em %
    motivo_suspensao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, plan_id, data_inicio)
);

-- Tabela de dependentes dos funcionários nos planos
CREATE TABLE IF NOT EXISTS rh.employee_plan_dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_plan_id UUID NOT NULL REFERENCES rh.employee_medical_plans(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11),
    data_nascimento DATE,
    parentesco VARCHAR(50) NOT NULL CHECK (parentesco IN ('conjuge', 'filho', 'filha', 'pai', 'mae', 'outros')),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado')),
    valor_mensal DECIMAL(10,2) NOT NULL,
    data_inclusao DATE NOT NULL,
    data_exclusao DATE,
    motivo_exclusao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para histórico de valores dos planos
CREATE TABLE IF NOT EXISTS rh.medical_plan_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES rh.medical_plans(id) ON DELETE CASCADE,
    data_vigencia DATE NOT NULL,
    valor_titular_anterior DECIMAL(10,2),
    valor_titular_novo DECIMAL(10,2) NOT NULL,
    valor_dependente_anterior DECIMAL(10,2),
    valor_dependente_novo DECIMAL(10,2) NOT NULL,
    valor_familia_anterior DECIMAL(10,2),
    valor_familia_novo DECIMAL(10,2),
    percentual_reajuste DECIMAL(5,2),
    motivo_reajuste TEXT,
    aprovado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_medical_agreements_company_id ON rh.medical_agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_agreements_tipo ON rh.medical_agreements(tipo);
CREATE INDEX IF NOT EXISTS idx_medical_agreements_ativo ON rh.medical_agreements(ativo);

CREATE INDEX IF NOT EXISTS idx_medical_plans_company_id ON rh.medical_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_plans_agreement_id ON rh.medical_plans(agreement_id);
CREATE INDEX IF NOT EXISTS idx_medical_plans_categoria ON rh.medical_plans(categoria);
CREATE INDEX IF NOT EXISTS idx_medical_plans_ativo ON rh.medical_plans(ativo);

CREATE INDEX IF NOT EXISTS idx_employee_medical_plans_company_id ON rh.employee_medical_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_medical_plans_employee_id ON rh.employee_medical_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_medical_plans_plan_id ON rh.employee_medical_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_employee_medical_plans_status ON rh.employee_medical_plans(status);

CREATE INDEX IF NOT EXISTS idx_employee_plan_dependents_company_id ON rh.employee_plan_dependents(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_plan_dependents_employee_plan_id ON rh.employee_plan_dependents(employee_plan_id);
CREATE INDEX IF NOT EXISTS idx_employee_plan_dependents_status ON rh.employee_plan_dependents(status);

CREATE INDEX IF NOT EXISTS idx_medical_plan_pricing_history_company_id ON rh.medical_plan_pricing_history(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_plan_pricing_history_plan_id ON rh.medical_plan_pricing_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_medical_plan_pricing_history_data_vigencia ON rh.medical_plan_pricing_history(data_vigencia);

-- Comentários das tabelas
COMMENT ON TABLE rh.medical_agreements IS 'Convênios médicos e odontológicos disponíveis para os funcionários';
COMMENT ON TABLE rh.medical_plans IS 'Planos oferecidos por cada convênio médico/odontológico';
COMMENT ON TABLE rh.employee_medical_plans IS 'Adesões dos funcionários aos planos médicos/odontológicos';
COMMENT ON TABLE rh.employee_plan_dependents IS 'Dependentes dos funcionários nos planos médicos/odontológicos';
COMMENT ON TABLE rh.medical_plan_pricing_history IS 'Histórico de reajustes de preços dos planos';

-- Comentários das colunas principais
COMMENT ON COLUMN rh.medical_agreements.tipo IS 'Tipo: medico, odontologico, ambos';
COMMENT ON COLUMN rh.medical_plans.categoria IS 'Categoria: basico, intermediario, premium, executivo, familia, individual';
COMMENT ON COLUMN rh.employee_medical_plans.status IS 'Status: ativo, suspenso, cancelado, transferido';
COMMENT ON COLUMN rh.employee_plan_dependents.parentesco IS 'Parentesco: conjuge, filho, filha, pai, mae, outros';
COMMENT ON COLUMN rh.employee_plan_dependents.status IS 'Status: ativo, suspenso, cancelado';

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_medical_agreements_updated_at BEFORE UPDATE ON rh.medical_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_plans_updated_at BEFORE UPDATE ON rh.medical_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_medical_plans_updated_at BEFORE UPDATE ON rh.employee_medical_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_plan_dependents_updated_at BEFORE UPDATE ON rh.employee_plan_dependents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
