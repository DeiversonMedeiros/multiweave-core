-- Função RPC para criar perfil (bypass de RLS)
CREATE OR REPLACE FUNCTION create_profile(
  p_nome TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Verificar se o usuário tem permissão para criar perfis
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar perfis';
  END IF;
  
  -- Verificar se o nome já existe
  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.nome = p_nome) THEN
    RAISE EXCEPTION 'Já existe um perfil com este nome: %', p_nome;
  END IF;
  
  -- Criar novo perfil
  INSERT INTO profiles (nome, descricao, is_active, permissoes)
  VALUES (p_nome, p_descricao, p_is_active, '{}')
  RETURNING profiles.id INTO new_profile_id;
  
  -- Retornar perfil criado
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = new_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC para atualizar perfil (bypass de RLS)
CREATE OR REPLACE FUNCTION update_profile(
  p_id UUID,
  p_nome TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verificar se o usuário tem permissão para atualizar perfis
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem atualizar perfis';
  END IF;
  
  -- Verificar se o nome já existe (exceto para o próprio perfil)
  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.nome = p_nome AND profiles.id != p_id) THEN
    RAISE EXCEPTION 'Já existe um perfil com este nome: %', p_nome;
  END IF;
  
  -- Atualizar perfil
  UPDATE profiles
  SET 
    nome = p_nome,
    descricao = p_descricao,
    is_active = p_is_active,
    updated_at = NOW()
  WHERE profiles.id = p_id;
  
  -- Retornar perfil atualizado
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
