-- =====================================================
-- AJUSTE DAS POLÍTICAS DO BUCKET income-statements
-- =====================================================
-- Objetivo:
-- - Permitir que QUALQUER usuário autenticado (incluindo RH/gestores)
--   faça upload de arquivos no bucket 'income-statements', usando
--   o user_id do colaborador como primeira pasta do caminho.
-- - Manter as políticas de SELECT já existentes, que garantem que
--   apenas o próprio colaborador (ou gestores/admins) consigam ver
--   os arquivos.
--
-- Motivação:
-- - A política original "Users can upload own income statements"
--   exige que auth.uid() seja igual ao primeiro segmento do caminho,
--   o que impede o RH de subir arquivos em nome de outros usuários.
-- - Nesta migração, removemos as políticas de INSERT antigas
--   relacionadas ao bucket 'income-statements' e criamos uma
--   política mais permissiva apenas para INSERT.
-- =====================================================

-- Remover políticas antigas de INSERT relacionadas ao bucket income-statements
DROP POLICY IF EXISTS "Users can upload own income statements" ON storage.objects;
DROP POLICY IF EXISTS "Managers can upload company income statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload income statements" ON storage.objects;

-- Nova política: qualquer usuário autenticado pode fazer upload
-- para o bucket income-statements. As políticas de SELECT
-- continuam controlando quem consegue ver os arquivos.
CREATE POLICY "Authenticated users can upload income statements"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'income-statements'
  AND auth.role() = 'authenticated'
);

