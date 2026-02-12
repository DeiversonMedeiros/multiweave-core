-- =====================================================
-- RECALCULAR REGISTRO DO GILCIMAR DO DIA 21/01/2026
-- =====================================================
-- Data: 2026-02-09
-- Descrição: Recalcula especificamente o registro do dia 21/01/2026
--            do funcionário GILCIMAR OLIVEIRA DA SILVA
-- =====================================================

-- Verificar registro antes
SELECT 
  '=== ANTES DO RECALCULO ===' as info,
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras,
  tr.horas_faltas,
  e.nome
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro = '2026-01-21';

-- Verificar eventos
SELECT 
  '=== EVENTOS ===' as info,
  tre.id,
  tre.event_type,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' as event_at_local,
  (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::date as event_date_local,
  (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::time as event_time_local
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro = '2026-01-21'
ORDER BY tre.event_at;

-- Recalcular
DO $$
DECLARE
  v_record_id uuid;
BEGIN
  SELECT tr.id INTO v_record_id
  FROM rh.time_records tr
  JOIN public.users e ON tr.employee_id = e.id
  WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
    AND tr.data_registro = '2026-01-21'
  LIMIT 1;

  IF v_record_id IS NOT NULL THEN
    PERFORM rh.recalculate_time_record_hours(v_record_id);
    RAISE NOTICE 'Registro recalculado: %', v_record_id;
  ELSE
    RAISE NOTICE 'Registro não encontrado';
  END IF;
END $$;

-- Verificar registro depois
SELECT 
  '=== DEPOIS DO RECALCULO ===' as info,
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras,
  tr.horas_faltas,
  e.nome
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro = '2026-01-21';
