-- =====================================================
-- GARANTIR EXISTÊNCIA DA TABELA financial_integration_config
-- =====================================================
-- Data: 2025-11-15
-- Descrição: Garante que a tabela financial_integration_config existe
-- Autor: Sistema MultiWeave Core

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS rh.financial_integration_config (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Configurações
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT financial_integration_config_pkey PRIMARY KEY (id),
    CONSTRAINT financial_integration_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT financial_integration_config_company_id_unique UNIQUE (company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financial_integration_config_company_id ON rh.financial_integration_config(company_id);

-- Comentários
COMMENT ON TABLE rh.financial_integration_config IS 'Configurações de integração com o módulo financeiro';
COMMENT ON COLUMN rh.financial_integration_config.config IS 'Configurações JSON da integração';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION rh.update_financial_integration_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_financial_integration_config_updated_at ON rh.financial_integration_config;
CREATE TRIGGER trigger_update_financial_integration_config_updated_at
    BEFORE UPDATE ON rh.financial_integration_config
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_financial_integration_config_updated_at();

-- Habilitar RLS
ALTER TABLE rh.financial_integration_config ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can access their company's integration config" ON rh.financial_integration_config;

-- Criar política RLS
CREATE POLICY "Users can access their company's integration config" ON rh.financial_integration_config
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
        OR public.is_admin(auth.uid())
    );

-- Garantir que a função get_entity_data pode acessar esta tabela
-- (A função já deve ter permissão, mas garantimos aqui)
GRANT SELECT, INSERT, UPDATE, DELETE ON rh.financial_integration_config TO authenticated;
GRANT USAGE ON SCHEMA rh TO authenticated;

