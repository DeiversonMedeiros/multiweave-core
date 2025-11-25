-- =====================================================
-- Finalize time record events setup after partial apply
-- =====================================================

-- Photos table (if missing)
CREATE TABLE IF NOT EXISTS rh.time_record_event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES rh.time_record_events(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_record_event_photos_event ON rh.time_record_event_photos(event_id);

-- Enable RLS
ALTER TABLE rh.time_record_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.time_record_event_photos ENABLE ROW LEVEL SECURITY;

-- Policies for events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_events' AND policyname = 'Users can view time_record_events from their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view time_record_events from their company" ON rh.time_record_events FOR SELECT USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_events' AND policyname = 'Users can insert time_record_events in their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert time_record_events in their company" ON rh.time_record_events FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_events' AND policyname = 'Users can update time_record_events from their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update time_record_events from their company" ON rh.time_record_events FOR UPDATE USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_events' AND policyname = 'Users can delete time_record_events from their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete time_record_events from their company" ON rh.time_record_events FOR DELETE USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true))';
  END IF;
END $$;

-- Policies for photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_event_photos' AND policyname = 'Users can view time_record_event_photos from their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view time_record_event_photos from their company" ON rh.time_record_event_photos FOR SELECT USING (EXISTS (SELECT 1 FROM rh.time_record_events e WHERE e.id = event_id AND e.company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true)))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_event_photos' AND policyname = 'Users can insert time_record_event_photos in their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert time_record_event_photos in their company" ON rh.time_record_event_photos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM rh.time_record_events e WHERE e.id = event_id AND e.company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true)))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_event_photos' AND policyname = 'Users can update time_record_event_photos from their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update time_record_event_photos from their company" ON rh.time_record_event_photos FOR UPDATE USING (EXISTS (SELECT 1 FROM rh.time_record_events e WHERE e.id = event_id AND e.company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true)))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'rh' AND tablename = 'time_record_event_photos' AND policyname = 'Users can delete time_record_event_photos from their company'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete time_record_event_photos from their company" ON rh.time_record_event_photos FOR DELETE USING (EXISTS (SELECT 1 FROM rh.time_record_events e WHERE e.id = event_id AND e.company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true)))';
  END IF;
END $$;

-- Recreate recalculation function and triggers to ensure present
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
BEGIN
  SELECT employee_id, company_id, data_registro, horas_faltas
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas
  FROM rh.time_records
  WHERE id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT (event_at AT TIME ZONE 'UTC')::time INTO v_entrada
  FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time INTO v_saida
  FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida'
  ORDER BY event_at DESC LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time INTO v_entrada_almoco
  FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time INTO v_saida_almoco
  FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
  ORDER BY event_at DESC LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time INTO v_entrada_extra1
  FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
  ORDER BY event_at ASC LIMIT 1;

  SELECT (event_at AT TIME ZONE 'UTC')::time INTO v_saida_extra1
  FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
  ORDER BY event_at DESC LIMIT 1;

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

  IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
    v_horas_extras := round(EXTRACT(EPOCH FROM ((v_date + v_saida_extra1) - (v_date + v_entrada_extra1))) / 3600, 2);
  ELSE
    v_horas_extras := 0;
  END IF;

  v_horas_faltas := COALESCE(v_horas_faltas, 0);

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
    updated_at = now()
  WHERE id = p_time_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION rh.trg_time_record_events_recalc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE v_id uuid; BEGIN
  IF (TG_OP = 'DELETE') THEN v_id := OLD.time_record_id; ELSE v_id := NEW.time_record_id; END IF;
  PERFORM rh.recalculate_time_record_hours(v_id);
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_after_change_recalc ON rh.time_record_events;
CREATE TRIGGER trg_after_change_recalc
AFTER INSERT OR UPDATE OR DELETE ON rh.time_record_events
FOR EACH ROW EXECUTE FUNCTION rh.trg_time_record_events_recalc();

-- Backfill (idempotent best-effort)
DO $$
DECLARE r RECORD; v_event_id uuid; v_ts timestamptz; BEGIN
  FOR r IN SELECT tr.* FROM rh.time_records tr LOOP
    IF r.entrada IS NOT NULL THEN
      v_ts := (r.data_registro + r.entrada)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at, latitude, longitude, endereco, source)
      SELECT r.id, r.employee_id, r.company_id, 'entrada', v_ts, r.latitude, r.longitude, r.endereco, COALESCE(r.localizacao_type, 'gps')
      WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_events ee WHERE ee.time_record_id = r.id AND ee.event_type = 'entrada' AND ee.event_at = v_ts
      )
      RETURNING id INTO v_event_id;
      IF v_event_id IS NOT NULL AND r.foto_url IS NOT NULL THEN
        INSERT INTO rh.time_record_event_photos(event_id, photo_url)
        SELECT v_event_id, r.foto_url
        WHERE NOT EXISTS (
          SELECT 1 FROM rh.time_record_event_photos p WHERE p.event_id = v_event_id AND p.photo_url = r.foto_url
        );
      END IF;
    END IF;

    IF r.saida IS NOT NULL THEN
      v_ts := (r.data_registro + r.saida)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      SELECT r.id, r.employee_id, r.company_id, 'saida', v_ts
      WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_events ee WHERE ee.time_record_id = r.id AND ee.event_type = 'saida' AND ee.event_at = v_ts
      );
    END IF;

    IF r.entrada_almoco IS NOT NULL THEN
      v_ts := (r.data_registro + r.entrada_almoco)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      SELECT r.id, r.employee_id, r.company_id, 'entrada_almoco', v_ts
      WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_events ee WHERE ee.time_record_id = r.id AND ee.event_type = 'entrada_almoco' AND ee.event_at = v_ts
      );
    END IF;

    IF r.saida_almoco IS NOT NULL THEN
      v_ts := (r.data_registro + r.saida_almoco)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      SELECT r.id, r.employee_id, r.company_id, 'saida_almoco', v_ts
      WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_events ee WHERE ee.time_record_id = r.id AND ee.event_type = 'saida_almoco' AND ee.event_at = v_ts
      );
    END IF;

    IF r.entrada_extra1 IS NOT NULL THEN
      v_ts := (r.data_registro + r.entrada_extra1)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      SELECT r.id, r.employee_id, r.company_id, 'extra_inicio', v_ts
      WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_events ee WHERE ee.time_record_id = r.id AND ee.event_type = 'extra_inicio' AND ee.event_at = v_ts
      );
    END IF;

    IF r.saida_extra1 IS NOT NULL THEN
      v_ts := (r.data_registro + r.saida_extra1)::timestamp;
      INSERT INTO rh.time_record_events(time_record_id, employee_id, company_id, event_type, event_at)
      SELECT r.id, r.employee_id, r.company_id, 'extra_fim', v_ts
      WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_events ee WHERE ee.time_record_id = r.id AND ee.event_type = 'extra_fim' AND ee.event_at = v_ts
      );
    END IF;

    PERFORM rh.recalculate_time_record_hours(r.id);
  END LOOP;
END $$;


