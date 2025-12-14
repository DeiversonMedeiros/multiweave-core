-- =====================================================
-- MIGRAÇÃO: CRIAR SCHEMA TRIBUTÁRIO E PARAMETRIZAÇÃO
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria o schema tributario com tabelas de parametrização de tributos
--            (ISS, ICMS, IPI, PIS/COFINS, INSS/RAT/FAP)
-- Autor: Sistema MultiWeave Core
-- Módulo: M5 - Motor Tributário

-- =====================================================
-- 1. CRIAR SCHEMA TRIBUTÁRIO
-- =====================================================

CREATE SCHEMA IF NOT EXISTS tributario;

COMMENT ON SCHEMA tributario IS 'Módulo Tributário - Parametrização e cálculo de impostos (ISS, ICMS, IPI, PIS/COFINS, INSS)';

-- =====================================================
-- 2. TABELA: PARAMETRIZAÇÃO ISS (POR MUNICÍPIO)
-- =====================================================

CREATE TABLE IF NOT EXISTS tributario.iss_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação do município
    codigo_municipio_ibge VARCHAR(7) NOT NULL, -- Código IBGE do município (7 dígitos)
    municipio_nome VARCHAR(255) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    
    -- Configuração de base de cálculo
    tipo_base_calculo VARCHAR(50) NOT NULL CHECK (tipo_base_calculo IN ('base_cheia', 'deducao_presumida', 'deducao_real')),
    percentual_deducao_presumida DECIMAL(5,2) DEFAULT 0, -- Percentual de dedução quando tipo = 'deducao_presumida'
    
    -- Alíquotas
    aliquota_iss DECIMAL(5,4) NOT NULL CHECK (aliquota_iss >= 0 AND aliquota_iss <= 1), -- Alíquota padrão (ex: 0.05 = 5%)
    aliquota_minima DECIMAL(5,4), -- Alíquota mínima permitida
    aliquota_maxima DECIMAL(5,4), -- Alíquota máxima permitida
    
    -- Regras específicas
    permite_retencao_na_fonte BOOLEAN DEFAULT false,
    responsavel_recolhimento VARCHAR(20) CHECK (responsavel_recolhimento IN ('prestador', 'tomador', 'intermediario')),
    
    -- Vigência
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE,
    
    -- Metadados
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única por empresa/município/vigência
    CONSTRAINT iss_config_unique UNIQUE (company_id, codigo_municipio_ibge, data_inicio_vigencia)
);

CREATE INDEX IF NOT EXISTS idx_iss_config_company_id ON tributario.iss_config(company_id);
CREATE INDEX IF NOT EXISTS idx_iss_config_municipio ON tributario.iss_config(codigo_municipio_ibge);
CREATE INDEX IF NOT EXISTS idx_iss_config_uf ON tributario.iss_config(uf);
CREATE INDEX IF NOT EXISTS idx_iss_config_vigencia ON tributario.iss_config(data_inicio_vigencia, data_fim_vigencia);

COMMENT ON TABLE tributario.iss_config IS 'Parametrização de ISS por município com opções de base cheia, dedução presumida ou real';
COMMENT ON COLUMN tributario.iss_config.tipo_base_calculo IS 'Tipo de base de cálculo: base_cheia (sem dedução), deducao_presumida (dedução percentual fixa), deducao_real (dedução baseada em materiais)';
COMMENT ON COLUMN tributario.iss_config.percentual_deducao_presumida IS 'Percentual de dedução quando tipo_base_calculo = deducao_presumida';

-- =====================================================
-- 3. TABELA: PARAMETRIZAÇÃO ICMS (POR UF)
-- =====================================================

CREATE TABLE IF NOT EXISTS tributario.icms_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação da UF
    uf VARCHAR(2) NOT NULL,
    uf_nome VARCHAR(100) NOT NULL,
    
    -- Tipo de operação
    tipo_operacao VARCHAR(50) NOT NULL CHECK (tipo_operacao IN ('venda_interna', 'venda_interestadual', 'venda_exterior', 'compra_interna', 'compra_interestadual', 'compra_exterior')),
    cst VARCHAR(3), -- Código de Situação Tributária (ex: '00', '10', '20', '41', '60')
    cfop VARCHAR(4), -- Código Fiscal de Operações e Prestações
    
    -- Alíquotas
    aliquota_icms DECIMAL(5,4) NOT NULL CHECK (aliquota_icms >= 0 AND aliquota_icms <= 1),
    aliquota_icms_st DECIMAL(5,4), -- Alíquota de ICMS ST (Substituição Tributária)
    
    -- Regras de crédito
    permite_credito_insumos BOOLEAN DEFAULT true,
    percentual_credito_insumos DECIMAL(5,2) DEFAULT 100, -- Percentual de crédito permitido (ex: 100 = 100%)
    
    -- Regras de redução de base
    percentual_reducao_base DECIMAL(5,2) DEFAULT 0, -- Percentual de redução da base de cálculo
    
    -- MVA (Margem de Valor Agregado) para ST
    percentual_mva DECIMAL(5,2), -- Percentual de MVA para cálculo de ST
    
    -- Vigência
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE,
    
    -- Metadados
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única por empresa/UF/tipo_operacao/vigência
    CONSTRAINT icms_config_unique UNIQUE (company_id, uf, tipo_operacao, cst, data_inicio_vigencia)
);

