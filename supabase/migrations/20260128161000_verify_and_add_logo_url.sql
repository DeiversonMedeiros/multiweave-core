-- =====================================================
-- VERIFICAR E ADICIONAR CAMPO logo_url SE NÃO EXISTIR
-- =====================================================
-- Esta migração verifica se o campo logo_url existe
-- e o adiciona caso não exista, garantindo compatibilidade

-- Verificar se a coluna existe antes de adicionar
DO $$
BEGIN
  -- Verificar se a coluna logo_url não existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'logo_url'
  ) THEN
    -- Adicionar a coluna
    ALTER TABLE public.companies 
    ADD COLUMN logo_url TEXT;
    
    -- Adicionar comentário
    COMMENT ON COLUMN public.companies.logo_url IS 'URL da logo da empresa armazenada no Supabase Storage';
    
    RAISE NOTICE 'Coluna logo_url adicionada à tabela companies';
  ELSE
    RAISE NOTICE 'Coluna logo_url já existe na tabela companies';
  END IF;
END $$;

-- Atualizar o schema cache do PostgREST
-- NOTA: Isso requer reiniciar o PostgREST ou executar:
-- SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
