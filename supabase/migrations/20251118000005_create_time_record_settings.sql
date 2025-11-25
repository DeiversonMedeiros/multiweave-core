-- =====================================================
-- CONFIGURAÇÕES DE PONTO ELETRÔNICO
-- =====================================================
-- Data: 2025-11-18
-- Descrição: Tabela para armazenar configurações de ponto eletrônico por empresa
-- Inclui janela de tempo para marcações (20h, 22h ou 24h)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.time_record_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Janela de tempo para marcações (em horas)
    -- Define por quanto tempo as marcações podem ser registradas após a primeira marcação
    -- Após esse período, a próxima marcação será considerada como primeira do dia seguinte
    janela_tempo_marcacoes INTEGER NOT NULL DEFAULT 24 CHECK (janela_tempo_marcacoes IN (20, 22, 24)),
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Uma configuração por empresa
    CONSTRAINT time_record_settings_company_unique UNIQUE (company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_time_record_settings_company_id ON rh.time_record_settings(company_id);

-- Comentários
COMMENT ON TABLE rh.time_record_settings IS 'Configurações de ponto eletrônico por empresa';
COMMENT ON COLUMN rh.time_record_settings.janela_tempo_marcacoes IS 'Janela de tempo em horas (20, 22 ou 24) para permitir marcações após a primeira marcação do dia';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION rh.update_time_record_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_record_settings_updated_at
    BEFORE UPDATE ON rh.time_record_settings
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_time_record_settings_updated_at();

-- RLS
ALTER TABLE rh.time_record_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view time record settings for their company" ON rh.time_record_settings
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can insert time record settings for their company" ON rh.time_record_settings
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can update time record settings for their company" ON rh.time_record_settings
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can delete time record settings for their company" ON rh.time_record_settings
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Função RPC para obter configurações (com fallback para padrão)
CREATE OR REPLACE FUNCTION rh.get_time_record_settings(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    janela_tempo_marcacoes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.company_id,
        ts.janela_tempo_marcacoes,
        ts.created_at,
        ts.updated_at
    FROM rh.time_record_settings ts
    WHERE ts.company_id = p_company_id
    
    UNION ALL
    
    -- Se não encontrar, retornar configuração padrão
    SELECT 
        gen_random_uuid() as id,
        p_company_id as company_id,
        24 as janela_tempo_marcacoes, -- Padrão: 24 horas
        NOW() as created_at,
        NOW() as updated_at
    WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_settings trs
        WHERE trs.company_id = p_company_id
    )
    LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION rh.get_time_record_settings(UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rh.time_record_settings TO authenticated;

-- Inserir configurações padrão para empresas existentes
INSERT INTO rh.time_record_settings (company_id, janela_tempo_marcacoes)
SELECT id, 24 -- Padrão: 24 horas
FROM public.companies
WHERE id NOT IN (SELECT company_id FROM rh.time_record_settings)
ON CONFLICT (company_id) DO NOTHING;

