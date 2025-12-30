-- =====================================================
-- ADICIONAR horas_noturnas ÀS FUNÇÕES RPC
-- =====================================================
-- Adiciona o campo horas_noturnas às funções RPC que retornam time_records
-- para que o frontend possa exibir as horas noturnas calculadas
-- =====================================================

-- Remover função antiga para poder alterar o tipo de retorno
DROP FUNCTION IF EXISTS public.get_time_records_paginated(
  uuid, integer, integer, uuid, date, date, varchar, uuid
);

-- Recriar get_time_records_paginated com campo horas_noturnas
CREATE OR REPLACE FUNCTION public.get_time_records_paginated(
  company_id_param uuid,
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 50,
  employee_id_filter uuid DEFAULT NULL,
  start_date_filter date DEFAULT NULL,
  end_date_filter date DEFAULT NULL,
  status_filter varchar DEFAULT NULL,
  manager_user_id_filter uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  employee_id uuid,
  company_id uuid,
  data_registro date,
  entrada time without time zone,
  saida time without time zone,
  entrada_almoco time without time zone,
  saida_almoco time without time zone,
  entrada_extra1 time without time zone,
  saida_extra1 time without time zone,
  horas_trabalhadas numeric,
  horas_extras numeric,
  horas_extras_50 numeric,
  horas_extras_100 numeric,
  horas_negativas numeric,
  horas_noturnas numeric,
  horas_faltas numeric,
  status character varying,
  observacoes text,
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_nome varchar,
  employee_matricula varchar,
  events_count integer,
  first_event_photo_url text,
  entrada_latitude numeric,
  entrada_longitude numeric,
  entrada_endereco text,
  saida_latitude numeric,
  saida_longitude numeric,
  all_photos jsonb,
  all_locations jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
  v_total_count bigint;
BEGIN
  -- Contar total de registros (antes da paginação)
  SELECT COUNT(*)
  INTO v_total_count
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON tr.employee_id = e.id
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter)
    AND (
      manager_user_id_filter IS NULL
      OR EXISTS (
        SELECT 1
        FROM rh.employees gestor_employee
        WHERE gestor_employee.id = e.gestor_imediato_id
          AND gestor_employee.company_id = company_id_param
          AND gestor_employee.user_id = manager_user_id_filter
      )
    );

  -- Retornar registros paginados com filtros aplicados no servidor
  RETURN QUERY
  SELECT
    tr.id,
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.entrada_extra1,
    tr.saida_extra1,
    tr.horas_trabalhadas,
    tr.horas_extras,
    tr.horas_extras_50,
    tr.horas_extras_100,
    tr.horas_negativas,
    tr.horas_noturnas,
    tr.horas_faltas,
    tr.status,
    tr.observacoes,
    tr.aprovado_por,
    tr.aprovado_em,
    tr.created_at,
    tr.updated_at,
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    ev.stats_events_count::int as events_count,
    ev.first_event_photo_url,
    ev.entrada_latitude,
    ev.entrada_longitude,
    ev.entrada_endereco,
    ev.saida_latitude,
    ev.saida_longitude,
    ev.all_photos,
    ev.all_locations,
    v_total_count as total_count
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON tr.employee_id = e.id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) as stats_events_count,
      (SELECT photo_url FROM rh.time_record_event_photos 
       WHERE event_id IN (
         SELECT tre.id FROM rh.time_record_events tre
         WHERE tre.time_record_id = tr.id 
         ORDER BY tre.event_at ASC LIMIT 1
       ) LIMIT 1) as first_event_photo_url,
      (SELECT latitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'entrada' 
       ORDER BY event_at ASC LIMIT 1) as entrada_latitude,
      (SELECT longitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'entrada' 
       ORDER BY event_at ASC LIMIT 1) as entrada_longitude,
      (SELECT endereco FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'entrada' 
       ORDER BY event_at ASC LIMIT 1) as entrada_endereco,
      (SELECT latitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'saida' 
       ORDER BY event_at DESC LIMIT 1) as saida_latitude,
      (SELECT longitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'saida' 
       ORDER BY event_at DESC LIMIT 1) as saida_longitude,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'photo_url', p.photo_url,
            'event_type', evt.event_type,
            'event_at', evt.event_at,
            'event_id', p.event_id
          )
          ORDER BY evt.event_at ASC
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
      ) as all_photos,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', evt.id,
            'event_type', evt.event_type,
            'event_at', evt.event_at,
            'latitude', evt.latitude,
            'longitude', evt.longitude,
            'endereco', evt.endereco,
            'source', evt.source
          )
          ORDER BY evt.event_at ASC
        ) FILTER (WHERE evt.latitude IS NOT NULL OR evt.longitude IS NOT NULL),
        '[]'::jsonb
      ) as all_locations
    FROM rh.time_record_events evt
    LEFT JOIN rh.time_record_event_photos p ON p.event_id = evt.id
    WHERE evt.time_record_id = tr.id
  ) ev ON true
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter)
    AND (
      manager_user_id_filter IS NULL
      OR EXISTS (
        SELECT 1
        FROM rh.employees gestor_employee
        WHERE gestor_employee.id = e.gestor_imediato_id
          AND gestor_employee.company_id = company_id_param
          AND gestor_employee.user_id = manager_user_id_filter
      )
    )
  ORDER BY tr.data_registro DESC, tr.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

