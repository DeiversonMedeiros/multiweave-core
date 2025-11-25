-- =====================================================
-- CORREÇÃO DAS VALIDAÇÕES DE REGRAS CLT PARA FÉRIAS FRACIONADAS
-- =====================================================

-- Corrigir função criar_ferias_fracionadas para validar corretamente as regras da CLT
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
  periodo_data_fim DATE;
  periodo_status VARCHAR(20);
  has_long_period BOOLEAN := FALSE;
  dias_restantes_atual INTEGER;
  dias_ja_solicitados INTEGER := 0;
  primeira_data_inicio DATE;
BEGIN
  -- Validar se o funcionário tem direito a férias no ano
  -- Permitir períodos futuros (pendentes) para visualização, mas validar data de início
  SELECT ve.dias_restantes, ve.data_fim_periodo, ve.status
  INTO dias_restantes_atual, periodo_data_fim, periodo_status
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = p_employee_id 
    AND ve.ano_aquisitivo = p_ano;
    
  IF periodo_data_fim IS NULL THEN
    RAISE EXCEPTION 'Funcionário não possui direito a férias para o ano %', p_ano;
  END IF;
  
  -- Validar que a data de início das férias seja após o término do período aquisitivo
  -- O funcionário precisa ter completado 12 meses antes de iniciar as férias
  -- data_fim_periodo = último dia do período aquisitivo, então férias podem começar em data_fim_periodo + 1 dia
  IF jsonb_array_length(p_periodos) > 0 THEN
    primeira_data_inicio := (p_periodos->0->>'data_inicio')::DATE;
    
    -- Validar que a data de início seja após o término do período aquisitivo
    IF primeira_data_inicio <= periodo_data_fim THEN
      RAISE EXCEPTION 'A data de início das férias deve ser após o término do período aquisitivo. Período termina em %, férias podem começar a partir de %', 
        periodo_data_fim, periodo_data_fim + INTERVAL '1 day';
    END IF;
  END IF;

  -- Calcular dias já solicitados e aprovados para o mesmo ano
  SELECT COALESCE(SUM(v.dias_solicitados), 0) INTO dias_ja_solicitados
  FROM rh.vacations v
  WHERE v.employee_id = p_employee_id
    AND v.status IN ('aprovado', 'em_andamento', 'concluido')
    AND EXTRACT(YEAR FROM v.data_inicio) = p_ano
    AND v.tipo = 'ferias';

  -- Validar número de períodos (máximo 3)
  IF jsonb_array_length(p_periodos) > 3 THEN
    RAISE EXCEPTION 'Máximo de 3 períodos permitidos';
  END IF;

  IF jsonb_array_length(p_periodos) = 0 THEN
    RAISE EXCEPTION 'Pelo menos um período deve ser informado';
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
    -- O primeiro período pode ter qualquer quantidade, mas os demais devem ter no mínimo 5 dias
    IF periodo_count > 1 AND (periodo->>'dias_ferias')::INTEGER < 5 THEN
      RAISE EXCEPTION 'Período % inválido: mínimo de 5 dias por período (exceto o primeiro)', periodo_count;
    END IF;
    
    -- Verificar se pelo menos um período tem 14+ dias
    IF (periodo->>'dias_ferias')::INTEGER >= 14 THEN
      has_long_period := TRUE;
    END IF;
    
    total_dias := total_dias + (periodo->>'dias_ferias')::INTEGER;
  END LOOP;
  
  -- Validar que pelo menos um período tenha 14+ dias (REGRAS CLT)
  -- EXCEÇÃO: Na primeira solicitação (dias_ja_solicitados = 0), se tiver apenas 1 período, não precisa ter 14 dias
  -- O funcionário pode fazer mais solicitações depois
  IF NOT has_long_period THEN
    IF dias_ja_solicitados = 0 AND jsonb_array_length(p_periodos) = 1 THEN
      -- Primeira solicitação com apenas 1 período: permitir qualquer valor
      -- Não precisa ter 14 dias imediatamente
      NULL; -- Não fazer nada, permitir
    ELSIF jsonb_array_length(p_periodos) >= 2 THEN
      -- Se tiver 2+ períodos, pelo menos um deve ter 14+ dias
      RAISE EXCEPTION 'Pelo menos um período deve ter 14 ou mais dias consecutivos (regra CLT)';
    ELSE
      -- Já existem férias aprovadas e não há período com 14+ dias
      RAISE EXCEPTION 'Pelo menos um período (incluindo férias já aprovadas) deve ter 14 ou mais dias consecutivos (regra CLT)';
    END IF;
  END IF;
  
  -- Validar total de dias (máximo 30)
  IF total_dias > 30 THEN
    RAISE EXCEPTION 'Total de dias excede o limite de 30 dias';
  END IF;
  
  -- Validar se há dias suficientes disponíveis (considerando dias já solicitados)
  IF (total_dias + dias_ja_solicitados) > (dias_restantes_atual + dias_ja_solicitados) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%). Dias já utilizados: %', 
      total_dias, dias_restantes_atual, dias_ja_solicitados;
  END IF;
  
  -- Verificar se após esta solicitação ainda restarão dias suficientes para completar as regras CLT
  -- Se restarem menos de 14 dias, a solicitação deve usar todos os dias restantes
  IF (dias_restantes_atual - total_dias) > 0 AND (dias_restantes_atual - total_dias) < 14 THEN
    -- Aviso: restarão menos de 14 dias, mas não é um erro - pode ser a última solicitação
    -- A validação será feita no frontend para alertar o usuário
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
  periodo_count := 0;
  FOR periodo IN SELECT * FROM jsonb_array_elements(p_periodos)
  LOOP
    periodo_count := periodo_count + 1;
    
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
  END LOOP;

  RETURN vacation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Corrigir função aprovar_ferias para atualizar corretamente os dias gozados
