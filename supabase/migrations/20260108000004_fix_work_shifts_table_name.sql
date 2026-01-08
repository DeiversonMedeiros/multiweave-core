-- =====================================================
-- CORREÇÃO: NOME DA TABELA work_shifts
-- =====================================================
-- Data: 2026-01-08
-- Descrição: Corrige o nome da tabela de rh.shifts para rh.work_shifts
--            na função recalculate_time_record_hours
-- =====================================================

-- Aplicar apenas a correção do nome da tabela
DO $$
BEGIN
  -- Substituir rh.shifts por rh.work_shifts na função
  EXECUTE format('
    CREATE OR REPLACE FUNCTION rh.recalculate_time_record_hours(p_time_record_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    AS $func$
    %s
    $func$;
  ', 
    REPLACE(
      REPLACE(
        pg_get_functiondef('rh.recalculate_time_record_hours'::regproc)::text,
        'INNER JOIN rh.shifts s ON s.id = es.shift_id',
        'INNER JOIN rh.work_shifts s ON s.id = es.shift_id'
      ),
      'LEFT JOIN rh.shifts s ON s.id = e.work_shift_id',
      'LEFT JOIN rh.work_shifts s ON s.id = e.work_shift_id'
    )
  );
END $$;