COMMENT ON FUNCTION public.get_time_records_paginated IS 
  'Retorna registros de ponto paginados com informações de eventos, fotos e localizações.
   Inclui campo horas_noturnas para exibição no frontend.';

-- Atualizar também get_time_records_simple
DROP FUNCTION IF EXISTS public.get_time_records_simple(uuid);

CREATE OR REPLACE FUNCTION public.get_time_records_simple(company_id_param uuid)
RETURNS TABLE (
  id uuid,
  employee_id uuid,
  company_id uuid,
  data_registro date,
  entrada time without time zone,
  saida time without time zone,
  entrada_almoco time without time zone,
  saida_almoco time without time zone,
  entrada_extra1 time without time zone,
  saida_extra1 time without time zone,
  horas_trabalhadas numeric,
  horas_extras numeric,
  horas_extras_50 numeric,
  horas_extras_100 numeric,
  horas_negativas numeric,
  horas_noturnas numeric,
  horas_faltas numeric,
  status character varying,
  observacoes text,
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_nome varchar,
  employee_matricula varchar,
  events_count integer,
  first_event_photo_url text,
  entrada_latitude numeric,
  entrada_longitude numeric,
  entrada_endereco text,
  saida_latitude numeric,
  saida_longitude numeric,
  all_photos jsonb,
  all_locations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
BEGIN
  -- Access check: current user must belong to the company
  IF NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = company_id_param
      AND uc.ativo = true
  ) THEN
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    tr.id,
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.entrada_extra1,
    tr.saida_extra1,
    tr.horas_trabalhadas,
    tr.horas_extras,
    tr.horas_extras_50,
    tr.horas_extras_100,
    tr.horas_negativas,
    tr.horas_noturnas,
    tr.horas_faltas,
    tr.status,
    tr.observacoes,
    tr.aprovado_por,
    tr.aprovado_em,
    tr.created_at,
    tr.updated_at,
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    ev.stats_events_count::int as events_count,
    ev.first_event_photo_url,
    ev.entrada_latitude,
    ev.entrada_longitude,
    ev.entrada_endereco,
    ev.saida_latitude,
    ev.saida_longitude,
    ev.all_photos,
    ev.all_locations
  FROM rh.time_records tr
  LEFT JOIN rh.employees e ON tr.employee_id = e.id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) as stats_events_count,
      (SELECT photo_url FROM rh.time_record_event_photos 
       WHERE event_id IN (
         SELECT tre.id FROM rh.time_record_events tre
         WHERE tre.time_record_id = tr.id 
         ORDER BY tre.event_at ASC LIMIT 1
       ) LIMIT 1) as first_event_photo_url,
      (SELECT latitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'entrada' 
       ORDER BY event_at ASC LIMIT 1) as entrada_latitude,
      (SELECT longitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'entrada' 
       ORDER BY event_at ASC LIMIT 1) as entrada_longitude,
      (SELECT endereco FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'entrada' 
       ORDER BY event_at ASC LIMIT 1) as entrada_endereco,
      (SELECT latitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'saida' 
       ORDER BY event_at DESC LIMIT 1) as saida_latitude,
      (SELECT longitude FROM rh.time_record_events 
       WHERE time_record_id = tr.id AND event_type = 'saida' 
       ORDER BY event_at DESC LIMIT 1) as saida_longitude,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'photo_url', p.photo_url,
            'event_type', evt.event_type,
            'event_at', evt.event_at,
            'event_id', p.event_id
          )
          ORDER BY evt.event_at ASC
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
      ) as all_photos,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', evt.id,
            'event_type', evt.event_type,
            'event_at', evt.event_at,
            'latitude', evt.latitude,
            'longitude', evt.longitude,
            'endereco', evt.endereco,
            'source', evt.source
          )
          ORDER BY evt.event_at ASC
        ) FILTER (WHERE evt.latitude IS NOT NULL OR evt.longitude IS NOT NULL),
        '[]'::jsonb
      ) as all_locations
    FROM rh.time_record_events evt
    LEFT JOIN rh.time_record_event_photos p ON p.event_id = evt.id
    WHERE evt.time_record_id = tr.id
  ) ev ON true
  WHERE tr.company_id = company_id_param
  ORDER BY tr.data_registro DESC, tr.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_time_records_simple IS 
  'Retorna todos os registros de ponto de uma empresa com informações de eventos, fotos e localizações.
   Inclui campo horas_noturnas para exibição no frontend.';

