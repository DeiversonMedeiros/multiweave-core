-- =====================================================
-- RECALCULAR REGISTROS DE NOVEMBRO 2025 - VERSÃO SEGURA
-- =====================================================
-- Este script usa a função corrigida que NUNCA zera dados existentes
-- Apenas recalcula os campos calculados (horas trabalhadas, horas noturnas, extras, etc.)
-- Preserva todos os dados existentes (entrada, saida, entrada_almoco, etc.)
-- =====================================================

DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
  v_employee_id uuid;
  v_before_horas_trabalhadas numeric(4,2);
  v_before_horas_noturnas numeric(4,2);
  v_before_horas_extras_50 numeric(4,2);
  v_before_horas_extras_100 numeric(4,2);
  v_after_horas_trabalhadas numeric(4,2);
  v_after_horas_noturnas numeric(4,2);
  v_after_horas_extras_50 numeric(4,2);
  v_after_horas_extras_100 numeric(4,2);
BEGIN
  -- Buscar ID do funcionário
  SELECT id INTO v_employee_id
  FROM rh.employees
  WHERE matricula = '03027'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Funcionário com matrícula 03027 não encontrado';
  END IF;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'RECALCULANDO REGISTROS DE NOVEMBRO 2025';
  RAISE NOTICE 'Funcionário: % (Matrícula: 03027)', v_employee_id;
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';

  -- Iterar sobre todos os registros de novembro de 2025
  FOR v_record IN
    SELECT tr.id, tr.data_registro, tr.entrada, tr.saida, 
           tr.horas_trabalhadas, tr.horas_noturnas,
           tr.horas_extras_50, tr.horas_extras_100
    FROM rh.time_records tr
    WHERE tr.employee_id = v_employee_id
      AND tr.data_registro >= '2025-11-01'
      AND tr.data_registro <= '2025-11-30'
    ORDER BY tr.data_registro ASC
  LOOP
    BEGIN
      -- Guardar valores ANTES do recálculo
      v_before_horas_trabalhadas := v_record.horas_trabalhadas;
      v_before_horas_noturnas := v_record.horas_noturnas;
      v_before_horas_extras_50 := v_record.horas_extras_50;
      v_before_horas_extras_100 := v_record.horas_extras_100;

      -- Recalcular usando a função corrigida (que não zera dados)
      PERFORM rh.recalculate_time_record_hours(v_record.id);

      -- Buscar valores DEPOIS do recálculo
      SELECT tr.horas_trabalhadas, tr.horas_noturnas,
             tr.horas_extras_50, tr.horas_extras_100
      INTO v_after_horas_trabalhadas, v_after_horas_noturnas,
           v_after_horas_extras_50, v_after_horas_extras_100
      FROM rh.time_records tr
      WHERE tr.id = v_record.id;

      v_count := v_count + 1;

      -- Mostrar resultado
      RAISE NOTICE 'Data: % | Entrada: % | Saída: %', 
        v_record.data_registro, 
        COALESCE(v_record.entrada::text, 'NULL'),
        COALESCE(v_record.saida::text, 'NULL');
      RAISE NOTICE '  ANTES: Trabalhadas=%, Noturnas=%, Extras50%=%, Extras100%=%',
        COALESCE(v_before_horas_trabalhadas::text, 'NULL'),
        COALESCE(v_before_horas_noturnas::text, 'NULL'),
        COALESCE(v_before_horas_extras_50::text, 'NULL'),
        COALESCE(v_before_horas_extras_100::text, 'NULL');
      RAISE NOTICE '  DEPOIS: Trabalhadas=%, Noturnas=%, Extras50%=%, Extras100%=%',
        COALESCE(v_after_horas_trabalhadas::text, 'NULL'),
        COALESCE(v_after_horas_noturnas::text, 'NULL'),
        COALESCE(v_after_horas_extras_50::text, 'NULL'),
        COALESCE(v_after_horas_extras_100::text, 'NULL');
      RAISE NOTICE '';

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao recalcular registro % (data: %): %', 
          v_record.id, v_record.data_registro, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'TOTAL DE REGISTROS RECALCULADOS: %', v_count;
  RAISE NOTICE '====================================================';

  -- Mostrar resumo final
  RAISE NOTICE '';
  RAISE NOTICE 'RESUMO FINAL:';
  SELECT 
    COUNT(*) as total_registros,
    SUM(horas_trabalhadas) as total_horas_trabalhadas,
    SUM(horas_noturnas) as total_horas_noturnas,
    SUM(horas_extras_50) as total_extras_50,
    SUM(horas_extras_100) as total_extras_100,
    SUM(horas_negativas) as total_horas_negativas
  INTO v_record
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND data_registro >= '2025-11-01'
    AND data_registro <= '2025-11-30';

  RAISE NOTICE 'Total de registros: %', v_record.total_registros;
  RAISE NOTICE 'Total horas trabalhadas: %', v_record.total_horas_trabalhadas;
  RAISE NOTICE 'Total horas noturnas: %', v_record.total_horas_noturnas;
  RAISE NOTICE 'Total extras 50%%: %', v_record.total_extras_50;
  RAISE NOTICE 'Total extras 100%%: %', v_record.total_extras_100;
  RAISE NOTICE 'Total horas negativas: %', v_record.total_horas_negativas;

END;
$$;

