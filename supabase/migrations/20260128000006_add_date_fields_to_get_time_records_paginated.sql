-- =====================================================
-- ADICIONAR CAMPOS *_date À FUNÇÃO get_time_records_paginated
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Adiciona campos *_date (entrada_date, saida_almoco_date, etc.)
--            à função get_time_records_paginated para permitir que as páginas
--            exibam a data real de cada marcação quando diferente de data_registro.
-- =====================================================

-- Remover função existente
DROP FUNCTION IF EXISTS public.get_time_records_paginated(
  uuid, integer, integer, uuid, date, date, varchar, uuid
);

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
  -- Novos campos de data real
  entrada_date date,
  entrada_almoco_date date,
  saida_almoco_date date,
  saida_date date,
  entrada_extra1_date date,
  saida_extra1_date date,
  base_date date,
  window_hours integer,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
  v_total_count bigint;
  v_auth_uid uuid;
  v_user_company_id uuid;
  v_timezone text := 'America/Sao_Paulo';
BEGIN
  -- Obter usuário autenticado
  v_auth_uid := auth.uid();
  
  -- Verificar acesso à empresa
  SELECT uc.company_id INTO v_user_company_id
  FROM public.user_companies uc
  WHERE uc.user_id = v_auth_uid
    AND uc.company_id = company_id_param
    AND uc.ativo = true
  LIMIT 1;

  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
  END IF;

  -- Calcular total de registros (antes da paginação)
  SELECT COUNT(*)
  INTO v_total_count
  FROM rh.time_records tr
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter)
    AND (
      manager_user_id_filter IS NULL OR
      EXISTS (
        SELECT 1 FROM rh.employees e
        WHERE e.id = tr.employee_id
          AND (
            -- Caso 1: gestor_imediato_id é o user_id diretamente
            e.gestor_imediato_id = manager_user_id_filter
            OR
            -- Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
            EXISTS (
              SELECT 1 
              FROM rh.employees gestor_employee
              WHERE gestor_employee.id = e.gestor_imediato_id
                AND gestor_employee.user_id = manager_user_id_filter
            )
          )
      )
    );

  -- Retornar registros paginados com datas reais dos eventos
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
    -- Buscar datas reais dos eventos
    (SELECT (tre.event_at AT TIME ZONE v_timezone)::date
     FROM rh.time_record_events tre
     WHERE tre.time_record_id = tr.id
       AND tre.event_type = 'entrada'
     ORDER BY tre.event_at ASC
     LIMIT 1) as entrada_date,
    (SELECT (tre.event_at AT TIME ZONE v_timezone)::date
     FROM rh.time_record_events tre
     WHERE tre.time_record_id = tr.id
       AND tre.event_type = 'entrada_almoco'
     ORDER BY tre.event_at ASC
     LIMIT 1) as entrada_almoco_date,
    (SELECT (tre.event_at AT TIME ZONE v_timezone)::date
     FROM rh.time_record_events tre
     WHERE tre.time_record_id = tr.id
       AND tre.event_type = 'saida_almoco'
     ORDER BY tre.event_at ASC
     LIMIT 1) as saida_almoco_date,
    (SELECT (tre.event_at AT TIME ZONE v_timezone)::date
     FROM rh.time_record_events tre
     WHERE tre.time_record_id = tr.id
       AND tre.event_type = 'saida'
     ORDER BY tre.event_at ASC
     LIMIT 1) as saida_date,
    (SELECT (tre.event_at AT TIME ZONE v_timezone)::date
     FROM rh.time_record_events tre
     WHERE tre.time_record_id = tr.id
       AND tre.event_type = 'extra_inicio'
     ORDER BY tre.event_at ASC
     LIMIT 1) as entrada_extra1_date,
    (SELECT (tre.event_at AT TIME ZONE v_timezone)::date
     FROM rh.time_record_events tre
     WHERE tre.time_record_id = tr.id
       AND tre.event_type = 'extra_fim'
     ORDER BY tre.event_at ASC
     LIMIT 1) as saida_extra1_date,
    tr.data_registro as base_date, -- data_registro é a base_date
    (SELECT COALESCE(trs.janela_tempo_marcacoes, 24)
     FROM rh.time_record_settings trs
     WHERE trs.company_id = company_id_param
     LIMIT 1) as window_hours,
    v_total_count as total_count
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON tr.employee_id = e.id
  LEFT JOIN LATERAL (
    SELECT
      (SELECT COUNT(1) FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id) AS stats_events_count,
      (SELECT photo_url 
       FROM rh.time_record_events ee
       JOIN rh.time_record_event_photos ep ON ep.event_id = ee.id
       WHERE ee.time_record_id = tr.id
       ORDER BY ee.event_at ASC
       LIMIT 1) AS first_event_photo_url,
      (SELECT latitude FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id AND ee.event_type = 'entrada' ORDER BY ee.event_at ASC LIMIT 1) AS entrada_latitude,
      (SELECT longitude FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id AND ee.event_type = 'entrada' ORDER BY ee.event_at ASC LIMIT 1) AS entrada_longitude,
      (SELECT endereco FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id AND ee.event_type = 'entrada' ORDER BY ee.event_at ASC LIMIT 1) AS entrada_endereco,
      (SELECT latitude FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id AND ee.event_type = 'saida' ORDER BY ee.event_at DESC LIMIT 1) AS saida_latitude,
      (SELECT longitude FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id AND ee.event_type = 'saida' ORDER BY ee.event_at DESC LIMIT 1) AS saida_longitude,
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ep.id,
          'photo_url', ep.photo_url,
          'event_type', ee.event_type,
          'event_at', ee.event_at,
          'event_id', ee.id
        ) ORDER BY ee.event_at
      )
      FROM rh.time_record_events ee
      JOIN rh.time_record_event_photos ep ON ep.event_id = ee.id
      WHERE ee.time_record_id = tr.id) AS all_photos,
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ee.id,
          'event_type', ee.event_type,
          'event_at', ee.event_at,
          'latitude', ee.latitude,
          'longitude', ee.longitude,
          'endereco', ee.endereco,
          'accuracy_meters', ee.accuracy_meters
        ) ORDER BY ee.event_at
      )
      FROM rh.time_record_events ee
      WHERE ee.time_record_id = tr.id
        AND (ee.latitude IS NOT NULL OR ee.longitude IS NOT NULL)) AS all_locations
  ) ev ON true
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter)
    AND (
      manager_user_id_filter IS NULL OR
      (
        -- Caso 1: gestor_imediato_id é o user_id diretamente
        e.gestor_imediato_id = manager_user_id_filter
        OR
        -- Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
        EXISTS (
          SELECT 1 
          FROM rh.employees gestor_employee
          WHERE gestor_employee.id = e.gestor_imediato_id
            AND gestor_employee.user_id = manager_user_id_filter
        )
      )
    )
  ORDER BY tr.data_registro DESC, e.nome ASC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

COMMENT ON FUNCTION public.get_time_records_paginated IS 
'Busca registros de ponto paginados com filtros.
Agora inclui campos *_date que indicam a data real de cada marcação quando diferente de data_registro.
Esses campos são obtidos de time_record_events.event_at para garantir precisão.';

GRANT EXECUTE ON FUNCTION public.get_time_records_paginated(uuid, integer, integer, uuid, date, date, varchar, uuid) TO authenticated;
