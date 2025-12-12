-- =====================================================
-- ADICIONAR SUPORTE A HORÁRIOS POR DIA DA SEMANA
-- Permite configurar horários diferentes para cada dia da semana
-- =====================================================

-- Adicionar campo JSONB para armazenar horários por dia da semana
ALTER TABLE rh.work_shifts 
ADD COLUMN IF NOT EXISTS horarios_por_dia JSONB DEFAULT NULL;

-- Estrutura esperada do JSONB:
-- {
--   "1": { "hora_inicio": "08:00", "hora_fim": "18:00", "intervalo_inicio": "12:00", "intervalo_fim": "13:00", "horas_diarias": 9.0 },
--   "2": { "hora_inicio": "08:00", "hora_fim": "18:00", "intervalo_inicio": "12:00", "intervalo_fim": "13:00", "horas_diarias": 9.0 },
--   "3": { "hora_inicio": "08:00", "hora_fim": "18:00", "intervalo_inicio": "12:00", "intervalo_fim": "13:00", "horas_diarias": 9.0 },
--   "4": { "hora_inicio": "08:00", "hora_fim": "18:00", "intervalo_inicio": "12:00", "intervalo_fim": "13:00", "horas_diarias": 9.0 },
--   "5": { "hora_inicio": "08:00", "hora_fim": "17:00", "intervalo_inicio": "12:00", "intervalo_fim": "13:00", "horas_diarias": 8.0 }
-- }
-- Onde: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado, 7=Domingo

-- Criar função auxiliar para obter horário de um dia específico
CREATE OR REPLACE FUNCTION rh.get_work_shift_hours_for_day(
  p_work_shift_id UUID,
  p_day_of_week INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_horarios_por_dia JSONB;
  v_day_hours JSONB;
  v_hora_inicio TIME;
  v_hora_fim TIME;
  v_intervalo_inicio TIME;
  v_intervalo_fim TIME;
  v_horas_diarias NUMERIC(4,2);
BEGIN
  -- Buscar horários por dia do turno
  SELECT horarios_por_dia, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias
  INTO v_horarios_por_dia, v_hora_inicio, v_hora_fim, v_intervalo_inicio, v_intervalo_fim, v_horas_diarias
  FROM rh.work_shifts
  WHERE id = p_work_shift_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Se existe horário específico para o dia, retornar
  IF v_horarios_por_dia IS NOT NULL AND v_horarios_por_dia ? p_day_of_week::TEXT THEN
    v_day_hours := v_horarios_por_dia->p_day_of_week::TEXT;
    RETURN v_day_hours;
  END IF;

  -- Caso contrário, retornar horário padrão
  RETURN jsonb_build_object(
    'hora_inicio', v_hora_inicio::TEXT,
    'hora_fim', v_hora_fim::TEXT,
    'intervalo_inicio', COALESCE(v_intervalo_inicio::TEXT, NULL),
    'intervalo_fim', COALESCE(v_intervalo_fim::TEXT, NULL),
    'horas_diarias', v_horas_diarias
  );
END;
$$;

-- Criar função para calcular horas semanais totais baseado em horarios_por_dia
CREATE OR REPLACE FUNCTION rh.calculate_work_shift_weekly_hours(p_work_shift_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_horarios_por_dia JSONB;
  v_dias_semana INTEGER[];
  v_total_horas NUMERIC(5,2) := 0;
  v_dia INTEGER;
  v_day_hours JSONB;
  v_horas_diarias NUMERIC(4,2);
BEGIN
  -- Buscar horários por dia e dias da semana do turno
  SELECT horarios_por_dia, dias_semana
  INTO v_horarios_por_dia, v_dias_semana
  FROM rh.work_shifts
  WHERE id = p_work_shift_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Se existe horarios_por_dia, calcular baseado neles
  IF v_horarios_por_dia IS NOT NULL THEN
    FOREACH v_dia IN ARRAY v_dias_semana
    LOOP
      IF v_horarios_por_dia ? v_dia::TEXT THEN
        v_day_hours := v_horarios_por_dia->v_dia::TEXT;
        v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, 0);
        v_total_horas := v_total_horas + v_horas_diarias;
      END IF;
    END LOOP;
  ELSE
    -- Caso contrário, usar horas_diarias padrão multiplicado pelos dias
    SELECT horas_diarias * array_length(dias_semana, 1)
    INTO v_total_horas
    FROM rh.work_shifts
    WHERE id = p_work_shift_id;
  END IF;

  RETURN COALESCE(v_total_horas, 0);
END;
$$;

-- Comentários
COMMENT ON COLUMN rh.work_shifts.horarios_por_dia IS 'JSONB com horários específicos por dia da semana. Chave é o número do dia (1=Segunda, 7=Domingo). Cada valor contém: hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias';
COMMENT ON FUNCTION rh.get_work_shift_hours_for_day IS 'Retorna os horários de um turno para um dia específico da semana. Se não houver horário específico, retorna o horário padrão';
COMMENT ON FUNCTION rh.calculate_work_shift_weekly_hours IS 'Calcula o total de horas semanais de um turno considerando horários por dia';









