-- =====================================================
-- CRIAÇÃO DA TABELA BENEFITS (BENEFÍCIOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vale_alimentacao', 'vale_refeicao', 'vale_transporte', 'plano_saude', 'plano_odonto', 'seguro_vida', 'auxilio_creche', 'auxilio_educacao', 'gympass', 'outros')),
    descricao TEXT,
    valor_mensal DECIMAL(10,2),
    valor_percentual DECIMAL(5,2), -- Para benefícios percentuais
    tipo_calculo VARCHAR(20) NOT NULL DEFAULT 'valor_fixo' CHECK (tipo_calculo IN ('valor_fixo', 'percentual_salario', 'tabela_faixas')),
    desconto_ir BOOLEAN DEFAULT false,
    desconto_inss BOOLEAN DEFAULT false,
    desconto_fgts BOOLEAN DEFAULT false,
    limite_mensal DECIMAL(10,2),
    data_inicio_vigencia DATE,
    data_fim_vigencia DATE,
    ativo BOOLEAN DEFAULT true,
    obrigatorio BOOLEAN DEFAULT false, -- Se é obrigatório para todos os funcionários
    categoria VARCHAR(50) DEFAULT 'geral' CHECK (categoria IN ('geral', 'executivo', 'operacional', 'terceirizado')),
    regras_aplicacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para funcionários que recebem benefícios
CREATE TABLE IF NOT EXISTS rh.employee_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    benefit_id UUID NOT NULL REFERENCES rh.benefits(id) ON DELETE CASCADE,
    valor_beneficio DECIMAL(10,2),
    valor_desconto DECIMAL(10,2) DEFAULT 0,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'finalizado')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, benefit_id, data_inicio)
);

-- Tabela para histórico de benefícios
CREATE TABLE IF NOT EXISTS rh.benefit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_benefit_id UUID NOT NULL REFERENCES rh.employee_benefits(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL,
    valor_beneficio DECIMAL(10,2) NOT NULL,
    valor_desconto DECIMAL(10,2) DEFAULT 0,
    valor_liquido DECIMAL(10,2) NOT NULL,
    status_processamento VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status_processamento IN ('pendente', 'processado', 'erro')),
    data_processamento TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_benefits_company_id ON rh.benefits(company_id);
CREATE INDEX IF NOT EXISTS idx_benefits_tipo ON rh.benefits(tipo);
CREATE INDEX IF NOT EXISTS idx_benefits_ativo ON rh.benefits(ativo);
CREATE INDEX IF NOT EXISTS idx_benefits_categoria ON rh.benefits(categoria);

CREATE INDEX IF NOT EXISTS idx_employee_benefits_company_id ON rh.employee_benefits(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_employee_id ON rh.employee_benefits(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_benefit_id ON rh.employee_benefits(benefit_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_status ON rh.employee_benefits(status);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_data_inicio ON rh.employee_benefits(data_inicio);

CREATE INDEX IF NOT EXISTS idx_benefit_history_company_id ON rh.benefit_history(company_id);
CREATE INDEX IF NOT EXISTS idx_benefit_history_employee_benefit_id ON rh.benefit_history(employee_benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_history_mes_referencia ON rh.benefit_history(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_benefit_history_status ON rh.benefit_history(status_processamento);

-- Comentários das tabelas
COMMENT ON TABLE rh.benefits IS 'Cadastro de benefícios oferecidos pela empresa';
COMMENT ON TABLE rh.employee_benefits IS 'Benefícios atribuídos aos funcionários';
COMMENT ON TABLE rh.benefit_history IS 'Histórico mensal dos benefícios dos funcionários';

-- Comentários das colunas principais
COMMENT ON COLUMN rh.benefits.tipo IS 'Tipo: vale_alimentacao, vale_refeicao, vale_transporte, plano_saude, plano_odonto, seguro_vida, auxilio_creche, auxilio_educacao, gympass, outros';
COMMENT ON COLUMN rh.benefits.tipo_calculo IS 'Tipo: valor_fixo, percentual_salario, tabela_faixas';
COMMENT ON COLUMN rh.benefits.categoria IS 'Categoria: geral, executivo, operacional, terceirizado';
COMMENT ON COLUMN rh.benefits.desconto_ir IS 'Se o benefício é descontado do IR';
COMMENT ON COLUMN rh.benefits.desconto_inss IS 'Se o benefício é descontado do INSS';
COMMENT ON COLUMN rh.benefits.desconto_fgts IS 'Se o benefício é descontado do FGTS';
COMMENT ON COLUMN rh.employee_benefits.status IS 'Status: ativo, suspenso, cancelado, finalizado';
COMMENT ON COLUMN rh.benefit_history.status_processamento IS 'Status: pendente, processado, erro';
