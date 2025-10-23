-- =====================================================
-- MIGRAÇÃO: TABELAS DE CONFIGURAÇÃO FINANCEIRA
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Criação das tabelas de configuração para SEFAZ e integrações bancárias
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- TABELA: CONFIGURAÇÃO FISCAL (SEFAZ)
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.configuracao_fiscal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    nome_configuracao VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('nfe', 'nfse', 'mdfe', 'cte')),
    
    -- Ambiente
    ambiente VARCHAR(20) NOT NULL CHECK (ambiente IN ('producao', 'homologacao')),
    
    -- Certificado Digital
    certificado_digital TEXT, -- Armazenar o certificado em base64
    senha_certificado TEXT, -- Criptografada
    data_validade_certificado DATE,
    
    -- Configurações SEFAZ
    webservice_url VARCHAR(500) NOT NULL,
    versao_layout VARCHAR(10) NOT NULL DEFAULT '4.00',
    serie_numeracao INTEGER NOT NULL DEFAULT 1,
    numero_inicial INTEGER NOT NULL DEFAULT 1,
    numero_final INTEGER,
    
    -- Configurações específicas por UF
    configuracao_uf JSONB DEFAULT '{}'::jsonb,
    
    -- Status e validação
    certificado_valido BOOLEAN DEFAULT false,
    conectividade_ok BOOLEAN DEFAULT false,
    ultima_validacao TIMESTAMP WITH TIME ZONE,
    erro_validacao TEXT,
    
    -- Metadados
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT configuracao_fiscal_company_uf_tipo_unique 
        UNIQUE (company_id, uf, tipo_documento, ambiente)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracao_fiscal_company_id ON financeiro.configuracao_fiscal(company_id);
