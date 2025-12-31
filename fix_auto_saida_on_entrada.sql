-- =====================================================
-- CORREÇÃO: NÃO DEFINIR SAÍDA AUTOMATICAMENTE AO REGISTRAR ENTRADA
-- =====================================================
-- Problema: Ao registrar apenas a entrada, o sistema estava
-- definindo a saída automaticamente.
-- 
-- Solução: Garantir que a função recalculate_time_record_hours
-- NUNCA defina saida quando não houver evento do tipo 'saida'.
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
  v_ultimo_evento_time time;
  v_ultimo_evento_type varchar;
  -- Variáveis para dados existentes na tabela
  v_entrada_existente time;
  v_saida_existente time;
  v_entrada_almoco_existente time;
  v_saida_almoco_existente time;
  v_entrada_extra1_existente time;
  v_saida_extra1_existente time;
BEGIN
  -- Buscar dados EXISTENTES na tabela time_records PRIMEIRO
  SELECT 
    tr.employee_id, 
    tr.company_id, 
    tr.data_registro, 
    tr.horas_faltas,
    tr.entrada,           -- DADOS EXISTENTES
    tr.saida,             -- DADOS EXISTENTES
    tr.entrada_almoco,    -- DADOS EXISTENTES
    tr.saida_almoco,      -- DADOS EXISTENTES
    tr.entrada_extra1,    -- DADOS EXISTENTES
    tr.saida_extra1,      -- DADOS EXISTENTES
    COALESCE(e.requer_registro_ponto, true)
  INTO 
    v_employee_id, 
    v_company_id, 
    v_date, 
    v_horas_faltas,
    v_entrada_existente,
    v_saida_existente,
    v_entrada_almoco_existente,
    v_saida_almoco_existente,
    v_entrada_extra1_existente,
    v_saida_extra1_existente,
    v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Usar dados existentes como base
  -- Só sobrescrever se houver eventos disponíveis
  v_entrada := v_entrada_existente;
  v_saida := v_saida_existente;
  v_entrada_almoco := v_entrada_almoco_existente;
  v_saida_almoco := v_saida_almoco_existente;
  v_entrada_extra1 := v_entrada_extra1_existente;
  v_saida_extra1 := v_saida_extra1_existente;

  -- Calcular dia da semana
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- Buscar turno primeiro via employee_shifts (permite histórico)
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

  -- Se não encontrou via employee_shifts, buscar via employees.work_shift_id
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

  -- Se ainda não encontrou horas_diarias, tentar buscar do turno diretamente
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

  -- Buscar eventos APENAS para complementar dados existentes
  -- Se não houver dados existentes, tentar buscar dos eventos
  -- Mas NUNCA sobrescrever dados existentes com NULL
  IF v_entrada IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_entrada
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  -- CORREÇÃO CRÍTICA: Só buscar saída de eventos se não houver saída existente
  -- E APENAS se houver um evento do tipo 'saida' (não usar último evento genérico)
  IF v_saida IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_saida
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_almoco IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_entrada_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_almoco IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_saida_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_extra1 IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_entrada_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_extra1 IS NULL THEN
    SELECT (event_at AT TIME ZONE 'UTC')::time
    INTO v_saida_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  -- Buscar último evento do dia para calcular horas parciais (se necessário)
  -- Mas NÃO usar para definir saída automaticamente
  SELECT (event_at AT TIME ZONE 'UTC')::time, event_type
  INTO v_ultimo_evento_time, v_ultimo_evento_type
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calcular horas trabalhadas usando dados existentes ou eventos
  -- Se não houver entrada ou saída, manter horas_trabalhadas existente se houver
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    -- Caso normal: tem entrada e saída
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSIF v_entrada IS NOT NULL AND v_ultimo_evento_time IS NOT NULL AND v_saida IS NULL THEN
    -- Tem entrada mas não tem saída explícita - usar último evento APENAS para cálculo de horas
    -- MAS NÃO definir v_saida (isso será feito apenas quando houver evento 'saida')
    IF v_ultimo_evento_type = 'saida_almoco' AND v_saida_almoco IS NOT NULL THEN
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_saida_almoco) - (v_date + v_entrada))) / 3600
        - COALESCE(EXTRACT(EPOCH FROM (
            CASE WHEN v_entrada_almoco IS NOT NULL
                 THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
                 ELSE INTERVAL '0 minute' END
          )) / 3600, 0), 2
      );
    ELSIF v_ultimo_evento_type = 'entrada_almoco' AND v_entrada_almoco IS NOT NULL THEN
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_entrada_almoco) - (v_date + v_entrada))) / 3600, 2
      );
    ELSIF v_ultimo_evento_type = 'entrada' AND v_ultimo_evento_time = v_entrada THEN
      -- Apenas entrada registrada: registro incompleto
      v_horas_trabalhadas := 0;
    ELSIF v_ultimo_evento_time != v_entrada THEN
      -- Usar último evento para cálculo, mas NÃO definir como saída
      v_horas_trabalhadas := round(
        EXTRACT(EPOCH FROM ((v_date + v_ultimo_evento_time) - (v_date + v_entrada))) / 3600
        - COALESCE(EXTRACT(EPOCH FROM (
            CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
                 THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
                 ELSE INTERVAL '0 minute' END
          )) / 3600, 0), 2
      );
    END IF;
    
    -- Garantir que horas trabalhadas não seja negativa
    IF v_horas_trabalhadas < 0 THEN
      v_horas_trabalhadas := 0;
    END IF;
  ELSIF v_entrada IS NULL AND v_saida IS NULL THEN
    -- Se não há entrada nem saída, PRESERVAR horas_trabalhadas existente
    SELECT horas_trabalhadas INTO v_horas_trabalhadas
    FROM rh.time_records
    WHERE id = p_time_record_id;
    
    -- Se não havia horas_trabalhadas, manter 0 (mas não zerar outros campos)
    IF v_horas_trabalhadas IS NULL THEN
      v_horas_trabalhadas := 0;
    END IF;
  END IF;

  -- Calculate extra hours from extra window (extra_inicio/extra_fim)
  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extra_window := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  END IF;

  -- Calcular horas noturnas (só se tiver entrada e saída)
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_noturnas := rh.calculate_night_hours(
      v_entrada, 
      v_saida, 
      v_date
    );
  ELSIF v_entrada IS NOT NULL AND v_ultimo_evento_time IS NOT NULL AND v_saida IS NULL THEN
    -- Tem entrada mas não saída: usar último evento APENAS para cálculo de horas noturnas
    -- MAS NÃO definir como saída
    v_horas_noturnas := rh.calculate_night_hours(
      v_entrada, 
      v_ultimo_evento_time, 
      v_date
    );
  ELSE
    -- Preservar horas_noturnas existente se não houver entrada/saída
    SELECT horas_noturnas INTO v_horas_noturnas
    FROM rh.time_records
    WHERE id = p_time_record_id;
    
    IF v_horas_noturnas IS NULL THEN
      v_horas_noturnas := 0;
    END IF;
  END IF;

  -- Calcular diferença entre horas trabalhadas e horas_diarias do turno
  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  -- IMPORTANTE: Se funcionário não precisa registrar ponto (Artigo 62),
  -- não deve calcular horas negativas por ausência de registro
  IF v_requer_registro_ponto THEN
    -- Funcionário precisa registrar ponto: calcular normalmente
    IF v_diferenca_horas > 0 THEN
      -- Horas extras do trabalho além do turno + horas extras da janela extra
      v_horas_extras := round(v_diferenca_horas + v_horas_extra_window, 2);
      v_horas_negativas := 0;
    ELSIF v_diferenca_horas < 0 THEN
      -- Horas negativas (trabalhou menos que o turno)
      -- Mas só se houver registro (entrada e saída ou entrada e último evento)
      IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
        -- Tem marcações e trabalhou menos: calcular horas negativas
        v_horas_negativas := round(ABS(v_diferenca_horas), 2);
        v_horas_extras := round(v_horas_extra_window, 2);
      ELSE
        -- Sem registro de ponto: considerar como falta (horas_faltas)
        v_horas_negativas := 0;
        v_horas_extras := 0;
        -- Não alterar horas_faltas se já existir valor
        IF v_horas_faltas IS NULL OR v_horas_faltas = 0 THEN
          v_horas_faltas := v_horas_diarias;
        END IF;
      END IF;
    ELSE
      -- Exatamente igual ao turno
      v_horas_extras := round(v_horas_extra_window, 2);
      v_horas_negativas := 0;
    END IF;
  ELSE
    -- Funcionário NÃO precisa registrar ponto (Artigo 62): não calcular horas negativas
    IF v_entrada IS NOT NULL AND (v_saida IS NOT NULL OR v_ultimo_evento_time IS NOT NULL) THEN
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

  -- CORREÇÃO CRÍTICA: Atualizar APENAS campos calculados, preservando dados existentes
  -- NUNCA atualizar entrada, saida, etc com NULL se já existem valores
  -- E NUNCA definir saida automaticamente quando só há entrada
  UPDATE rh.time_records
  SET 
    -- Atualizar entrada/saída APENAS se não existirem ou se eventos fornecerem valores
    -- IMPORTANTE: saida só é atualizada se houver evento do tipo 'saida' ou se já existir
    entrada = COALESCE(v_entrada, entrada),
    saida = COALESCE(v_saida, saida),  -- Só atualiza se v_saida não for NULL (ou seja, se houver evento 'saida')
    entrada_almoco = COALESCE(v_entrada_almoco, entrada_almoco),
    saida_almoco = COALESCE(v_saida_almoco, saida_almoco),
    entrada_extra1 = COALESCE(v_entrada_extra1, entrada_extra1),
    saida_extra1 = COALESCE(v_saida_extra1, saida_extra1),
    -- Atualizar campos calculados
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = CASE 
      WHEN v_horas_negativas > 0 THEN -v_horas_negativas
      ELSE v_horas_extras
    END,
    horas_negativas = v_horas_negativas,
    horas_noturnas = v_horas_noturnas,
    horas_faltas = v_horas_faltas,
    updated_at = v_last_event_at
  WHERE id = p_time_record_id;

  -- Chamar calculate_overtime_by_scale para calcular corretamente
  -- as horas extras/negativas por escala (considera tipo de escala, feriados, etc)
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

