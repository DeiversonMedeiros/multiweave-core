-- =====================================================
-- MIGRAÇÃO: Adicionar cost_center_id e work_shift_id à tabela rh.employees
-- Data: 2025-11-03
-- Descrição: Adiciona campos cost_center_id e work_shift_id para vincular funcionários a centros de custo e turnos de trabalho
-- =====================================================

-- Adicionar campo cost_center_id na tabela rh.employees
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- Adicionar campo work_shift_id na tabela rh.employees
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS work_shift_id UUID REFERENCES rh.work_shifts(id) ON DELETE SET NULL;

-- Adicionar comentários nos campos
COMMENT ON COLUMN rh.employees.cost_center_id IS 'Centro de custo associado ao funcionário';
COMMENT ON COLUMN rh.employees.work_shift_id IS 'Turno de trabalho associado ao funcionário';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_employees_cost_center_id ON rh.employees(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_shift_id ON rh.employees(work_shift_id);

-- Verificar se as colunas foram adicionadas corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'rh' 
        AND table_name = 'employees' 
        AND column_name = 'cost_center_id'
    ) THEN
        RAISE NOTICE 'Campo cost_center_id adicionado com sucesso à tabela rh.employees';
    ELSE
        RAISE WARNING 'Campo cost_center_id não foi encontrado na tabela rh.employees';
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'rh' 
        AND table_name = 'employees' 
        AND column_name = 'work_shift_id'
    ) THEN
        RAISE NOTICE 'Campo work_shift_id adicionado com sucesso à tabela rh.employees';
    ELSE
        RAISE WARNING 'Campo work_shift_id não foi encontrado na tabela rh.employees';
    END IF;
END $$;










































