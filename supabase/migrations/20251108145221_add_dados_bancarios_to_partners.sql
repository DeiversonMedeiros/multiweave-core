-- Adiciona campo dados_bancarios JSONB à tabela partners
-- Este campo armazenará informações bancárias e PIX dos parceiros

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS dados_bancarios JSONB NULL;

COMMENT ON COLUMN public.partners.dados_bancarios IS 'Dados bancários e PIX do parceiro em formato JSONB';

