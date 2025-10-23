-- =====================================================
-- FUNÇÕES RPC PARA EXAMES PERIÓDICOS
-- =====================================================

-- Função para criar exame periódico
CREATE OR REPLACE FUNCTION create_periodic_exam(
  p_company_id UUID,
  p_employee_id UUID,
  p_tipo_exame VARCHAR(30),
  p_data_agendamento DATE,
  p_data_vencimento DATE,
  p_status VARCHAR(20) DEFAULT 'agendado',
  p_medico_responsavel VARCHAR(255) DEFAULT NULL,
  p_clinica_local VARCHAR(255) DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_resultado VARCHAR(20) DEFAULT NULL,
  p_restricoes TEXT DEFAULT NULL,
  p_anexos TEXT[] DEFAULT NULL,
  p_custo DECIMAL(10,2) DEFAULT NULL,
  p_pago BOOLEAN DEFAULT false,
  p_data_pagamento DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  employee_id UUID,
  tipo_exame VARCHAR(30),
  data_agendamento DATE,
  data_realizacao DATE,
  data_vencimento DATE,
  status VARCHAR(20),
  medico_responsavel VARCHAR(255),
  clinica_local VARCHAR(255),
  observacoes TEXT,
  resultado VARCHAR(20),
  restricoes TEXT,
  anexos TEXT[],
  custo DECIMAL(10,2),
  pago BOOLEAN,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_exam_id UUID;
  exam_record RECORD;
BEGIN
  -- Verificar se a empresa existe
  IF NOT EXISTS (SELECT 1 FROM companies WHERE companies.id = p_company_id) THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  -- Verificar se o funcionário existe e pertence à empresa
  IF NOT EXISTS (
    SELECT 1 FROM rh.employees 
    WHERE rh.employees.id = p_employee_id AND rh.employees.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Funcionário não encontrado ou não pertence à empresa';
  END IF;

  -- Inserir o exame
  INSERT INTO rh.periodic_exams (
    company_id,
    employee_id,
    tipo_exame,
    data_agendamento,
    data_vencimento,
    status,
    medico_responsavel,
    clinica_local,
    observacoes,
    resultado,
    restricoes,
    anexos,
    custo,
    pago,
    data_pagamento
  ) VALUES (
    p_company_id,
    p_employee_id,
    p_tipo_exame,
    p_data_agendamento,
    p_data_vencimento,
    p_status,
    p_medico_responsavel,
    p_clinica_local,
    p_observacoes,
    p_resultado,
    p_restricoes,
    p_anexos,
    p_custo,
    p_pago,
    p_data_pagamento
  ) RETURNING * INTO exam_record;

  -- Retornar o exame criado
  RETURN QUERY SELECT * FROM rh.periodic_exams WHERE rh.periodic_exams.id = exam_record.id;
END;
$$;

-- Função para atualizar exame periódico
CREATE OR REPLACE FUNCTION update_periodic_exam(
  p_exam_id UUID,
  p_company_id UUID,
  p_employee_id UUID DEFAULT NULL,
  p_tipo_exame VARCHAR(30) DEFAULT NULL,
  p_data_agendamento DATE DEFAULT NULL,
  p_data_realizacao DATE DEFAULT NULL,
  p_data_vencimento DATE DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT NULL,
  p_medico_responsavel VARCHAR(255) DEFAULT NULL,
  p_clinica_local VARCHAR(255) DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_resultado VARCHAR(20) DEFAULT NULL,
  p_restricoes TEXT DEFAULT NULL,
  p_anexos TEXT[] DEFAULT NULL,
  p_custo DECIMAL(10,2) DEFAULT NULL,
  p_pago BOOLEAN DEFAULT NULL,
  p_data_pagamento DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  employee_id UUID,
  tipo_exame VARCHAR(30),
  data_agendamento DATE,
  data_realizacao DATE,
  data_vencimento DATE,
  status VARCHAR(20),
  medico_responsavel VARCHAR(255),
  clinica_local VARCHAR(255),
  observacoes TEXT,
  resultado VARCHAR(20),
  restricoes TEXT,
  anexos TEXT[],
  custo DECIMAL(10,2),
  pago BOOLEAN,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exam_record RECORD;
BEGIN
  -- Verificar se o exame existe e pertence à empresa
  IF NOT EXISTS (
    SELECT 1 FROM rh.periodic_exams 
    WHERE rh.periodic_exams.id = p_exam_id AND rh.periodic_exams.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Exame não encontrado ou não pertence à empresa';
  END IF;

  -- Atualizar apenas os campos fornecidos
  UPDATE rh.periodic_exams SET
    employee_id = COALESCE(p_employee_id, employee_id),
    tipo_exame = COALESCE(p_tipo_exame, tipo_exame),
    data_agendamento = COALESCE(p_data_agendamento, data_agendamento),
    data_realizacao = COALESCE(p_data_realizacao, data_realizacao),
    data_vencimento = COALESCE(p_data_vencimento, data_vencimento),
    status = COALESCE(p_status, status),
    medico_responsavel = COALESCE(p_medico_responsavel, medico_responsavel),
    clinica_local = COALESCE(p_clinica_local, clinica_local),
    observacoes = COALESCE(p_observacoes, observacoes),
    resultado = COALESCE(p_resultado, resultado),
    restricoes = COALESCE(p_restricoes, restricoes),
    anexos = COALESCE(p_anexos, anexos),
    custo = COALESCE(p_custo, custo),
    pago = COALESCE(p_pago, pago),
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    updated_at = NOW()
  WHERE rh.periodic_exams.id = p_exam_id
  RETURNING * INTO exam_record;

  -- Retornar o exame atualizado
  RETURN QUERY SELECT * FROM rh.periodic_exams WHERE rh.periodic_exams.id = p_exam_id;
END;
$$;

-- Função para deletar exame periódico
CREATE OR REPLACE FUNCTION delete_periodic_exam(
  p_exam_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o exame existe e pertence à empresa
  IF NOT EXISTS (
    SELECT 1 FROM rh.periodic_exams 
    WHERE rh.periodic_exams.id = p_exam_id AND rh.periodic_exams.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Exame não encontrado ou não pertence à empresa';
  END IF;

  -- Deletar o exame
  DELETE FROM rh.periodic_exams 
  WHERE rh.periodic_exams.id = p_exam_id AND rh.periodic_exams.company_id = p_company_id;

  RETURN TRUE;
END;
$$;

-- Função para listar exames periódicos com filtros
CREATE OR REPLACE FUNCTION list_periodic_exams(
  p_company_id UUID,
  p_employee_id UUID DEFAULT NULL,
  p_tipo_exame VARCHAR(30) DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT NULL,
  p_resultado VARCHAR(20) DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  tipo_exame VARCHAR(30),
  data_agendamento DATE,
  data_realizacao DATE,
  data_vencimento DATE,
  status VARCHAR(20),
  medico_responsavel VARCHAR(255),
  clinica_local VARCHAR(255),
  observacoes TEXT,
  resultado VARCHAR(20),
  restricoes TEXT,
  anexos TEXT[],
  custo DECIMAL(10,2),
  pago BOOLEAN,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.id,
    pe.company_id,
    pe.employee_id,
    e.nome as employee_name,
    pe.tipo_exame,
    pe.data_agendamento,
    pe.data_realizacao,
    pe.data_vencimento,
    pe.status,
    pe.medico_responsavel,
    pe.clinica_local,
    pe.observacoes,
    pe.resultado,
    pe.restricoes,
    pe.anexos,
    pe.custo,
    pe.pago,
    pe.data_pagamento,
    pe.created_at,
    pe.updated_at
  FROM rh.periodic_exams pe
  JOIN rh.employees e ON pe.employee_id = e.id
  WHERE pe.company_id = p_company_id
    AND (p_employee_id IS NULL OR pe.employee_id = p_employee_id)
    AND (p_tipo_exame IS NULL OR pe.tipo_exame = p_tipo_exame)
    AND (p_status IS NULL OR pe.status = p_status)
    AND (p_resultado IS NULL OR pe.resultado = p_resultado)
    AND (p_data_inicio IS NULL OR pe.data_agendamento >= p_data_inicio)
    AND (p_data_fim IS NULL OR pe.data_agendamento <= p_data_fim)
  ORDER BY pe.data_agendamento DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION create_periodic_exam TO authenticated;
GRANT EXECUTE ON FUNCTION update_periodic_exam TO authenticated;
GRANT EXECUTE ON FUNCTION delete_periodic_exam TO authenticated;
GRANT EXECUTE ON FUNCTION list_periodic_exams TO authenticated;
