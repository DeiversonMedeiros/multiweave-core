-- =====================================================
-- NATUREZA DO DIA: adicionar "Folga Débito"
-- =====================================================
-- Permite selecionar "Folga Débito" na natureza do dia;
-- quando selecionada, o sistema gera horas negativas (débito) no dia.
-- =====================================================

-- 1. rh.time_records: permitir 'folga_debito' em natureza_dia
ALTER TABLE rh.time_records
  DROP CONSTRAINT IF EXISTS time_records_natureza_dia_check;

ALTER TABLE rh.time_records
  ADD CONSTRAINT time_records_natureza_dia_check
  CHECK (
    natureza_dia IS NULL
    OR natureza_dia IN (
      'normal', 'dsr', 'folga', 'folga_debito', 'feriado', 'ferias',
      'atestado', 'compensacao', 'falta', 'outros'
    )
  );

-- 2. rh.time_record_day_nature_override: permitir 'folga_debito'
ALTER TABLE rh.time_record_day_nature_override
  DROP CONSTRAINT IF EXISTS time_record_day_nature_override_natureza_check;

ALTER TABLE rh.time_record_day_nature_override
  ADD CONSTRAINT time_record_day_nature_override_natureza_check
  CHECK (natureza_dia IN (
    'normal', 'dsr', 'folga', 'folga_debito', 'feriado', 'ferias',
    'atestado', 'compensacao', 'falta', 'outros'
  ));

COMMENT ON COLUMN rh.time_records.natureza_dia IS
  'Natureza do dia: normal, DSR, folga, folga_debito (folga com débito de horas), feriado, férias, atestado, compensação, falta, outros. NULL = detecção automática.';

COMMENT ON COLUMN rh.time_record_day_nature_override.natureza_dia IS
  'Natureza do dia: normal, dsr, folga, folga_debito, feriado, ferias, atestado, compensacao, falta, outros.';
