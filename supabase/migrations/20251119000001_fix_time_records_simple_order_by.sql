-- =====================================================
-- CORREÇÃO: ORDER BY na função get_time_records_simple
-- Garantir que registros sem employee também apareçam
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_time_records_simple(
  company_id_param uuid
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
  -- Novos campos: arrays com todas as fotos e localizações
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
    -- Array com todas as fotos do dia (ordenadas por event_at)
    ev.all_photos,
    -- Array com todas as localizações do dia (ordenadas por event_at)
    ev.all_locations
  FROM rh.time_records tr
  LEFT JOIN rh.employees e ON tr.employee_id = e.id
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
            'source', ee.source
          ) AS loc_obj
          FROM rh.time_record_events ee
          WHERE ee.time_record_id = tr.id
            AND (ee.latitude IS NOT NULL OR ee.longitude IS NOT NULL OR ee.endereco IS NOT NULL)
          ORDER BY ee.event_at ASC
        ) AS location_data
      ) AS all_locations
  ) ev ON TRUE
  WHERE tr.company_id = company_id_param
  -- CORREÇÃO: Usar COALESCE para tratar NULL em employee_nome no ORDER BY
  ORDER BY tr.data_registro DESC, COALESCE(e.nome, '') ASC, tr.created_at DESC;
END;
$$;

GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO service_role;







