-- =====================================================
-- Create event-based punch model for time records
-- - rh.time_record_events: one row per punch (entrada/saida/etc.)
-- - rh.time_record_event_photos: 0..N photos per event
-- - RLS policies analogous to rh.time_records
-- - Function rh.recalculate_time_record_hours to keep daily aggregates
-- - Triggers to recalculate on event changes
-- - Backfill from existing rh.time_records (non-destructive)
-- =====================================================

-- 1) Tables
CREATE TABLE IF NOT EXISTS rh.time_record_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_record_id uuid NOT NULL REFERENCES rh.time_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  event_type varchar(20) NOT NULL CHECK (event_type IN (
    'entrada','saida','entrada_almoco','saida_almoco','extra_inicio','extra_fim','manual'
  )),
  event_at timestamptz NOT NULL,
  latitude decimal(10,8),
  longitude decimal(11,8),
  endereco text,
  source varchar(20) DEFAULT 'gps' CHECK (source IN ('gps','wifi','manual')),
  accuracy_meters numeric(6,2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_record_events_record ON rh.time_record_events(time_record_id);
CREATE INDEX IF NOT EXISTS idx_time_record_events_employee_date ON rh.time_record_events(employee_id, (date_trunc('day', event_at)));
CREATE INDEX IF NOT EXISTS idx_time_record_events_company_date ON rh.time_record_events(company_id, (date_trunc('day', event_at)));

CREATE TABLE IF NOT EXISTS rh.time_record_event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES rh.time_record_events(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_record_event_photos_event ON rh.time_record_event_photos(event_id);

-- 2) RLS policies (mirroring rh.time_records)
ALTER TABLE rh.time_record_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.time_record_event_photos ENABLE ROW LEVEL SECURITY;

-- View policies
CREATE POLICY IF NOT EXISTS "Users can view time_record_events from their company"
ON rh.time_record_events FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY IF NOT EXISTS "Users can insert time_record_events in their company"
ON rh.time_record_events FOR INSERT WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY IF NOT EXISTS "Users can update time_record_events from their company"
ON rh.time_record_events FOR UPDATE USING (
  company_id IN (
    SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY IF NOT EXISTS "Users can delete time_record_events from their company"
ON rh.time_record_events FOR DELETE USING (
  company_id IN (
    SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Photos policies (via event -> company)
CREATE POLICY IF NOT EXISTS "Users can view time_record_event_photos from their company"
ON rh.time_record_event_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM rh.time_record_events e
    WHERE e.id = event_id AND e.company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

CREATE POLICY IF NOT EXISTS "Users can insert time_record_event_photos in their company"
ON rh.time_record_event_photos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM rh.time_record_events e
    WHERE e.id = event_id AND e.company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

CREATE POLICY IF NOT EXISTS "Users can update time_record_event_photos from their company"
ON rh.time_record_event_photos FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM rh.time_record_events e
    WHERE e.id = event_id AND e.company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

CREATE POLICY IF NOT EXISTS "Users can delete time_record_event_photos from their company"
ON rh.time_record_event_photos FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM rh.time_record_events e
    WHERE e.id = event_id AND e.company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true
    )
  )
);

-- 3) Recalculation function
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
  v_horas_faltas numeric(4,2);
  v_last_event_at timestamptz;
BEGIN
  SELECT employee_id, company_id, data_registro, horas_faltas
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas
  FROM rh.time_records
  WHERE id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Map each event_type to the first occurrence of the day
  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_almoco
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at DESC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_entrada_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC
  LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time
  INTO v_saida_extra1
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
  ORDER BY event_at DESC
  LIMIT 1;

  -- Calculate hours worked = (saida-entrada) - (saida_almoco-entrada_almoco)
  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida) - (v_date + v_entrada))) / 3600
      - COALESCE(EXTRACT(EPOCH FROM (
          CASE WHEN v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL
               THEN ((v_date + v_saida_almoco) - (v_date + v_entrada_almoco))
               ELSE INTERVAL '0 minute' END
        )) / 3600, 0), 2
    );
  ELSE
    v_horas_trabalhadas := 0;
  END IF;

  -- Calculate extra hours (first extra window only for now)
  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extras := round(
      EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600
    , 2);
  ELSE
    v_horas_extras := 0;
  END IF;

  -- Keep faltas as-is if previously set; if NULL, default to 0
  v_horas_faltas := COALESCE(v_horas_faltas, 0);

  -- Usar o event_at mais recente como referência para updated_at
  -- Isso preserva o timezone do último registro de ponto
  SELECT MAX(event_at) INTO v_last_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  -- Se não houver eventos, usar NOW() como fallback
  IF v_last_event_at IS NULL THEN
    v_last_event_at := now();
  END IF;

  UPDATE rh.time_records
  SET 
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1,
    horas_trabalhadas = v_horas_trabalhadas,
    horas_extras = v_horas_extras,
    horas_faltas = v_horas_faltas,
    updated_at = v_last_event_at  -- Usar event_at do último evento ao invés de now()
  WHERE id = p_time_record_id;
