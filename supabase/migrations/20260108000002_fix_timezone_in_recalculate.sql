-- =====================================================
-- CORREÇÃO: TIMEZONE NA FUNÇÃO recalculate_time_record_hours
-- =====================================================
-- Data: 2026-01-08
-- Descrição: A função recalculate_time_record_hours estava usando
--            AT TIME ZONE 'UTC' que extrai o horário UTC em vez do local.
--            Agora usa 'America/Sao_Paulo' como padrão para converter
--            o event_at UTC para o horário local.
-- =====================================================

CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_date date;
  v_horas_faltas numeric;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  v_entrada_existente time;
  v_saida_existente time;
  v_entrada_almoco_existente time;
  v_saida_almoco_existente time;
  v_entrada_extra1_existente time;
  v_saida_extra1_existente time;
  v_current_status text;
  v_horas_extras_50_existente numeric;
  v_horas_extras_100_existente numeric;
  v_requer_registro_ponto boolean;
  v_day_of_week integer;
  v_shift_id uuid;
  v_horas_diarias numeric;
  v_horas_trabalhadas numeric := 0;
  v_horas_extras numeric := 0;
  v_horas_negativas numeric := 0;
  v_horas_noturnas numeric := 0;
  v_horas_extra_window numeric := 0;
  v_ultimo_evento_time time;
  v_ultimo_evento_type text;
  v_last_event_at timestamptz;
  v_new_status text;
  v_has_overtime boolean := false;
  v_timezone text := 'America/Sao_Paulo'; -- Timezone padrão
