-- =====================================================
-- CRIAÇÃO DA TABELA COMPENSATION_REQUESTS (SOLICITAÇÕES DE COMPENSAÇÃO)
-- =====================================================

-- Criar tabela de solicitações de compensação
CREATE TABLE IF NOT EXISTS rh.compensation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    funcionario_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    tipo_compensacao VARCHAR(50) NOT NULL,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_compensacao DATE NOT NULL,
    horas_solicitadas DECIMAL(5,2) NOT NULL,
    motivo TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'compensado')),
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_compensation_requests_company_id ON rh.compensation_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_funcionario_id ON rh.compensation_requests(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_status ON rh.compensation_requests(status);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_data_compensacao ON rh.compensation_requests(data_compensacao);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_aprovado_por ON rh.compensation_requests(aprovado_por);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_compensation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compensation_requests_updated_at
    BEFORE UPDATE ON rh.compensation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_compensation_requests_updated_at();

-- Habilitar RLS
ALTER TABLE rh.compensation_requests ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view compensation_requests from their company" ON rh.compensation_requests
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert compensation_requests in their company" ON rh.compensation_requests
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update compensation_requests from their company" ON rh.compensation_requests
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete compensation_requests from their company" ON rh.compensation_requests
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.compensation_requests IS 'Tabela de solicitações de compensação de horas';
COMMENT ON COLUMN rh.compensation_requests.tipo_compensacao IS 'Tipo de compensação (ex: Banco de horas, Folga)';
COMMENT ON COLUMN rh.compensation_requests.horas_solicitadas IS 'Quantidade de horas solicitadas para compensação';
COMMENT ON COLUMN rh.compensation_requests.status IS 'Status da solicitação: pendente, aprovado, rejeitado, compensado';
COMMENT ON COLUMN rh.compensation_requests.aprovado_por IS 'Usuário que aprovou/rejeitou a solicitação';
