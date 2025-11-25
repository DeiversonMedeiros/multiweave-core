-- =====================================================
-- CONFIGURAÇÃO DE INTEGRAÇÃO FLASH API
-- =====================================================
-- Data: 2025-11-04
-- Descrição: Tabela para armazenar configurações de integração com Flash API

CREATE TABLE IF NOT EXISTS rh.flash_integration_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    nome_configuracao VARCHAR(100) NOT NULL DEFAULT 'Configuração Flash',
    
    -- Ambiente
    ambiente VARCHAR(20) NOT NULL DEFAULT 'producao' CHECK (ambiente IN ('producao', 'sandbox', 'homologacao')),
    
    -- Credenciais de API
    api_key TEXT NOT NULL, -- Chave de API Flash (criptografada)
    flash_company_id VARCHAR(100), -- ID da empresa na Flash (se aplicável)
    
    -- URLs e endpoints
    base_url VARCHAR(500) NOT NULL DEFAULT 'https://api.flashapp.services',
    api_version VARCHAR(20) DEFAULT 'v2',
    
    -- Informações da empresa na Flash
    empresa_nome VARCHAR(255),
    empresa_cnpj VARCHAR(18),
    empresa_email VARCHAR(255),
    empresa_telefone VARCHAR(20),
    
    -- Configurações específicas
    configuracao_adicional JSONB DEFAULT '{}'::jsonb,
    
    -- Status e validação
    credenciais_validas BOOLEAN DEFAULT false,
    conectividade_ok BOOLEAN DEFAULT false,
    ultima_validacao TIMESTAMP WITH TIME ZONE,
    erro_validacao TEXT,
    ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    observacoes TEXT,
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT flash_integration_config_company_unique 
        UNIQUE (company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_flash_integration_config_company_id 
    ON rh.flash_integration_config(company_id);
CREATE INDEX IF NOT EXISTS idx_flash_integration_config_ambiente 
    ON rh.flash_integration_config(ambiente);
CREATE INDEX IF NOT EXISTS idx_flash_integration_config_is_active 
    ON rh.flash_integration_config(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_flash_integration_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_flash_integration_config_updated_at
    BEFORE UPDATE ON rh.flash_integration_config
    FOR EACH ROW
    EXECUTE FUNCTION update_flash_integration_config_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE rh.flash_integration_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flash_integration_config from their company" 
  ON rh.flash_integration_config
  FOR SELECT USING (
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Users can insert flash_integration_config in their company" 
  ON rh.flash_integration_config
  FOR INSERT WITH CHECK (
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Users can update flash_integration_config from their company" 
  ON rh.flash_integration_config
  FOR UPDATE USING (
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Users can delete flash_integration_config from their company" 
  ON rh.flash_integration_config
  FOR DELETE USING (
    public.user_has_company_access(auth.uid(), company_id)
  );

-- Função para testar conexão Flash
CREATE OR REPLACE FUNCTION test_flash_connection(
  p_config_id UUID
) RETURNS JSON AS $$
DECLARE
  v_config RECORD;
  v_result JSON;
BEGIN
  -- Buscar configuração
  SELECT * INTO v_config
  FROM rh.flash_integration_config
  WHERE id = p_config_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Configuração não encontrada'
    );
  END IF;
  
  -- Atualizar última tentativa de validação
  UPDATE rh.flash_integration_config
  SET ultima_validacao = NOW()
  WHERE id = p_config_id;
  
  -- Retornar sucesso (a validação real será feita no frontend)
  RETURN json_build_object(
    'success', true,
    'message', 'Validação iniciada. Verifique os logs para detalhes.'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE rh.flash_integration_config IS 'Configurações de integração com Flash API por empresa';
COMMENT ON COLUMN rh.flash_integration_config.api_key IS 'Chave de API Flash (deve ser criptografada)';
COMMENT ON COLUMN rh.flash_integration_config.credenciais_validas IS 'Indica se as credenciais estão válidas';
COMMENT ON COLUMN rh.flash_integration_config.conectividade_ok IS 'Indica se a conectividade com a Flash está OK';
COMMENT ON COLUMN rh.flash_integration_config.configuracao_adicional IS 'Configurações adicionais em formato JSON';

