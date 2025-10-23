-- =====================================================
-- MIGRAÇÃO: Criar tabela user_companies
-- =====================================================
-- Data: 2025-01-03
-- Descrição: Cria a tabela user_companies necessária para as políticas RLS

-- User-Company relationship (multiempresa)
-- Criar tabela sem foreign keys primeiro, adicionar depois
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  company_id UUID,
  profile_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_ativo ON public.user_companies(ativo);

-- Comentários
COMMENT ON TABLE public.user_companies IS 'Relacionamento entre usuários e empresas (multiempresa)';
COMMENT ON COLUMN public.user_companies.user_id IS 'ID do usuário';
COMMENT ON COLUMN public.user_companies.company_id IS 'ID da empresa';
COMMENT ON COLUMN public.user_companies.profile_id IS 'ID do perfil do usuário na empresa';
COMMENT ON COLUMN public.user_companies.ativo IS 'Se o relacionamento está ativo';
