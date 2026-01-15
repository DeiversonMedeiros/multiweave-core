-- =====================================================
-- ADICIONAR SUPORTE A M4A NO BUCKET DE TREINAMENTOS
-- =====================================================
-- Data: 2026-01-15
-- Descrição: Adiciona os MIME types para arquivos M4A (audio/mp4 e audio/x-m4a)
--            ao bucket training-files para permitir upload de arquivos de áudio M4A.
-- =====================================================

-- Atualizar bucket para incluir MIME types de M4A
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/html',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',  -- M4A (formato padrão)
  'audio/x-m4a' -- M4A (formato alternativo)
]
WHERE id = 'training-files';
