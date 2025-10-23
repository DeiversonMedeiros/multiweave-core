-- =====================================================
-- FUNÇÕES RPC PARA SISTEMA DE FÉRIAS
-- =====================================================

-- Função para buscar anos de férias disponíveis
CREATE OR REPLACE FUNCTION rh.buscar_anos_ferias_disponiveis(
  employee_id_param UUID
) RETURNS TABLE (
  ano INTEGER,
  dias_disponiveis INTEGER,
  dias_gozados INTEGER,
  dias_restantes INTEGER,
  status TEXT,
  data_vencimento DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ve.ano_aquisitivo as ano,
    ve.dias_disponiveis,
    ve.dias_gozados,
    ve.dias_restantes,
    ve.status,
    ve.data_vencimento
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = employee_id_param
    AND ve.status IN ('ativo', 'parcialmente_gozado')
  ORDER BY ve.ano_aquisitivo DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar férias fracionadas
CREATE OR REPLACE FUNCTION rh.criar_ferias_fracionadas(
  p_company_id UUID,
  p_employee_id UUID,
  p_ano INTEGER,
  p_periodos JSONB,
  p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  vacation_id UUID;
  periodo JSONB;
  total_dias INTEGER := 0;
  periodo_count INTEGER := 0;
  periodo_data JSONB;
BEGIN
  -- Validar se o funcionário tem direito a férias no ano
  IF NOT EXISTS (
    SELECT 1 FROM rh.vacation_entitlements 
    WHERE employee_id = p_employee_id 
      AND ano_aquisitivo = p_ano 
      AND status IN ('ativo', 'parcialmente_gozado')
  ) THEN
    RAISE EXCEPTION 'Funcionário não possui direito a férias para o ano %', p_ano;
  END IF;

  -- Validar número de períodos (máximo 3)
  IF jsonb_array_length(p_periodos) > 3 THEN
    RAISE EXCEPTION 'Máximo de 3 períodos permitidos';
  END IF;

  -- Validar cada período
  FOR periodo IN SELECT * FROM jsonb_array_elements(p_periodos)
  LOOP
    periodo_count := periodo_count + 1;
    
    -- Validar dados do período
    IF NOT (periodo ? 'data_inicio' AND periodo ? 'data_fim' AND periodo ? 'dias_ferias') THEN
      RAISE EXCEPTION 'Período % inválido: dados obrigatórios ausentes', periodo_count;
    END IF;
    
    -- Validar datas
    IF (periodo->>'data_fim')::DATE < (periodo->>'data_inicio')::DATE THEN
      RAISE EXCEPTION 'Período % inválido: data fim anterior à data início', periodo_count;
    END IF;
    
    -- Validar dias de férias
    IF (periodo->>'dias_ferias')::INTEGER <= 0 THEN
      RAISE EXCEPTION 'Período % inválido: dias de férias deve ser maior que zero', periodo_count;
    END IF;
    
    -- Validar mínimo de dias por período (exceto o primeiro)
    IF periodo_count > 1 AND (periodo->>'dias_ferias')::INTEGER < 5 THEN
      RAISE EXCEPTION 'Período % inválido: mínimo de 5 dias por período', periodo_count;
    END IF;
    
    -- Validar que pelo menos um período tenha 14+ dias
    IF (periodo->>'dias_ferias')::INTEGER >= 14 THEN
      -- OK, pelo menos um período tem 14+ dias
    END IF;
    
    total_dias := total_dias + (periodo->>'dias_ferias')::INTEGER;
  END LOOP;
  
  -- Validar total de dias (máximo 30)
  IF total_dias > 30 THEN
    RAISE EXCEPTION 'Total de dias excede o limite de 30 dias';
  END IF;
  
  -- Verificar se há dias suficientes disponíveis
  IF total_dias > (
    SELECT dias_restantes FROM rh.vacation_entitlements 
    WHERE employee_id = p_employee_id AND ano_aquisitivo = p_ano
  ) THEN
    RAISE EXCEPTION 'Dias solicitados excedem os dias disponíveis';
  END IF;

  -- Criar registro de férias
  INSERT INTO rh.vacations (
    employee_id,
    company_id,
    tipo,
    data_inicio,
    data_fim,
    dias_solicitados,
    status,
    observacoes
  ) VALUES (
    p_employee_id,
    p_company_id,
    'ferias',
    (p_periodos->0->>'data_inicio')::DATE,
    (p_periodos->-1->>'data_fim')::DATE,
    total_dias,
    'pendente',
    p_observacoes
  ) RETURNING id INTO vacation_id;

  -- Criar períodos de férias
  FOR periodo IN SELECT * FROM jsonb_array_elements(p_periodos)
  LOOP
    INSERT INTO rh.vacation_periods (
      vacation_id,
      data_inicio,
      data_fim,
      dias_ferias,
      dias_abono,
      periodo_numero,
      observacoes
    ) VALUES (
      vacation_id,
      (periodo->>'data_inicio')::DATE,
      (periodo->>'data_fim')::DATE,
      (periodo->>'dias_ferias')::INTEGER,
      COALESCE((periodo->>'dias_abono')::INTEGER, 0),
      periodo_count,
      periodo->>'observacoes'
    );
    
    periodo_count := periodo_count + 1;
  END LOOP;

  RETURN vacation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular dias de férias disponíveis
CREATE OR REPLACE FUNCTION rh.calcular_dias_ferias_disponiveis(
  p_employee_id UUID,
  p_ano INTEGER
) RETURNS INTEGER AS $$
DECLARE
  dias_disponiveis INTEGER;
BEGIN
  SELECT dias_restantes INTO dias_disponiveis
  FROM rh.vacation_entitlements
  WHERE employee_id = p_employee_id 
    AND ano_aquisitivo = p_ano
    AND status IN ('ativo', 'parcialmente_gozado');
  
  RETURN COALESCE(dias_disponiveis, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar férias
CREATE OR REPLACE FUNCTION rh.aprovar_ferias(
  p_vacation_id UUID,
  p_aprovado_por UUID
) RETURNS BOOLEAN AS $$
DECLARE
  vacation_record RECORD;
  periodo RECORD;
  dias_gozados INTEGER := 0;
BEGIN
  -- Buscar dados da férias
  SELECT * INTO vacation_record
  FROM rh.vacations
  WHERE id = p_vacation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias não encontrada';
  END IF;
  
  IF vacation_record.status != 'pendente' THEN
    RAISE EXCEPTION 'Férias já foi processada';
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'aprovado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW()
  WHERE id = p_vacation_id;
  
  -- Calcular total de dias gozados
  SELECT SUM(dias_ferias) INTO dias_gozados
  FROM rh.vacation_periods
  WHERE vacation_id = p_vacation_id;
  
  -- Atualizar entitlement
  UPDATE rh.vacation_entitlements
  SET dias_gozados = dias_gozados + dias_gozados,
      updated_at = NOW()
  WHERE employee_id = vacation_record.employee_id
    AND ano_aquisitivo = EXTRACT(YEAR FROM vacation_record.data_inicio);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar férias
CREATE OR REPLACE FUNCTION rh.rejeitar_ferias(
  p_vacation_id UUID,
  p_aprovado_por UUID,
  p_motivo_rejeicao TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE rh.vacations
  SET status = 'rejeitado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW(),
      observacoes = COALESCE(p_motivo_rejeicao, observacoes)
  WHERE id = p_vacation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar férias pendentes de aprovação
CREATE OR REPLACE FUNCTION rh.buscar_ferias_pendentes(
  p_company_id UUID
) RETURNS TABLE (
  id UUID,
  employee_id UUID,
  employee_nome TEXT,
  data_inicio DATE,
  data_fim DATE,
  dias_solicitados INTEGER,
  tipo VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.employee_id,
    e.nome as employee_nome,
    v.data_inicio,
    v.data_fim,
    v.dias_solicitados,
    v.tipo,
    v.observacoes,
    v.created_at
  FROM rh.vacations v
  JOIN rh.employees e ON e.id = v.employee_id
  WHERE v.company_id = p_company_id
    AND v.status = 'pendente'
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
