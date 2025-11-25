-- =====================================================
-- ATUALIZAR FUNÇÕES DE FERIADOS PARA CONSIDERAR LOCALIZAÇÃO
-- Data: 2025-11-11
-- Descrição: Atualiza funções que verificam feriados para considerar
--            a localização do funcionário (estado e município)
-- =====================================================

-- Função auxiliar para verificar se um feriado se aplica a um funcionário
-- baseado na localização do funcionário
CREATE OR REPLACE FUNCTION rh.holiday_applies_to_employee(
  holiday_record rh.holidays,
  employee_estado VARCHAR(2),
  employee_cidade VARCHAR(100)
) RETURNS BOOLEAN AS $$
BEGIN
  -- Feriados nacionais se aplicam a todos
  IF holiday_record.tipo = 'nacional' THEN
    RETURN true;
  END IF;
  
  -- Feriados estaduais se aplicam apenas se o estado do funcionário corresponder
  IF holiday_record.tipo = 'estadual' THEN
    RETURN holiday_record.uf IS NOT NULL 
      AND employee_estado IS NOT NULL 
      AND UPPER(TRIM(holiday_record.uf)) = UPPER(TRIM(employee_estado));
  END IF;
  
  -- Feriados municipais se aplicam apenas se estado E município corresponderem
  IF holiday_record.tipo = 'municipal' THEN
    RETURN holiday_record.uf IS NOT NULL 
      AND holiday_record.municipio IS NOT NULL
      AND employee_estado IS NOT NULL 
      AND employee_cidade IS NOT NULL
      AND UPPER(TRIM(holiday_record.uf)) = UPPER(TRIM(employee_estado))
      AND UPPER(TRIM(holiday_record.municipio)) = UPPER(TRIM(employee_cidade));
  END IF;
  
  -- Para outros tipos (pontos_facultativos, outros), considerar como nacionais
  -- ou implementar lógica específica conforme necessário
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar função de cálculo de dias trabalhados para considerar localização
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
  employee_estado VARCHAR(2);
  employee_cidade VARCHAR(100);
BEGIN
  -- Buscar escala de trabalho e localização do funcionário
  SELECT 
    e.work_shift_id,
    e.estado,
    e.cidade,
    ws.dias_semana,
    ws.tipo_escala,
    ws.dias_trabalho,
    ws.dias_folga,
    ws.ciclo_dias
  INTO 
    employee_shift_id,
    employee_estado,
    employee_cidade,
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
      is_work_day := true; -- Por enquanto, considerar todos os dias
    END IF;

    -- Se é dia de trabalho, verificar exclusões
    IF is_work_day THEN
      -- Verificar se é feriado considerando localização do funcionário
      SELECT EXISTS(
        SELECT 1 
        FROM rh.holidays h
        WHERE h.company_id = company_id_param
          AND h.data = check_date
          AND h.ativo = true
          AND rh.holiday_applies_to_employee(h, employee_estado, employee_cidade)
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
      SELECT EXISTS(
        SELECT 1 
        FROM rh.medical_certificates mc
        WHERE mc.employee_id = employee_id_param
          AND mc.company_id = company_id_param
          AND check_date >= mc.data_inicio
          AND check_date <= mc.data_fim
          AND mc.tipo = 'licenca_medica'
          AND mc.status = 'aprovado'
      ) INTO is_medical_leave;

      -- Contar apenas se não for feriado, férias ou licença médica
      IF NOT is_holiday AND NOT is_vacation AND NOT is_medical_leave THEN
        total_working_days := total_working_days + 1;
      END IF;
    END IF;

    check_date := check_date + INTERVAL '1 day';
  END LOOP;

  RETURN total_working_days;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON FUNCTION rh.holiday_applies_to_employee IS 'Verifica se um feriado se aplica a um funcionário baseado na localização (estado e município)';
COMMENT ON FUNCTION calculate_working_days_for_benefits IS 'Calcula dias trabalhados considerando feriados baseados na localização do funcionário';