CREATE INDEX IF NOT EXISTS idx_icms_config_company_id ON tributario.icms_config(company_id);
CREATE INDEX IF NOT EXISTS idx_icms_config_uf ON tributario.icms_config(uf);
CREATE INDEX IF NOT EXISTS idx_icms_config_tipo_operacao ON tributario.icms_config(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_icms_config_vigencia ON tributario.icms_config(data_inicio_vigencia, data_fim_vigencia);

COMMENT ON TABLE tributario.icms_config IS 'Parametrização de ICMS por UF com regras de crédito de insumos e alíquotas';
COMMENT ON COLUMN tributario.icms_config.permite_credito_insumos IS 'Indica se permite crédito de ICMS sobre insumos';
COMMENT ON COLUMN tributario.icms_config.percentual_credito_insumos IS 'Percentual de crédito permitido sobre insumos (0-100)';

-- =====================================================
-- 4. TABELA: PARAMETRIZAÇÃO IPI (POR TIPO DE PRODUTO/ATIVIDADE)
-- =====================================================

CREATE TABLE IF NOT EXISTS tributario.ipi_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Classificação do produto
    ncm VARCHAR(8), -- Nomenclatura Comum do Mercosul (8 dígitos)
    codigo_enquadramento VARCHAR(3), -- Código de enquadramento IPI
    descricao_produto TEXT,
    
    -- Tipo de atividade
    tipo_atividade VARCHAR(50) CHECK (tipo_atividade IN ('industrializacao', 'comercializacao', 'importacao', 'exportacao')),
    
    -- Alíquotas
    aliquota_ipi DECIMAL(5,4) NOT NULL CHECK (aliquota_ipi >= 0 AND aliquota_ipi <= 1),
    aliquota_ipi_st DECIMAL(5,4), -- Alíquota de IPI ST (quando aplicável)
    
    -- Regras de crédito
    permite_credito_ipi BOOLEAN DEFAULT true,
    percentual_credito_ipi DECIMAL(5,2) DEFAULT 100,
    
    -- Vigência
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE,
    
    -- Metadados
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipi_config_company_id ON tributario.ipi_config(company_id);
CREATE INDEX IF NOT EXISTS idx_ipi_config_ncm ON tributario.ipi_config(ncm);
CREATE INDEX IF NOT EXISTS idx_ipi_config_tipo_atividade ON tributario.ipi_config(tipo_atividade);
CREATE INDEX IF NOT EXISTS idx_ipi_config_vigencia ON tributario.ipi_config(data_inicio_vigencia, data_fim_vigencia);

COMMENT ON TABLE tributario.ipi_config IS 'Parametrização de IPI por tipo de produto/atividade e NCM';
COMMENT ON COLUMN tributario.ipi_config.ncm IS 'Nomenclatura Comum do Mercosul (8 dígitos)';

-- =====================================================
-- 5. TABELA: PARAMETRIZAÇÃO PIS/COFINS
-- =====================================================

CREATE TABLE IF NOT EXISTS tributario.pis_cofins_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Regime de apuração
    regime_apuracao VARCHAR(50) NOT NULL CHECK (regime_apuracao IN ('cumulativo', 'nao_cumulativo')),
    
    -- Alíquotas PIS
    aliquota_pis_cumulativo DECIMAL(5,4), -- Alíquota PIS no regime cumulativo
    aliquota_pis_nao_cumulativo DECIMAL(5,4), -- Alíquota PIS no regime não cumulativo
    
    -- Alíquotas COFINS
    aliquota_cofins_cumulativo DECIMAL(5,4), -- Alíquota COFINS no regime cumulativo
    aliquota_cofins_nao_cumulativo DECIMAL(5,4), -- Alíquota COFINS no regime não cumulativo
    
    -- Regras de crédito (apenas no regime não cumulativo)
    permite_credito_insumos BOOLEAN DEFAULT true,
    permite_credito_servicos BOOLEAN DEFAULT false,
    permite_credito_energia BOOLEAN DEFAULT true,
    permite_credito_aluguel BOOLEAN DEFAULT false,
    permite_credito_combustivel BOOLEAN DEFAULT true,
    
    -- Percentuais de crédito permitidos
    percentual_credito_insumos DECIMAL(5,2) DEFAULT 100,
    percentual_credito_servicos DECIMAL(5,2) DEFAULT 0,
    percentual_credito_energia DECIMAL(5,2) DEFAULT 100,
    percentual_credito_aluguel DECIMAL(5,2) DEFAULT 0,
    percentual_credito_combustivel DECIMAL(5,2) DEFAULT 100,
    
    -- Vigência
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE,
    
    -- Metadados
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única por empresa/regime/vigência
    CONSTRAINT pis_cofins_config_unique UNIQUE (company_id, regime_apuracao, data_inicio_vigencia)
);

