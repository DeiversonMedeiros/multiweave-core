-- =====================================================
-- CRIAÇÃO DO BUCKET PARA DOCUMENTOS DE FUNCIONÁRIOS
-- =====================================================
-- Data: 2025-11-15
-- Descrição: Cria bucket no Supabase Storage para armazenar documentos anexos dos funcionários.
--            Estrutura: employee-documents/{company_id}/{employee_id}/{filename}

-- Criar bucket para documentos de funcionários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false, -- Bucket privado (não público)
  10485760, -- 10MB limite por arquivo
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================

-- Política: Permitir upload de documentos apenas para usuários autenticados da empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload employee documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload employee documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'employee-documents'
      AND auth.role() = 'authenticated'
      AND (
        -- Primeiro segmento do caminho é company_id
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem visualizar documentos de funcionários da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view employee documents of their company'
  ) THEN
    CREATE POLICY "Users can view employee documents of their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'employee-documents'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem atualizar documentos de funcionários da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update employee documents of their company'
  ) THEN
    CREATE POLICY "Users can update employee documents of their company"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'employee-documents'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem excluir documentos de funcionários da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete employee documents of their company'
  ) THEN
    CREATE POLICY "Users can delete employee documents of their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'employee-documents'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

