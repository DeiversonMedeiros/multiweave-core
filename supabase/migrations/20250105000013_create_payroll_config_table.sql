-- =====================================================
-- TABELA: PAYROLL CONFIG (Configurações de Folha)
-- =====================================================
-- Armazena configurações específicas para cálculo de folha

CREATE TABLE IF NOT EXISTS rh.payroll_config (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Configurações gerais
    codigo VARCHAR(20) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    
    -- Configurações de período
    ano_vigencia INTEGER NOT NULL CHECK (ano_vigencia >= 2000 AND ano_vigencia <= 2100),
    mes_vigencia INTEGER NOT NULL CHECK (mes_vigencia >= 1 AND mes_vigencia <= 12),
    
    -- Configurações de cálculo
    dias_uteis_mes INTEGER DEFAULT 22,
    horas_dia_trabalho DECIMAL(4,2) DEFAULT 8.00,
    percentual_hora_extra DECIMAL(5,4) DEFAULT 0.5000, -- 50%
    percentual_hora_noturna DECIMAL(5,4) DEFAULT 0.2000, -- 20%
    percentual_dsr DECIMAL(5,4) DEFAULT 0.0455, -- 1/22 = 4.55%
    
    -- Configurações de impostos
    aplicar_inss BOOLEAN DEFAULT true,
    aplicar_irrf BOOLEAN DEFAULT true,
    aplicar_fgts BOOLEAN DEFAULT true,
    aplicar_vale_transporte BOOLEAN DEFAULT true,
    percentual_vale_transporte DECIMAL(5,4) DEFAULT 0.0600, -- 6%
    
    -- Configurações de adicionais
    aplicar_adicional_noturno BOOLEAN DEFAULT true,
    percentual_adicional_noturno DECIMAL(5,4) DEFAULT 0.2000, -- 20%
    aplicar_periculosidade BOOLEAN DEFAULT false,
    percentual_periculosidade DECIMAL(5,4) DEFAULT 0.3000, -- 30%
    aplicar_insalubridade BOOLEAN DEFAULT false,
    grau_insalubridade VARCHAR(20) DEFAULT 'medio', -- 'minimo', 'medio', 'maximo'
    
    -- Configurações de férias
    aplicar_ferias_proporcionais BOOLEAN DEFAULT true,
    aplicar_terco_ferias BOOLEAN DEFAULT true,
    aplicar_13_salario BOOLEAN DEFAULT true,
    
    -- Configurações de desconto
    desconto_faltas BOOLEAN DEFAULT true,
    desconto_atrasos BOOLEAN DEFAULT true,
    tolerancia_atraso_minutos INTEGER DEFAULT 5,
    
    -- Configurações de arredondamento
    arredondar_centavos BOOLEAN DEFAULT true,
    tipo_arredondamento VARCHAR(20) DEFAULT 'matematico', -- 'matematico', 'para_cima', 'para_baixo'
    
    -- Metadados
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT payroll_config_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT payroll_config_grau_insalubridade_check CHECK (grau_insalubridade IN ('minimo', 'medio', 'maximo')),
    CONSTRAINT payroll_config_tipo_arredondamento_check CHECK (tipo_arredondamento IN ('matematico', 'para_cima', 'para_baixo')),
    CONSTRAINT payroll_config_unique_company_period UNIQUE (company_id, ano_vigencia, mes_vigencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payroll_config_company_id ON rh.payroll_config(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_config_periodo ON rh.payroll_config(ano_vigencia, mes_vigencia);
CREATE INDEX IF NOT EXISTS idx_payroll_config_ativo ON rh.payroll_config(ativo);

-- Comentários
COMMENT ON TABLE rh.payroll_config IS 'Configurações específicas para cálculo de folha de pagamento';
COMMENT ON COLUMN rh.payroll_config.dias_uteis_mes IS 'Número de dias úteis no mês (padrão 22)';
COMMENT ON COLUMN rh.payroll_config.horas_dia_trabalho IS 'Horas de trabalho por dia (padrão 8h)';
COMMENT ON COLUMN rh.payroll_config.percentual_hora_extra IS 'Percentual de hora extra (padrão 50%)';
COMMENT ON COLUMN rh.payroll_config.percentual_hora_noturna IS 'Percentual de hora noturna (padrão 20%)';
COMMENT ON COLUMN rh.payroll_config.percentual_dsr IS 'Percentual de DSR (1/22 = 4.55%)';
COMMENT ON COLUMN rh.payroll_config.grau_insalubridade IS 'Grau de insalubridade: minimo, medio, maximo';
COMMENT ON COLUMN rh.payroll_config.tolerancia_atraso_minutos IS 'Tolerância para atrasos em minutos';
COMMENT ON COLUMN rh.payroll_config.tipo_arredondamento IS 'Tipo de arredondamento: matematico, para_cima, para_baixo';
