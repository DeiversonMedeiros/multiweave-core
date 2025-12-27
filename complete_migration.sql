-- Políticas RLS para o bucket notas-fiscais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload notas fiscais'
  ) THEN
    CREATE POLICY "Authenticated users can upload notas fiscais"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'notas-fiscais'
      AND auth.role() = 'authenticated'
      AND (split_part(name, '/', 1)::uuid IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view notas fiscais from their company'
  ) THEN
    CREATE POLICY "Users can view notas fiscais from their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'notas-fiscais'
      AND auth.role() = 'authenticated'
      AND (split_part(name, '/', 1)::uuid IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete notas fiscais from their company'
  ) THEN
    CREATE POLICY "Users can delete notas fiscais from their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'notas-fiscais'
      AND auth.role() = 'authenticated'
      AND (split_part(name, '/', 1)::uuid IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()))
    );
  END IF;
END $$;
