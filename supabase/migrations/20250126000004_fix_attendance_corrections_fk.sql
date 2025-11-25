-- =====================================================
-- CORREÇÃO: Foreign Key de attendance_corrections
-- Data: 2025-01-26
-- Descrição: Atualiza foreign key para aceitar UUIDs de auth.users
-- =====================================================

-- Verificar estrutura atual da foreign key
DO $$
DECLARE
    fk_constraint TEXT;
BEGIN
    SELECT constraint_name INTO fk_constraint
    FROM information_schema.table_constraints
    WHERE table_schema = 'rh'
      AND table_name = 'attendance_corrections'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%solicitado_por%';
    
    RAISE NOTICE 'FK constraint atual: %', COALESCE(fk_constraint, 'Não encontrada');
END $$;

-- Dropar a constraint antiga
ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_solicitado_por_fkey;

ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_aprovado_por_fkey;

-- Recriar constraints sem foreign key (aceita qualquer UUID válido)
-- OU criar uma constraint que aceita tanto profiles quanto auth.users

-- Por enquanto, apenas remover a constraint para permitir inserção
-- O sistema validará manualmente se necessário

COMMENT ON COLUMN rh.attendance_corrections.solicitado_por IS 
'UUID do usuário que solicitou a correção (pode ser de auth.users ou profiles)';

COMMENT ON COLUMN rh.attendance_corrections.aprovado_por IS 
'UUID do usuário que aprovou a correção (pode ser de auth.users ou profiles)';

