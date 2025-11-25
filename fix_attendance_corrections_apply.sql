-- =====================================================
-- APLICAR CORREÇÃO NA TABELA attendance_corrections
-- =====================================================
-- IMPORTANTE: Execute este script no Supabase SQL Editor

-- 1. Verificar qual é a foreign key atual
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'rh'
  AND tc.table_name = 'attendance_corrections'
  AND kcu.column_name IN ('solicitado_por', 'aprovado_por');

-- 2. Dropar as foreign keys existentes
ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_solicitado_por_fkey CASCADE;

ALTER TABLE rh.attendance_corrections 
DROP CONSTRAINT IF EXISTS attendance_corrections_aprovado_por_fkey CASCADE;

-- 3. Agora a tabela aceita qualquer UUID
-- O sistema irá armazenar o UUID do auth.users diretamente

COMMIT;

