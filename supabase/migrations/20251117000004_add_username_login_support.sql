-- =====================================================
-- Habilita login por nome de usuário
-- =====================================================

-- 1. Adiciona coluna username na tabela public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username TEXT;

COMMENT ON COLUMN public.users.username IS 'Nome de usuário único para login (alias do email)';

-- 2. Garante unicidade (case insensitive) e performance nas buscas por username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_ci_unique
  ON public.users (LOWER(username));

-- 3. Função para resolver email a partir do username (usada pelo front-end)
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT email
    INTO v_email
  FROM public.users
  WHERE username IS NOT NULL
    AND LOWER(username) = LOWER(trim(p_username))
    AND COALESCE(ativo, true)
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_email;
END;
$$;

COMMENT ON FUNCTION public.get_user_email_by_username(TEXT)
  IS 'Retorna o email associado a um username ativo para permitir login.';

GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO authenticated;

