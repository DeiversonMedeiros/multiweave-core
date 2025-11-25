-- =====================================================
-- VERIFICAR SE O USUÁRIO EXISTE
-- =====================================================

-- 1. Verificar se o usuário existe em auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = 'e745168f-addb-4456-a6fa-f4a336d874ac';

-- 2. Verificar a estrutura da tabela attendance_corrections
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'rh'
  AND table_name = 'attendance_corrections'
ORDER BY ordinal_position;

-- 3. Verificar a foreign key
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'rh'
  AND tc.table_name = 'attendance_corrections'
  AND kcu.column_name LIKE '%solicitado%';

