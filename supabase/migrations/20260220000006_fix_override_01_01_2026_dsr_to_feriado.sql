-- =====================================================
-- Corrigir natureza do dia em 01/01/2026 quando for feriado
-- 1) Overrides salvos como DSR -> feriado (ex.: LEONARDO SILVA PEREIRA)
-- 2) time_records com natureza_dia = 'dsr' nessa data -> feriado
-- =====================================================

-- 1) Override: DSR em 01/01/2026 em empresa que tem feriado nessa data
UPDATE rh.time_record_day_nature_override o
SET natureza_dia = 'feriado', updated_at = NOW()
WHERE o.data_registro = '2026-01-01'
  AND o.natureza_dia = 'dsr'
  AND EXISTS (
    SELECT 1 FROM rh.holidays h
    WHERE h.company_id = o.company_id
      AND h.data = '2026-01-01'
      AND h.ativo = true
  );

-- 2) time_records: natureza_dia = 'dsr' em 01/01/2026 em empresa que tem feriado
UPDATE rh.time_records tr
SET natureza_dia = 'feriado', updated_at = NOW()
WHERE tr.data_registro::date = '2026-01-01'
  AND tr.natureza_dia = 'dsr'
  AND EXISTS (
    SELECT 1 FROM rh.holidays h
    WHERE h.company_id = tr.company_id
      AND h.data = '2026-01-01'
      AND h.ativo = true
  );
