-- =====================================================
-- CRIAÇÃO DO BUCKET PARA LOGOS DE EMPRESAS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Cria bucket no Supabase Storage para armazenar logos de empresas.
--            Bucket público para facilitar acesso às imagens.
--
-- NOTA: As políticas RLS devem ser criadas manualmente no dashboard do Supabase
--       ou através de uma migração executada com permissões de superusuário.
--       O bucket criado aqui será público por padrão.

-- Criar bucket para logos de empresas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true, -- Bucket público para facilitar acesso às logos
  5242880, -- 5MB limite por arquivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================
-- IMPORTANTE: Como o bucket é público (public = true), a leitura já está habilitada.
--             Para restringir upload/update/delete apenas para usuários autenticados,
--             você precisa criar as políticas manualmente no dashboard do Supabase:
--
--             1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/storage/policies
--             2. Selecione o bucket 'company-logos'
--             3. Crie as seguintes políticas:
--
--             INSERT Policy:
--               Name: "Authenticated users can upload company logos"
--               WITH CHECK: bucket_id = 'company-logos' AND auth.role() = 'authenticated'
--
--             UPDATE Policy:
--               Name: "Authenticated users can update company logos"
--               USING: bucket_id = 'company-logos' AND auth.role() = 'authenticated'
--
--             DELETE Policy:
--               Name: "Authenticated users can delete company logos"
--               USING: bucket_id = 'company-logos' AND auth.role() = 'authenticated'
--
--             NOTA: A política SELECT não é necessária pois o bucket é público.
