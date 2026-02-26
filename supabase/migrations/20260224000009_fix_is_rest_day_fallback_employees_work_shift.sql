-- =====================================================
-- CORREÇÃO: is_rest_day considerar employees.work_shift_id quando não há employee_shifts
-- =====================================================
-- Problema: Na aba "Resumo por Funcionário" (rh/time-records), para escalas fixas,
-- sábado (folga) e domingo (DSR) apareciam como "Falta" com horas negativas quando
-- o funcionário tem apenas employees.work_shift_id preenchido e não possui registro
-- em rh.employee_shifts. A função is_rest_day consultava só employee_shifts e
-- retornava false (dia útil) quando não encontrava linha.
-- Solução: Após buscar em employee_shifts, se não encontrar turno, buscar turno
-- diretamente em rh.employees (work_shift_id) + rh.work_shifts e aplicar a mesma
-- lógica de folga (escala fixa: dias_semana; escala rotativa: ciclo com data_inicio
-- inferida pela data de admissão quando disponível).
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
  -- 1) Buscar informações do turno via rh.employee_shifts (permite histórico por período)
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

  -- 2) Fallback: se não encontrou em employee_shifts, usar turno direto do funcionário (employees.work_shift_id)
  IF v_tipo_escala IS NULL THEN
    SELECT 
      ws.dias_semana,
      ws.tipo_escala,
      ws.dias_trabalho,
      ws.dias_folga,
      ws.ciclo_dias
    INTO 
      v_dias_semana,
      v_tipo_escala,
      v_dias_trabalho,
      v_dias_folga,
      v_ciclo_dias
    FROM rh.employees e
    INNER JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = p_employee_id
      AND e.company_id = p_company_id
      AND e.work_shift_id IS NOT NULL;

    -- Para fallback em escala rotativa, usar data de admissão como início do ciclo
    IF v_tipo_escala IS NOT NULL AND v_tipo_escala <> 'fixa' THEN
      SELECT e.data_admissao INTO v_data_inicio
      FROM rh.employees e
      WHERE e.id = p_employee_id AND e.company_id = p_company_id;
    ELSE
      v_data_inicio := NULL;
    END IF;
  END IF;

  -- Se ainda não encontrou turno, retornar false (não é folga)
  IF v_tipo_escala IS NULL THEN
    RETURN false;
  END IF;

  -- Para escalas fixas, usar lógica baseada em dias da semana
  IF v_tipo_escala = 'fixa' THEN
    -- Se não tem dias_semana definido, usar padrão (Segunda a Sexta = 1,2,3,4,5 → sábado 6 e domingo 7 são folga)
    IF v_dias_semana IS NULL OR array_length(v_dias_semana, 1) = 0 THEN
      v_dias_semana := ARRAY[1, 2, 3, 4, 5];
    END IF;

    -- Converter dia da semana (0=Domingo -> 7, 1=Segunda -> 1, ..., 6=Sábado -> 6)
    v_day_of_week := CASE 
      WHEN EXTRACT(DOW FROM p_date) = 0 THEN 7
      ELSE EXTRACT(DOW FROM p_date)::INTEGER
    END;

    -- Se o dia da semana não está nos dias de trabalho, é folga (sábado ou domingo na escala 5x2)
    RETURN NOT (v_day_of_week = ANY(v_dias_semana));
  ELSE
    -- Para escalas rotativas (flexíveis), calcular baseado no ciclo
    IF v_dias_trabalho IS NULL OR v_dias_trabalho = 0 THEN
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
          v_dias_trabalho := 5;
          v_dias_folga := 2;
          v_ciclo_dias := 7;
      END CASE;
    END IF;

    IF v_ciclo_dias IS NULL OR v_ciclo_dias = 0 THEN
      v_ciclo_dias := v_dias_trabalho + v_dias_folga;
    END IF;

    IF v_data_inicio IS NULL THEN
      v_data_inicio := p_date;
    END IF;

    v_dias_desde_inicio := p_date - v_data_inicio;
    IF v_dias_desde_inicio < 0 THEN
      RETURN false;
    END IF;

    v_posicao_no_ciclo := (v_dias_desde_inicio % v_ciclo_dias) + 1;
    RETURN v_posicao_no_ciclo > v_dias_trabalho;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rh.is_rest_day IS 
'Verifica se uma data é dia de folga para um funcionário. 
Suporta escalas fixas (dias da semana) e rotativas (ciclo).
Busca turno em rh.employee_shifts; se não houver, usa rh.employees.work_shift_id.';
