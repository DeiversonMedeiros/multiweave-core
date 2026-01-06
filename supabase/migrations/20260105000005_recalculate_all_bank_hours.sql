-- =====================================================
-- RECALCULAR SALDOS DE BANCO DE HORAS
-- =====================================================
-- Script para recalcular saldos de banco de horas de todos os funcionários
-- Executa o cálculo para dezembro de 2025
-- =====================================================

DO $$
DECLARE
  v_emp RECORD;
  v_result RECORD;
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  FOR v_emp IN 
    SELECT DISTINCT employee_id, company_id 
    FROM rh.bank_hours_balance
  LOOP
    BEGIN
      SELECT * INTO v_result 
      FROM rh.calculate_and_accumulate_bank_hours(
        v_emp.employee_id, 
        v_emp.company_id, 
        '2025-12-01'::DATE, 
        '2025-12-31'::DATE
      );
      
      v_processed := v_processed + 1;
      
      -- Log apenas a cada 10 funcionários para não poluir
      IF v_processed % 10 = 0 THEN
        RAISE NOTICE 'Processados % funcionários...', v_processed;
      END IF;
      
    EXCEPTION 
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        RAISE WARNING 'Erro ao processar funcionário %: %', v_emp.employee_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processamento concluído: % funcionários processados, % erros', v_processed, v_errors;
END $$;

