-- =====================================================
-- CORREÇÃO: Erro ORDER BY com MIN/MAX em recalculate_time_record_hours
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Remove ORDER BY e LIMIT de queries que usam MIN/MAX
--            (funções agregadas não podem usar ORDER BY na mesma query)
-- =====================================================

CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_faltas numeric(4,2);
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_entrada_extra1 TIME;
  v_saida_extra1 TIME;
  v_horas_trabalhadas numeric(4,2);
  v_horas_diarias numeric(4,2);
  v_horas_extra_window numeric(4,2) := 0;
  v_diferenca_horas numeric(4,2);
  v_requer_registro_ponto boolean := true;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  -- NOVO: Variáveis auxiliares para construção de timestamps
  v_timezone text := 'America/Sao_Paulo';
  -- Variáveis auxiliares para fallback (usadas em blocos condicionais)
  v_entrada_date_use date;
  v_saida_date_use date;
  v_entrada_almoco_date_use date;
  v_saida_almoco_date_use date;
  v_entrada_extra1_date_use date;
  v_saida_extra1_date_use date;
  -- NOVO: Variáveis para event_at completo (TIMESTAMPTZ)
  v_entrada_event_at timestamptz;
  v_saida_event_at timestamptz;
  v_entrada_almoco_event_at timestamptz;
  v_saida_almoco_event_at timestamptz;
  v_entrada_extra1_event_at timestamptz;
  v_saida_extra1_event_at timestamptz;
  -- Variáveis para campos *_date (fallback)
  v_entrada_date date;
  v_saida_date date;
  v_entrada_almoco_date date;
  v_saida_almoco_date date;
  v_entrada_extra1_date date;
  v_saida_extra1_date date;
  -- Variáveis para cálculo de horas noturnas
  v_entrada_date_for_night date;
  v_saida_date_for_night date;
  v_horas_noturnas numeric(4,2) := 0;
  v_work_shift_id UUID;
  v_tipo_escala VARCHAR(50);
