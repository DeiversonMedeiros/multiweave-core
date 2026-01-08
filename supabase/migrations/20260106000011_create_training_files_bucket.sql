-- =====================================================
-- CRIAÇÃO DO BUCKET PARA ARQUIVOS DE TREINAMENTOS
-- =====================================================
-- Data: 2026-01-06
-- Descrição: Cria bucket no Supabase Storage para armazenar vídeos, PDFs e outros arquivos de treinamentos online.
--            Estrutura: training-files/{company_id}/{training_id}/{content_id}/{filename}
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
    'image/png'
  ]
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS 'Buckets de armazenamento do Supabase';
COMMENT ON ROW storage.buckets IS 'Bucket para armazenar arquivos de treinamentos online (vídeos, PDFs, etc)';

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================

-- Política: Permitir upload de arquivos apenas para usuários autenticados da empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload training files'
  ) THEN
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
  END IF;
END $$;

-- Política: Usuários podem visualizar arquivos de treinamentos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view training files of their company'
  ) THEN
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
  END IF;
END $$;

-- Política: Usuários podem atualizar arquivos de treinamentos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update training files of their company'
  ) THEN
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
  END IF;
END $$;

-- Política: Usuários podem deletar arquivos de treinamentos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete training files of their company'
  ) THEN
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
  END IF;
END $$;



