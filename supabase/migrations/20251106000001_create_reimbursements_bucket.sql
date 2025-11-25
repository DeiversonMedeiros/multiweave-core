-- =====================================================
-- CRIAÇÃO DO BUCKET PARA COMPROVANTES DE REEMBOLSO
-- =====================================================
-- Data: 2025-11-06
-- Descrição: Cria bucket no Supabase Storage para armazenar comprovantes de reembolso.
--            Estrutura: reimbursements/{company_id}/{employee_id}/{filename}

-- Criar bucket para comprovantes de reembolso
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reimbursements',
  'reimbursements',
  false, -- Bucket privado (não público)
  10485760, -- 10MB limite por arquivo
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS 'Buckets de armazenamento do Supabase';
COMMENT ON ROW storage.buckets IS 'Bucket para armazenar comprovantes de reembolso';

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload reimbursements'
  ) THEN
    CREATE POLICY "Authenticated users can upload reimbursements"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'reimbursements'
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view reimbursements of their company'
  ) THEN
    CREATE POLICY "Users can view reimbursements of their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'reimbursements'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete reimbursements of their company'
  ) THEN
    CREATE POLICY "Users can delete reimbursements of their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'reimbursements'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;


