-- =====================================================
-- CRIAÇÃO DO BUCKET PARA ARQUIVOS DE TREINAMENTOS
-- =====================================================
-- Data: 2026-01-15
-- Descrição: Cria bucket no Supabase Storage para armazenar vídeos, PDFs e outros arquivos de treinamentos online.
--            Estrutura: training-files/{company_id}/{training_id}/{content_id}/{filename}
--            Esta migração garante que o bucket seja criado mesmo se a migração anterior não foi aplicada.
-- =====================================================

-- Criar bucket para arquivos de treinamentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-files',
  'training-files',
  false, -- Bucket privado (usa RLS)
  524288000, -- 500MB limite por arquivo (para vídeos)
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg'
  ]
) ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================

-- Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Authenticated users can upload training files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view training files of their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update training files of their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete training files of their company" ON storage.objects;

-- Política: Permitir upload de arquivos apenas para usuários autenticados da empresa
CREATE POLICY "Authenticated users can upload training files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-files'
  AND auth.role() = 'authenticated'
  AND (
    -- Primeiro segmento do caminho é company_id
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

-- Política: Usuários podem visualizar arquivos de treinamentos da sua empresa
CREATE POLICY "Users can view training files of their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-files'
  AND (
    -- Primeiro segmento do caminho é company_id
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

-- Política: Usuários podem atualizar arquivos de treinamentos da sua empresa
CREATE POLICY "Users can update training files of their company"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-files'
  AND (
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

-- Política: Usuários podem deletar arquivos de treinamentos da sua empresa
CREATE POLICY "Users can delete training files of their company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-files'
  AND (
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
);
