-- =====================================================
-- ATUALIZAR FUNÇÃO create_employee COM NOVOS CAMPOS
-- Data: 2025-11-11
-- Descrição: Atualiza a função RPC create_employee para incluir todos os novos campos detalhados
-- =====================================================

-- Remover todas as versões antigas da função create_employee
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT proname, oidvectortypes(proargtypes) as argtypes
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname = 'create_employee'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.create_employee(%s) CASCADE', func_record.argtypes);
  END LOOP;
END $$;

-- Criar a nova função create_employee com TODOS os campos
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
  rg_orgao_emissor_param TEXT DEFAULT NULL,
  rg_uf_emissao_param TEXT DEFAULT NULL,
  rg_data_emissao_param DATE DEFAULT NULL,
  data_nascimento_param DATE DEFAULT NULL,
  telefone_param TEXT DEFAULT NULL,
  email_param TEXT DEFAULT NULL,
  sexo_param TEXT DEFAULT NULL,
  orientacao_sexual_param TEXT DEFAULT NULL,
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
  tipo_contrato_trabalho_param TEXT DEFAULT NULL,
  vinculo_periculosidade_param BOOLEAN DEFAULT false,
  vinculo_insalubridade_param BOOLEAN DEFAULT false,
  grau_insalubridade_param TEXT DEFAULT NULL,
  -- Documentos pessoais - Título de Eleitor
  titulo_eleitor_param TEXT DEFAULT NULL,
  titulo_eleitor_zona_param TEXT DEFAULT NULL,
  titulo_eleitor_secao_param TEXT DEFAULT NULL,
  -- Documentos pessoais - CTPS
  ctps_param TEXT DEFAULT NULL,
  ctps_serie_param TEXT DEFAULT NULL,
  ctps_uf_param TEXT DEFAULT NULL,
  ctps_data_emissao_param DATE DEFAULT NULL,
  -- Documentos pessoais - CNH
  cnh_numero_param TEXT DEFAULT NULL,
  cnh_validade_param DATE DEFAULT NULL,
  cnh_categoria_param TEXT DEFAULT NULL,
  -- Documentos pessoais - Outros
  certidao_nascimento_param TEXT DEFAULT NULL,
  certidao_casamento_param TEXT DEFAULT NULL,
  certidao_casamento_numero_param TEXT DEFAULT NULL,
  certidao_casamento_data_param DATE DEFAULT NULL,
  certidao_uniao_estavel_numero_param TEXT DEFAULT NULL,
  certidao_uniao_estavel_data_param DATE DEFAULT NULL,
  pis_pasep_param TEXT DEFAULT NULL,
  certificado_reservista_param TEXT DEFAULT NULL,
  comprovante_endereco_param TEXT DEFAULT NULL,
  foto_funcionario_param TEXT DEFAULT NULL,
  escolaridade_param TEXT DEFAULT NULL,
  tipo_cnh_param TEXT DEFAULT NULL, -- Mantido para compatibilidade
  cartao_sus_param TEXT DEFAULT NULL,
  registros_profissionais_param JSONB DEFAULT NULL,
  outros_vinculos_empregaticios_param BOOLEAN DEFAULT false,
  detalhes_outros_vinculos_param TEXT DEFAULT NULL,
  -- Deficiência
  possui_deficiencia_param BOOLEAN DEFAULT false,
  deficiencia_tipo_id_param UUID DEFAULT NULL,
  deficiencia_grau_param TEXT DEFAULT NULL,
  deficiencia_laudo_url_param TEXT DEFAULT NULL,
  -- RNE (Registro Nacional de Estrangeiro)
  rne_numero_param TEXT DEFAULT NULL,
  rne_orgao_param TEXT DEFAULT NULL,
  rne_data_expedicao_param DATE DEFAULT NULL,
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
    id, company_id, nome, matricula, cpf, rg,
    rg_orgao_emissor, rg_uf_emissao, rg_data_emissao,
    data_nascimento, data_admissao, data_demissao,
    cargo_id, departamento_id, salario_base, status,
    telefone, email, endereco, cidade, estado, cep,
    estado_civil, nacionalidade, naturalidade, nome_mae, nome_pai,
    work_shift_id, cost_center_id, gestor_imediato_id, user_id,
    requer_registro_ponto, tipo_contrato_trabalho,
    vinculo_periculosidade, vinculo_insalubridade, grau_insalubridade,
    -- Documentos pessoais
    certidao_nascimento, certidao_casamento,
    certidao_casamento_numero, certidao_casamento_data,
    certidao_uniao_estavel_numero, certidao_uniao_estavel_data,
    titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
    ctps, ctps_serie, ctps_uf, ctps_data_emissao,
    pis_pasep, certificado_reservista, comprovante_endereco,
    foto_funcionario, escolaridade, tipo_cnh, cnh_numero, cnh_validade, cnh_categoria,
    cartao_sus, registros_profissionais,
    outros_vinculos_empregaticios, detalhes_outros_vinculos,
    -- Deficiência
    possui_deficiencia, deficiencia_tipo_id, deficiencia_grau, deficiencia_laudo_url,
    -- RNE
    rne_numero, rne_orgao, rne_data_expedicao,
    -- Identidade pessoal
    sexo, orientacao_sexual,
    -- Dados bancários
    banco_nome, banco_agencia, banco_conta, banco_tipo_conta, banco_pix
  ) VALUES (
    gen_random_uuid(), company_id_param, nome_param, generated_matricula, cpf_param, rg_param,
    rg_orgao_emissor_param, rg_uf_emissao_param, rg_data_emissao_param,
    data_nascimento_param, data_admissao_param, NULL,
    cargo_id_param, departamento_id_param, salario_base_param, status_param,
    telefone_param, email_param, endereco_param, cidade_param, estado_param, cep_param,
    estado_civil_param, nacionalidade_param, naturalidade_param, nome_mae_param, nome_pai_param,
    work_shift_id_param, cost_center_id_param, gestor_imediato_id_param, user_id_param,
    requer_registro_ponto_param, tipo_contrato_trabalho_param,
    vinculo_periculosidade_param, vinculo_insalubridade_param, grau_insalubridade_param,
    -- Documentos pessoais
    certidao_nascimento_param, certidao_casamento_param,
    certidao_casamento_numero_param, certidao_casamento_data_param,
    certidao_uniao_estavel_numero_param, certidao_uniao_estavel_data_param,
    titulo_eleitor_param, titulo_eleitor_zona_param, titulo_eleitor_secao_param,
    ctps_param, ctps_serie_param, ctps_uf_param, ctps_data_emissao_param,
    pis_pasep_param, certificado_reservista_param, comprovante_endereco_param,
    foto_funcionario_param, escolaridade_param, 
    COALESCE(tipo_cnh_param, cnh_categoria_param), -- Usar tipo_cnh_param se fornecido, senão cnh_categoria_param
    cnh_numero_param, cnh_validade_param, cnh_categoria_param,
    cartao_sus_param, registros_profissionais_param,
    outros_vinculos_empregaticios_param, detalhes_outros_vinculos_param,
    -- Deficiência
    possui_deficiencia_param, deficiencia_tipo_id_param, deficiencia_grau_param, deficiencia_laudo_url_param,
    -- RNE
    rne_numero_param, rne_orgao_param, rne_data_expedicao_param,
    -- Identidade pessoal
    sexo_param, orientacao_sexual_param,
    -- Dados bancários
    banco_nome_param, banco_agencia_param, banco_conta_param, banco_tipo_conta_param, banco_pix_param
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
COMMENT ON FUNCTION public.create_employee IS 'Cria um novo funcionário com todos os campos disponíveis no formulário, incluindo documentos detalhados, deficiência, RNE, periculosidade e insalubridade';

