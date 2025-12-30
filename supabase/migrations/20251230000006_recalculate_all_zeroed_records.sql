-- =====================================================
-- RECALCULAR TODOS OS REGISTROS ZERADOS COM EVENTOS
-- =====================================================
-- Recalcula todos os registros que têm eventos mas horas zeradas
-- independente da data, para garantir que todos sejam corrigidos
-- =====================================================

DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Recalculando registros com eventos mas horas zeradas...';
  
  FOR v_record IN
    SELECT DISTINCT tr.id, tr.employee_id, tr.data_registro
    FROM rh.time_records tr
    INNER JOIN rh.time_record_events ev ON ev.time_record_id = tr.id
    WHERE (tr.horas_trabalhadas = 0 OR tr.horas_trabalhadas IS NULL)
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY tr.data_registro DESC, tr.employee_id
  LOOP
    BEGIN
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      v_count := v_count + 1;
      
      IF v_count % 50 = 0 THEN
        RAISE NOTICE 'Recalculados % registros...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao recalcular registro % (data: %, funcionário: %): %', 
          v_record.id, v_record.data_registro, v_record.employee_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros recalculados: %', v_count;
END;
$$;