CREATE OR REPLACE FUNCTION rh.aprovar_ferias(
  p_vacation_id UUID,
  p_aprovado_por UUID
) RETURNS BOOLEAN AS $$
DECLARE
  vacation_record RECORD;
  periodo RECORD;
  dias_gozados_calculados INTEGER := 0;
  dias_gozados_atuais INTEGER := 0;
  ano_aquisitivo INTEGER;
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
  
  -- Determinar o ano aquisitivo baseado na data de início
  -- Assumindo que o ano aquisitivo é passado ou pode ser determinado pela data
  -- Por enquanto, vamos usar o ano da data de início
  ano_aquisitivo := EXTRACT(YEAR FROM vacation_record.data_inicio);
  
  -- Calcular total de dias gozados (somando dias de férias de todos os períodos)
  SELECT COALESCE(SUM(dias_ferias), 0) INTO dias_gozados_calculados
  FROM rh.vacation_periods
  WHERE vacation_id = p_vacation_id;
  
  -- Buscar dias gozados atuais
  SELECT COALESCE(dias_gozados, 0) INTO dias_gozados_atuais
  FROM rh.vacation_entitlements
  WHERE employee_id = vacation_record.employee_id
    AND ano_aquisitivo = ano_aquisitivo
    AND status IN ('ativo', 'parcialmente_gozado');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período aquisitivo não encontrado para o funcionário e ano %', ano_aquisitivo;
  END IF;
  
  -- Verificar se há dias suficientes disponíveis
  IF dias_gozados_calculados > (30 - dias_gozados_atuais) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)', 
      dias_gozados_calculados, (30 - dias_gozados_atuais);
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'aprovado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW()
  WHERE id = p_vacation_id;
  
  -- Atualizar entitlement (CORRIGIDO: estava somando dias_gozados + dias_gozados)
  UPDATE rh.vacation_entitlements
  SET dias_gozados = dias_gozados_atuais + dias_gozados_calculados,
      status = CASE 
        WHEN (dias_gozados_atuais + dias_gozados_calculados) >= 30 THEN 'gozado'
        WHEN (dias_gozados_atuais + dias_gozados_calculados) > 0 THEN 'parcialmente_gozado'
        ELSE 'ativo'
      END,
      updated_at = NOW()
  WHERE employee_id = vacation_record.employee_id
    AND ano_aquisitivo = ano_aquisitivo
    AND status IN ('ativo', 'parcialmente_gozado');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar férias integrais (30 dias)
CREATE OR REPLACE FUNCTION rh.criar_ferias_integrais(
  p_company_id UUID,
  p_employee_id UUID,
  p_ano INTEGER,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_observacoes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  vacation_id UUID;
  dias_restantes_atual INTEGER;
  periodo_data_fim DATE;
  dias_calculados INTEGER;
BEGIN
  -- Validar se o funcionário tem direito a férias no ano
  -- Permitir períodos futuros (pendentes) para visualização, mas validar data de início
  SELECT ve.dias_restantes, ve.data_fim_periodo
  INTO dias_restantes_atual, periodo_data_fim
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = p_employee_id 
    AND ve.ano_aquisitivo = p_ano;
    
  IF periodo_data_fim IS NULL THEN
    RAISE EXCEPTION 'Funcionário não possui direito a férias para o ano %', p_ano;
  END IF;
  
  -- Validar que a data de início das férias seja após o término do período aquisitivo
  -- O funcionário precisa ter completado 12 meses antes de iniciar as férias
  -- data_fim_periodo = último dia do período aquisitivo, então férias podem começar em data_fim_periodo + 1 dia
  IF p_data_inicio <= periodo_data_fim THEN
    RAISE EXCEPTION 'A data de início das férias deve ser após o término do período aquisitivo. Período termina em %, férias podem começar a partir de %', 
      periodo_data_fim, periodo_data_fim + INTERVAL '1 day';
  END IF;
  
  -- Calcular dias entre as datas
  dias_calculados := (p_data_fim - p_data_inicio) + 1;
  
  -- Validar que são exatamente 30 dias (férias integrais)
  IF dias_calculados != 30 THEN
    RAISE EXCEPTION 'Férias integrais devem ter exatamente 30 dias. Dias calculados: %', dias_calculados;
  END IF;
  
  -- Validar se há dias suficientes disponíveis
  IF dias_calculados > dias_restantes_atual THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)', 
      dias_calculados, dias_restantes_atual;
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
    p_data_inicio,
    p_data_fim,
    dias_calculados,
    'pendente',
    p_observacoes
  ) RETURNING id INTO vacation_id;
  
  RETURN vacation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON FUNCTION rh.criar_ferias_fracionadas IS 'Cria solicitação de férias fracionadas validando regras CLT: máximo 3 períodos, pelo menos um com 14+ dias, demais com mínimo 5 dias, total máximo 30 dias';
COMMENT ON FUNCTION rh.criar_ferias_integrais IS 'Cria solicitação de férias integrais (30 dias) validando que o período aquisitivo foi completado (12 meses de trabalho)';
COMMENT ON FUNCTION rh.aprovar_ferias IS 'Aprova férias e atualiza corretamente os dias gozados no período aquisitivo';

