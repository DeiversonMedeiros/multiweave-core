-- =====================================================
-- CRIAÇÃO DA TABELA COMPANIES
-- =====================================================

-- Criar tabela companies se não existir
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    endereco JSONB,
    contato JSONB,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_ativo ON public.companies(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- Habilitar RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view companies" ON public.companies
    FOR SELECT USING (true);

-- Comentários
COMMENT ON TABLE public.companies IS 'Tabela de empresas';
COMMENT ON COLUMN public.companies.razao_social IS 'Razão social da empresa';
COMMENT ON COLUMN public.companies.nome_fantasia IS 'Nome fantasia da empresa';
COMMENT ON COLUMN public.companies.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.companies.inscricao_estadual IS 'Inscrição estadual da empresa';
COMMENT ON COLUMN public.companies.endereco IS 'Dados de endereço da empresa (JSON)';
COMMENT ON COLUMN public.companies.contato IS 'Dados de contato da empresa (JSON)';
COMMENT ON COLUMN public.companies.ativo IS 'Se a empresa está ativa';
