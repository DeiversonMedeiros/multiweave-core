-- =====================================================
-- TABELA: PAYROLL EVENTS (Eventos de Folha)
-- =====================================================
-- Armazena eventos individuais de cada funcionário por período

CREATE TABLE IF NOT EXISTS rh.payroll_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    payroll_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    company_id UUID NOT NULL,
    
    -- Identificação do evento
    rubrica_id UUID NOT NULL,
    codigo_rubrica VARCHAR(20) NOT NULL,
    descricao_rubrica VARCHAR(255) NOT NULL,
    tipo_rubrica VARCHAR(20) NOT NULL CHECK (tipo_rubrica IN ('provento', 'desconto', 'base_calculo', 'informacao')),
    
    -- Valores do evento
    quantidade DECIMAL(10,4) DEFAULT 1.0,
    valor_unitario DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    percentual DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Referência e período
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
    ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2000 AND ano_referencia <= 2100),
    
    -- Controle de cálculo
    calculado_automaticamente BOOLEAN DEFAULT true,
    origem_evento VARCHAR(50) DEFAULT 'sistema', -- 'sistema', 'manual', 'importado'
    
    -- Metadados
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT payroll_events_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_events_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES rh.payroll(id) ON DELETE CASCADE,
    CONSTRAINT payroll_events_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE CASCADE,
    CONSTRAINT payroll_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT payroll_events_rubrica_id_fkey FOREIGN KEY (rubrica_id) REFERENCES rh.rubricas(id) ON DELETE RESTRICT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payroll_events_payroll_id ON rh.payroll_events(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_events_employee_id ON rh.payroll_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_events_company_id ON rh.payroll_events(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_events_periodo ON rh.payroll_events(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_payroll_events_tipo ON rh.payroll_events(tipo_rubrica);
CREATE INDEX IF NOT EXISTS idx_payroll_events_rubrica ON rh.payroll_events(rubrica_id);

-- Comentários
COMMENT ON TABLE rh.payroll_events IS 'Eventos individuais de cada funcionário por período de folha';
COMMENT ON COLUMN rh.payroll_events.payroll_id IS 'Referência à folha de pagamento';
COMMENT ON COLUMN rh.payroll_events.rubrica_id IS 'Rubrica que originou o evento';
COMMENT ON COLUMN rh.payroll_events.tipo_rubrica IS 'Tipo da rubrica: provento, desconto, base_calculo, informacao';
COMMENT ON COLUMN rh.payroll_events.quantidade IS 'Quantidade para cálculo (horas, dias, etc.)';
COMMENT ON COLUMN rh.payroll_events.valor_unitario IS 'Valor por unidade';
COMMENT ON COLUMN rh.payroll_events.valor_total IS 'Valor total calculado';
COMMENT ON COLUMN rh.payroll_events.percentual IS 'Percentual aplicado (para rubricas percentuais)';
COMMENT ON COLUMN rh.payroll_events.calculado_automaticamente IS 'Se o evento foi calculado automaticamente pelo sistema';
COMMENT ON COLUMN rh.payroll_events.origem_evento IS 'Origem do evento: sistema, manual, importado';
