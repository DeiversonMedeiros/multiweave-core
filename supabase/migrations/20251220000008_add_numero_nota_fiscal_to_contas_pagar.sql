-- =====================================================
-- ADICIONAR CAMPO NUMERO_NOTA_FISCAL EM CONTAS A PAGAR
-- =====================================================
-- Data: 2025-12-20
-- Descrição: Adiciona campo para número da nota fiscal e cria bucket para armazenar notas fiscais
-- Autor: Sistema MultiWeave Core

-- Adicionar campo numero_nota_fiscal na tabela contas_pagar
ALTER TABLE financeiro.contas_pagar
ADD COLUMN IF NOT EXISTS numero_nota_fiscal VARCHAR(50);

-- Comentário no campo
COMMENT ON COLUMN financeiro.contas_pagar.numero_nota_fiscal IS 'Número da nota fiscal da conta a pagar';

-- =====================================================
-- CRIAÇÃO DO BUCKET PARA NOTAS FISCAIS
-- =====================================================

-- Criar bucket para notas fiscais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notas-fiscais',
  'notas-fiscais',
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

-- Política: Permitir upload de notas fiscais apenas para usuários autenticados da empresa
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
      AND (
        -- Primeiro segmento do caminho é company_id
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem visualizar notas fiscais da sua empresa
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
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem deletar notas fiscais da sua empresa
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
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

