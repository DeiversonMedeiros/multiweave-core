-- =====================================================
-- CORREÇÃO: Função is_rest_day para suportar escalas rotativas
-- =====================================================
-- Data: 2026-01-10
-- Descrição: Atualiza a função is_rest_day para calcular corretamente
--            dias de folga em escalas rotativas (flexíveis) usando
--            a data de início do ciclo do funcionário
-- =====================================================

CREATE OR REPLACE FUNCTION rh.is_rest_day(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_dias_semana INTEGER[];
  v_day_of_week INTEGER;
  v_tipo_escala VARCHAR(50);
  v_dias_trabalho INTEGER;
  v_dias_folga INTEGER;
  v_ciclo_dias INTEGER;
  v_data_inicio DATE;
  v_dias_desde_inicio INTEGER;
  v_posicao_no_ciclo INTEGER;
BEGIN
  -- Buscar informações do turno do funcionário
  SELECT 
    ws.dias_semana,
    ws.tipo_escala,
    ws.dias_trabalho,
    ws.dias_folga,
    ws.ciclo_dias,
    es.data_inicio
  INTO 
    v_dias_semana,
    v_tipo_escala,
    v_dias_trabalho,
    v_dias_folga,
    v_ciclo_dias,
    v_data_inicio
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_date
    AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrou turno, retornar false
  IF v_tipo_escala IS NULL THEN
    RETURN false;
  END IF;

  -- Para escalas fixas, usar lógica baseada em dias da semana
  IF v_tipo_escala = 'fixa' THEN
    -- Se não tem dias_semana definido, usar padrão (Segunda a Sexta)
    IF v_dias_semana IS NULL OR array_length(v_dias_semana, 1) = 0 THEN
      v_dias_semana := ARRAY[1, 2, 3, 4, 5];
    END IF;

    -- Converter dia da semana (0=Domingo -> 7, 1=Segunda -> 1, etc.)
    v_day_of_week := CASE 
      WHEN EXTRACT(DOW FROM p_date) = 0 THEN 7
      ELSE EXTRACT(DOW FROM p_date)::INTEGER
    END;

    -- Se o dia da semana não está nos dias de trabalho, é folga
    RETURN NOT (v_day_of_week = ANY(v_dias_semana));
  ELSE
    -- Para escalas rotativas (flexíveis), calcular baseado no ciclo
    -- Usar valores padrão se não estiverem definidos
    IF v_dias_trabalho IS NULL OR v_dias_trabalho = 0 THEN
      -- Valores padrão baseados no tipo de escala
      CASE v_tipo_escala
        WHEN 'flexivel_6x1' THEN
          v_dias_trabalho := 6;
          v_dias_folga := 1;
          v_ciclo_dias := 7;
        WHEN 'flexivel_5x2' THEN
          v_dias_trabalho := 5;
          v_dias_folga := 2;
          v_ciclo_dias := 7;
        WHEN 'flexivel_4x3' THEN
          v_dias_trabalho := 4;
          v_dias_folga := 3;
          v_ciclo_dias := 7;
        WHEN 'escala_12x36' THEN
          v_dias_trabalho := 1;
          v_dias_folga := 2;
          v_ciclo_dias := 3;
        WHEN 'escala_24x48' THEN
          v_dias_trabalho := 1;
          v_dias_folga := 2;
          v_ciclo_dias := 3;
        ELSE
          -- Personalizada ou desconhecida: usar padrão 5x2
          v_dias_trabalho := 5;
          v_dias_folga := 2;
          v_ciclo_dias := 7;
      END CASE;
    END IF;

    -- Garantir que ciclo_dias está definido
    IF v_ciclo_dias IS NULL OR v_ciclo_dias = 0 THEN
      v_ciclo_dias := v_dias_trabalho + v_dias_folga;
    END IF;

    -- Se não tem data_inicio, usar a data atual como referência
    -- (não ideal, mas melhor que retornar erro)
    IF v_data_inicio IS NULL THEN
      v_data_inicio := p_date;
    END IF;

    -- Calcular quantos dias se passaram desde o início do ciclo
    v_dias_desde_inicio := p_date - v_data_inicio;

    -- Se a data é anterior ao início do turno, não é folga (não deveria acontecer, mas por segurança)
    IF v_dias_desde_inicio < 0 THEN
      RETURN false;
    END IF;

    -- Calcular a posição no ciclo (1 = primeiro dia do ciclo)
    -- Usar módulo para encontrar a posição no ciclo atual
    -- Exemplo: se ciclo é 7 dias e se passaram 10 dias, posição = (10 % 7) + 1 = 4
    v_posicao_no_ciclo := (v_dias_desde_inicio % v_ciclo_dias) + 1;

    -- Se a posição está dentro dos dias de trabalho, não é folga
    -- Se está além dos dias de trabalho, é folga
    RETURN v_posicao_no_ciclo > v_dias_trabalho;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION rh.is_rest_day IS 
'Verifica se uma data é dia de folga para um funcionário. 
Suporta escalas fixas (baseado em dias da semana) e escalas rotativas (baseado em ciclos).
Para escalas rotativas, calcula a posição no ciclo a partir da data de início do turno do funcionário.';
