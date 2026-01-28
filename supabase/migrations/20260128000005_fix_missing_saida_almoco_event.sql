-- =====================================================
-- CORRIGIR EVENTOS FALTANTES PARA REGISTROS CORRIGIDOS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Cria eventos faltantes em time_record_events para registros
--            que foram corrigidos pelo script de correção mas não tiveram
--            os eventos criados.
-- =====================================================

-- Criar eventos faltantes para registros que têm campos preenchidos mas não têm eventos
DO $$
DECLARE
  v_record RECORD;
  v_event_timestamp timestamptz;
  v_event_date date;
  v_event_time time;
BEGIN
  -- Para cada registro que tem saida_almoco mas não tem evento
  FOR v_record IN
    SELECT 
      tr.id,
      tr.employee_id,
      tr.company_id,
      tr.data_registro,
      tr.entrada,
      tr.entrada_almoco,
      tr.saida_almoco,
      tr.saida,
      tr.entrada_extra1,
      tr.saida_extra1
    FROM rh.time_records tr
    WHERE tr.saida_almoco IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM rh.time_record_events tre 
        WHERE tre.time_record_id = tr.id 
          AND tre.event_type = 'saida_almoco'
      )
  LOOP
    -- Construir timestamp da saida_almoco
    -- Se o horário é antes das 12:00, provavelmente é do dia seguinte
    IF v_record.saida_almoco < '12:00'::time THEN
      -- Verificar se entrada_almoco existe para calcular melhor
      IF v_record.entrada_almoco IS NOT NULL THEN
        -- Se entrada_almoco é do mesmo dia e saida_almoco é antes das 12:00,
        -- então saida_almoco é do dia seguinte
        v_event_date := v_record.data_registro + INTERVAL '1 day';
      ELSE
        -- Se não tem entrada_almoco, usar data_registro + 1 dia
        v_event_date := v_record.data_registro + INTERVAL '1 day';
      END IF;
    ELSE
      -- Se o horário é depois das 12:00, provavelmente é do mesmo dia
      v_event_date := v_record.data_registro;
    END IF;
    
    -- Construir timestamp completo (assumindo timezone America/Sao_Paulo)
    v_event_timestamp := ((v_event_date + v_record.saida_almoco)::timestamp 
                          AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
    
    -- Criar evento
    INSERT INTO rh.time_record_events (
      time_record_id,
      employee_id,
      company_id,
      event_type,
      event_at,
      source
    ) VALUES (
      v_record.id,
      v_record.employee_id,
      v_record.company_id,
      'saida_almoco',
      v_event_timestamp,
      'manual' -- Marcado como manual pois foi criado pela correção
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Evento saida_almoco criado para registro %: % %', 
      v_record.id, v_event_date, v_record.saida_almoco;
  END LOOP;
  
  -- Fazer o mesmo para outros campos que podem estar faltando eventos
  -- (saida, entrada_extra1, saida_extra1)
  
  -- Saída
  FOR v_record IN
    SELECT 
      tr.id,
      tr.employee_id,
      tr.company_id,
      tr.data_registro,
      tr.saida
    FROM rh.time_records tr
    WHERE tr.saida IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM rh.time_record_events tre 
        WHERE tre.time_record_id = tr.id 
          AND tre.event_type = 'saida'
      )
  LOOP
    -- Se o horário é antes das 12:00, provavelmente é do dia seguinte
    IF v_record.saida < '12:00'::time THEN
      v_event_date := v_record.data_registro + INTERVAL '1 day';
    ELSE
      v_event_date := v_record.data_registro;
    END IF;
    
    v_event_timestamp := ((v_event_date + v_record.saida)::timestamp 
                          AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
    
    INSERT INTO rh.time_record_events (
      time_record_id,
      employee_id,
      company_id,
      event_type,
      event_at,
      source
    ) VALUES (
      v_record.id,
      v_record.employee_id,
      v_record.company_id,
      'saida',
      v_event_timestamp,
      'manual'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Correção de eventos concluída';
END;
$$;
