-- =====================================================
-- MIGRAÇÃO: Adicionar cost_center_id à tabela rh.training_assignments
-- Data: 2026-03-03
-- Descrição: Permite atribuições de treinamentos por Centro de Custo
-- =====================================================

-- 1) Adicionar coluna cost_center_id referenciando public.cost_centers
ALTER TABLE rh.training_assignments 
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- 2) Comentário da coluna
COMMENT ON COLUMN rh.training_assignments.cost_center_id IS 'Centro de custo associado à atribuição de treinamento';

-- 3) Índice para melhorar buscas por centro de custo
CREATE INDEX IF NOT EXISTS idx_training_assignments_cost_center_id 
ON rh.training_assignments(cost_center_id);

-- 4) Atualizar constraint de alvo da atribuição para incluir cost_center_id
DO $$
BEGIN
    -- Remover constraint antiga, se existir
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'rh'
          AND table_name = 'training_assignments'
          AND constraint_name = 'chk_assignment_target'
    ) THEN
        ALTER TABLE rh.training_assignments
        DROP CONSTRAINT chk_assignment_target;
    END IF;
END $$;

-- Recriar constraint considerando cost_center_id
ALTER TABLE rh.training_assignments
ADD CONSTRAINT chk_assignment_target
CHECK (
  (tipo_atribuicao::text = 'publica'::text)
  OR employee_id IS NOT NULL
  OR position_id IS NOT NULL
  OR unit_id IS NOT NULL
  OR cost_center_id IS NOT NULL
);

