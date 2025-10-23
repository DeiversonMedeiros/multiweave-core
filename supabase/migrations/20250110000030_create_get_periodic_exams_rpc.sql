-- =====================================================
-- FUNÇÃO RPC PARA BUSCAR EXAMES PERIÓDICOS
-- =====================================================

CREATE OR REPLACE FUNCTION get_periodic_exams(
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
  LEFT JOIN rh.employees e ON pe.employee_id = e.id
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

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_periodic_exams TO authenticated;
