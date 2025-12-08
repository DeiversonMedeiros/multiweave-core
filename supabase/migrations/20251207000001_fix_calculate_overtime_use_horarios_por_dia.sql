-- =====================================================
-- CORRIGIR CÁLCULO DE HORAS EXTRAS PARA USAR horarios_por_dia
-- E CALCULAR HORAS NEGATIVAS CORRETAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION rh.calculate_overtime_by_scale(
  p_time_record_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_diarias DECIMAL(4,2);
  v_tipo_escala VARCHAR(50);
  v_is_feriado BOOLEAN;
  v_is_domingo BOOLEAN;
  v_is_dia_folga BOOLEAN;
  v_horas_extras_50 DECIMAL(4,2) := 0;
  v_horas_extras_100 DECIMAL(4,2) := 0;
  v_horas_para_banco DECIMAL(4,2) := 0;
  v_horas_para_pagamento DECIMAL(4,2) := 0;
  v_excedente DECIMAL(4,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
BEGIN
  -- Buscar dados do registro
  SELECT 
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.horas_trabalhadas
  INTO 
    v_employee_id,
    v_company_id,
    v_date,
    v_horas_trabalhadas
  FROM rh.time_records tr
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular dia da semana (1=Segunda, 7=Domingo)
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- Buscar tipo de escala, turno e horas diárias
  SELECT 
    rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
    es.turno_id,
    ws.horas_diarias
  INTO 
    v_tipo_escala,
    v_work_shift_id,
    v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  -- Se não encontrou turno, usar padrão
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  -- Verificar se é feriado, domingo ou dia de folga
  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  -- Calcular excedente (pode ser positivo ou negativo)
  -- Se positivo = horas extras, se negativo = horas faltantes
  v_excedente := v_horas_trabalhadas - v_horas_diarias;

  -- Só calcular horas extras se houver excedente positivo
  -- Se negativo, não há horas extras (será tratado como falta)
  IF v_excedente > 0 THEN
    -- Aplicar regras por tipo de escala
    IF v_tipo_escala = 'escala_12x36' THEN
      -- ESCALA 12x36: Só existe excedente se romper 12h
      IF v_horas_trabalhadas > 12 THEN
        v_excedente := v_horas_trabalhadas - 12;
        -- Se é feriado trabalhado, pagar 100%
        IF v_is_feriado THEN
          v_horas_extras_100 := v_excedente;
          v_horas_para_pagamento := v_excedente;
        ELSE
          -- Horas extras normais vão para banco (50%)
          v_horas_extras_50 := v_excedente;
          v_horas_para_banco := v_excedente;
        END IF;
      END IF;
      
    ELSIF v_tipo_escala = 'flexivel_6x1' THEN
      -- ESCALA 6x1: Dia de folga ou feriado = 100%
      IF v_is_dia_folga OR v_is_feriado THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
      
    ELSE
      -- ESCALA 5x2 (fixa) ou outras: Domingo ou feriado = 100%
      IF v_is_domingo OR v_is_feriado THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Sábado em escala 5x2: vai para banco (50%)
        -- Horas extras normais: vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
    END IF;
  ELSE
    -- Se excedente é negativo ou zero, não há horas extras
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
  END IF;

  -- Atualizar registro
  -- horas_extras é a soma de horas_extras_50 + horas_extras_100 (para compatibilidade)
  UPDATE rh.time_records
  SET 
    horas_extras_50 = ROUND(v_horas_extras_50, 2),
    horas_extras_100 = ROUND(v_horas_extras_100, 2),
    horas_extras = ROUND(v_horas_extras_50 + v_horas_extras_100, 2),
    horas_para_banco = ROUND(v_horas_para_banco, 2),
    horas_para_pagamento = ROUND(v_horas_para_pagamento, 2),
    is_feriado = v_is_feriado,
    is_domingo = v_is_domingo,
    is_dia_folga = v_is_dia_folga
  WHERE id = p_time_record_id;

END;
$$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Calcula horas extras conforme tipo de escala e regras CLT.
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Agora considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   Só calcula horas extras se houver excedente positivo (trabalhou mais que o esperado).';

