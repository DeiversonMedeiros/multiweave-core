-- =====================================================
-- CORREÇÃO CRÍTICA: Usar datas reais dos eventos nos cálculos
-- =====================================================
-- Problema: A função recalculate_time_record_hours extrai apenas TIME
-- de time_record_events.event_at e depois usa data_registro para construir
-- timestamp, assumindo que entrada e saída estão sempre no mesmo dia.
-- 
-- Quando registros cruzam meia-noite (ex: entrada 27/01 21:24, saída 28/01 01:00),
-- o cálculo fica INCORRETO.
--
-- Solução: Usar event_at (TIMESTAMPTZ) diretamente nos cálculos, mantendo
-- fallbacks para compatibilidade com registros antigos.
-- =====================================================

CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_date date;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  -- NOVO: Variáveis para event_at completo (TIMESTAMPTZ)
  v_entrada_event_at timestamptz;
  v_saida_event_at timestamptz;
  v_entrada_almoco_event_at timestamptz;
  v_saida_almoco_event_at timestamptz;
  v_entrada_extra1_event_at timestamptz;
  v_saida_extra1_event_at timestamptz;
  -- NOVO: Variáveis para campos *_date quando disponíveis
  v_entrada_date date;
  v_saida_date date;
  v_entrada_almoco_date date;
  v_saida_almoco_date date;
  v_entrada_extra1_date date;
  v_saida_extra1_date date;
  v_horas_trabalhadas numeric(4,2) := 0;
  v_horas_extras numeric(4,2) := 0;
  v_horas_faltas numeric(4,2) := 0;
  v_horas_negativas numeric(4,2) := 0;
  v_horas_noturnas numeric(4,2) := 0;
  v_last_event_at timestamptz;
  v_work_shift_id uuid;
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
  -- Variáveis para cálculo de horas noturnas
  v_entrada_date_for_night date;
  v_saida_date_for_night date;
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

  -- CORREÇÃO: Buscar turno primeiro via employee_shifts (permite histórico)
  -- Se não encontrar, buscar via employees.work_shift_id (turno direto)
  SELECT es.turno_id, ws.horas_diarias
  INTO v_work_shift_id, v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- CORREÇÃO: Se não encontrou via employee_shifts, buscar via employees.work_shift_id
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT e.work_shift_id, ws.horas_diarias
    INTO v_work_shift_id, v_horas_diarias
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
  -- Buscar event_at completo para usar nos cálculos
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
  -- FALLBACK 1: Se não houver eventos, buscar campos *_date
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
  SELECT (event_at AT TIME ZONE v_timezone)::time
  INTO v_entrada
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE v_timezone)::time
  INTO v_saida
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE v_timezone)::time
  INTO v_entrada_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE v_timezone)::time
  INTO v_saida_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE v_timezone)::time
  INTO v_entrada_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE v_timezone)::time
  INTO v_saida_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
  ORDER BY event_at DESC
  LIMIT 1;

  -- =====================================================
  -- FALLBACK 2: Se não houver eventos, usar campos TIME da tabela
  -- =====================================================
  IF v_entrada IS NULL THEN
    SELECT entrada INTO v_entrada FROM rh.time_records WHERE id = p_time_record_id;
  END IF;
  IF v_saida IS NULL THEN
    SELECT saida INTO v_saida FROM rh.time_records WHERE id = p_time_record_id;
  END IF;
  IF v_entrada_almoco IS NULL THEN
    SELECT entrada_almoco INTO v_entrada_almoco FROM rh.time_records WHERE id = p_time_record_id;
  END IF;
  IF v_saida_almoco IS NULL THEN
    SELECT saida_almoco INTO v_saida_almoco FROM rh.time_records WHERE id = p_time_record_id;
  END IF;
  IF v_entrada_extra1 IS NULL THEN
    SELECT entrada_extra1 INTO v_entrada_extra1 FROM rh.time_records WHERE id = p_time_record_id;
  END IF;
  IF v_saida_extra1 IS NULL THEN
    SELECT saida_extra1 INTO v_saida_extra1 FROM rh.time_records WHERE id = p_time_record_id;
  END IF;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: Calcular horas trabalhadas usando event_at completo
  -- =====================================================
  -- Prioridade: 1) event_at, 2) campos *_date + TIME, 3) data_registro + TIME
  IF v_entrada_event_at IS NOT NULL AND v_saida_event_at IS NOT NULL THEN
    -- CASO IDEAL: Usar event_at completo (preciso)
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM (v_saida_event_at - v_entrada_event_at)) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL
               THEN (v_saida_almoco_event_at - v_entrada_almoco_event_at)
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSIF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    -- FALLBACK: Usar campos *_date quando disponíveis, senão usar data_registro
    -- Determinar datas a usar
    v_entrada_date_use := COALESCE(v_entrada_date, v_date);
    v_saida_date_use := COALESCE(v_saida_date, v_date);
    
    -- Se saída é antes da entrada em termos de TIME, assumir dia seguinte
    IF v_saida < v_entrada AND v_saida_date IS NULL THEN
      v_saida_date_use := v_date + INTERVAL '1 day';
    END IF;
    
    v_entrada_almoco_date_use := COALESCE(v_entrada_almoco_date, v_date);
    v_saida_almoco_date_use := COALESCE(v_saida_almoco_date, v_date);
    
    -- Se saída almoço é antes da entrada almoço, assumir dia seguinte
    IF v_saida_almoco IS NOT NULL AND v_entrada_almoco IS NOT NULL 
       AND v_saida_almoco < v_entrada_almoco AND v_saida_almoco_date IS NULL THEN
      v_saida_almoco_date_use := v_date + INTERVAL '1 day';
    END IF;
    
    -- Calcular horas trabalhadas
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_saida_date_use + v_saida)::timestamp - (v_entrada_date_use + v_entrada)::timestamp)) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_saida_almoco_date_use + v_saida_almoco)::timestamp - (v_entrada_almoco_date_use + v_entrada_almoco)::timestamp)
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSE
    v_horas_trabalhadas := 0;
  END IF;

  -- =====================================================
  -- Calcular horas extras da janela extra (extra_inicio/extra_fim)
  -- =====================================================
  IF v_entrada_extra1_event_at IS NOT NULL AND v_saida_extra1_event_at IS NOT NULL THEN
    -- Usar event_at completo
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM (v_saida_extra1_event_at - v_entrada_extra1_event_at)) / 3600, 2
    );
  ELSIF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    -- Fallback: usar campos *_date ou data_registro
    v_entrada_extra1_date_use := COALESCE(v_entrada_extra1_date, v_date);
    v_saida_extra1_date_use := COALESCE(v_saida_extra1_date, v_date);
    
    -- Se saída extra é antes da entrada extra, assumir dia seguinte
    IF v_saida_extra1 < v_entrada_extra1 AND v_saida_extra1_date IS NULL THEN
      v_saida_extra1_date_use := v_date + INTERVAL '1 day';
    END IF;
    
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM ((v_saida_extra1_date_use + v_saida_extra1)::timestamp - (v_entrada_extra1_date_use + v_entrada_extra1)::timestamp)) / 3600, 2
    );
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
    -- Se trabalhou igual ou mais, NUNCA calcular horas negativas
    IF v_diferenca_horas > 0 THEN
      -- Horas extras do trabalho além do turno + horas extras da janela extra
      v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      v_horas_negativas := 0;
    ELSIF v_diferenca_horas < 0 THEN
      -- Horas negativas (trabalhou menos que o turno)
      -- Mas só se houver registro (entrada e saída), caso contrário é falta não registrada
      IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
        -- Tem todas as marcações e trabalhou menos: calcular horas negativas
        v_horas_negativas := round(ABS(v_diferenca_horas), 2);
        v_horas_extras := round(v_horas_extra_window, 2); -- Apenas janela extra se houver
      ELSE
        -- Sem registro de ponto: considerar como falta (horas_faltas)
        v_horas_negativas := 0;
        v_horas_extras := 0;
        v_horas_faltas := COALESCE(v_horas_faltas, 0) + v_horas_diarias;
      END IF;
    ELSE
      -- Exatamente igual ao turno
      v_horas_extras := round(v_horas_extra_window, 2);
      v_horas_negativas := 0;
    END IF;
  ELSE
    -- Funcionário NÃO precisa registrar ponto (Artigo 62): não calcular horas negativas
    -- Apenas calcular horas extras se houver registro manual
    IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
      -- Se registrou manualmente, calcular horas extras se trabalhou mais que o turno
      IF v_diferenca_horas > 0 THEN
        v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      ELSE
        v_horas_extras := round(v_horas_extra_window, 2);
      END IF;
      v_horas_negativas := 0;
    ELSE
      -- Sem registro: não calcular nada (funcionário não precisa registrar)
      v_horas_extras := 0;
      v_horas_negativas := 0;
    END IF;
  END IF;

  -- Keep faltas as-is if previously set; if NULL, default to 0
  v_horas_faltas := COALESCE(v_horas_faltas, 0);

  -- Usar o event_at mais recente como referência para updated_at
  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  -- Se não houver eventos, usar NOW() como fallback
  IF v_last_event_at IS NULL THEN
    v_last_event_at := now();
  END IF;

  -- Atualizar registro com horas trabalhadas e horas negativas
  UPDATE rh.time_records
  SET 
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1,
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = CASE 
      WHEN v_horas_negativas > 0 THEN -v_horas_negativas -- Negativo indica débito
      ELSE v_horas_extras -- Positivo indica crédito
    END,
    horas_negativas = v_horas_negativas,
    horas_noturnas = v_horas_noturnas,
    horas_faltas = v_horas_faltas,
    updated_at = v_last_event_at
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
Mantém fallbacks para compatibilidade com registros antigos sem eventos.';