BEGIN
  -- CORREÇÃO CRÍTICA: Buscar dados EXISTENTES na tabela time_records PRIMEIRO
  -- Isso garante que nunca zeremos dados que já existem
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
    tr.status,            -- STATUS EXISTENTE
    tr.horas_extras_50,   -- HORAS EXTRAS 50% EXISTENTE
    tr.horas_extras_100,  -- HORAS EXTRAS 100% EXISTENTE
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
    v_current_status,
    v_horas_extras_50_existente,
    v_horas_extras_100_existente,
    v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- CORREÇÃO CRÍTICA: Usar dados existentes como base
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
  SELECT es.turno_id, s.horas_diarias
  INTO v_shift_id, v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts s ON s.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND (es.data_inicio IS NULL OR es.data_inicio <= v_date)
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
    AND es.ativo = true
  ORDER BY es.data_inicio DESC NULLS LAST
  LIMIT 1;

  -- Se não encontrou via employee_shifts, buscar direto do employee
  IF v_shift_id IS NULL THEN
    SELECT e.work_shift_id, s.horas_diarias
    INTO v_shift_id, v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts s ON s.id = e.work_shift_id
    WHERE e.id = v_employee_id;
  END IF;

  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  -- CORREÇÃO CRÍTICA: Buscar eventos APENAS para complementar dados existentes
  -- Se não houver dados existentes, tentar buscar dos eventos
  -- Mas NUNCA sobrescrever dados existentes com NULL
  -- CORREÇÃO: Usar timezone local (America/Sao_Paulo) em vez de UTC
  IF v_entrada IS NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida IS NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_almoco IS NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_almoco IS NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_extra1 IS NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_extra1 IS NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  -- Buscar último evento do dia para calcular horas parciais (se necessário)
  SELECT (event_at AT TIME ZONE v_timezone)::time, event_type
  INTO v_ultimo_evento_time, v_ultimo_evento_type
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id
  ORDER BY event_at DESC
  LIMIT 1;

  -- Buscar último event_at para updated_at
  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;

  -- CORREÇÃO CRÍTICA: Calcular horas trabalhadas usando dados existentes ou eventos
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
    -- Tem entrada mas não tem saída explícita - usar último evento
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
    -- CORREÇÃO CRÍTICA: Se não há entrada nem saída, PRESERVAR horas_trabalhadas existente
    -- Não zerar se já havia horas calculadas anteriormente
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
    -- Horário noturno: 22h às 5h
    v_horas_noturnas := round(
      EXTRACT(EPOCH FROM (
        CASE 
          WHEN v_entrada >= '22:00'::time OR v_entrada < '05:00'::time THEN
            -- Entrada no período noturno
            CASE 
              WHEN v_saida >= '22:00'::time OR v_saida < '05:00'::time THEN
                -- Saída também no período noturno
                CASE 
                  WHEN v_entrada <= v_saida THEN
                    -- Mesmo dia: v_saida - v_entrada
                    (v_date + v_saida) - (v_date + v_entrada)
                  ELSE
                    -- Passou da meia-noite: (24h - v_entrada) + v_saida
                    (v_date + INTERVAL '1 day' + v_saida) - (v_date + v_entrada)
                END
              WHEN v_saida >= '05:00'::time AND v_saida < '22:00'::time THEN
                -- Saída no período diurno
                CASE 
                  WHEN v_entrada >= '22:00'::time THEN
                    -- Entrada antes da meia-noite, saída depois
                    (v_date + INTERVAL '1 day' + '05:00'::time) - (v_date + v_entrada)
                  ELSE
                    -- Entrada depois da meia-noite
                    (v_date + '05:00'::time) - (v_date + v_entrada)
                END
              ELSE INTERVAL '0'
            END
          WHEN v_saida >= '22:00'::time OR v_saida < '05:00'::time THEN
            -- Apenas saída no período noturno
            CASE 
              WHEN v_entrada >= '05:00'::time AND v_entrada < '22:00'::time THEN
                -- Entrada no período diurno
                CASE 
                  WHEN v_saida >= '22:00'::time THEN
                    -- Saída antes da meia-noite
                    (v_date + v_saida) - (v_date + '22:00'::time)
                  ELSE
                    -- Saída depois da meia-noite
                    (v_date + INTERVAL '1 day' + v_saida) - (v_date + '22:00'::time)
                END
              ELSE INTERVAL '0'
            END
          ELSE INTERVAL '0'
        END
      )) / 3600, 2
    );
  END IF;

  -- Calcular horas extras e negativas
  IF v_horas_trabalhadas > v_horas_diarias THEN
    v_horas_extras := round(v_horas_trabalhadas - v_horas_diarias, 2);
  ELSIF v_horas_trabalhadas < v_horas_diarias AND v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    -- Só calcular horas negativas se tiver entrada E saída
    v_horas_negativas := round(v_horas_diarias - v_horas_trabalhadas, 2);
  END IF;

  -- Adicionar horas da janela extra
  IF v_horas_extra_window > 0 THEN
    v_horas_extras := COALESCE(v_horas_extras, 0) + v_horas_extra_window;
  END IF;

  -- Calcular horas de falta (só se não tiver entrada e não for funcionário que não precisa registrar ponto)
  IF v_entrada IS NULL AND v_requer_registro_ponto THEN
    v_horas_faltas := v_horas_diarias;
  END IF;

  -- Determinar status baseado em horas extras
  v_new_status := v_current_status;
  
  -- Se tem horas extras (50% ou 100%) ou horas negativas, precisa aprovação
  IF (v_horas_extras_50_existente IS NOT NULL AND v_horas_extras_50_existente > 0) OR
     (v_horas_extras_100_existente IS NOT NULL AND v_horas_extras_100_existente > 0) OR
     (v_horas_extras > 0) OR
     (v_horas_negativas > 0) THEN
    v_has_overtime := true;
  END IF;

  -- Se tem horas extras ou negativas e status não é aprovado/rejeitado, marcar como pendente
  IF v_has_overtime AND v_current_status NOT IN ('aprovado', 'rejeitado') THEN
    v_new_status := 'pendente';
  END IF;

  -- CORREÇÃO CRÍTICA: Atualizar APENAS campos calculados, preservando dados existentes
  -- NUNCA atualizar entrada, saida, etc com NULL se já existem valores
  UPDATE rh.time_records
  SET 
    -- Atualizar entrada/saída APENAS se não existirem ou se eventos fornecerem valores
    entrada = COALESCE(v_entrada, entrada),
    saida = COALESCE(v_saida, saida),
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
    -- Atualizar status baseado em horas extras
    status = v_new_status,
    updated_at = v_last_event_at
  WHERE id = p_time_record_id;

  -- Chamar calculate_overtime_by_scale para calcular corretamente
  -- as horas extras/negativas por escala (considera tipo de escala, feriados, etc)
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas e extras de um registro de ponto. 
CORREÇÃO CRÍTICA: NUNCA zera dados existentes na tabela time_records.
Usa dados existentes (entrada, saida, etc) como fonte primária.
Só busca de eventos se dados não existirem.
Preserva todos os dados existentes ao recalcular.
Garante que sempre use horas_diarias corretas do turno.
Considera Artigo 62 da CLT: funcionários que não precisam registrar ponto não têm saldo negativo por ausência de registro. 
Só calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações. 
Calcula horas noturnas (22h às 5h).
Calcula horas parciais quando há entrada mas não saída explícita, usando o último evento do dia como referência.
CORREÇÃO TIMEZONE: Agora converte event_at UTC para timezone local (America/Sao_Paulo) antes de extrair o horário.';

