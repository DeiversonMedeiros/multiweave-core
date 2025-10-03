-- Fix search_path security warning by setting it to empty string
-- This forces all references to be fully qualified

-- Update is_admin function
CREATE OR REPLACE FUNCTION core.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.user_companies uc
    JOIN core.profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = $1 
    AND p.nome = 'Administrador'
    AND uc.ativo = true
  );
$$;

-- Update user_has_company_access function
CREATE OR REPLACE FUNCTION core.user_has_company_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.user_companies
    WHERE user_id = $1 
    AND company_id = $2
    AND ativo = true
  );
$$;

-- Update update_updated_at trigger function
CREATE OR REPLACE FUNCTION core.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION core.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO core.users (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;