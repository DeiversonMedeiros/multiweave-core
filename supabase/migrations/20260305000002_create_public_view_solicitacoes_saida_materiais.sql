-- =====================================================
-- MIGRATION: Criar view public.solicitacoes_saida_materiais
-- Data: 2026-03-05
-- Descrição: Garante a existência da relação public.solicitacoes_saida_materiais,
--            utilizada pelas funções de aprovação e granular permissions,
--            projetando a tabela base almoxarifado.solicitacoes_saida_materiais.
-- =====================================================

-- Remover view anterior se existir, para evitar conflitos de definição
DROP VIEW IF EXISTS public.solicitacoes_saida_materiais;

-- View simples e atualizável apontando para a tabela do schema almoxarifado
CREATE OR REPLACE VIEW public.solicitacoes_saida_materiais AS
SELECT
  ssm.*
FROM almoxarifado.solicitacoes_saida_materiais ssm;

-- Permissões básicas para os papéis padrão do Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_saida_materiais TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_saida_materiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_saida_materiais TO service_role;

COMMENT ON VIEW public.solicitacoes_saida_materiais IS
'View pública para solicitacoes de saída de materiais, baseada em almoxarifado.solicitacoes_saida_materiais. Usada em funções de aprovação e filtros granulares.';