CREATE INDEX IF NOT EXISTS idx_pis_cofins_config_company_id ON tributario.pis_cofins_config(company_id);
CREATE INDEX IF NOT EXISTS idx_pis_cofins_config_regime ON tributario.pis_cofins_config(regime_apuracao);
CREATE INDEX IF NOT EXISTS idx_pis_cofins_config_vigencia ON tributario.pis_cofins_config(data_inicio_vigencia, data_fim_vigencia);

COMMENT ON TABLE tributario.pis_cofins_config IS 'Parametrização de PIS/COFINS com definição de regime (cumulativo/não cumulativo) e créditos permitidos';
COMMENT ON COLUMN tributario.pis_cofins_config.regime_apuracao IS 'Regime de apuração: cumulativo (sem créditos) ou nao_cumulativo (com créditos)';

-- =====================================================
-- 6. TABELA: PARAMETRIZAÇÃO INSS/RAT/FAP (COMPLEMENTAR)
-- =====================================================
-- Nota: INSS básico já existe em rh.inss_brackets
-- Esta tabela complementa com RAT (Risco Ambiental do Trabalho) e FAP (Fator Acidentário de Prevenção)

CREATE TABLE IF NOT EXISTS tributario.inss_rat_fap_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- CNAE (Classificação Nacional de Atividades Econômicas)
    cnae VARCHAR(7), -- CNAE principal da empresa
    cnae_descricao TEXT,
    
    -- RAT (Risco Ambiental do Trabalho)
    aliquota_rat DECIMAL(5,4) NOT NULL CHECK (aliquota_rat >= 0 AND aliquota_rat <= 1),
    -- Alíquotas RAT padrão: 1%, 2% ou 3% conforme grau de risco
    
    -- FAP (Fator Acidentário de Prevenção)
    fap DECIMAL(5,4) DEFAULT 1.0, -- Fator multiplicador (padrão 1.0, varia de 0.5 a 2.0)
    data_fap DATE, -- Data de atualização do FAP
    
    -- Alíquota final calculada
    aliquota_final DECIMAL(5,4) GENERATED ALWAYS AS (aliquota_rat * fap) STORED,
    
    -- Vigência
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE,
    
    -- Metadados
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única por empresa/CNAE/vigência
    CONSTRAINT inss_rat_fap_config_unique UNIQUE (company_id, cnae, data_inicio_vigencia)
);

CREATE INDEX IF NOT EXISTS idx_inss_rat_fap_config_company_id ON tributario.inss_rat_fap_config(company_id);
CREATE INDEX IF NOT EXISTS idx_inss_rat_fap_config_cnae ON tributario.inss_rat_fap_config(cnae);
CREATE INDEX IF NOT EXISTS idx_inss_rat_fap_config_vigencia ON tributario.inss_rat_fap_config(data_inicio_vigencia, data_fim_vigencia);

COMMENT ON TABLE tributario.inss_rat_fap_config IS 'Parametrização complementar de INSS com RAT (Risco Ambiental do Trabalho) e FAP (Fator Acidentário de Prevenção)';
COMMENT ON COLUMN tributario.inss_rat_fap_config.aliquota_rat IS 'Alíquota de RAT conforme grau de risco da atividade (1%, 2% ou 3%)';
COMMENT ON COLUMN tributario.inss_rat_fap_config.fap IS 'Fator Acidentário de Prevenção - multiplicador que varia de 0.5 a 2.0';

-- =====================================================
-- 7. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION tributario.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_iss_config_updated_at
    BEFORE UPDATE ON tributario.iss_config
    FOR EACH ROW EXECUTE FUNCTION tributario.update_updated_at_column();

CREATE TRIGGER update_icms_config_updated_at
    BEFORE UPDATE ON tributario.icms_config
    FOR EACH ROW EXECUTE FUNCTION tributario.update_updated_at_column();

CREATE TRIGGER update_ipi_config_updated_at
    BEFORE UPDATE ON tributario.ipi_config
    FOR EACH ROW EXECUTE FUNCTION tributario.update_updated_at_column();

CREATE TRIGGER update_pis_cofins_config_updated_at
    BEFORE UPDATE ON tributario.pis_cofins_config
    FOR EACH ROW EXECUTE FUNCTION tributario.update_updated_at_column();

CREATE TRIGGER update_inss_rat_fap_config_updated_at
    BEFORE UPDATE ON tributario.inss_rat_fap_config
    FOR EACH ROW EXECUTE FUNCTION tributario.update_updated_at_column();

-- =====================================================
-- 8. COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA tributario IS 'Módulo Tributário - Centraliza todas as regras de apuração e simulação tributária, parametrizando alíquotas e fórmulas';

