-- Adiciona campos adicionais à tabela partners
-- Campos: inscricao_estadual, inscricao_municipal, observacoes

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT NULL,
ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT NULL,
ADD COLUMN IF NOT EXISTS observacoes TEXT NULL;

COMMENT ON COLUMN public.partners.inscricao_estadual IS 'Inscrição Estadual (IE) do parceiro';
COMMENT ON COLUMN public.partners.inscricao_municipal IS 'Inscrição Municipal (IM) do parceiro';
COMMENT ON COLUMN public.partners.observacoes IS 'Observações e informações adicionais sobre o parceiro';

