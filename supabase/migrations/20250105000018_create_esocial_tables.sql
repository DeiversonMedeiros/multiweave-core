-- =====================================================
-- CRIAÇÃO DAS TABELAS eSOCIAL
-- =====================================================

-- Tabela para eventos eSocial
CREATE TABLE IF NOT EXISTS rh.esocial_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES rh.employees(id),
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
        'S1000', 'S1005', 'S1010', 'S1020', 'S1030', 'S1035', 'S1040', 'S1050', 
        'S1060', 'S1070', 'S1080', 'S1200', 'S1202', 'S1207', 'S1210', 'S1220', 
        'S1250', 'S1260', 'S1270', 'S1280', 'S1295', 'S1298', 'S1299', 'S1300',
        'S2190', 'S2200', 'S2205', 'S2206', 'S2210', 'S2220', 'S2221', 'S2230',
        'S2231', 'S2240', 'S2241', 'S2245', 'S2250', 'S2260', 'S2298', 'S2299',
        'S2300', 'S2306', 'S2399', 'S2400', 'S2405', 'S2410', 'S2416', 'S2418',
        'S2420', 'S3000', 'S5001', 'S5002', 'S5003', 'S5011', 'S5012', 'S5013'
    )),
    numero_recibo VARCHAR(50),
    data_envio TIMESTAMP WITH TIME ZONE,
    data_recebimento TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'processado', 'rejeitado', 'erro')),
    xml_content TEXT,
    xml_response TEXT,
    observacoes TEXT,
    tentativas_envio INTEGER DEFAULT 0,
    ultimo_erro TEXT,
    data_proximo_envio TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para configurações eSocial
CREATE TABLE IF NOT EXISTS rh.esocial_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ambiente VARCHAR(10) NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    tp_amb VARCHAR(1) NOT NULL DEFAULT '2', -- 1=Produção, 2=Homologação
    cnpj_empregador VARCHAR(14) NOT NULL,
    cpf_empregador VARCHAR(11),
    razao_social VARCHAR(255) NOT NULL,
    codigo_empregador VARCHAR(20),
    codigo_esocial VARCHAR(20),
    versao_lote VARCHAR(10) DEFAULT '2.5.00',
    versao_evento VARCHAR(10) DEFAULT '2.5.00',
    url_consulta VARCHAR(255),
    url_envio VARCHAR(255),
    certificado_digital TEXT, -- Base64 do certificado
    senha_certificado VARCHAR(255),
    proxy_host VARCHAR(255),
    proxy_port INTEGER,
    proxy_user VARCHAR(255),
    proxy_pass VARCHAR(255),
    timeout INTEGER DEFAULT 300,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Tabela para logs de envio eSocial
CREATE TABLE IF NOT EXISTS rh.esocial_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event_id UUID REFERENCES rh.esocial_events(id) ON DELETE CASCADE,
    tipo_operacao VARCHAR(20) NOT NULL CHECK (tipo_operacao IN ('envio', 'consulta', 'download', 'erro')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sucesso', 'erro', 'aviso')),
    mensagem TEXT,
    detalhes JSONB,
    tempo_execucao INTEGER, -- em milissegundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_esocial_events_company_id ON rh.esocial_events(company_id);
CREATE INDEX IF NOT EXISTS idx_esocial_events_employee_id ON rh.esocial_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_esocial_events_tipo_evento ON rh.esocial_events(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_esocial_events_status ON rh.esocial_events(status);
CREATE INDEX IF NOT EXISTS idx_esocial_events_data_envio ON rh.esocial_events(data_envio);
CREATE INDEX IF NOT EXISTS idx_esocial_events_numero_recibo ON rh.esocial_events(numero_recibo);

CREATE INDEX IF NOT EXISTS idx_esocial_config_company_id ON rh.esocial_config(company_id);
CREATE INDEX IF NOT EXISTS idx_esocial_config_ambiente ON rh.esocial_config(ambiente);
CREATE INDEX IF NOT EXISTS idx_esocial_config_ativo ON rh.esocial_config(ativo);

CREATE INDEX IF NOT EXISTS idx_esocial_logs_company_id ON rh.esocial_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_esocial_logs_event_id ON rh.esocial_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_esocial_logs_tipo_operacao ON rh.esocial_logs(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_esocial_logs_status ON rh.esocial_logs(status);
CREATE INDEX IF NOT EXISTS idx_esocial_logs_created_at ON rh.esocial_logs(created_at);

-- Comentários das tabelas
COMMENT ON TABLE rh.esocial_events IS 'Eventos eSocial a serem enviados para o governo';
COMMENT ON TABLE rh.esocial_config IS 'Configurações de integração com eSocial';
COMMENT ON TABLE rh.esocial_logs IS 'Logs de operações eSocial';

-- Comentários das colunas principais
COMMENT ON COLUMN rh.esocial_events.tipo_evento IS 'Tipo do evento eSocial (S1000, S2200, S1200, etc.)';
COMMENT ON COLUMN rh.esocial_events.numero_recibo IS 'Número do recibo de entrega do eSocial';
COMMENT ON COLUMN rh.esocial_events.status IS 'Status: pendente, enviado, processado, rejeitado, erro';
COMMENT ON COLUMN rh.esocial_events.xml_content IS 'Conteúdo XML do evento';
COMMENT ON COLUMN rh.esocial_events.xml_response IS 'Resposta XML do governo';

COMMENT ON COLUMN rh.esocial_config.ambiente IS 'Ambiente: homologacao ou producao';
COMMENT ON COLUMN rh.esocial_config.tp_amb IS 'Tipo ambiente: 1=Produção, 2=Homologação';
COMMENT ON COLUMN rh.esocial_config.certificado_digital IS 'Certificado digital em Base64';
COMMENT ON COLUMN rh.esocial_config.versao_lote IS 'Versão do lote eSocial';
COMMENT ON COLUMN rh.esocial_config.versao_evento IS 'Versão do evento eSocial';
