-- =====================================================
-- CORRIGIR FUNÇÃO register_time_record PARA EXTRA_INICIO E EXTRA_FIM
-- =====================================================
-- Data: 2026-02-09
-- Descrição: Corrige a função register_time_record para garantir que eventos
--            extra_inicio e extra_fim sejam agrupados corretamente com registros
--            do dia anterior quando ocorrem após a meia-noite mas ainda estão
--            dentro da janela de tempo.
--            
--            O problema identificado: quando uma entrada extra ocorre às 00:32
--            do dia 22/01, ela deveria ser agrupada com o registro do dia 21/01
--            se estiver dentro da janela de tempo (ex: 15 horas), mas estava sendo
--            criada em um registro separado do dia 22/01.
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
  p_photo_url text DEFAULT NULL,
  p_endereco text DEFAULT NULL
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
  v_localizacao_type text;
  -- Variáveis para janela de tempo
  v_window_hours INTEGER := 24;
  v_recent_record_id uuid;
  v_recent_record_date date;
  v_recent_entrada time;
  v_recent_entrada_timestamp timestamptz;
  v_current_timestamp timestamptz;
  v_hours_elapsed numeric;
  v_is_within_window boolean;
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
  v_local_date := v_local_timestamp::date;
  
  -- Criar timestamp atual em UTC para comparação
  v_current_timestamp := p_timestamp_utc;

  -- Determinar tipo de localização
  v_localizacao_type := CASE 
    WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN 'gps'
    ELSE 'manual'
  END;

  -- Se o evento NÃO é "entrada", verificar se deve usar registro existente baseado na janela de tempo
  IF p_event_type != 'entrada' THEN
    -- Obter configuração da janela de tempo
    SELECT COALESCE(janela_tempo_marcacoes, 24) INTO v_window_hours
    FROM rh.time_record_settings
    WHERE company_id = p_company_id;

    -- CORREÇÃO: Buscar registro mais recente com entrada considerando também o dia anterior
    -- quando a marcação ocorre nas primeiras horas do dia (0h-6h), pode pertencer ao dia anterior
    -- Expandir a busca para incluir até 3 dias atrás para garantir que encontre registros
    -- que ainda estão dentro da janela de tempo
    SELECT 
      tr.id,
      tr.data_registro,
      tr.entrada
    INTO 
      v_recent_record_id,
      v_recent_record_date,
      v_recent_entrada
    FROM rh.time_records tr
    WHERE tr.employee_id = p_employee_id
      AND tr.company_id = p_company_id
      AND tr.entrada IS NOT NULL
      -- Expandir busca para até 3 dias atrás para garantir encontrar registros dentro da janela
      AND tr.data_registro >= v_local_date - INTERVAL '3 days'
      -- Incluir também o dia atual (pode haver registro criado no mesmo dia)
      AND tr.data_registro <= v_local_date
    ORDER BY tr.data_registro DESC, tr.entrada DESC
    LIMIT 1;

    -- Se encontrou registro recente com entrada, verificar se está dentro da janela de tempo
    IF v_recent_record_id IS NOT NULL AND v_recent_entrada IS NOT NULL THEN
      -- Construir timestamp da entrada do registro recente
      v_recent_entrada_timestamp := ((v_recent_record_date + v_recent_entrada)::timestamp 
                                     AT TIME ZONE p_timezone)::timestamptz;
      
      -- Calcular horas decorridas desde a entrada
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_timestamp - v_recent_entrada_timestamp)) / 3600;
      
      -- Verificar se está dentro da janela de tempo
      -- CORREÇÃO: Permitir até 0.5 horas de margem para considerar marcações muito próximas da janela
      v_is_within_window := v_hours_elapsed >= -0.5 AND v_hours_elapsed <= (v_window_hours + 0.5);
      
      -- Se está dentro da janela, usar o data_registro do registro existente
      IF v_is_within_window THEN
        v_local_date := v_recent_record_date;
        v_existing_record_id := v_recent_record_id;
        
        RAISE NOTICE 'Marcação dentro da janela de tempo: usando registro existente. Data: %, Horas decorridas: %, Janela: %h', 
          v_recent_record_date, ROUND(v_hours_elapsed, 2), v_window_hours;
      ELSE
        RAISE NOTICE 'Marcação fora da janela de tempo: criando novo registro. Horas decorridas: %, Janela: %h', 
          ROUND(v_hours_elapsed, 2), v_window_hours;
      END IF;
    END IF;
  END IF;

  -- Buscar ou criar time_record para o dia determinado
  IF v_existing_record_id IS NULL THEN
    SELECT id INTO v_existing_record_id
    FROM rh.time_records
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND data_registro = v_local_date
    LIMIT 1;
  END IF;

  IF v_existing_record_id IS NOT NULL THEN
    v_time_record_id := v_existing_record_id;
  ELSE
    -- Criar novo registro com localização se disponível
    INSERT INTO rh.time_records (
      employee_id,
      company_id,
      data_registro,
      status,
      latitude,
      longitude,
      endereco,
      localizacao_type,
      foto_url
    ) VALUES (
      p_employee_id,
      p_company_id,
      v_local_date,
      'pendente',
      p_latitude,
      p_longitude,
      p_endereco,
      v_localizacao_type,
      p_photo_url
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
    endereco,
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
    p_endereco, -- Adicionar endereço ao evento
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
  
  -- Atualizar o campo correspondente ao tipo de evento E também atualizar localização
  -- se fornecida (para garantir que sempre tenha a localização mais recente)
  CASE p_event_type
    WHEN 'entrada' THEN
      UPDATE rh.time_records 
      SET entrada = v_local_time,
          latitude = COALESCE(p_latitude, latitude),
          longitude = COALESCE(p_longitude, longitude),
          endereco = COALESCE(p_endereco, endereco),
          localizacao_type = COALESCE(v_localizacao_type, localizacao_type),
          foto_url = COALESCE(p_photo_url, foto_url)
      WHERE id = v_time_record_id;
    WHEN 'saida' THEN
      UPDATE rh.time_records 
      SET saida = v_local_time,
          latitude = COALESCE(p_latitude, latitude),
          longitude = COALESCE(p_longitude, longitude),
          endereco = COALESCE(p_endereco, endereco),
          localizacao_type = COALESCE(v_localizacao_type, localizacao_type),
          foto_url = COALESCE(p_photo_url, foto_url)
      WHERE id = v_time_record_id;
    WHEN 'entrada_almoco' THEN
      UPDATE rh.time_records 
      SET entrada_almoco = v_local_time,
          latitude = COALESCE(p_latitude, latitude),
          longitude = COALESCE(p_longitude, longitude),
          endereco = COALESCE(p_endereco, endereco),
          localizacao_type = COALESCE(v_localizacao_type, localizacao_type),
          foto_url = COALESCE(p_photo_url, foto_url)
      WHERE id = v_time_record_id;
    WHEN 'saida_almoco' THEN
      UPDATE rh.time_records 
      SET saida_almoco = v_local_time,
          latitude = COALESCE(p_latitude, latitude),
          longitude = COALESCE(p_longitude, longitude),
          endereco = COALESCE(p_endereco, endereco),
          localizacao_type = COALESCE(v_localizacao_type, localizacao_type),
          foto_url = COALESCE(p_photo_url, foto_url)
      WHERE id = v_time_record_id;
    WHEN 'extra_inicio' THEN
      UPDATE rh.time_records 
      SET entrada_extra1 = v_local_time,
          latitude = COALESCE(p_latitude, latitude),
          longitude = COALESCE(p_longitude, longitude),
          endereco = COALESCE(p_endereco, endereco),
          localizacao_type = COALESCE(v_localizacao_type, localizacao_type),
          foto_url = COALESCE(p_photo_url, foto_url)
      WHERE id = v_time_record_id;
    WHEN 'extra_fim' THEN
      UPDATE rh.time_records 
      SET saida_extra1 = v_local_time,
          latitude = COALESCE(p_latitude, latitude),
          longitude = COALESCE(p_longitude, longitude),
          endereco = COALESCE(p_endereco, endereco),
          localizacao_type = COALESCE(v_localizacao_type, localizacao_type),
          foto_url = COALESCE(p_photo_url, foto_url)
      WHERE id = v_time_record_id;
  END CASE;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'time_record_id', v_time_record_id,
    'event_id', v_event_id,
    'local_date', v_local_date,
    'local_timestamp', v_local_timestamp,
    'timezone', p_timezone,
    'window_hours', v_window_hours,
    'hours_elapsed', CASE WHEN v_hours_elapsed IS NOT NULL THEN ROUND(v_hours_elapsed, 2) ELSE NULL END,
    'is_within_window', CASE WHEN v_is_within_window IS NOT NULL THEN v_is_within_window ELSE false END
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
'Registra ponto com timezone correto e localização, considerando a janela de tempo configurada.
Para eventos que não são "entrada", busca o registro mais recente com entrada (até 3 dias atrás) 
e verifica se a marcação está dentro da janela de tempo. Se estiver, usa o data_registro do 
registro existente. Se estiver fora da janela ou não encontrar registro, usa a data do timestamp atual.
CORRIGIDO: Agora busca até 3 dias atrás e permite margem de 0.5h para garantir que marcações
de entrada_extra e saida_extra sejam agrupadas corretamente quando ocorrem após a meia-noite.';
