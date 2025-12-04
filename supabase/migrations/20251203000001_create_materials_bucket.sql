-- =====================================================
-- CRIAÇÃO DO BUCKET PARA IMAGENS DE MATERIAIS
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Cria bucket no Supabase Storage para armazenar imagens de materiais e equipamentos.
--            Estrutura: materials/{company_id}/{filename}

-- Criar bucket para imagens de materiais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  true, -- Bucket público para facilitar acesso às imagens
  5242880, -- 5MB limite por arquivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================

-- Política: Permitir leitura pública das imagens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public Access for Material Images'
  ) THEN
    CREATE POLICY "Public Access for Material Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'materials');
  END IF;
END $$;

-- Política: Permitir upload apenas para usuários autenticados da empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload material images'
  ) THEN
    CREATE POLICY "Authenticated users can upload material images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'materials'
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

-- Política: Usuários podem atualizar imagens da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update material images of their company'
  ) THEN
    CREATE POLICY "Users can update material images of their company"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'materials'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem deletar imagens da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete material images of their company'
  ) THEN
    CREATE POLICY "Users can delete material images of their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'materials'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

