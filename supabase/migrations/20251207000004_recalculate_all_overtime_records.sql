-- =====================================================
-- RECALCULAR TODAS AS HORAS EXTRAS DOS REGISTROS APROVADOS
-- Para corrigir registros calculados antes da correção
-- =====================================================

-- Criar função temporária para recalcular todos os registros
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Recalcular horas extras para todos os registros aprovados
  FOR v_record IN 
    SELECT id 
    FROM rh.time_records 
    WHERE status = 'aprovado'
    ORDER BY data_registro DESC
  LOOP
    BEGIN
      PERFORM rh.calculate_overtime_by_scale(v_record.id);
      v_count := v_count + 1;
      
      -- Log a cada 100 registros
      IF v_count % 100 = 0 THEN
        RAISE NOTICE 'Recalculados % registros...', v_count;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Continuar mesmo se houver erro em um registro
        RAISE NOTICE 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros recalculados: %', v_count;
END $$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Recalcula horas extras para todos os registros aprovados.
   Execute este script após atualizar a função calculate_overtime_by_scale.';