END;
$$;

-- 4) Triggers on events to recalc aggregates
CREATE OR REPLACE FUNCTION rh.trg_time_record_events_recalc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_id := OLD.time_record_id;
  ELSE
    v_id := NEW.time_record_id;
  END IF;
  PERFORM rh.recalculate_time_record_hours(v_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_after_change_recalc ON rh.time_record_events;
CREATE TRIGGER trg_after_change_recalc
AFTER INSERT OR UPDATE OR DELETE ON rh.time_record_events
FOR EACH ROW EXECUTE FUNCTION rh.trg_time_record_events_recalc();

-- 5) Backfill existing data into events (non-destructive)
DO $$
DECLARE 
  r RECORD;
  v_event_id uuid;
  v_ts timestamptz;
BEGIN
  FOR r IN 
    SELECT tr.* FROM rh.time_records tr
  LOOP
    -- entrada
    IF r.entrada IS NOT NULL THEN
      v_ts := (r.data_registro + r.entrada)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at, latitude, longitude, endereco, source)
      VALUES (r.id, r.employee_id, r.company_id, 'entrada', v_ts, r.latitude, r.longitude, r.endereco, COALESCE(r.localizacao_type, 'gps'))
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_event_id;

      -- link any existing daily photo to the entrada event
      IF v_event_id IS NOT NULL AND r.foto_url IS NOT NULL THEN
        INSERT INTO rh.time_record_event_photos(event_id, photo_url)
        VALUES (v_event_id, r.foto_url)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- saida
    IF r.saida IS NOT NULL THEN
      v_ts := (r.data_registro + r.saida)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      VALUES (r.id, r.employee_id, r.company_id, 'saida', v_ts)
      ON CONFLICT DO NOTHING;
    END IF;

    -- entrada_almoco
    IF r.entrada_almoco IS NOT NULL THEN
      v_ts := (r.data_registro + r.entrada_almoco)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      VALUES (r.id, r.employee_id, r.company_id, 'entrada_almoco', v_ts)
      ON CONFLICT DO NOTHING;
    END IF;

    -- saida_almoco
    IF r.saida_almoco IS NOT NULL THEN
      v_ts := (r.data_registro + r.saida_almoco)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      VALUES (r.id, r.employee_id, r.company_id, 'saida_almoco', v_ts)
      ON CONFLICT DO NOTHING;
    END IF;

    -- extra window 1
    IF r.entrada_extra1 IS NOT NULL THEN
      v_ts := (r.data_registro + r.entrada_extra1)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      VALUES (r.id, r.employee_id, r.company_id, 'extra_inicio', v_ts)
      ON CONFLICT DO NOTHING;
    END IF;

    IF r.saida_extra1 IS NOT NULL THEN
      v_ts := (r.data_registro + r.saida_extra1)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      VALUES (r.id, r.employee_id, r.company_id, 'extra_fim', v_ts)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Recalculate aggregates for each record after inserts
    PERFORM rh.recalculate_time_record_hours(r.id);
  END LOOP;
END $$;

-- Notes:
-- - event_at timezone: we currently cast (date + time) to timestamp (server tz). If your
--   instance stores local timezones per company, adjust to apply that offset.
-- - horas_faltas is preserved if already set on the daily record; otherwise defaults to 0.


