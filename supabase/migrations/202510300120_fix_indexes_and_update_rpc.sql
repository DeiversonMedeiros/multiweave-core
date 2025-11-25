-- =====================================================
-- Fix: immutable index expressions + recreate RPC with extended return
-- =====================================================

-- Create missing indexes using immutable casts instead of date_trunc
DO $$
BEGIN
  -- employee_id + event_at (use direct column to avoid expression immutability issues)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'rh' AND indexname = 'idx_time_record_events_employee_eventat'
  ) THEN
    EXECUTE 'CREATE INDEX idx_time_record_events_employee_eventat ON rh.time_record_events(employee_id, event_at)';
  END IF;

  -- company_id + event_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'rh' AND indexname = 'idx_time_record_events_company_eventat'
  ) THEN
    EXECUTE 'CREATE INDEX idx_time_record_events_company_eventat ON rh.time_record_events(company_id, event_at)';
  END IF;
END $$;

-- Recreate RPC with new return columns (must DROP first due to return type change)
DROP FUNCTION IF EXISTS public.get_time_records_simple(uuid);

CREATE FUNCTION public.get_time_records_simple(
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
  -- New optional fields (event-derived)
  events_count integer,
  first_event_photo_url text,
  entrada_latitude numeric,
  entrada_longitude numeric,
  saida_latitude numeric,
  saida_longitude numeric
) LANGUAGE plpgsql AS $$
BEGIN
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
    -- event-derived
    ev.stats_events_count,
    ev.first_event_photo_url,
    ev.entrada_latitude,
    ev.entrada_longitude,
    ev.saida_latitude,
    ev.saida_longitude
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
      ) AS saida_longitude
  ) ev ON TRUE
  WHERE tr.company_id = company_id_param
  ORDER BY tr.data_registro DESC, e.nome;
END;
$$;

GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO service_role;


