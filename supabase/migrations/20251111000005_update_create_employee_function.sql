-- =====================================================
-- ATUALIZAR FUNÇÃO create_employee PARA ACEITAR TODOS OS CAMPOS
-- Data: 2025-11-11
-- Descrição: Atualiza a função RPC create_employee para aceitar todos os campos do formulário de funcionário
-- =====================================================

-- Primeiro, verificar e adicionar campos que podem não existir na tabela
DO $$
BEGIN
  -- Adicionar campos de dados pessoais adicionais se não existirem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'rh' 
    AND table_name = 'employees' 
    AND column_name = 'estado_civil'
  ) THEN
    ALTER TABLE rh.employees ADD COLUMN estado_civil VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'rh' 
    AND table_name = 'employees' 
    AND column_name = 'nacionalidade'
  ) THEN
    ALTER TABLE rh.employees ADD COLUMN nacionalidade VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'rh' 
    AND table_name = 'employees' 
    AND column_name = 'naturalidade'
  ) THEN
    ALTER TABLE rh.employees ADD COLUMN naturalidade VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'rh' 
    AND table_name = 'employees' 
    AND column_name = 'nome_mae'
  ) THEN
    ALTER TABLE rh.employees ADD COLUMN nome_mae VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'rh' 
    AND table_name = 'employees' 
    AND column_name = 'nome_pai'
  ) THEN
    ALTER TABLE rh.employees ADD COLUMN nome_pai VARCHAR(255);
  END IF;
END $$;

-- Remover todas as versões antigas da função create_employee para evitar conflito
-- Usar CASCADE para remover dependências se houver
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Buscar todas as funções create_employee e removê-las
  FOR func_record IN 
    SELECT proname, oidvectortypes(proargtypes) as argtypes
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname = 'create_employee'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.create_employee(%s) CASCADE', func_record.argtypes);
  END LOOP;
END $$;

