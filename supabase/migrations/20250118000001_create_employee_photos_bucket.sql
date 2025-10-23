-- =====================================================
-- CRIAÇÃO DO BUCKET PARA FOTOS DE FUNCIONÁRIOS
-- =====================================================

-- Criar bucket para fotos de funcionários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880, -- 5MB limite
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Criar política RLS para permitir leitura pública das fotos
CREATE POLICY "Public Access for Employee Photos" ON storage.objects
FOR SELECT USING (bucket_id = 'employee-photos');

-- Criar política RLS para permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload employee photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'employee-photos' 
  AND auth.role() = 'authenticated'
);

-- Criar política RLS para permitir atualização apenas para usuários autenticados
CREATE POLICY "Authenticated users can update employee photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'employee-photos' 
  AND auth.role() = 'authenticated'
);

-- Criar política RLS para permitir exclusão apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete employee photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'employee-photos' 
  AND auth.role() = 'authenticated'
);

-- Comentário para documentação
COMMENT ON POLICY "Public Access for Employee Photos" ON storage.objects IS 'Permite acesso público às fotos de funcionários';
COMMENT ON POLICY "Authenticated users can upload employee photos" ON storage.objects IS 'Permite upload de fotos apenas para usuários autenticados';
COMMENT ON POLICY "Authenticated users can update employee photos" ON storage.objects IS 'Permite atualização de fotos apenas para usuários autenticados';
COMMENT ON POLICY "Authenticated users can delete employee photos" ON storage.objects IS 'Permite exclusão de fotos apenas para usuários autenticados';
