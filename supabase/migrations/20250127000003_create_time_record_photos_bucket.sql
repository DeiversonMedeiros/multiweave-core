-- =====================================================
-- CRIAÇÃO DO BUCKET PARA FOTOS DE REGISTRO DE PONTO
-- =====================================================
-- Data: 2025-01-27
-- Descrição: Cria bucket no Supabase Storage para armazenar fotos capturadas durante o registro de ponto.
--            Estrutura: time-record-photos/{company_id}/{employee_id}/{timestamp}.jpg

-- Criar bucket para fotos de registro de ponto
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-record-photos',
  'time-record-photos',
  false, -- Bucket privado (não público)
  5242880, -- 5MB limite por arquivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS 'Buckets de armazenamento do Supabase';
COMMENT ON ROW storage.buckets IS 'Bucket para armazenar fotos capturadas durante registro de ponto';

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA O BUCKET
-- =====================================================

-- Política: Permitir upload de fotos apenas para usuários autenticados
-- Estrutura do caminho: {company_id}/{employee_id}/{filename}
CREATE POLICY "Authenticated users can upload time record photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'time-record-photos'
  AND auth.role() = 'authenticated'
  -- Verificar se o usuário pertence à empresa do caminho
  -- split_part(name, '/', 1) extrai o primeiro segmento do caminho (company_id)
  AND (
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  )
);

-- Política: Usuários podem visualizar fotos de registros de ponto da sua empresa
CREATE POLICY "Users can view time record photos of their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'time-record-photos'
  AND (
    split_part(name, '/', 1)::uuid IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  )
);

-- Política: Usuários podem atualizar apenas suas próprias fotos de registro
-- (ou se tiverem permissão administrativa)
CREATE POLICY "Users can update time record photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'time-record-photos'
  AND auth.role() = 'authenticated'
  AND (
    -- Verificar se é foto própria ou se tem permissão admin
    -- split_part(name, '/', 2) extrai o segundo segmento (employee_id)
    (split_part(name, '/', 2)::uuid IN (
      SELECT e.id 
      FROM rh.employees e
      JOIN user_companies uc ON uc.company_id = e.company_id
      WHERE uc.user_id = auth.uid()
      AND e.user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM user_companies uc
      JOIN entity_permissions ep ON ep.profile_id = uc.profile_id
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = split_part(name, '/', 1)::uuid
      AND ep.entity_name = 'registros_ponto'
      AND ep.can_edit = true
    )
  )
);

-- Política: Usuários podem deletar apenas suas próprias fotos
-- (ou se tiverem permissão administrativa)
CREATE POLICY "Users can delete time record photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'time-record-photos'
  AND auth.role() = 'authenticated'
  AND (
    -- Verificar se é foto própria ou se tem permissão admin
    -- split_part(name, '/', 2) extrai o segundo segmento (employee_id)
    (split_part(name, '/', 2)::uuid IN (
      SELECT e.id 
      FROM rh.employees e
      JOIN user_companies uc ON uc.company_id = e.company_id
      WHERE uc.user_id = auth.uid()
      AND e.user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM user_companies uc
      JOIN entity_permissions ep ON ep.profile_id = uc.profile_id
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = split_part(name, '/', 1)::uuid
      AND ep.entity_name = 'registros_ponto'
      AND ep.can_edit = true
    )
  )
);

-- Comentários para documentação
COMMENT ON POLICY "Authenticated users can upload time record photos" ON storage.objects IS 
'Permite que usuários autenticados façam upload de fotos de registro de ponto apenas para empresas que pertencem';

COMMENT ON POLICY "Users can view time record photos of their company" ON storage.objects IS 
'Permite que usuários visualizem fotos de registro de ponto da sua empresa';

COMMENT ON POLICY "Users can update time record photos" ON storage.objects IS 
'Permite que usuários atualizem suas próprias fotos ou tenham permissão administrativa';

COMMENT ON POLICY "Users can delete time record photos" ON storage.objects IS 
'Permite que usuários deletem suas próprias fotos ou tenham permissão administrativa';

