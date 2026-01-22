-- =====================================================
-- Adicionar logs detalhados à função get_time_records_paginated
-- Para diagnosticar problema de gestor não ver registros
-- =====================================================

-- Remover a função existente primeiro para evitar conflito de tipos
DROP FUNCTION IF EXISTS public.get_time_records_paginated(
  uuid,
  integer,
  integer,
  uuid,
  date,
  date,
  varchar,
  uuid
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
  v_auth_uid uuid;
  v_user_has_access boolean;
  v_manager_filter_applied boolean;
  v_registros_antes_filtro_gestor bigint;
  v_registros_apos_filtro_gestor bigint;
  rec RECORD;
BEGIN
  -- Obter auth.uid() para logs
  v_auth_uid := auth.uid();
  
  -- Log inicial
  RAISE NOTICE '[get_time_records_paginated] INÍCIO - Parâmetros recebidos:';
  RAISE NOTICE '  company_id_param: %', company_id_param;
  RAISE NOTICE '  page_offset: %', page_offset;
  RAISE NOTICE '  page_limit: %', page_limit;
  RAISE NOTICE '  employee_id_filter: %', employee_id_filter;
  RAISE NOTICE '  start_date_filter: %', start_date_filter;
  RAISE NOTICE '  end_date_filter: %', end_date_filter;
  RAISE NOTICE '  status_filter: %', status_filter;
  RAISE NOTICE '  manager_user_id_filter: %', manager_user_id_filter;
  RAISE NOTICE '  auth.uid(): %', v_auth_uid;
  
  -- Access check: current user must belong to the company
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = v_auth_uid
      AND uc.company_id = company_id_param
      AND uc.ativo = true
  ) INTO v_user_has_access;
  
  RAISE NOTICE '[get_time_records_paginated] Verificação de acesso:';
  RAISE NOTICE '  v_user_has_access: %', v_user_has_access;
  
  IF NOT v_user_has_access THEN
    RAISE NOTICE '[get_time_records_paginated] ❌ ACESSO NEGADO - Usuário não tem acesso a esta empresa';
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' USING ERRCODE = '42501';
  END IF;

  -- Contar registros antes do filtro de gestor
  SELECT COUNT(*)
  INTO v_registros_antes_filtro_gestor
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON tr.employee_id = e.id
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter);
  
  RAISE NOTICE '[get_time_records_paginated] Registros antes do filtro de gestor: %', v_registros_antes_filtro_gestor;

  -- Calcular total de registros (antes da paginação) para retornar junto
  SELECT COUNT(*)
  INTO v_total_count
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON tr.employee_id = e.id
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter)
    -- Filtro de gestor: se manager_user_id_filter for fornecido, filtrar apenas funcionários gerenciados
    AND (
      manager_user_id_filter IS NULL 
      OR (
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
    );
  
  v_registros_apos_filtro_gestor := v_total_count;
  v_manager_filter_applied := manager_user_id_filter IS NOT NULL;
  
  RAISE NOTICE '[get_time_records_paginated] Filtro de gestor aplicado: %', v_manager_filter_applied;
  RAISE NOTICE '[get_time_records_paginated] Registros após filtro de gestor: %', v_registros_apos_filtro_gestor;
  
  -- Se manager_user_id_filter foi fornecido, listar funcionários gerenciados
  IF manager_user_id_filter IS NOT NULL THEN
    RAISE NOTICE '[get_time_records_paginated] Funcionários gerenciados pelo gestor %:', manager_user_id_filter;
    
    FOR rec IN 
      SELECT DISTINCT e.id, e.nome, e.gestor_imediato_id
      FROM rh.employees e
      WHERE e.company_id = company_id_param
        AND (
          e.gestor_imediato_id = manager_user_id_filter
          OR EXISTS (
            SELECT 1 
            FROM rh.employees gestor_employee
            WHERE gestor_employee.id = e.gestor_imediato_id
              AND gestor_employee.user_id = manager_user_id_filter
          )
        )
    LOOP
      RAISE NOTICE '  - Funcionário: % (id: %, gestor_imediato_id: %)', rec.nome, rec.id, rec.gestor_imediato_id;
    END LOOP;
  END IF;

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
      (SELECT COUNT(1) FROM rh.time_record_events ee WHERE ee.time_record_id = tr.id) AS stats_events_count,
      (
        SELECT p.photo_url
        FROM rh.time_record_events ee
        JOIN rh.time_record_event_photos p ON p.event_id = ee.id
        WHERE ee.time_record_id = tr.id
        ORDER BY ee.event_at ASC, p.created_at ASC
        LIMIT 1
      ) AS first_event_photo_url,
      (
        SELECT ee.latitude
        FROM rh.time_record_events ee
        WHERE ee.time_record_id = tr.id AND ee.event_type = 'entrada'
        ORDER BY ee.event_at ASC
        LIMIT 1
      ) AS entrada_latitude,
      (
        SELECT ee.longitude
        FROM rh.time_record_events ee
        WHERE ee.time_record_id = tr.id AND ee.event_type = 'entrada'
        ORDER BY ee.event_at ASC
        LIMIT 1
      ) AS entrada_longitude,
      (
        SELECT ee.endereco
        FROM rh.time_record_events ee
        WHERE ee.time_record_id = tr.id AND ee.event_type = 'entrada'
        ORDER BY ee.event_at ASC
        LIMIT 1
      ) AS entrada_endereco,
      (
        SELECT ee.latitude
        FROM rh.time_record_events ee
        WHERE ee.time_record_id = tr.id AND ee.event_type = 'saida'
        ORDER BY ee.event_at DESC
        LIMIT 1
      ) AS saida_latitude,
      (
        SELECT ee.longitude
        FROM rh.time_record_events ee
        WHERE ee.time_record_id = tr.id AND ee.event_type = 'saida'
        ORDER BY ee.event_at DESC
        LIMIT 1
      ) AS saida_longitude,
      -- Array JSON com todas as fotos do dia
      (
        SELECT COALESCE(jsonb_agg(photo_obj), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', p.id::text,
            'photo_url', p.photo_url,
            'event_type', ee.event_type,
            'event_at', ee.event_at::text,
            'event_id', ee.id::text
          ) AS photo_obj
          FROM rh.time_record_events ee
          JOIN rh.time_record_event_photos p ON p.event_id = ee.id
          WHERE ee.time_record_id = tr.id
          ORDER BY ee.event_at ASC, p.created_at ASC
        ) AS photo_data
      ) AS all_photos,
      -- Array JSON com todas as localizações do dia
      (
        SELECT COALESCE(jsonb_agg(loc_obj), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', ee.id::text,
            'event_type', ee.event_type,
            'event_at', ee.event_at::text,
            'latitude', ee.latitude,
            'longitude', ee.longitude,
            'endereco', ee.endereco,
            'source', 'time_record_events'
          ) AS loc_obj
          FROM rh.time_record_events ee
          WHERE ee.time_record_id = tr.id
            AND (ee.latitude IS NOT NULL OR ee.longitude IS NOT NULL OR ee.endereco IS NOT NULL)
          ORDER BY ee.event_at ASC
        ) AS loc_data
      ) AS all_locations
  ) ev ON TRUE
  WHERE tr.company_id = company_id_param
    AND (employee_id_filter IS NULL OR tr.employee_id = employee_id_filter)
    AND (start_date_filter IS NULL OR tr.data_registro >= start_date_filter)
    AND (end_date_filter IS NULL OR tr.data_registro <= end_date_filter)
    AND (status_filter IS NULL OR tr.status = status_filter)
    -- Filtro de gestor: se manager_user_id_filter for fornecido, filtrar apenas funcionários gerenciados
    AND (
      manager_user_id_filter IS NULL 
      OR (
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
  ORDER BY tr.data_registro DESC, e.nome
  LIMIT page_limit
  OFFSET page_offset;
  
  RAISE NOTICE '[get_time_records_paginated] ✅ FIM - Retornando % registros (total: %)', page_limit, v_total_count;
END;
$$;

COMMENT ON FUNCTION public.get_time_records_paginated IS 
'Retorna registros de ponto paginados com filtros aplicados no servidor.
Quando manager_user_id_filter é fornecido, retorna apenas registros de funcionários gerenciados pelo gestor.
Versão com logs detalhados para diagnóstico.';
