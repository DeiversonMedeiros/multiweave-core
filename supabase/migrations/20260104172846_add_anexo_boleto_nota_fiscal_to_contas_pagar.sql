-- =====================================================
-- MIGRAÇÃO: ADICIONAR CAMPOS DE ANEXO (BOLETO E NOTA FISCAL)
-- Data: 2026-01-04
-- Descrição: Adiciona campos específicos para anexo de boleto e nota fiscal na tabela contas_pagar
-- =====================================================

-- Adicionar campos de anexo específicos
ALTER TABLE financeiro.contas_pagar
ADD COLUMN IF NOT EXISTS anexo_boleto TEXT,
ADD COLUMN IF NOT EXISTS anexo_nota_fiscal TEXT;

-- Comentários para documentação
COMMENT ON COLUMN financeiro.contas_pagar.anexo_boleto IS 'URL ou caminho do arquivo de boleto anexado';
COMMENT ON COLUMN financeiro.contas_pagar.anexo_nota_fiscal IS 'URL ou caminho do arquivo de nota fiscal anexado';

-- =====================================================
-- CRIAÇÃO DO BUCKET PARA BOLETOS
-- =====================================================

-- Criar bucket para boletos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'boletos',
  'boletos',
  false, -- Bucket privado (não público)
  10485760, -- 10MB limite por arquivo
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET DE BOLETOS
-- =====================================================

-- Política: Permitir upload de boletos apenas para usuários autenticados da empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload boletos'
  ) THEN
    CREATE POLICY "Authenticated users can upload boletos"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'boletos'
      AND auth.role() = 'authenticated'
      AND (
        -- Primeiro segmento do caminho é company_id
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem visualizar boletos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view boletos from their company'
  ) THEN
    CREATE POLICY "Users can view boletos from their company"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'boletos'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
        )
      )
    );
  END IF;
END $$;

-- Política: Usuários podem deletar boletos da sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete boletos from their company'
  ) THEN
    CREATE POLICY "Users can delete boletos from their company"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'boletos'
      AND auth.role() = 'authenticated'
      AND (
        split_part(name, '/', 1)::uuid IN (
          SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
        )
      )
    );
  END IF;
END $$;

