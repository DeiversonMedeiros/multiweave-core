-- MIGRAÇÃO: Criar bucket para anexos de cotação
-- Data: 2025-01-30
-- Descrição: Cria bucket no Supabase Storage para armazenar anexos de fornecedores em cotações

-- 1. Criar bucket 'cotacao-anexos' (público para facilitar acesso, mas com RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cotacao-anexos',
  'cotacao-anexos',
  false, -- Bucket privado (usa RLS)
  10485760, -- 10MB limite por arquivo
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar política RLS para INSERT (upload) - apenas usuários autenticados podem fazer upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload cotacao anexos'
  ) THEN
    CREATE POLICY "Authenticated users can upload cotacao anexos"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'cotacao-anexos'
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

-- 3. Criar política RLS para SELECT (download) - usuários autenticados podem ver apenas anexos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view cotacao anexos of their company'
  ) THEN
    CREATE POLICY "Users can view cotacao anexos of their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'cotacao-anexos'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies 
          WHERE user_id = auth.uid() AND ativo = true
        )
      )
    );
  END IF;
END $$;

-- 4. Criar política RLS para UPDATE - usuários autenticados podem atualizar apenas anexos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update cotacao anexos of their company'
  ) THEN
    CREATE POLICY "Users can update cotacao anexos of their company"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'cotacao-anexos'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies 
          WHERE user_id = auth.uid() AND ativo = true
        )
      )
    );
  END IF;
END $$;

-- 5. Criar política RLS para DELETE - usuários autenticados podem deletar apenas anexos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete cotacao anexos of their company'
  ) THEN
    CREATE POLICY "Users can delete cotacao anexos of their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'cotacao-anexos'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies 
          WHERE user_id = auth.uid() AND ativo = true
        )
      )
    );
  END IF;
END $$;

