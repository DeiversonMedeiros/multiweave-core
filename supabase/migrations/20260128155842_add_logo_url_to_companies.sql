-- Adicionar campo logo_url na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.companies.logo_url IS 'URL da logo da empresa armazenada no Supabase Storage';
