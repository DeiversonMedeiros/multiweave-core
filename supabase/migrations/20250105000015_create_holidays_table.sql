-- =====================================================
-- CRIAÇÃO DA TABELA HOLIDAYS (FERIADOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    data DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'pontos_facultativos', 'outros')),
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, data, nome)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_holidays_company_id ON rh.holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_holidays_data ON rh.holidays(data);
CREATE INDEX IF NOT EXISTS idx_holidays_tipo ON rh.holidays(tipo);
CREATE INDEX IF NOT EXISTS idx_holidays_ativo ON rh.holidays(ativo);
CREATE INDEX IF NOT EXISTS idx_holidays_ano ON rh.holidays(EXTRACT(YEAR FROM data));

-- Comentários das colunas
COMMENT ON TABLE rh.holidays IS 'Feriados e pontos facultativos para cálculos de folha';
COMMENT ON COLUMN rh.holidays.nome IS 'Nome do feriado';
COMMENT ON COLUMN rh.holidays.data IS 'Data do feriado';
COMMENT ON COLUMN rh.holidays.tipo IS 'Tipo: nacional, estadual, municipal, pontos_facultativos, outros';
COMMENT ON COLUMN rh.holidays.ativo IS 'Se o feriado está ativo para cálculos';
