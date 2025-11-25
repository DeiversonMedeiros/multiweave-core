-- =====================================================
-- Adiciona flags para identificar registros fora da zona permitida
-- =====================================================

-- Garantir coluna nas batidas agregadas (time_records)
ALTER TABLE IF EXISTS rh.time_records
  ADD COLUMN IF NOT EXISTS outside_zone boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_time_records_outside_zone_true
  ON rh.time_records(outside_zone)
  WHERE outside_zone = true;

-- Garantir coluna nos eventos individuais (time_record_events)
ALTER TABLE IF EXISTS rh.time_record_events
  ADD COLUMN IF NOT EXISTS outside_zone boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_time_record_events_outside_zone_true
  ON rh.time_record_events(outside_zone)
  WHERE outside_zone = true;

