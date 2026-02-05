-- =====================================================
-- CORRIGIR REGISTROS COM MÚLTIPLOS EVENTOS COMO 'entrada'
-- =====================================================
-- Data: 2026-01-29
-- Descrição: Alguns colaboradores registraram entrada almoço, saída almoço e saída
--            mas a UI enviou event_type 'entrada' para todos (ex.: refetch lento).
--            Este script identifica time_records com 2+ eventos tipo 'entrada',
--            reordena por event_at e reatribui: 1º=entrada, 2º=entrada_almoco,
--            3º=saida_almoco, 4º=saida, 5º=extra_inicio, 6º=extra_fim.
--            Atualiza rh.time_record_events.event_type e rh.time_records (colunas de hora).
-- =====================================================

CREATE OR REPLACE FUNCTION rh.fix_multiple_entrada_events(p_timezone text DEFAULT 'America/Sao_Paulo')
RETURNS TABLE (
  time_record_id uuid,
  data_registro date,
  employee_id uuid,
  events_fixed integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec RECORD;
  v_ev RECORD;
  v_ord int;
  v_new_type text;
  v_local_time time;
  v_types text[] := ARRAY['entrada','entrada_almoco','saida_almoco','saida','extra_inicio','extra_fim'];
BEGIN
  FOR v_rec IN
    SELECT tr.id AS rec_id, tr.employee_id, tr.company_id, tr.data_registro,
           (SELECT COUNT(*) FROM rh.time_record_events e WHERE e.time_record_id = tr.id AND e.event_type = 'entrada') AS entrada_count
    FROM rh.time_records tr
    WHERE tr.entrada IS NOT NULL
      AND tr.entrada_almoco IS NULL
      AND tr.saida_almoco IS NULL
      AND tr.saida IS NULL
      AND (SELECT COUNT(*) FROM rh.time_record_events e WHERE e.time_record_id = tr.id AND e.event_type = 'entrada') >= 2
  LOOP
    v_ord := 0;
    FOR v_ev IN
      SELECT e.id, e.event_at, e.event_type
      FROM rh.time_record_events e
      WHERE e.time_record_id = v_rec.rec_id
        AND e.event_type = 'entrada'
      ORDER BY e.event_at
    LOOP
      v_ord := v_ord + 1;
      IF v_ord <= array_length(v_types, 1) THEN
        v_new_type := v_types[v_ord];
        UPDATE rh.time_record_events SET event_type = v_new_type WHERE id = v_ev.id;
        v_local_time := (v_ev.event_at AT TIME ZONE p_timezone)::time;
        CASE v_new_type
          WHEN 'entrada' THEN
            UPDATE rh.time_records SET entrada = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'entrada_almoco' THEN
            UPDATE rh.time_records SET entrada_almoco = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'saida_almoco' THEN
            UPDATE rh.time_records SET saida_almoco = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'saida' THEN
            UPDATE rh.time_records SET saida = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'extra_inicio' THEN
            UPDATE rh.time_records SET entrada_extra1 = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'extra_fim' THEN
            UPDATE rh.time_records SET saida_extra1 = v_local_time WHERE id = v_rec.rec_id;
        END CASE;
      END IF;
    END LOOP;
    PERFORM rh.recalculate_time_record_hours(v_rec.rec_id);
    time_record_id := v_rec.rec_id;
    data_registro := v_rec.data_registro;
    employee_id := v_rec.employee_id;
    events_fixed := v_ord;
    details := jsonb_build_object('entrada_events_before', v_rec.entrada_count);
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Executar correção
DO $$
DECLARE
  r RECORD;
  n int := 0;
BEGIN
  FOR r IN SELECT * FROM rh.fix_multiple_entrada_events()
  LOOP
    n := n + 1;
    RAISE NOTICE 'Corrigido time_record % (data: %, employee: %): % eventos', r.time_record_id, r.data_registro, r.employee_id, r.events_fixed;
  END LOOP;
  RAISE NOTICE 'Total de registros corrigidos: %', n;
END;
$$;

COMMENT ON FUNCTION rh.fix_multiple_entrada_events IS 
'Corrige time_records que têm vários eventos com event_type=entrada, reatribuindo tipos na ordem: entrada, entrada_almoco, saida_almoco, saida, extra_inicio, extra_fim.';
