-- =====================================================
-- CRIAÇÃO DA TABELA ESOCIAL_INTEGRATIONS (INTEGRAÇÃO ESOCIAL)
-- =====================================================

-- Criar tabela de integração eSocial
CREATE TABLE IF NOT EXISTS rh.esocial_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL,
    codigo_evento VARCHAR(20) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'processado', 'erro', 'rejeitado')),
    data_envio TIMESTAMP WITH TIME ZONE,
    data_processamento TIMESTAMP WITH TIME ZONE,
    protocolo VARCHAR(100),
    funcionario_id UUID REFERENCES rh.employees(id),
    observacoes TEXT,
    arquivo_retorno TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_esocial_integrations_company_id ON rh.esocial_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_esocial_integrations_tipo_evento ON rh.esocial_integrations(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_esocial_integrations_status ON rh.esocial_integrations(status);
CREATE INDEX IF NOT EXISTS idx_esocial_integrations_funcionario_id ON rh.esocial_integrations(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_esocial_integrations_protocolo ON rh.esocial_integrations(protocolo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_esocial_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_esocial_integrations_updated_at
    BEFORE UPDATE ON rh.esocial_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_esocial_integrations_updated_at();

-- Habilitar RLS
ALTER TABLE rh.esocial_integrations ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view esocial_integrations from their company" ON rh.esocial_integrations
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert esocial_integrations in their company" ON rh.esocial_integrations
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update esocial_integrations from their company" ON rh.esocial_integrations
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete esocial_integrations from their company" ON rh.esocial_integrations
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.esocial_integrations IS 'Tabela de integração com eSocial';
COMMENT ON COLUMN rh.esocial_integrations.tipo_evento IS 'Tipo do evento eSocial (ex: S-1000, S-1010)';
COMMENT ON COLUMN rh.esocial_integrations.codigo_evento IS 'Código específico do evento';
COMMENT ON COLUMN rh.esocial_integrations.status IS 'Status da integração: pendente, enviado, processado, erro, rejeitado';
COMMENT ON COLUMN rh.esocial_integrations.protocolo IS 'Protocolo de envio para eSocial';
COMMENT ON COLUMN rh.esocial_integrations.arquivo_retorno IS 'URL do arquivo de retorno do eSocial';