CREATE INDEX IF NOT EXISTS idx_configuracao_fiscal_uf ON financeiro.configuracao_fiscal(uf);
CREATE INDEX IF NOT EXISTS idx_configuracao_fiscal_tipo ON financeiro.configuracao_fiscal(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_configuracao_fiscal_ambiente ON financeiro.configuracao_fiscal(ambiente);

-- Comentários
COMMENT ON TABLE financeiro.configuracao_fiscal IS 'Configurações de integração SEFAZ por empresa, UF e tipo de documento';
COMMENT ON COLUMN financeiro.configuracao_fiscal.certificado_digital IS 'Certificado digital em formato base64';
COMMENT ON COLUMN financeiro.configuracao_fiscal.senha_certificado IS 'Senha do certificado digital (criptografada)';
COMMENT ON COLUMN financeiro.configuracao_fiscal.configuracao_uf IS 'Configurações específicas por UF (JSON)';
COMMENT ON COLUMN financeiro.configuracao_fiscal.certificado_valido IS 'Indica se o certificado está válido';
COMMENT ON COLUMN financeiro.configuracao_fiscal.conectividade_ok IS 'Indica se a conectividade com SEFAZ está OK';

-- =====================================================
-- TABELA: CONFIGURAÇÃO BANCÁRIA
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.configuracao_bancaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    nome_configuracao VARCHAR(100) NOT NULL,
    banco_codigo VARCHAR(10) NOT NULL,
    banco_nome VARCHAR(100) NOT NULL,
    
    -- Ambiente
    ambiente VARCHAR(20) NOT NULL CHECK (ambiente IN ('producao', 'sandbox', 'homologacao')),
    
    -- Credenciais de API
    client_id VARCHAR(200),
    client_secret TEXT, -- Criptografado
    api_key TEXT, -- Criptografado
    access_token TEXT, -- Criptografado
    refresh_token TEXT, -- Criptografado
    
    -- URLs e endpoints
    base_url VARCHAR(500) NOT NULL,
    auth_url VARCHAR(500),
    api_version VARCHAR(20) DEFAULT 'v1',
    
    -- Configurações de autenticação
    grant_type VARCHAR(50) DEFAULT 'client_credentials',
    scope VARCHAR(200),
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Configurações específicas do banco
    configuracao_banco JSONB DEFAULT '{}'::jsonb,
    
    -- Status e validação
    credenciais_validas BOOLEAN DEFAULT false,
    conectividade_ok BOOLEAN DEFAULT false,
    ultima_validacao TIMESTAMP WITH TIME ZONE,
    erro_validacao TEXT,
    
    -- Metadados
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT configuracao_bancaria_company_banco_unique 
        UNIQUE (company_id, banco_codigo, ambiente)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracao_bancaria_company_id ON financeiro.configuracao_bancaria(company_id);
CREATE INDEX IF NOT EXISTS idx_configuracao_bancaria_banco ON financeiro.configuracao_bancaria(banco_codigo);
CREATE INDEX IF NOT EXISTS idx_configuracao_bancaria_ambiente ON financeiro.configuracao_bancaria(ambiente);

-- Comentários
COMMENT ON TABLE financeiro.configuracao_bancaria IS 'Configurações de integração bancária por empresa e banco';
COMMENT ON COLUMN financeiro.configuracao_bancaria.client_secret IS 'Client secret da API bancária (criptografado)';
COMMENT ON COLUMN financeiro.configuracao_bancaria.api_key IS 'Chave da API bancária (criptografada)';
COMMENT ON COLUMN financeiro.configuracao_bancaria.access_token IS 'Token de acesso (criptografado)';
COMMENT ON COLUMN financeiro.configuracao_bancaria.configuracao_banco IS 'Configurações específicas do banco (JSON)';
COMMENT ON COLUMN financeiro.configuracao_bancaria.credenciais_validas IS 'Indica se as credenciais estão válidas';
COMMENT ON COLUMN financeiro.configuracao_bancaria.conectividade_ok IS 'Indica se a conectividade com o banco está OK';

-- =====================================================
-- TABELA: LOG DE VALIDAÇÃO DE INTEGRAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.log_validacao_integracao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação da integração
    tipo_integracao VARCHAR(20) NOT NULL CHECK (tipo_integracao IN ('sefaz', 'bancaria')),
    configuracao_id UUID NOT NULL,
    
    -- Resultado da validação
    status VARCHAR(20) NOT NULL CHECK (status IN ('sucesso', 'erro', 'aviso')),
    mensagem TEXT,
    detalhes JSONB DEFAULT '{}'::jsonb,
    
    -- Tempo de resposta
    tempo_resposta_ms INTEGER,
    
    -- Metadados
    created_by UUID ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_log_validacao_company_id ON financeiro.log_validacao_integracao(company_id);
CREATE INDEX IF NOT EXISTS idx_log_validacao_tipo ON financeiro.log_validacao_integracao(tipo_integracao);
CREATE INDEX IF NOT EXISTS idx_log_validacao_status ON financeiro.log_validacao_integracao(status);
CREATE INDEX IF NOT EXISTS idx_log_validacao_created_at ON financeiro.log_validacao_integracao(created_at);

-- Comentários
COMMENT ON TABLE financeiro.log_validacao_integracao IS 'Log de validações de integrações SEFAZ e bancárias';

-- =====================================================
-- FUNÇÕES DE TRIGGER
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION financeiro.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_configuracao_fiscal_updated_at 
    BEFORE UPDATE ON financeiro.configuracao_fiscal 
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

CREATE TRIGGER update_configuracao_bancaria_updated_at 
    BEFORE UPDATE ON financeiro.configuracao_bancaria 
    FOR EACH ROW EXECUTE FUNCTION financeiro.update_updated_at_column();

-- =====================================================
-- FUNÇÕES DE VALIDAÇÃO
-- =====================================================

-- Função para validar certificado digital
CREATE OR REPLACE FUNCTION financeiro.validar_certificado_digital(
    p_certificado TEXT,
    p_senha TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Aqui seria implementada a validação real do certificado
    -- Por enquanto, retorna true se ambos os parâmetros não são nulos
    RETURN p_certificado IS NOT NULL AND p_senha IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para testar conectividade SEFAZ
CREATE OR REPLACE FUNCTION financeiro.testar_conectividade_sefaz(
    p_webservice_url TEXT,
    p_uf VARCHAR(2)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Aqui seria implementado o teste real de conectividade
    -- Por enquanto, retorna true se a URL não é nula
    RETURN p_webservice_url IS NOT NULL AND p_uf IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para testar conectividade bancária
CREATE OR REPLACE FUNCTION financeiro.testar_conectividade_bancaria(
    p_base_url TEXT,
    p_banco_codigo VARCHAR(10)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Aqui seria implementado o teste real de conectividade
    -- Por enquanto, retorna true se ambos os parâmetros não são nulos
    RETURN p_base_url IS NOT NULL AND p_banco_codigo IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE financeiro.configuracao_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.configuracao_bancaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.log_validacao_integracao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para configuracao_fiscal
CREATE POLICY "Users can view fiscal configs from their companies" ON financeiro.configuracao_fiscal
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert fiscal configs for their companies" ON financeiro.configuracao_fiscal
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update fiscal configs from their companies" ON financeiro.configuracao_fiscal
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete fiscal configs from their companies" ON financeiro.configuracao_fiscal
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas RLS para configuracao_bancaria
CREATE POLICY "Users can view bank configs from their companies" ON financeiro.configuracao_bancaria
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert bank configs for their companies" ON financeiro.configuracao_bancaria
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update bank configs from their companies" ON financeiro.configuracao_bancaria
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete bank configs from their companies" ON financeiro.configuracao_bancaria
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas RLS para log_validacao_integracao
CREATE POLICY "Users can view validation logs from their companies" ON financeiro.log_validacao_integracao
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert validation logs for their companies" ON financeiro.log_validacao_integracao
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir configurações padrão para SEFAZ (apenas estrutura)
INSERT INTO financeiro.configuracao_fiscal (
    company_id,
    nome_configuracao,
    uf,
    tipo_documento,
    ambiente,
    webservice_url,
    versao_layout,
    serie_numeracao,
    numero_inicial,
    observacoes,
    created_by
) VALUES 
(
    (SELECT id FROM public.companies LIMIT 1),
    'Configuração Padrão SP - NFe',
    'SP',
    'nfe',
    'homologacao',
    'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    '4.00',
    1,
    1,
    'Configuração inicial para testes',
    (SELECT id FROM public.users LIMIT 1)
) ON CONFLICT (company_id, uf, tipo_documento, ambiente) DO NOTHING;

-- Inserir configuração padrão para Bradesco
INSERT INTO financeiro.configuracao_bancaria (
    company_id,
    nome_configuracao,
    banco_codigo,
    banco_nome,
    ambiente,
    base_url,
    api_version,
    observacoes,
    created_by
) VALUES 
(
    (SELECT id FROM public.companies LIMIT 1),
    'Configuração Padrão Bradesco',
    '237',
    'Banco Bradesco S.A.',
    'sandbox',
    'https://sandbox.api.bradesco.com.br',
    'v1',
    'Configuração inicial para testes',
    (SELECT id FROM public.users LIMIT 1)
) ON CONFLICT (company_id, banco_codigo, ambiente) DO NOTHING;
