-- =====================================================
-- FUNÇÃO DE CÁLCULO DE DIAS TRABALHADOS PARA BENEFÍCIOS
-- =====================================================
-- Data: 2025-11-03
-- Descrição: Calcula dias trabalhados reais considerando escala, feriados, férias e licença médica

-- Função para calcular dias trabalhados reais de um funcionário em um período
-- Exclui: feriados, férias, licença médica (não atestado)
CREATE OR REPLACE FUNCTION calculate_working_days_for_benefits(
  company_id_param UUID,
  employee_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
) RETURNS INTEGER AS $$
DECLARE
  total_working_days INTEGER := 0;
  check_date DATE;
  is_work_day BOOLEAN;
  is_holiday BOOLEAN;
  is_vacation BOOLEAN;
  is_medical_leave BOOLEAN;
  employee_shift_id UUID;
  shift_dias_semana INTEGER[];
  shift_tipo_escala VARCHAR(50);
  shift_dias_trabalho INTEGER;
  shift_dias_folga INTEGER;
  shift_ciclo_dias INTEGER;
  day_of_week INTEGER;
BEGIN
  -- Buscar escala de trabalho do funcionário
  SELECT 
    e.work_shift_id,
    ws.dias_semana,
    ws.tipo_escala,
    ws.dias_trabalho,
    ws.dias_folga,
    ws.ciclo_dias
  INTO 
    employee_shift_id,
    shift_dias_semana,
    shift_tipo_escala,
    shift_dias_trabalho,
    shift_dias_folga,
    shift_ciclo_dias
  FROM rh.employees e
  LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
  WHERE e.id = employee_id_param
    AND e.company_id = company_id_param;

  -- Se não tem escala, usar padrão (Segunda a Sexta)
  IF employee_shift_id IS NULL THEN
    shift_dias_semana := ARRAY[1, 2, 3, 4, 5];
    shift_tipo_escala := 'fixa';
    shift_dias_trabalho := 5;
    shift_dias_folga := 2;
    shift_ciclo_dias := 7;
  END IF;

  -- Se dias_semana está NULL, usar padrão
  IF shift_dias_semana IS NULL OR array_length(shift_dias_semana, 1) = 0 THEN
    shift_dias_semana := ARRAY[1, 2, 3, 4, 5];
  END IF;

  -- Iterar sobre cada dia do período
  check_date := start_date_param;
  
  WHILE check_date <= end_date_param LOOP
    -- Verificar se é dia de trabalho (baseado na escala)
    is_work_day := false;
    
    IF shift_tipo_escala = 'fixa' THEN
      -- Para escala fixa, verificar se o dia da semana está nos dias de trabalho
      -- PostgreSQL: 0=Domingo, 1=Segunda, ..., 6=Sábado
      -- Nosso sistema: 1=Segunda, 2=Terça, ..., 7=Domingo
      day_of_week := EXTRACT(DOW FROM check_date);
      IF day_of_week = 0 THEN
        day_of_week := 7; -- Converter Domingo para 7
      END IF;
      
      is_work_day := day_of_week = ANY(shift_dias_semana);
    ELSE
      -- Para escala rotativa, usar cálculo proporcional
      -- Simplificado: considerar todos os dias como trabalho para cálculo proporcional
      -- Em uma implementação mais complexa, poderia calcular o ciclo exato
      is_work_day := true; -- Por enquanto, considerar todos os dias
    END IF;

    -- Se é dia de trabalho, verificar exclusões
    IF is_work_day THEN
      -- Verificar se é feriado
      SELECT EXISTS(
        SELECT 1 
        FROM rh.holidays h
        WHERE h.company_id = company_id_param
          AND h.data = check_date
          AND h.ativo = true
      ) INTO is_holiday;

      -- Verificar se está em férias
      SELECT EXISTS(
        SELECT 1 
        FROM rh.vacations v
        WHERE v.employee_id = employee_id_param
          AND v.company_id = company_id_param
          AND check_date >= v.data_inicio
          AND check_date <= v.data_fim
          AND v.status IN ('aprovado', 'em_andamento', 'concluido')
      ) INTO is_vacation;

      -- Verificar se está em licença médica (não atestado)
      -- Licença médica é diferente de atestado médico
      -- Atestado médico está em medical_certificates e NÃO deve descontar se for atestado simples
      -- Para licença médica, vamos considerar apenas afastamentos longos (mais de 15 dias)
      -- que são considerados licença médica, não simples atestado
      SELECT EXISTS(
        SELECT 1 
        FROM rh.medical_certificates mc
        WHERE mc.employee_id = employee_id_param
          AND mc.company_id = company_id_param
          AND mc.dias_afastamento > 15  -- Licença médica é considerada afastamento longo
          AND mc.status = 'aprovado'
          AND check_date >= mc.data_inicio
          AND check_date <= mc.data_fim
      ) INTO is_medical_leave;

      -- Se não é feriado, não está em férias e não está em licença médica, contar como dia trabalhado
      IF NOT is_holiday AND NOT is_vacation AND NOT is_medical_leave THEN
        total_working_days := total_working_days + 1;
      END IF;
    END IF;

    -- Avançar para o próximo dia
    check_date := check_date + INTERVAL '1 day';
  END LOOP;

  RETURN total_working_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular valor do benefício baseado em dias trabalhados
CREATE OR REPLACE FUNCTION calculate_daily_benefit_value(
  company_id_param UUID,
  employee_id_param UUID,
  benefit_config_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  working_days INTEGER;
  daily_value DECIMAL(10,2);
  total_value DECIMAL(10,2);
BEGIN
  -- Buscar valor diário do benefício
  SELECT bc.base_value
  INTO daily_value
  FROM rh.benefit_configurations bc
  WHERE bc.id = benefit_config_id_param
    AND bc.company_id = company_id_param
    AND bc.calculation_type = 'daily_value'
    AND bc.is_active = true;

  -- Se não encontrou ou não é daily_value, retornar 0
  IF daily_value IS NULL THEN
    RETURN 0;
  END IF;

  -- Calcular dias trabalhados reais
  SELECT calculate_working_days_for_benefits(
    company_id_param,
    employee_id_param,
    start_date_param,
    end_date_param
  ) INTO working_days;

  -- Calcular valor total
  total_value := daily_value * working_days;

  RETURN total_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION calculate_working_days_for_benefits IS 'Calcula dias trabalhados reais considerando escala, feriados, férias e licença médica (não atestado)';
COMMENT ON FUNCTION calculate_daily_benefit_value IS 'Calcula valor do benefício diário baseado em dias trabalhados reais';

