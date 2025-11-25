-- =====================================================
-- CORREÇÃO: Atualizar configuração de entradas_materiais
-- para solicitacoes_saida_materiais
-- =====================================================

-- Remover configuração antiga de entradas_materiais se existir
DELETE FROM public.entity_ownership_config
WHERE entity_name = 'entradas_materiais';

-- Garantir que a configuração correta de saída de materiais existe
INSERT INTO public.entity_ownership_config (
    entity_name,'   '
    schema_name,
    table_name,
    enforce_ownership,
    enforce_cost_center,
    ownership_field,
    cost_center_field,
    description
)
VALUES (
    'solicitacoes_saida_materiais',
    'public',
    'solicitacoes_saida_materiais',
    true,
    true,
    'funcionario_solicitante_id',
    'centro_custo_id',
    'Solicitações de saída de materiais - restrito por solicitante e centro de custo'
)
ON CONFLICT (entity_name) DO UPDATE
SET
    schema_name = EXCLUDED.schema_name,
    table_name = EXCLUDED.table_name,
    enforce_ownership = EXCLUDED.enforce_ownership,
    enforce_cost_center = EXCLUDED.enforce_cost_center,
    ownership_field = EXCLUDED.ownership_field,
    cost_center_field = EXCLUDED.cost_center_field,
    description = EXCLUDED.description,
    updated_at = NOW();

COMMENT ON TABLE public.entity_ownership_config IS 'Configuração atualizada: solicitacoes_saida_materiais substitui entradas_materiais';

