-- =====================================================
-- TABELA: CALCULATION LOGS (Logs de Cálculo)
-- =====================================================
-- Armazena logs de execução do motor de cálculo

CREATE TABLE IF NOT EXISTS rh.calculation_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Identificação do processo
    processo_id UUID NOT NULL, -- ID único do processo de cálculo
    tipo_processo VARCHAR(50) NOT NULL, -- 'folha_mensal', 'recalculo', 'ajuste', 'simulacao'
    descricao_processo VARCHAR(255),
    
    -- Período de cálculo
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
    ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2000 AND ano_referencia <= 2100),
    
    -- Status do processo
    status VARCHAR(20) NOT NULL DEFAULT 'iniciado' CHECK (status IN ('iniciado', 'processando', 'concluido', 'erro', 'cancelado')),
    progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    
    -- Estatísticas
    total_funcionarios INTEGER DEFAULT 0,
    funcionarios_processados INTEGER DEFAULT 0,
    eventos_calculados INTEGER DEFAULT 0,
    erros_encontrados INTEGER DEFAULT 0,
    
    -- Tempos de execução
    inicio_processamento TIMESTAMP WITH TIME ZONE,
    fim_processamento TIMESTAMP WITH TIME ZONE,
    tempo_execucao_segundos INTEGER,
    
    -- Usuário responsável
    usuario_id UUID,
    usuario_nome VARCHAR(255),
    
    -- Resultados e logs
    logs_execucao JSONB,
    erros_execucao JSONB,
    resumo_calculos JSONB,
    
    -- Metadados
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT calculation_logs_pkey PRIMARY KEY (id),
    CONSTRAINT calculation_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calculation_logs_company_id ON rh.calculation_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_calculation_logs_processo_id ON rh.calculation_logs(processo_id);
CREATE INDEX IF NOT EXISTS idx_calculation_logs_periodo ON rh.calculation_logs(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_calculation_logs_status ON rh.calculation_logs(status);
CREATE INDEX IF NOT EXISTS idx_calculation_logs_tipo ON rh.calculation_logs(tipo_processo);
CREATE INDEX IF NOT EXISTS idx_calculation_logs_created_at ON rh.calculation_logs(created_at);

-- Comentários
COMMENT ON TABLE rh.calculation_logs IS 'Logs de execução do motor de cálculo de folha';
COMMENT ON COLUMN rh.calculation_logs.processo_id IS 'ID único do processo de cálculo';
COMMENT ON COLUMN rh.calculation_logs.tipo_processo IS 'Tipo: folha_mensal, recalculo, ajuste, simulacao';
COMMENT ON COLUMN rh.calculation_logs.status IS 'Status: iniciado, processando, concluido, erro, cancelado';
COMMENT ON COLUMN rh.calculation_logs.progresso IS 'Progresso em percentual (0-100)';
COMMENT ON COLUMN rh.calculation_logs.logs_execucao IS 'Logs detalhados da execução em JSON';
COMMENT ON COLUMN rh.calculation_logs.erros_execucao IS 'Erros encontrados durante a execução';
COMMENT ON COLUMN rh.calculation_logs.resumo_calculos IS 'Resumo dos cálculos realizados';
