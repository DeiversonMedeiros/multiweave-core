-- =====================================================
-- FUNÇÃO RPC PARA REGISTRAR PONTO COM TIMEZONE CORRETO
-- =====================================================
-- Data: 2026-01-08
-- Descrição: Função que recebe timestamp UTC e timezone do frontend
--            e decide corretamente o dia do registro no backend
-- =====================================================

CREATE OR REPLACE FUNCTION public.register_time_record(
  p_employee_id uuid,
  p_company_id uuid,
  p_event_type text,
  p_timestamp_utc timestamptz,
  p_timezone text DEFAULT 'America/Sao_Paulo',
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_accuracy_meters numeric DEFAULT NULL,
  p_photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_local_timestamp timestamp;
  v_local_date date;
  v_time_record_id uuid;
  v_event_id uuid;
  v_existing_record_id uuid;
  v_local_time time;
BEGIN
  -- Validar timezone (fallback para America/Sao_Paulo se inválido)
  BEGIN
    PERFORM pg_timezone_names.name 
    FROM pg_timezone_names 
    WHERE name = p_timezone;
    
    IF NOT FOUND THEN
      p_timezone := 'America/Sao_Paulo';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      p_timezone := 'America/Sao_Paulo';
  END;

  -- Converter timestamp UTC para timezone local
  v_local_timestamp := p_timestamp_utc AT TIME ZONE p_timezone;
  
  -- Backend decide o dia do registro (regra de ouro)
  v_local_date := v_local_timestamp::date;

  -- Buscar ou criar time_record para o dia
  SELECT id INTO v_existing_record_id
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro = v_local_date
  LIMIT 1;

  IF v_existing_record_id IS NOT NULL THEN
    v_time_record_id := v_existing_record_id;
  ELSE
    -- Criar novo registro
    INSERT INTO rh.time_records (
      employee_id,
      company_id,
      data_registro,
      status
    ) VALUES (
      p_employee_id,
      p_company_id,
      v_local_date,
      'pendente'
    ) RETURNING id INTO v_time_record_id;
  END IF;

  -- Criar evento (time_record_event)
  INSERT INTO rh.time_record_events (
    time_record_id,
    employee_id,
    company_id,
    event_type,
    event_at,
    latitude,
    longitude,
    source,
    accuracy_meters
  ) VALUES (
    v_time_record_id,
    p_employee_id,
    p_company_id,
    p_event_type,
    p_timestamp_utc, -- Salvar UTC original
    p_latitude,
    p_longitude,
    CASE WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN 'gps' ELSE 'manual' END,
    CASE 
      WHEN p_accuracy_meters > 9999.99 THEN 9999.99
      WHEN p_accuracy_meters < 0 THEN NULL
      ELSE p_accuracy_meters
    END
  ) RETURNING id INTO v_event_id;

  -- Registrar foto se fornecida
  IF p_photo_url IS NOT NULL AND v_event_id IS NOT NULL THEN
    PERFORM public.insert_time_record_event_photo(
      v_event_id,
      p_photo_url
    );
  END IF;

  -- CORREÇÃO: Atualizar diretamente os campos de horário no time_record
  -- usando o horário local convertido do UTC
  -- Isso garante que os horários sejam salvos corretamente sem depender do trigger
  -- Extrair apenas o horário (HH:MM:SS) do timestamp local
  v_local_time := v_local_timestamp::time;
  
  -- Atualizar o campo correspondente ao tipo de evento
  CASE p_event_type
    WHEN 'entrada' THEN
      UPDATE rh.time_records 
      SET entrada = v_local_time
      WHERE id = v_time_record_id;
    WHEN 'saida' THEN
      UPDATE rh.time_records 
      SET saida = v_local_time
      WHERE id = v_time_record_id;
    WHEN 'entrada_almoco' THEN
      UPDATE rh.time_records 
      SET entrada_almoco = v_local_time
      WHERE id = v_time_record_id;
    WHEN 'saida_almoco' THEN
      UPDATE rh.time_records 
      SET saida_almoco = v_local_time
      WHERE id = v_time_record_id;
    WHEN 'extra_inicio' THEN
      UPDATE rh.time_records 
      SET entrada_extra1 = v_local_time
      WHERE id = v_time_record_id;
    WHEN 'extra_fim' THEN
      UPDATE rh.time_records 
      SET saida_extra1 = v_local_time
      WHERE id = v_time_record_id;
  END CASE;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'time_record_id', v_time_record_id,
    'event_id', v_event_id,
    'local_date', v_local_date,
    'local_timestamp', v_local_timestamp,
    'timezone', p_timezone
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.register_time_record IS 
'Registra ponto com timezone correto.
Regra de ouro: Backend SEMPRE decide o dia do registro baseado no timezone fornecido.
Frontend envia timestamp UTC e timezone, backend converte e decide o dia local.';

