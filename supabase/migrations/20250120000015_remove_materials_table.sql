-- =====================================================
-- MIGRAÇÃO: Remover tabela public.materials
-- Data: 2025-01-20
-- Descrição: Remove a tabela public.materials após migração para almoxarifado.materiais_equipamentos
-- =====================================================

-- Verificar se existem dados na tabela antes de remover
DO $$
DECLARE
  materials_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO materials_count FROM public.materials;
  
  IF materials_count > 0 THEN
    RAISE WARNING 'Ainda existem % registros na tabela public.materials. Não será removida.', materials_count;
  ELSE
    RAISE NOTICE 'Tabela public.materials está vazia. Prosseguindo com a remoção...';
  END IF;
END $$;

-- Remover a tabela public.materials (apenas se estiver vazia)
DROP TABLE IF EXISTS public.materials CASCADE;

-- Remover o tipo enum material_type se existir
DROP TYPE IF EXISTS public.material_type CASCADE;

-- Log de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Tabela public.materials removida com sucesso!';
  RAISE NOTICE 'Todos os dados de materiais agora estão em almoxarifado.materiais_equipamentos';
END $$;
