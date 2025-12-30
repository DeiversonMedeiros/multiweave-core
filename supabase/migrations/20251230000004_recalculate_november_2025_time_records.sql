-- =====================================================
-- RECALCULAR REGISTROS DE PONTO DE NOVEMBRO 2025
-- =====================================================
-- Problema: Muitos registros de novembro/2025 estão com valores zerados
-- Solução: Recalcular todos os registros de novembro/2025 usando a função
--          rh.recalculate_time_record_hours que agora inclui:
--          - Cálculo correto de horas diárias baseado no turno
--          - Consideração de feriados para horas extras 100%
--          - Cálculo de horas noturnas
-- =====================================================

DO $$
DECLARE
  v_record_id uuid;
  v_total_records integer := 0;
  v_processed_records integer := 0;
  v_error_count integer := 0;
  v_start_time timestamp;
  v_end_time timestamp;
BEGIN
  v_start_time := clock_timestamp();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Iniciando recálculo de registros de novembro/2025';
  RAISE NOTICE '========================================';
  
  -- Contar total de registros a processar
  SELECT COUNT(*) INTO v_total_records
  FROM rh.time_records tr
  WHERE tr.data_registro >= '2025-11-01'
    AND tr.data_registro <= '2025-11-30';
  
  RAISE NOTICE 'Total de registros encontrados: %', v_total_records;
  
  -- Processar cada registro
  FOR v_record_id IN 
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.data_registro >= '2025-11-01'
      AND tr.data_registro <= '2025-11-30'
    ORDER BY tr.data_registro ASC, tr.employee_id ASC
  LOOP
    BEGIN
      -- Recalcular horas do registro
      PERFORM rh.recalculate_time_record_hours(v_record_id);
      
      v_processed_records := v_processed_records + 1;
      
      -- Log de progresso a cada 50 registros
      IF v_processed_records % 50 = 0 THEN
        RAISE NOTICE 'Processados: % / % (%.1f%%)', 
          v_processed_records, 
          v_total_records,
          (v_processed_records::numeric / v_total_records::numeric * 100);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Erro ao processar registro %: %', v_record_id, SQLERRM;
    END;
  END LOOP;
  
  v_end_time := clock_timestamp();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Recálculo concluído!';
  RAISE NOTICE 'Total processado: %', v_processed_records;
  RAISE NOTICE 'Total de erros: %', v_error_count;
  RAISE NOTICE 'Tempo decorrido: %', (v_end_time - v_start_time);
  RAISE NOTICE '========================================';
  
  -- Verificar quantos registros ainda estão zerados
  DECLARE
    v_zerados integer;
  BEGIN
    SELECT COUNT(*) INTO v_zerados
    FROM rh.time_records tr
    WHERE tr.data_registro >= '2025-11-01'
      AND tr.data_registro <= '2025-11-30'
      AND (tr.horas_trabalhadas IS NULL OR tr.horas_trabalhadas = 0)
      AND (tr.horas_extras_50 IS NULL OR tr.horas_extras_50 = 0)
      AND (tr.horas_extras_100 IS NULL OR tr.horas_extras_100 = 0)
      AND (tr.horas_noturnas IS NULL OR tr.horas_noturnas = 0)
      AND (tr.horas_negativas IS NULL OR tr.horas_negativas = 0);
    
    RAISE NOTICE 'Registros ainda zerados após recálculo: %', v_zerados;
    
    IF v_zerados > 0 THEN
      RAISE WARNING 'Ainda existem % registros zerados. Isso pode ser normal se não houver eventos de ponto registrados para esses dias.', v_zerados;
    END IF;
  END;
  
END $$;

COMMENT ON FUNCTION rh.recalculate_time_record_hours(uuid) IS 
'Recalcula horas trabalhadas, extras, negativas e noturnas de um registro de ponto. 
Esta função foi atualizada para considerar turnos de trabalho, feriados e horas noturnas.';


