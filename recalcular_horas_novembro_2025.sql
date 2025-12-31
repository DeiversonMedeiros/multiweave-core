-- =====================================================
-- RECALCULAR HORAS NOTURNAS, NEGATIVAS, EXTRAS 50% E 100%
-- Funcionário: VITOR ALVES DA COSTA NETO (Matrícula: 03027)
-- Período: Novembro/2025
-- =====================================================
-- Este script recalcula todos os registros de novembro/2025
-- para garantir que horas_noturnas, horas_negativas, horas_extras_50 
-- e horas_extras_100 estejam corretamente calculadas.
-- =====================================================

DO $$
DECLARE
  v_employee_id uuid;
  v_record_id uuid;
  v_count integer := 0;
  v_data_registro date;
  v_entrada time;
  v_saida time;
  v_horas_noturnas_antes numeric;
  v_horas_noturnas_depois numeric;
BEGIN
  -- Buscar funcionário
  SELECT id INTO v_employee_id
  FROM rh.employees
  WHERE matricula = '03027'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Funcionário com matrícula 03027 não encontrado!';
  END IF;

  RAISE NOTICE 'Funcionário encontrado: ID = %', v_employee_id;
  RAISE NOTICE 'Iniciando recálculo de registros de novembro/2025...';
  RAISE NOTICE '';

  -- Recalcular cada registro
  FOR v_record_id IN 
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.employee_id = v_employee_id
      AND tr.data_registro >= '2025-11-01'
      AND tr.data_registro <= '2025-11-30'
    ORDER BY tr.data_registro DESC
  LOOP
    -- Capturar valores antes
    SELECT 
      data_registro,
      entrada,
      saida,
      horas_noturnas
    INTO 
      v_data_registro,
      v_entrada,
      v_saida,
      v_horas_noturnas_antes
    FROM rh.time_records
    WHERE id = v_record_id;

    -- Recalcular
    PERFORM rh.recalculate_time_record_hours(v_record_id);

    -- Capturar valores depois
    SELECT horas_noturnas
    INTO v_horas_noturnas_depois
    FROM rh.time_records
    WHERE id = v_record_id;

    v_count := v_count + 1;

    -- Log apenas se houve mudança ou se deveria ter horas noturnas
    IF v_horas_noturnas_antes != v_horas_noturnas_depois OR 
       (v_entrada IS NOT NULL AND v_saida IS NOT NULL AND 
        (v_entrada < '05:00:00' OR v_saida > '22:00:00' OR 
         (v_entrada >= '22:00:00' AND v_saida <= '05:00:00'))) THEN
      RAISE NOTICE 'Data: %, Entrada: %, Saída: %, Noturnas: % -> %',
        v_data_registro, v_entrada, v_saida, 
        v_horas_noturnas_antes, v_horas_noturnas_depois;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Recálculo concluído! Total de registros processados: %', v_count;
END;
$$;

-- Verificar resultados
SELECT 
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_trabalhadas,
  tr.horas_noturnas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  rh.calculate_night_hours(tr.entrada, tr.saida, tr.data_registro) as horas_noturnas_calculadas,
  CASE 
    WHEN tr.horas_noturnas != rh.calculate_night_hours(tr.entrada, tr.saida, tr.data_registro) 
    THEN '⚠️ DISCREPÂNCIA'
    WHEN tr.entrada IS NOT NULL AND tr.saida IS NOT NULL AND 
         (tr.entrada < '05:00:00' OR tr.saida > '22:00:00' OR 
          (tr.entrada >= '22:00:00' AND tr.saida <= '05:00:00')) AND
         tr.horas_noturnas = 0
    THEN '⚠️ DEVERIA TER HORAS NOTURNAS'
    ELSE '✅ OK'
  END as status
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;

