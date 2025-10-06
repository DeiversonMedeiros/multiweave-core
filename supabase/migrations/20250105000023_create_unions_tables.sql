-- =====================================================
-- CRIAÇÃO DAS TABELAS DE SINDICATOS E GESTÃO SINDICAL
-- =====================================================

-- Tabela de sindicatos
CREATE TABLE IF NOT EXISTS rh.unions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(50),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('patronal', 'trabalhadores', 'categoria', 'profissional', 'misto')),
    categoria VARCHAR(100), -- Categoria específica (ex: metalúrgicos, bancários, etc.)
    cnpj VARCHAR(14),
    inscricao_municipal VARCHAR(50),
    inscricao_estadual VARCHAR(50),
    razao_social VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    site VARCHAR(255),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(8),
    presidente VARCHAR(255),
    telefone_presidente VARCHAR(20),
    email_presidente VARCHAR(255),
    data_fundacao DATE,
    numero_registro VARCHAR(50),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, nome)
);

-- Tabela de filiações sindicais dos funcionários
CREATE TABLE IF NOT EXISTS rh.employee_union_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    union_id UUID NOT NULL REFERENCES rh.unions(id) ON DELETE CASCADE,
    data_filiacao DATE NOT NULL,
    data_desfiliacao DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'desfiliado', 'transferido')),
    numero_carteira VARCHAR(50),
    categoria_filiacao VARCHAR(100), -- Categoria específica na filiação
    valor_mensalidade DECIMAL(10,2), -- Valor da mensalidade sindical
    desconto_folha BOOLEAN DEFAULT false, -- Se desconta na folha
    motivo_desfiliacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, union_id, data_filiacao)
);

-- Tabela de contribuições sindicais
CREATE TABLE IF NOT EXISTS rh.union_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    union_id UUID NOT NULL REFERENCES rh.unions(id) ON DELETE CASCADE,
    tipo_contribuicao VARCHAR(50) NOT NULL CHECK (tipo_contribuicao IN ('mensalidade', 'contribuicao_assistencial', 'contribuicao_confederativa', 'taxa_negociacao', 'outras')),
    mes_referencia VARCHAR(7) NOT NULL, -- YYYY-MM
    valor DECIMAL(10,2) NOT NULL,
    desconto_folha BOOLEAN DEFAULT false,
    data_vencimento DATE,
    data_pagamento DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'isento', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de convenções coletivas e acordos
