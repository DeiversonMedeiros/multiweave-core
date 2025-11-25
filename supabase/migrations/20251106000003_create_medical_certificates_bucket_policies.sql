-- =====================================================
-- POLÍTICAS PARA BUCKET medical-certificates (Storage)
-- =====================================================
-- Estrutura de caminho adotada: medical-certificates/{company_id}/{certificate_id}/{filename}

-- Upload por usuários autenticados da empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload medical certificates'
  ) THEN
    CREATE POLICY "Authenticated users can upload medical certificates"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'medical-certificates'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Leitura por usuários da própria empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view medical certificates of their company'
  ) THEN
    CREATE POLICY "Users can view medical certificates of their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'medical-certificates'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Exclusão por usuários autenticados da mesma empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete medical certificates of their company'
  ) THEN
    CREATE POLICY "Users can delete medical certificates of their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'medical-certificates'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;


