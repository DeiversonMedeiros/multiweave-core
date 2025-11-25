-- =====================================================
-- CORREÇÃO: Permitir primeira solicitação sem 14 dias
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Ajusta a validação de criar_ferias_fracionadas para permitir
--            que na primeira solicitação (sem férias aprovadas), se tiver
--            apenas 1 período, não precisa ter 14 dias imediatamente

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
    
    -- Só validar data mínima se o período ainda está em andamento (status = 'pendente')
    -- Se o período já está completo (status = 'ativo' ou 'vencido'), pode solicitar a qualquer momento
    IF periodo_status = 'pendente' AND primeira_data_inicio <= periodo_data_fim THEN
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

COMMENT ON FUNCTION rh.criar_ferias_fracionadas IS 'Cria solicitação de férias fracionadas validando regras CLT: máximo 3 períodos, pelo menos um com 14+ dias (exceto primeira solicitação com 1 período), demais com mínimo 5 dias, total máximo 30 dias';

