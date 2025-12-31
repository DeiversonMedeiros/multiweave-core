-- =====================================================
-- CORREÇÃO: Recalcular Horas Noturnas, Negativas, Extras 50% e 100%
-- Funcionário: VITOR ALVES DA COSTA NETO (Matrícula: 03027)
-- Período: Novembro/2025
-- =====================================================
-- Este script verifica e recalcula todos os registros de novembro/2025
-- para garantir que horas_noturnas, horas_negativas, horas_extras_50 e horas_extras_100
-- estejam corretamente calculadas após as correções feitas nas tabelas.
-- =====================================================

-- 1. Primeiro, buscar o ID do funcionário
DO $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_record_id uuid;
  v_count integer := 0;
BEGIN
  -- Buscar funcionário
  SELECT id, company_id
  INTO v_employee_id, v_company_id
  FROM rh.employees
  WHERE matricula = '03027'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE NOTICE 'Funcionário com matrícula 03027 não encontrado!';
    RETURN;
  END IF;

  RAISE NOTICE 'Funcionário encontrado: ID = %, Company = %', v_employee_id, v_company_id;

  -- 2. Listar registros de novembro/2025 antes do recálculo
  RAISE NOTICE '=== REGISTROS ANTES DO RECÁLCULO ===';
  FOR v_record_id IN 
    SELECT id
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND data_registro >= '2025-11-01'
      AND data_registro <= '2025-11-30'
    ORDER BY data_registro DESC
  LOOP
    -- Mostrar dados antes
    DECLARE
      v_data_registro date;
      v_entrada time;
      v_saida time;
      v_horas_trabalhadas numeric;
      v_horas_noturnas numeric;
      v_horas_negativas numeric;
      v_horas_extras_50 numeric;
      v_horas_extras_100 numeric;
    BEGIN
      SELECT 
        data_registro,
        entrada,
        saida,
        horas_trabalhadas,
        horas_noturnas,
        horas_negativas,
        horas_extras_50,
        horas_extras_100
      INTO 
        v_data_registro,
        v_entrada,
        v_saida,
        v_horas_trabalhadas,
        v_horas_noturnas,
        v_horas_negativas,
        v_horas_extras_50,
        v_horas_extras_100
      FROM rh.time_records
      WHERE id = v_record_id;

      RAISE NOTICE 'Data: %, Entrada: %, Saída: %, Trabalhadas: %, Noturnas: %, Negativas: %, Extras 50%%: %, Extras 100%%: %',
        v_data_registro, v_entrada, v_saida, v_horas_trabalhadas, 
        v_horas_noturnas, v_horas_negativas, v_horas_extras_50, v_horas_extras_100;
    END;
  END LOOP;

  -- 3. Recalcular todos os registros de novembro/2025
  RAISE NOTICE '';
  RAISE NOTICE '=== RECALCULANDO REGISTROS ===';
  
  FOR v_record_id IN 
    SELECT id
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND data_registro >= '2025-11-01'
      AND data_registro <= '2025-11-30'
    ORDER BY data_registro DESC
  LOOP
    -- Recalcular horas trabalhadas, noturnas, negativas e extras
    PERFORM rh.recalculate_time_record_hours(v_record_id);
    
    v_count := v_count + 1;
    
    IF v_count % 5 = 0 THEN
      RAISE NOTICE 'Recalculados % registros...', v_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total de registros recalculados: %', v_count;

  -- 4. Listar registros após o recálculo
  RAISE NOTICE '';
  RAISE NOTICE '=== REGISTROS APÓS O RECÁLCULO ===';
  FOR v_record_id IN 
    SELECT id
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND data_registro >= '2025-11-01'
      AND data_registro <= '2025-11-30'
    ORDER BY data_registro DESC
  LOOP
    -- Mostrar dados depois
    DECLARE
      v_data_registro date;
      v_entrada time;
      v_saida time;
      v_horas_trabalhadas numeric;
      v_horas_noturnas numeric;
      v_horas_negativas numeric;
      v_horas_extras_50 numeric;
      v_horas_extras_100 numeric;
      v_horas_noturnas_calculadas numeric;
    BEGIN
      SELECT 
        data_registro,
        entrada,
        saida,
        horas_trabalhadas,
        horas_noturnas,
        horas_negativas,
        horas_extras_50,
        horas_extras_100
      INTO 
        v_data_registro,
        v_entrada,
        v_saida,
        v_horas_trabalhadas,
        v_horas_noturnas,
        v_horas_negativas,
        v_horas_extras_50,
        v_horas_extras_100
      FROM rh.time_records
      WHERE id = v_record_id;

      -- Testar cálculo de horas noturnas diretamente
      IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
        v_horas_noturnas_calculadas := rh.calculate_night_hours(v_entrada, v_saida, v_data_registro);
      ELSE
        v_horas_noturnas_calculadas := 0;
      END IF;

      RAISE NOTICE 'Data: %, Entrada: %, Saída: %, Trabalhadas: %, Noturnas (DB): %, Noturnas (Calc): %, Negativas: %, Extras 50%%: %, Extras 100%%: %',
        v_data_registro, v_entrada, v_saida, v_horas_trabalhadas, 
        v_horas_noturnas, v_horas_noturnas_calculadas, v_horas_negativas, 
        v_horas_extras_50, v_horas_extras_100;

      -- Verificar se há discrepância
      IF v_horas_noturnas != v_horas_noturnas_calculadas THEN
        RAISE WARNING 'DISCREPÂNCIA: Data % - Noturnas no DB (%) diferente do cálculo direto (%)',
          v_data_registro, v_horas_noturnas, v_horas_noturnas_calculadas;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== RECÁLCULO CONCLUÍDO ===';
END;
$$;

-- 5. Verificar se há registros com horas_noturnas = 0 mas que deveriam ter horas noturnas
-- (entrada antes das 5h ou saída depois das 22h)
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_trabalhadas,
  tr.horas_noturnas,
  rh.calculate_night_hours(tr.entrada, tr.saida, tr.data_registro) as horas_noturnas_esperadas,
  CASE 
    WHEN tr.entrada < '05:00:00' OR tr.saida > '22:00:00' THEN 'DEVERIA TER HORAS NOTURNAS'
    ELSE 'OK'
  END as status
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
  AND tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL
  AND (
    tr.entrada < '05:00:00' OR 
    tr.saida > '22:00:00' OR
    (tr.entrada >= '22:00:00' AND tr.saida <= '05:00:00')
  )
  AND tr.horas_noturnas = 0
ORDER BY tr.data_registro DESC;

