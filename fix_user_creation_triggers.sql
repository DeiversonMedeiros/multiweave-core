-- Corrigir trigger para incluir company_id na tabela users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, nome, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    (SELECT company_id FROM user_companies WHERE user_id = NEW.id LIMIT 1)
  );
  RETURN NEW;
END;
$$;

-- Criar trigger para criar funcionário automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_company_id UUID;
  user_company_company_id UUID;
BEGIN
  -- Buscar o company_id do usuário
  SELECT company_id INTO user_company_company_id
  FROM user_companies 
  WHERE user_id = NEW.id 
  LIMIT 1;
  
  -- Se encontrou uma empresa, criar funcionário
  IF user_company_company_id IS NOT NULL THEN
    INSERT INTO rh.employees (
      id,
      company_id,
      nome,
      email,
      cpf,
      data_admissao,
      status,
      user_id
    )
    VALUES (
      gen_random_uuid(),
      user_company_company_id,
      NEW.raw_user_meta_data->>'nome',
      NEW.email,
      '000.000.000-00', -- CPF temporário, deve ser atualizado posteriormente
      NOW(),
      'ativo',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção em users
CREATE TRIGGER on_user_created_employee
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_employee();
