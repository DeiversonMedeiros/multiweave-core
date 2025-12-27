-- =====================================================
-- CRIAÇÃO DO BUCKET PARA DOCUMENTOS DE VEÍCULOS
-- Sistema ERP MultiWeave Core
-- =====================================================
-- Data: 2025-12-27
-- Descrição: Cria bucket no Supabase Storage para armazenar documentos de veículos.
--            Estrutura: vehicle-documents/{company_id}/{vehicle_id}/{filename}
-- =====================================================

-- Criar bucket para documentos de veículos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-documents',
  'vehicle-documents',
  false, -- Bucket privado (não público)
  10485760, -- 10MB limite por arquivo
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
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
      AND policyname = 'Authenticated users can upload vehicle documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload vehicle documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'vehicle-documents'
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

-- Política: Usuários podem visualizar documentos de veículos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view vehicle documents of their company'
  ) THEN
    CREATE POLICY "Users can view vehicle documents of their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'vehicle-documents'
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

-- Política: Usuários podem deletar documentos de veículos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete vehicle documents of their company'
  ) THEN
    CREATE POLICY "Users can delete vehicle documents of their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'vehicle-documents'
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

