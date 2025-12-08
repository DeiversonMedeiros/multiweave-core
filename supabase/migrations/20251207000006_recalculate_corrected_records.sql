-- =====================================================
-- RECALCULAR REGISTROS QUE TIVERAM CORREÇÃO DE PONTO
-- Para corrigir horas trabalhadas e horas extras
-- =====================================================

DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Recalcular registros que têm observações indicando correção
  FOR v_record IN 
    SELECT tr.id 
    FROM rh.time_records tr
    WHERE tr.status = 'aprovado'
      AND tr.observacoes LIKE '%corrigido%'
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      -- Recalcular horas trabalhadas baseado nos eventos
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      
      -- Recalcular horas extras/negativas baseado na escala
      PERFORM rh.calculate_overtime_by_scale(v_record.id);
      
      v_count := v_count + 1;
      
      -- Log a cada 50 registros
      IF v_count % 50 = 0 THEN
        RAISE NOTICE 'Recalculados % registros corrigidos...', v_count;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Continuar mesmo se houver erro em um registro
        RAISE NOTICE 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros corrigidos recalculados: %', v_count;
END $$;

