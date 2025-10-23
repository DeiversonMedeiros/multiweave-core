-- =====================================================
-- CRIAÇÃO DA TABELA REPORTS (RELATÓRIOS)
-- =====================================================

-- Criar tabela de relatórios
CREATE TABLE IF NOT EXISTS rh.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    periodo VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado', 'processando', 'erro')),
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    arquivo_url TEXT,
    parametros JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON rh.reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_tipo ON rh.reports(tipo);
CREATE INDEX IF NOT EXISTS idx_reports_status ON rh.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_data_geracao ON rh.reports(data_geracao);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON rh.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- Habilitar RLS
ALTER TABLE rh.reports ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view reports from their company" ON rh.reports
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert reports in their company" ON rh.reports
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update reports from their company" ON rh.reports
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete reports from their company" ON rh.reports
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.reports IS 'Tabela de relatórios gerados';
COMMENT ON COLUMN rh.reports.tipo IS 'Tipo do relatório (ex: funcionarios, folha, horas, ferias)';
COMMENT ON COLUMN rh.reports.periodo IS 'Período do relatório (ex: 2024/01)';
COMMENT ON COLUMN rh.reports.status IS 'Status do relatório: gerado, processando, erro';
COMMENT ON COLUMN rh.reports.arquivo_url IS 'URL do arquivo do relatório gerado';
COMMENT ON COLUMN rh.reports.parametros IS 'Parâmetros utilizados para gerar o relatório (JSON)';
