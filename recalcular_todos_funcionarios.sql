-- =====================================================
-- RECALCULAR TODOS OS REGISTROS - TODOS OS FUNCIONÁRIOS
-- =====================================================
-- Este script recalcula TODOS os registros de ponto de TODOS os funcionários
-- de TODAS as empresas usando a função corrigida que NUNCA zera dados existentes
-- =====================================================

DO $$
DECLARE
  v_employee RECORD;
  v_record RECORD;
  v_total_employees INTEGER := 0;
  v_total_records INTEGER := 0;
  v_processed_records INTEGER := 0;
  v_errors INTEGER := 0;
  v_start_time TIMESTAMP;
  v_current_time TIMESTAMP;
BEGIN
  v_start_time := clock_timestamp();
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'INICIANDO RECÁLCULO GERAL DE TODOS OS REGISTROS';
  RAISE NOTICE 'Data/Hora de início: %', v_start_time;
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';

  -- Contar total de funcionários
  SELECT COUNT(*) INTO v_total_employees
  FROM rh.employees;

  RAISE NOTICE 'Total de funcionários a processar: %', v_total_employees;
  RAISE NOTICE '';

  -- Iterar sobre todos os funcionários
  FOR v_employee IN
    SELECT e.id, e.matricula, e.nome, e.company_id
    FROM rh.employees e
    ORDER BY e.company_id, e.matricula
  LOOP
    BEGIN
      -- Contar registros deste funcionário
      SELECT COUNT(*) INTO v_total_records
      FROM rh.time_records
      WHERE employee_id = v_employee.id;

      IF v_total_records > 0 THEN
        -- Recalcular todos os registros deste funcionário
        FOR v_record IN
          SELECT tr.id, tr.data_registro
          FROM rh.time_records tr
          WHERE tr.employee_id = v_employee.id
          ORDER BY tr.data_registro DESC
        LOOP
          BEGIN
            PERFORM rh.recalculate_time_record_hours(v_record.id);
            v_processed_records := v_processed_records + 1;

            -- Mostrar progresso a cada 100 registros
            IF v_processed_records % 100 = 0 THEN
              v_current_time := clock_timestamp();
              RAISE NOTICE 'Progresso: % registros processados | Funcionário: % (%) | Tempo decorrido: %', 
                v_processed_records, 
                v_employee.matricula, 
                v_employee.nome,
                v_current_time - v_start_time;
            END IF;

          EXCEPTION
            WHEN OTHERS THEN
              v_errors := v_errors + 1;
              RAISE WARNING 'Erro ao recalcular registro % (funcionário: %, data: %): %', 
                v_record.id, 
                v_employee.matricula, 
                v_record.data_registro, 
                SQLERRM;
          END;
        END LOOP;

        -- Mostrar progresso por funcionário (apenas se tiver muitos registros)
        IF v_total_records > 10 THEN
          RAISE NOTICE 'Funcionário % (%) processado: % registros', 
            v_employee.matricula, 
            v_employee.nome, 
            v_total_records;
        END IF;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        RAISE WARNING 'Erro ao processar funcionário % (%): %', 
          v_employee.matricula, 
          v_employee.nome, 
          SQLERRM;
    END;
  END LOOP;

  v_current_time := clock_timestamp();

  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'RECÁLCULO CONCLUÍDO';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Total de funcionários processados: %', v_total_employees;
  RAISE NOTICE 'Total de registros processados: %', v_processed_records;
  RAISE NOTICE 'Total de erros: %', v_errors;
  RAISE NOTICE 'Tempo total: %', v_current_time - v_start_time;
  RAISE NOTICE '====================================================';

  -- Mostrar resumo estatístico
  RAISE NOTICE '';
  RAISE NOTICE 'RESUMO ESTATÍSTICO:';
  
  SELECT 
    COUNT(DISTINCT tr.employee_id) as funcionarios_com_registros,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tr.horas_trabalhadas > 0 THEN 1 END) as registros_com_horas,
    COUNT(CASE WHEN tr.horas_noturnas > 0 THEN 1 END) as registros_com_horas_noturnas,
    ROUND(SUM(tr.horas_trabalhadas)::numeric, 2) as total_horas_trabalhadas,
    ROUND(SUM(tr.horas_noturnas)::numeric, 2) as total_horas_noturnas,
    ROUND(SUM(tr.horas_extras_50)::numeric, 2) as total_extras_50,
    ROUND(SUM(tr.horas_extras_100)::numeric, 2) as total_extras_100
  INTO v_record
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id;

  RAISE NOTICE 'Funcionários com registros: %', v_record.funcionarios_com_registros;
  RAISE NOTICE 'Total de registros: %', v_record.total_registros;
  RAISE NOTICE 'Registros com horas trabalhadas: %', v_record.registros_com_horas;
  RAISE NOTICE 'Registros com horas noturnas: %', v_record.registros_com_horas_noturnas;
  RAISE NOTICE 'Total horas trabalhadas: %', v_record.total_horas_trabalhadas;
  RAISE NOTICE 'Total horas noturnas: %', v_record.total_horas_noturnas;
  RAISE NOTICE 'Total extras 50%%: %', v_record.total_extras_50;
  RAISE NOTICE 'Total extras 100%%: %', v_record.total_extras_100;

END;
$$;