CREATE TABLE IF NOT EXISTS rh.collective_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    union_id UUID NOT NULL REFERENCES rh.unions(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('convencao_coletiva', 'acordo_coletivo', 'acordo_individual', 'dissidio', 'norma_regulamentar')),
    numero_documento VARCHAR(100),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_assinatura DATE NOT NULL,
    data_vigencia_inicio DATE NOT NULL,
    data_vigencia_fim DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencido', 'suspenso', 'cancelado')),
    valor_beneficios DECIMAL(10,2), -- Valor total dos benefícios negociados
    percentual_reajuste DECIMAL(5,2), -- Percentual de reajuste salarial
    clausulas TEXT, -- Texto das cláusulas principais
    arquivo_url VARCHAR(500), -- URL do arquivo digitalizado
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de negociações e reuniões sindicais
CREATE TABLE IF NOT EXISTS rh.union_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    union_id UUID NOT NULL REFERENCES rh.unions(id) ON DELETE CASCADE,
    tipo_negociacao VARCHAR(50) NOT NULL CHECK (tipo_negociacao IN ('salarial', 'beneficios', 'condicoes_trabalho', 'seguranca', 'outras')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'suspensa', 'cancelada')),
    responsavel_empresa VARCHAR(255),
    responsavel_sindicato VARCHAR(255),
    resultado TEXT,
    valor_proposto DECIMAL(10,2),
    valor_aceito DECIMAL(10,2),
    percentual_proposto DECIMAL(5,2),
    percentual_aceito DECIMAL(5,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de representantes sindicais na empresa
CREATE TABLE IF NOT EXISTS rh.union_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    union_id UUID NOT NULL REFERENCES rh.unions(id) ON DELETE CASCADE,
    cargo VARCHAR(100) NOT NULL, -- Ex: Delegado, Membro da CIPA, etc.
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unions_company_id ON rh.unions(company_id);
CREATE INDEX IF NOT EXISTS idx_unions_tipo ON rh.unions(tipo);
CREATE INDEX IF NOT EXISTS idx_unions_categoria ON rh.unions(categoria);
CREATE INDEX IF NOT EXISTS idx_unions_ativo ON rh.unions(ativo);

CREATE INDEX IF NOT EXISTS idx_employee_union_memberships_company_id ON rh.employee_union_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_union_memberships_employee_id ON rh.employee_union_memberships(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_union_memberships_union_id ON rh.employee_union_memberships(union_id);
CREATE INDEX IF NOT EXISTS idx_employee_union_memberships_status ON rh.employee_union_memberships(status);

CREATE INDEX IF NOT EXISTS idx_union_contributions_company_id ON rh.union_contributions(company_id);
CREATE INDEX IF NOT EXISTS idx_union_contributions_employee_id ON rh.union_contributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_union_contributions_union_id ON rh.union_contributions(union_id);
CREATE INDEX IF NOT EXISTS idx_union_contributions_mes_referencia ON rh.union_contributions(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_union_contributions_status ON rh.union_contributions(status);

CREATE INDEX IF NOT EXISTS idx_collective_agreements_company_id ON rh.collective_agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_collective_agreements_union_id ON rh.collective_agreements(union_id);
CREATE INDEX IF NOT EXISTS idx_collective_agreements_tipo_documento ON rh.collective_agreements(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_collective_agreements_status ON rh.collective_agreements(status);
CREATE INDEX IF NOT EXISTS idx_collective_agreements_data_vigencia_inicio ON rh.collective_agreements(data_vigencia_inicio);

CREATE INDEX IF NOT EXISTS idx_union_negotiations_company_id ON rh.union_negotiations(company_id);
CREATE INDEX IF NOT EXISTS idx_union_negotiations_union_id ON rh.union_negotiations(union_id);
CREATE INDEX IF NOT EXISTS idx_union_negotiations_tipo_negociacao ON rh.union_negotiations(tipo_negociacao);
CREATE INDEX IF NOT EXISTS idx_union_negotiations_status ON rh.union_negotiations(status);

CREATE INDEX IF NOT EXISTS idx_union_representatives_company_id ON rh.union_representatives(company_id);
CREATE INDEX IF NOT EXISTS idx_union_representatives_employee_id ON rh.union_representatives(employee_id);
CREATE INDEX IF NOT EXISTS idx_union_representatives_union_id ON rh.union_representatives(union_id);
CREATE INDEX IF NOT EXISTS idx_union_representatives_status ON rh.union_representatives(status);

-- Comentários das tabelas
COMMENT ON TABLE rh.unions IS 'Sindicatos patronais e de trabalhadores';
COMMENT ON TABLE rh.employee_union_memberships IS 'Filiações dos funcionários aos sindicatos';
COMMENT ON TABLE rh.union_contributions IS 'Contribuições e mensalidades sindicais';
COMMENT ON TABLE rh.collective_agreements IS 'Convenções coletivas e acordos sindicais';
COMMENT ON TABLE rh.union_negotiations IS 'Negociações e reuniões sindicais';
COMMENT ON TABLE rh.union_representatives IS 'Representantes sindicais na empresa';

-- Comentários das colunas principais
COMMENT ON COLUMN rh.unions.tipo IS 'Tipo: patronal, trabalhadores, categoria, profissional, misto';
COMMENT ON COLUMN rh.employee_union_memberships.status IS 'Status: ativo, suspenso, desfiliado, transferido';
COMMENT ON COLUMN rh.union_contributions.tipo_contribuicao IS 'Tipo: mensalidade, contribuicao_assistencial, contribuicao_confederativa, taxa_negociacao, outras';
COMMENT ON COLUMN rh.collective_agreements.tipo_documento IS 'Tipo: convencao_coletiva, acordo_coletivo, acordo_individual, dissidio, norma_regulamentar';
COMMENT ON COLUMN rh.union_negotiations.tipo_negociacao IS 'Tipo: salarial, beneficios, condicoes_trabalho, seguranca, outras';

-- Triggers para updated_at
CREATE TRIGGER update_unions_updated_at BEFORE UPDATE ON rh.unions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_union_memberships_updated_at BEFORE UPDATE ON rh.employee_union_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_union_contributions_updated_at BEFORE UPDATE ON rh.union_contributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collective_agreements_updated_at BEFORE UPDATE ON rh.collective_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_union_negotiations_updated_at BEFORE UPDATE ON rh.union_negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_union_representatives_updated_at BEFORE UPDATE ON rh.union_representatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
