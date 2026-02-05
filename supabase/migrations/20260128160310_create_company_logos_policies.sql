-- =====================================================
-- POLÍTICAS RLS PARA O BUCKET DE LOGOS DE EMPRESAS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Cria políticas RLS para o bucket company-logos
--            Permitindo upload/update/delete apenas para usuários autenticados
--
-- NOTA: Esta migração requer permissões de superusuário.
--       Se falhar com erro de permissão, execute manualmente no dashboard do Supabase.

-- Remover políticas existentes se houver (para evitar conflitos)
DROP POLICY IF EXISTS "Public Access for Company Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- Política: Permitir leitura pública das logos
-- NOTA: Como o bucket é público, esta política pode não ser necessária,
--       mas é incluída para consistência e controle explícito
CREATE POLICY "Public Access for Company Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Política: Permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
);

-- Política: Usuários autenticados podem atualizar logos
CREATE POLICY "Authenticated users can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
);

-- Política: Usuários autenticados podem deletar logos
CREATE POLICY "Authenticated users can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
);

-- Comentários para documentação
COMMENT ON POLICY "Public Access for Company Logos" ON storage.objects IS 
  'Permite acesso público às logos de empresas armazenadas no bucket company-logos';

COMMENT ON POLICY "Authenticated users can upload company logos" ON storage.objects IS 
  'Permite upload de logos apenas para usuários autenticados';

COMMENT ON POLICY "Authenticated users can update company logos" ON storage.objects IS 
  'Permite atualização de logos apenas para usuários autenticados';

COMMENT ON POLICY "Authenticated users can delete company logos" ON storage.objects IS 
  'Permite exclusão de logos apenas para usuários autenticados';
