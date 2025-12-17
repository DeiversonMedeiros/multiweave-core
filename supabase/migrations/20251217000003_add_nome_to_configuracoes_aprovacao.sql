-- Adiciona campo de nome para configurações de aprovação

ALTER TABLE public.configuracoes_aprovacao_unificada
  ADD COLUMN IF NOT EXISTS nome TEXT;

-- Opcional: preencher vazio com string para evitar nulls em novas criações
UPDATE public.configuracoes_aprovacao_unificada
SET nome = COALESCE(nome, '')
WHERE nome IS NULL;

