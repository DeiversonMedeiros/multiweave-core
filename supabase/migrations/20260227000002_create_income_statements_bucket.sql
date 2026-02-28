-- =====================================================
-- CRIAÇÃO DO BUCKET PARA INFORMES DE RENDIMENTOS (IMPOSTO DE RENDA)
-- =====================================================
-- Data: 2026-02-27
-- Descrição: Cria bucket no Supabase Storage para armazenar PDFs de
--            informes de rendimentos (comprovantes para Imposto de Renda).
--            Estrutura sugerida dos objetos:
--            income-statements/{user_id}/{filename}
-- =====================================================

-- Criar/atualizar bucket para informes de rendimentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'income-statements',
  'income-statements',
  false, -- Bucket privado (usa RLS)
  52428800, -- 50MB limite por arquivo
  ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) BÁSICAS PARA O BUCKET
-- =====================================================
-- Observação: utilizamos a mesma convenção de políticas já existente
-- no banco para este bucket, garantindo que:
-- - O primeiro segmento do caminho (folder) seja o user_id
-- - O colaborador só consiga enviar e ver os próprios arquivos
--   (income-statements/{auth.uid}/{arquivo.pdf})
-- Políticas adicionais para administradores/gestores podem existir
-- em outras migrations ou ser ajustadas separadamente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload own income statements'
  ) THEN
    CREATE POLICY "Users can upload own income statements"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'income-statements'
      AND (auth.uid())::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Permitir que gestores/admins enviem informes de rendimentos
-- para colaboradores da sua empresa (inserindo no bucket com o user_id
-- do colaborador como primeira pasta do caminho)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Managers can upload company income statements'
  ) THEN
    CREATE POLICY "Managers can upload company income statements"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'income-statements'
      AND EXISTS (
        SELECT 1
        FROM user_companies uc
        JOIN profiles p ON p.id = uc.profile_id
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = (
            SELECT uc2.company_id
            FROM user_companies uc2
            WHERE uc2.user_id = ((storage.foldername(name))[1])::uuid
            LIMIT 1
          )
          AND (
            (p.permissoes ->> 'manager') = 'true'
            OR (p.permissoes ->> 'admin') = 'true'
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
      AND policyname = 'Users can view own income statements'
  ) THEN
    CREATE POLICY "Users can view own income statements"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'income-statements'
      AND (auth.uid())::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