-- Criar a nova função create_employee com todos os campos
CREATE OR REPLACE FUNCTION public.create_employee(
  company_id_param UUID,
  nome_param TEXT,
  cpf_param TEXT,
  data_admissao_param DATE,
  status_param TEXT DEFAULT 'ativo',
  user_id_param UUID DEFAULT NULL,
  matricula_param TEXT DEFAULT NULL,
  -- Dados pessoais básicos
  rg_param TEXT DEFAULT NULL,
  data_nascimento_param DATE DEFAULT NULL,
  telefone_param TEXT DEFAULT NULL,
  email_param TEXT DEFAULT NULL,
  -- Endereço
  endereco_param TEXT DEFAULT NULL,
  cidade_param TEXT DEFAULT NULL,
  estado_param TEXT DEFAULT NULL,
  cep_param TEXT DEFAULT NULL,
  -- Dados pessoais adicionais
  estado_civil_param TEXT DEFAULT NULL,
  nacionalidade_param TEXT DEFAULT NULL,
  naturalidade_param TEXT DEFAULT NULL,
  nome_mae_param TEXT DEFAULT NULL,
  nome_pai_param TEXT DEFAULT NULL,
  -- Dados profissionais
  cargo_id_param UUID DEFAULT NULL,
  departamento_id_param UUID DEFAULT NULL,
  work_shift_id_param UUID DEFAULT NULL,
  cost_center_id_param UUID DEFAULT NULL,
  gestor_imediato_id_param UUID DEFAULT NULL,
  salario_base_param NUMERIC(10,2) DEFAULT NULL,
  requer_registro_ponto_param BOOLEAN DEFAULT true,
  -- Documentos pessoais
  certidao_nascimento_param TEXT DEFAULT NULL,
  certidao_casamento_param TEXT DEFAULT NULL,
  titulo_eleitor_param TEXT DEFAULT NULL,
  ctps_param TEXT DEFAULT NULL,
  pis_pasep_param TEXT DEFAULT NULL,
  certificado_reservista_param TEXT DEFAULT NULL,
  comprovante_endereco_param TEXT DEFAULT NULL,
  foto_funcionario_param TEXT DEFAULT NULL,
  escolaridade_param TEXT DEFAULT NULL,
  tipo_cnh_param TEXT DEFAULT NULL,
  cartao_sus_param TEXT DEFAULT NULL,
  registros_profissionais_param JSONB DEFAULT NULL,
  outros_vinculos_empregaticios_param BOOLEAN DEFAULT false,
  detalhes_outros_vinculos_param TEXT DEFAULT NULL,
  -- Dados bancários
  banco_nome_param TEXT DEFAULT NULL,
  banco_agencia_param TEXT DEFAULT NULL,
  banco_conta_param TEXT DEFAULT NULL,
  banco_tipo_conta_param TEXT DEFAULT NULL,
  banco_pix_param TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record record;
  result_json jsonb;
  generated_matricula text;
BEGIN
  -- Gerar matrícula se não fornecida
  IF matricula_param IS NULL OR matricula_param = '' THEN
    generated_matricula := public.generate_employee_matricula(company_id_param);
  ELSE
    generated_matricula := matricula_param;
  END IF;
  
  -- Validar campos obrigatórios
  IF nome_param IS NULL OR nome_param = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  
  IF cpf_param IS NULL OR cpf_param = '' THEN
    RAISE EXCEPTION 'CPF é obrigatório';
  END IF;
  
  IF data_admissao_param IS NULL THEN
    RAISE EXCEPTION 'Data de admissão é obrigatória';
  END IF;
  
  -- Inserir funcionário com todos os campos
  INSERT INTO rh.employees (
    id,
    company_id,
    nome,
    matricula,
    cpf,
    rg,
    data_nascimento,
    data_admissao,
    data_demissao,
    cargo_id,
    departamento_id,
    salario_base,
    status,
    telefone,
    email,
    endereco,
    cidade,
    estado,
    cep,
    estado_civil,
    nacionalidade,
    naturalidade,
    nome_mae,
    nome_pai,
    work_shift_id,
    cost_center_id,
    gestor_imediato_id,
    user_id,
    requer_registro_ponto,
    -- Documentos pessoais
    certidao_nascimento,
    certidao_casamento,
    titulo_eleitor,
    ctps,
    pis_pasep,
    certificado_reservista,
    comprovante_endereco,
    foto_funcionario,
    escolaridade,
    tipo_cnh,
    cartao_sus,
    registros_profissionais,
    outros_vinculos_empregaticios,
    detalhes_outros_vinculos,
    -- Dados bancários
    banco_nome,
    banco_agencia,
    banco_conta,
    banco_tipo_conta,
    banco_pix
  ) VALUES (
    gen_random_uuid(),
    company_id_param,
    nome_param,
    generated_matricula,
    cpf_param,
    rg_param,
    data_nascimento_param,
    data_admissao_param,
    NULL, -- data_demissao
    cargo_id_param,
    departamento_id_param,
    salario_base_param,
    status_param,
    telefone_param,
    email_param,
    endereco_param,
    cidade_param,
    estado_param,
    cep_param,
    estado_civil_param,
    nacionalidade_param,
    naturalidade_param,
    nome_mae_param,
    nome_pai_param,
    work_shift_id_param,
    cost_center_id_param,
    gestor_imediato_id_param,
    user_id_param,
    requer_registro_ponto_param,
    -- Documentos pessoais
    certidao_nascimento_param,
    certidao_casamento_param,
    titulo_eleitor_param,
    ctps_param,
    pis_pasep_param,
    certificado_reservista_param,
    comprovante_endereco_param,
    foto_funcionario_param,
    escolaridade_param,
    tipo_cnh_param,
    cartao_sus_param,
    registros_profissionais_param,
    outros_vinculos_empregaticios_param,
    detalhes_outros_vinculos_param,
    -- Dados bancários
    banco_nome_param,
    banco_agencia_param,
    banco_conta_param,
    banco_tipo_conta_param,
    banco_pix_param
  ) RETURNING * INTO result_record;
  
  -- Converter resultado para JSON
  result_json := to_jsonb(result_record);
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar funcionário: %', SQLERRM;
END;
$$;

-- Comentários na função
COMMENT ON FUNCTION public.create_employee IS 'Cria um novo funcionário com todos os campos disponíveis no formulário';

