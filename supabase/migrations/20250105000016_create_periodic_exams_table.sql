-- =====================================================
-- CRIAÇÃO DA TABELA PERIODIC_EXAMS (EXAMES PERIÓDICOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.periodic_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    tipo_exame VARCHAR(30) NOT NULL CHECK (tipo_exame IN ('admissional', 'periodico', 'demissional', 'retorno_trabalho', 'mudanca_funcao', 'ambiental')),
    data_agendamento DATE NOT NULL,
    data_realizacao DATE,
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'realizado', 'vencido', 'cancelado', 'reagendado')),
    medico_responsavel VARCHAR(255),
    clinica_local VARCHAR(255),
    observacoes TEXT,
    resultado VARCHAR(20) CHECK (resultado IN ('apto', 'inapto', 'apto_com_restricoes', 'pendente')),
    restricoes TEXT,
    anexos TEXT[], -- URLs dos arquivos anexados
    custo DECIMAL(10,2),
    pago BOOLEAN DEFAULT false,
    data_pagamento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_periodic_exams_company_id ON rh.periodic_exams(company_id);
CREATE INDEX IF NOT EXISTS idx_periodic_exams_employee_id ON rh.periodic_exams(employee_id);
CREATE INDEX IF NOT EXISTS idx_periodic_exams_tipo_exame ON rh.periodic_exams(tipo_exame);
CREATE INDEX IF NOT EXISTS idx_periodic_exams_status ON rh.periodic_exams(status);
CREATE INDEX IF NOT EXISTS idx_periodic_exams_data_agendamento ON rh.periodic_exams(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_periodic_exams_data_vencimento ON rh.periodic_exams(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_periodic_exams_resultado ON rh.periodic_exams(resultado);

-- Comentários das colunas
COMMENT ON TABLE rh.periodic_exams IS 'Exames médicos periódicos e ocupacionais dos funcionários';
COMMENT ON COLUMN rh.periodic_exams.tipo_exame IS 'Tipo: admissional, periodico, demissional, retorno_trabalho, mudanca_funcao, ambiental';
COMMENT ON COLUMN rh.periodic_exams.status IS 'Status: agendado, realizado, vencido, cancelado, reagendado';
COMMENT ON COLUMN rh.periodic_exams.resultado IS 'Resultado: apto, inapto, apto_com_restricoes, pendente';
COMMENT ON COLUMN rh.periodic_exams.anexos IS 'Array de URLs dos arquivos anexados (laudos, atestados, etc.)';
COMMENT ON COLUMN rh.periodic_exams.custo IS 'Custo do exame para controle financeiro';
