-- =====================================================
-- CORREÇÃO: correction_history.changed_by referenciar users
-- =====================================================
-- Data: 2026-01-30
-- Descrição: A coluna changed_by em rh.correction_history referenciava
--            public.profiles(id) (tabela de perfis/roles), mas as funções
--            approve_attendance_correction e reject_attendance_correction
--            usam auth.uid() (ID do usuário). Usuários como laila.novaes
--            existem em auth.users e public.users, mas não em profiles
--            (que guarda apenas roles: Gestor, Administrador, etc.).
--            Altera a FK para public.users(id), igual à correção feita
--            em medical_certificates (20260123095727).
-- =====================================================

-- 1) Garantir que todos os usuários de auth.users tenham linha em public.users
--    (evita erro de FK para quem foi criado antes do trigger ou com trigger falho)
INSERT INTO public.users (id, nome, email)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'nome', au.raw_user_meta_data->>'full_name', au.email),
  au.email
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);

-- 2) Remover a FK que referencia profiles
ALTER TABLE rh.correction_history
DROP CONSTRAINT IF EXISTS correction_history_changed_by_fkey;

-- 3) Permitir NULL em changed_by para registros históricos com profile_id inválido
ALTER TABLE rh.correction_history
ALTER COLUMN changed_by DROP NOT NULL;

-- 4) Limpar registros onde changed_by era um profile_id (não existe em users)
UPDATE rh.correction_history ch
SET changed_by = NULL
WHERE ch.changed_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = ch.changed_by);

-- 5) Nova FK referenciando public.users(id)
ALTER TABLE rh.correction_history
ADD CONSTRAINT correction_history_changed_by_fkey
FOREIGN KEY (changed_by)
REFERENCES public.users(id)
ON DELETE SET NULL;

COMMENT ON COLUMN rh.correction_history.changed_by IS
'ID do usuário que fez a alteração (referencia public.users.id).';
