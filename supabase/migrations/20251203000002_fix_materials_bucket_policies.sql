-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS DO BUCKET DE MATERIAIS
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Garante que as políticas RLS do bucket materials estejam criadas corretamente

-- Remover políticas existentes (se houver) para recriar
DROP POLICY IF EXISTS "Public Access for Material Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload material images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update material images of their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete material images of their company" ON storage.objects;

-- Política: Permitir leitura pública das imagens
CREATE POLICY "Public Access for Material Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'materials');

-- Política: Permitir upload apenas para usuários autenticados da empresa
CREATE POLICY "Authenticated users can upload material images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'materials'
  AND auth.role() = 'authenticated'
  AND (
    -- Primeiro segmento do caminho é company_id
    -- Verificar se o company_id no caminho pertence ao usuário
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  )
);

-- Política: Usuários podem atualizar imagens da sua empresa
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

-- Política: Usuários podem deletar imagens da sua empresa
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


