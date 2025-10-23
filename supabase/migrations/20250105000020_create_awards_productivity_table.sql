-- =====================================================
-- CRIAÇÃO DA TABELA AWARDS_PRODUCTIVITY (PREMIAÇÕES E PRODUTIVIDADE)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.awards_productivity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('premiacao', 'produtividade', 'bonus', 'comissao', 'meta', 'outros')),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    mes_referencia DATE NOT NULL, -- Mês/ano de referência (primeiro dia do mês)
    valor DECIMAL(10,2) NOT NULL,
    percentual DECIMAL(5,2), -- Para premiações percentuais
    tipo_calculo VARCHAR(20) NOT NULL DEFAULT 'valor_fixo' CHECK (tipo_calculo IN ('valor_fixo', 'percentual_meta', 'tabela_faixas', 'comissao_venda')),
    meta_atingida DECIMAL(10,2), -- Meta que foi atingida
    meta_estabelecida DECIMAL(10,2), -- Meta estabelecida
    percentual_atingimento DECIMAL(5,2), -- Percentual de atingimento da meta
    criterios TEXT, -- Critérios para concessão da premiação
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'pago', 'cancelado')),
    data_aprovacao DATE,
    aprovado_por UUID,
    data_pagamento DATE,
    observacoes TEXT,
    anexos TEXT[], -- Array de URLs ou nomes de arquivos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, nome, mes_referencia) -- Evita duplicação para mesmo funcionário, premiação e mês
);

-- Tabela para categorias de premiações/produtividade
CREATE TABLE IF NOT EXISTS rh.award_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('premiacao', 'produtividade', 'bonus', 'comissao', 'meta', 'outros')),
    ativo BOOLEAN DEFAULT true,
    criterios_padrao TEXT,
    valor_base DECIMAL(10,2),
    percentual_base DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, nome)
);

-- Tabela para importações em massa
CREATE TABLE IF NOT EXISTS rh.award_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_importacao VARCHAR(20) NOT NULL CHECK (tipo_importacao IN ('csv', 'excel', 'manual')),
    total_registros INTEGER NOT NULL,
    registros_processados INTEGER DEFAULT 0,
    registros_com_erro INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro', 'cancelado')),
    erro_detalhes TEXT,
    importado_por UUID,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para logs de erros de importação
CREATE TABLE IF NOT EXISTS rh.award_import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    import_id UUID NOT NULL REFERENCES rh.award_imports(id) ON DELETE CASCADE,
    linha_arquivo INTEGER NOT NULL,
    dados_linha TEXT, -- Dados da linha que causou erro
    erro_descricao TEXT NOT NULL,
    erro_campo VARCHAR(100), -- Campo que causou o erro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_awards_productivity_company_id ON rh.awards_productivity(company_id);
CREATE INDEX IF NOT EXISTS idx_awards_productivity_employee_id ON rh.awards_productivity(employee_id);
CREATE INDEX IF NOT EXISTS idx_awards_productivity_tipo ON rh.awards_productivity(tipo);
CREATE INDEX IF NOT EXISTS idx_awards_productivity_mes_referencia ON rh.awards_productivity(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_awards_productivity_status ON rh.awards_productivity(status);
CREATE INDEX IF NOT EXISTS idx_awards_productivity_data_aprovacao ON rh.awards_productivity(data_aprovacao);

CREATE INDEX IF NOT EXISTS idx_award_categories_company_id ON rh.award_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_award_categories_tipo ON rh.award_categories(tipo);
CREATE INDEX IF NOT EXISTS idx_award_categories_ativo ON rh.award_categories(ativo);

CREATE INDEX IF NOT EXISTS idx_award_imports_company_id ON rh.award_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_award_imports_mes_referencia ON rh.award_imports(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_award_imports_status ON rh.award_imports(status);

CREATE INDEX IF NOT EXISTS idx_award_import_errors_company_id ON rh.award_import_errors(company_id);
CREATE INDEX IF NOT EXISTS idx_award_import_errors_import_id ON rh.award_import_errors(import_id);

-- Comentários das tabelas
COMMENT ON TABLE rh.awards_productivity IS 'Registro de premiações e pagamentos por produtividade dos funcionários';
COMMENT ON TABLE rh.award_categories IS 'Categorias de premiações e produtividade';
COMMENT ON TABLE rh.award_imports IS 'Log de importações em massa de premiações';
COMMENT ON TABLE rh.award_import_errors IS 'Log de erros de importação de premiações';

-- Comentários das colunas principais
COMMENT ON COLUMN rh.awards_productivity.tipo IS 'Tipo: premiacao, produtividade, bonus, comissao, meta, outros';
COMMENT ON COLUMN rh.awards_productivity.mes_referencia IS 'Mês/ano de referência (primeiro dia do mês)';
COMMENT ON COLUMN rh.awards_productivity.tipo_calculo IS 'Tipo: valor_fixo, percentual_meta, tabela_faixas, comissao_venda';
COMMENT ON COLUMN rh.awards_productivity.status IS 'Status: pendente, aprovado, pago, cancelado';
COMMENT ON COLUMN rh.awards_productivity.percentual_atingimento IS 'Percentual de atingimento da meta (0-100)';
COMMENT ON COLUMN rh.award_categories.tipo IS 'Tipo de categoria: premiacao, produtividade, bonus, comissao, meta, outros';
COMMENT ON COLUMN rh.award_imports.tipo_importacao IS 'Tipo: csv, excel, manual';
COMMENT ON COLUMN rh.award_imports.status IS 'Status: processando, concluido, erro, cancelado';