BEGIN
  SELECT tr.employee_id, tr.company_id, tr.data_registro, tr.horas_faltas,
         COALESCE(e.requer_registro_ponto, true)
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas, v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular dia da semana
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- Buscar turno
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

  -- Se não encontrou via employee_shifts, buscar via employees.work_shift_id
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT 
      rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
      e.work_shift_id,
      ws.horas_diarias
    INTO 
      v_tipo_escala,
      v_work_shift_id,
      v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = v_employee_id
      AND e.company_id = v_company_id;
  END IF;

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  -- CORREÇÃO: Se ainda não encontrou horas_diarias, tentar buscar do turno diretamente
  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias
    INTO v_horas_diarias
    FROM rh.work_shifts
    WHERE id = v_work_shift_id;
  END IF;

  -- Se não encontrar turno, usar 8.0 como padrão
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: Buscar event_at completo (TIMESTAMPTZ)
  -- =====================================================
  -- CORREÇÃO: Remover ORDER BY e LIMIT quando usando MIN/MAX (funções agregadas)
  SELECT MIN(event_at)
  INTO v_entrada_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada';

  SELECT MAX(event_at)
  INTO v_saida_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida';

  SELECT MIN(event_at)
  INTO v_entrada_almoco_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco';

  SELECT MAX(event_at)
  INTO v_saida_almoco_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco';

  SELECT MIN(event_at)
  INTO v_entrada_extra1_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio';

  SELECT MAX(event_at)
  INTO v_saida_extra1_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim';

  -- =====================================================
  -- FALLBACK 1: Calcular campos *_date a partir dos eventos
  -- =====================================================
  -- Calcular datas a partir dos event_at quando disponíveis
  -- (campos *_date não existem como colunas na tabela, são calculados)
  IF v_entrada_event_at IS NOT NULL THEN
    v_entrada_date := (v_entrada_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_saida_event_at IS NOT NULL THEN
    v_saida_date := (v_saida_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_entrada_almoco_event_at IS NOT NULL THEN
    v_entrada_almoco_date := (v_entrada_almoco_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_saida_almoco_event_at IS NOT NULL THEN
    v_saida_almoco_date := (v_saida_almoco_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_entrada_extra1_event_at IS NOT NULL THEN
    v_entrada_extra1_date := (v_entrada_extra1_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_saida_extra1_event_at IS NOT NULL THEN
    v_saida_extra1_date := (v_saida_extra1_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  -- =====================================================
  -- Buscar TIME para atualizar campos na tabela time_records
  -- (mantido para compatibilidade e exibição)
  -- =====================================================
  IF v_entrada_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_almoco_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_almoco_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_extra1_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_extra1_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  -- =====================================================
  -- FALLBACK 2: Se não houver eventos nem campos *_date, usar dados existentes
  -- =====================================================
  IF v_entrada IS NULL OR v_saida IS NULL THEN
    SELECT entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1
    INTO v_entrada, v_saida, v_entrada_almoco, v_saida_almoco, v_entrada_extra1, v_saida_extra1
    FROM rh.time_records
    WHERE id = p_time_record_id;
  END IF;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: Calcular horas trabalhadas usando event_at completo
  -- =====================================================
  IF v_entrada_event_at IS NOT NULL AND v_saida_event_at IS NOT NULL THEN
    -- Usar event_at completo para cálculo preciso
    v_horas_trabalhadas := ROUND(
      EXTRACT(EPOCH FROM (v_saida_event_at - v_entrada_event_at)) / 3600,
      2
    );
    
    -- Subtrair intervalo de almoço se houver
    IF v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas - ROUND(
        EXTRACT(EPOCH FROM (v_saida_almoco_event_at - v_entrada_almoco_event_at)) / 3600,
        2
      );
    END IF;
    
    -- Adicionar horas extras se houver
    IF v_entrada_extra1_event_at IS NOT NULL AND v_saida_extra1_event_at IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas + ROUND(
        EXTRACT(EPOCH FROM (v_saida_extra1_event_at - v_entrada_extra1_event_at)) / 3600,
        2
      );
    END IF;
    
  ELSE
    -- FALLBACK: Usar campos *_date quando disponíveis
    IF v_entrada_date IS NOT NULL AND v_saida_date IS NOT NULL AND v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
      -- Usar campos *_date para construir timestamps
      v_entrada_date_use := v_entrada_date;
      v_saida_date_use := v_saida_date;
      
      -- Calcular horas trabalhadas usando timestamps construídos
      v_horas_trabalhadas := ROUND(
        EXTRACT(EPOCH FROM (
          (v_saida_date_use + v_saida)::timestamp - 
          (v_entrada_date_use + v_entrada)::timestamp
        )) / 3600,
        2
      );
      
      -- Subtrair intervalo de almoço se houver
      IF v_entrada_almoco_date IS NOT NULL AND v_saida_almoco_date IS NOT NULL 
         AND v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
        v_entrada_almoco_date_use := v_entrada_almoco_date;
        v_saida_almoco_date_use := v_saida_almoco_date;
        
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(
          EXTRACT(EPOCH FROM (
            (v_saida_almoco_date_use + v_saida_almoco)::timestamp - 
            (v_entrada_almoco_date_use + v_entrada_almoco)::timestamp
          )) / 3600,
          2
        );
      END IF;
      
    ELSE
      -- FALLBACK FINAL: Usar lógica antiga (compatibilidade)
      -- Calcular horas trabalhadas usando TIME e data_registro
      IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
        -- Usar função calculate_work_hours como fallback
        SELECT rh.calculate_work_hours(
          v_entrada, v_saida, v_entrada_almoco, v_saida_almoco, 
          v_entrada_extra1, v_saida_extra1, v_date
        ) INTO v_horas_trabalhadas;
      END IF;
    END IF;
  END IF;

  -- =====================================================
  -- Calcular horas noturnas
  -- =====================================================
  -- Passar datas quando disponíveis para calculate_night_hours
  -- Usar campos *_date quando disponíveis, senão usar data_registro
  -- Determinar datas para cálculo de horas noturnas
  IF v_entrada_event_at IS NOT NULL THEN
    -- Usar data do event_at
    v_entrada_date_for_night := (v_entrada_event_at AT TIME ZONE v_timezone)::date;
  ELSE
    -- Fallback: usar campo *_date ou data_registro
    v_entrada_date_for_night := COALESCE(v_entrada_date, v_date);
  END IF;

  IF v_saida_event_at IS NOT NULL THEN
    -- Usar data do event_at
    v_saida_date_for_night := (v_saida_event_at AT TIME ZONE v_timezone)::date;
  ELSE
    -- Fallback: usar campo *_date ou data_registro
    v_saida_date_for_night := COALESCE(v_saida_date, v_date);
  END IF;

  v_horas_noturnas := rh.calculate_night_hours(
    v_entrada, 
    v_saida, 
    v_date,
    v_entrada_date_for_night,
    v_saida_date_for_night
  );

  -- Calcular diferença entre horas trabalhadas e horas_diarias do turno
  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  -- IMPORTANTE: Se funcionário não precisa registrar ponto (Artigo 62),
  -- não deve calcular horas negativas por ausência de registro
  IF v_requer_registro_ponto THEN
    -- Funcionário precisa registrar ponto: calcular normalmente
    -- CORREÇÃO: Só calcular horas negativas se trabalhou MENOS que o esperado
    IF v_diferenca_horas < 0 THEN
      v_horas_faltas := ABS(v_diferenca_horas);
    ELSE
      v_horas_faltas := 0;
    END IF;
  ELSE
    -- Funcionário não precisa registrar ponto: não calcular horas negativas
    v_horas_faltas := 0;
  END IF;

  -- Atualizar registro com horas calculadas
  UPDATE rh.time_records
  SET 
    horas_trabalhadas = ROUND(v_horas_trabalhadas, 2),
    horas_faltas = ROUND(v_horas_faltas, 2),
    horas_noturnas = ROUND(v_horas_noturnas, 2),
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1
  WHERE id = p_time_record_id;

  -- Chamar calculate_overtime_by_scale para calcular corretamente
  -- as horas extras/negativas por escala (considera tipo de escala, feriados, etc)
  -- Esta função agora garante que não calcula horas negativas incorretamente
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. 
CORREÇÃO CRÍTICA: Agora usa event_at (TIMESTAMPTZ) completo para cálculos precisos,
garantindo que registros que cruzam meia-noite sejam calculados corretamente.
Mantém fallbacks para compatibilidade com registros antigos sem eventos.
CORREÇÃO: Removido ORDER BY de queries com MIN/MAX (funções agregadas).';
