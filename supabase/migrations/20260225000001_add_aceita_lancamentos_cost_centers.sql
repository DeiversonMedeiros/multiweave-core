-- Adiciona coluna aceita_lancamentos em cost_centers
-- Centros com aceita_lancamentos = false são apenas organizacionais (hierarquia) e não aparecem
-- em requisições, cotações, contas a pagar/receber, vínculo a funcionários, almoxarifados, etc.

ALTER TABLE public.cost_centers
  ADD COLUMN IF NOT EXISTS aceita_lancamentos boolean NOT NULL DEFAULT true;

-- Comentário na coluna
COMMENT ON COLUMN public.cost_centers.aceita_lancamentos IS 'Se true, o centro de custo aparece em seleções (requisições, cotações, contas a pagar/receber, funcionários, almoxarifados, etc.). Se false, serve apenas para organização hierárquica.';
