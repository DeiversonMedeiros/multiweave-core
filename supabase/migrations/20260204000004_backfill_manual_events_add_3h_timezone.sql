-- =====================================================
-- BACKFILL: Ajustar event_at dos eventos manuais (+3h)
-- =====================================================
-- Data: 2026-02-04
-- Objetivo: Corrigir registros de ponto já afetados pelo bug de timezone
--           (horário gravado como UTC em vez de America/Sao_Paulo).
--           Adiciona 3 horas a todos os eventos com source = 'manual',
--           depois recalcula horas e horas extras por registro.
-- Execução: Uma vez apenas (protegido por tabela de controle).
-- =====================================================

-- Tabela de controle para não rodar o backfill duas vezes
CREATE TABLE IF NOT EXISTS public._backfill_timezone_manual_events (
  id int PRIMARY KEY DEFAULT 1,
  done_at timestamptz NOT NULL DEFAULT now(),
  events_updated int NOT NULL DEFAULT 0,
  records_recalculated int NOT NULL DEFAULT 0
);

DO $$
DECLARE
  v_done boolean;
  v_events_updated int;
  v_record_id uuid;
  v_records_recalculated int := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public._backfill_timezone_manual_events WHERE id = 1) INTO v_done;
  IF v_done THEN
    RAISE NOTICE '[BACKFILL_TIMEZONE] Já executado anteriormente em %. Nada a fazer.', (SELECT done_at FROM public._backfill_timezone_manual_events WHERE id = 1);
    RETURN;
  END IF;

  RAISE NOTICE '[BACKFILL_TIMEZONE] Iniciando: adicionando 3 horas a eventos source = ''manual''...';

  UPDATE rh.time_record_events
  SET event_at = event_at + INTERVAL '3 hours'
  WHERE source = 'manual';

  GET DIAGNOSTICS v_events_updated = ROW_COUNT;
  RAISE NOTICE '[BACKFILL_TIMEZONE] Eventos atualizados: %', v_events_updated;

  IF v_events_updated = 0 THEN
    INSERT INTO public._backfill_timezone_manual_events (id, done_at, events_updated, records_recalculated)
    VALUES (1, now(), 0, 0);
    RAISE NOTICE '[BACKFILL_TIMEZONE] Nenhum evento manual encontrado. Controle registrado.';
    RETURN;
  END IF;

  RAISE NOTICE '[BACKFILL_TIMEZONE] Recalculando horas e horas extras por registro de ponto...';

  FOR v_record_id IN
    SELECT DISTINCT time_record_id FROM rh.time_record_events WHERE source = 'manual'
  LOOP
    BEGIN
      PERFORM rh.recalculate_time_record_hours(v_record_id);
      PERFORM rh.calculate_overtime_by_scale(v_record_id);
      v_records_recalculated := v_records_recalculated + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[BACKFILL_TIMEZONE] Erro ao recalcular time_record_id %: % %', v_record_id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  INSERT INTO public._backfill_timezone_manual_events (id, done_at, events_updated, records_recalculated)
  VALUES (1, now(), v_events_updated, v_records_recalculated);

  RAISE NOTICE '[BACKFILL_TIMEZONE] Concluído. Eventos: %, Registros recalculados: %', v_events_updated, v_records_recalculated;
END;
$$;

COMMENT ON TABLE public._backfill_timezone_manual_events IS
'Controle de execução única do backfill de timezone (event_at +3h para eventos manuais). Não remover.';
