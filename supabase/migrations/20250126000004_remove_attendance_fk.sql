-- =====================================================
-- REMOVER FOREIGN KEY PROBLEMÁTICA
-- Data: 2025-01-26
-- Descrição: Remove foreign key de solicitado_por que está causando erro
-- =====================================================

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

