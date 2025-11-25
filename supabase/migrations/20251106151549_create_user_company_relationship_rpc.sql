-- =====================================================
-- MIGRAÇÃO: Criar função RPC create_user_company_relationship
-- =====================================================
-- Data: 2025-11-06
-- Descrição: Cria a função RPC necessária para associar usuários a empresas
--            Usada pela edge function create-user para criar o relacionamento
--            entre usuário e empresa após a criação do usuário no auth

-- Função para criar relacionamento usuário-empresa
CREATE OR REPLACE FUNCTION public.create_user_company_relationship(
  p_user_id UUID,
  p_company_id UUID,
  p_profile_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_id UUID,
  profile_id UUID,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result RECORD;
  v_user_email TEXT;
  v_user_nome TEXT;
  v_error_message TEXT;
BEGIN
  RAISE NOTICE 'create_user_company_relationship: Iniciando função com parâmetros: user_id=%, company_id=%, profile_id=%', p_user_id, p_company_id, p_profile_id;

  -- Desabilitar RLS temporariamente para esta função (seguro porque já validamos os dados)
  SET LOCAL row_security = off;
  RAISE NOTICE 'create_user_company_relationship: RLS desabilitado';

  -- Verificar se o usuário existe em auth.users e obter dados
  BEGIN
    SELECT email, raw_user_meta_data->>'nome' INTO v_user_email, v_user_nome
    FROM auth.users
    WHERE id = p_user_id;
    
    IF v_user_email IS NULL THEN
      RAISE EXCEPTION 'Usuário não encontrado no auth: %', p_user_id;
    END IF;
    
    RAISE NOTICE 'create_user_company_relationship: Usuário encontrado no auth: email=%, nome=%', v_user_email, v_user_nome;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao buscar usuário no auth: %', SQLERRM;
  END;

  -- Garantir que o registro existe em public.users (pode não existir se o trigger ainda não executou)
  BEGIN
    INSERT INTO public.users (id, nome, email)
    VALUES (p_user_id, COALESCE(v_user_nome, v_user_email), v_user_email)
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'create_user_company_relationship: Registro em public.users verificado/criado';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao inserir/verificar usuário em public.users: %', SQLERRM;
  END;

  -- Verificar se a empresa existe
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
      RAISE EXCEPTION 'Empresa não encontrada: %', p_company_id;
    END IF;
    RAISE NOTICE 'create_user_company_relationship: Empresa encontrada: %', p_company_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao verificar empresa: %', SQLERRM;
  END;

  -- Verificar se o perfil existe
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
      RAISE EXCEPTION 'Perfil não encontrado: %', p_profile_id;
    END IF;
    RAISE NOTICE 'create_user_company_relationship: Perfil encontrado: %', p_profile_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao verificar perfil: %', SQLERRM;
  END;

  -- Inserir o relacionamento (ou atualizar se já existir)
  -- RLS está desabilitado para esta transação, permitindo a inserção
  BEGIN
    RAISE NOTICE 'create_user_company_relationship: Tentando inserir relacionamento em user_companies';
    
    INSERT INTO public.user_companies (
      user_id,
      company_id,
      profile_id,
      ativo,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_company_id,
      p_profile_id,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, company_id)
    DO UPDATE SET
      profile_id = EXCLUDED.profile_id,
      ativo = true,
      updated_at = NOW()
    RETURNING * INTO v_result;
    
    RAISE NOTICE 'create_user_company_relationship: Relacionamento criado/atualizado com sucesso: id=%', v_result.id;
  EXCEPTION WHEN OTHERS THEN
    v_error_message := 'Erro ao inserir relacionamento em user_companies: ' || SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')';
    RAISE NOTICE 'create_user_company_relationship: %', v_error_message;
    RAISE EXCEPTION '%', v_error_message;
  END;

  -- Retornar o registro criado/atualizado
  RETURN QUERY
  SELECT 
    v_result.id,
    v_result.user_id,
    v_result.company_id,
    v_result.profile_id,
    v_result.ativo,
    v_result.created_at,
    v_result.updated_at;
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.create_user_company_relationship(UUID, UUID, UUID) IS 
  'Cria ou atualiza o relacionamento entre um usuário e uma empresa com um perfil específico. Usa SECURITY DEFINER para permitir execução pela edge function.';

-- Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.create_user_company_relationship(UUID, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_company_relationship(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_company_relationship(UUID, UUID, UUID) TO service_role;

