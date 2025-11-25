-- =====================================================
-- APLICAR CORREÇÃO: Remove Foreign Key Problemática
-- =====================================================
-- IMPORTANTE: Copie e cole este SQL no Supabase SQL Editor

-- Remover constraints problemáticas
ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_solicitado_por_fkey CASCADE;

ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_aprovado_por_fkey CASCADE;

-- Comentar as colunas para documentar
COMMENT ON COLUMN rh.attendance_corrections.solicitado_por IS 
'UUID do usuário que solicitou a correção. Pode ser UUID de auth.users ou profiles.';

COMMENT ON COLUMN rh.attendance_corrections.aprovado_por IS 
'UUID do usuário que aprovou a correção. Pode ser UUID de auth.users ou profiles.';

-- Verificar que a constraint foi removida
SELECT
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'rh'
  AND tc.table_name = 'attendance_corrections'
  AND kcu.column_name IN ('solicitado_por', 'aprovado_por');

