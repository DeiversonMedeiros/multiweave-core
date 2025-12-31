-- =====================================================
-- RECUPERAR DADOS DAS CORREÇÕES DE PONTO
-- Funcionário: VITOR ALVES DA COSTA NETO (Matrícula: 03027)
-- Período: Novembro/2025
-- =====================================================
-- Este script recupera os dados originais/corrigidos das correções
-- de ponto e atualiza os registros de ponto correspondentes
-- =====================================================

DO $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_correction RECORD;
  v_time_record_id uuid;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  v_count_updated integer := 0;
BEGIN
  -- Buscar funcionário
  SELECT id, company_id
  INTO v_employee_id, v_company_id
  FROM rh.employees
  WHERE matricula = '03027'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Funcionário com matrícula 03027 não encontrado!';
  END IF;

  RAISE NOTICE 'Funcionário encontrado: ID = %, Company = %', v_employee_id, v_company_id;
  RAISE NOTICE 'Iniciando recuperação de dados das correções...';
  RAISE NOTICE '';

  -- Processar cada correção
  FOR v_correction IN 
    SELECT 
      ac.id,
      ac.data_original,
      ac.entrada_original,
      ac.saida_original,
      ac.entrada_corrigida,
      ac.saida_corrigida,
      ac.entrada_almoco_original,
      ac.saida_almoco_original,
      ac.entrada_almoco_corrigida,
      ac.saida_almoco_corrigida,
      ac.entrada_extra1_original,
      ac.saida_extra1_original,
      ac.entrada_extra1_corrigida,
      ac.saida_extra1_corrigida,
      ac.status
    FROM rh.attendance_corrections ac
    WHERE ac.employee_id = v_employee_id
      AND ac.data_original >= '2025-11-01'
      AND ac.data_original <= '2025-11-30'
    ORDER BY ac.data_original DESC
  LOOP
    -- Buscar ou criar registro de ponto para esta data
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND data_registro = v_correction.data_original
    LIMIT 1;

    -- Se não existe registro, criar
    IF v_time_record_id IS NULL THEN
      INSERT INTO rh.time_records (
        employee_id,
        company_id,
        data_registro,
        status,
        created_at,
        updated_at
      ) VALUES (
        v_employee_id,
        v_company_id,
        v_correction.data_original,
        'pendente',
        NOW(),
        NOW()
      )
      RETURNING id INTO v_time_record_id;
      
      RAISE NOTICE 'Registro criado para % (ID: %)', v_correction.data_original, v_time_record_id;
    END IF;

    -- Determinar quais valores usar (corrigidos se aprovados, originais se pendente)
    IF v_correction.status = 'aprovado' AND v_correction.entrada_corrigida IS NOT NULL THEN
      v_entrada := v_correction.entrada_corrigida;
      v_saida := v_correction.saida_corrigida;
      v_entrada_almoco := v_correction.entrada_almoco_corrigida;
      v_saida_almoco := v_correction.saida_almoco_corrigida;
      v_entrada_extra1 := v_correction.entrada_extra1_corrigida;
      v_saida_extra1 := v_correction.saida_extra1_corrigida;
    ELSIF v_correction.entrada_original IS NOT NULL THEN
      -- Usar valores originais se não houver corrigidos
      v_entrada := v_correction.entrada_original;
      v_saida := v_correction.saida_original;
      v_entrada_almoco := v_correction.entrada_almoco_original;
      v_saida_almoco := v_correction.saida_almoco_original;
      v_entrada_extra1 := v_correction.entrada_extra1_original;
      v_saida_extra1 := v_correction.saida_extra1_original;
    ELSE
      -- Usar valores corrigidos mesmo se pendente (melhor que nada)
      v_entrada := v_correction.entrada_corrigida;
      v_saida := v_correction.saida_corrigida;
      v_entrada_almoco := v_correction.entrada_almoco_corrigida;
      v_saida_almoco := v_correction.saida_almoco_corrigida;
      v_entrada_extra1 := v_correction.entrada_extra1_corrigida;
      v_saida_extra1 := v_correction.saida_extra1_corrigida;
    END IF;

    -- Atualizar registro de ponto
    UPDATE rh.time_records
    SET 
      entrada = v_entrada,
      saida = v_saida,
      entrada_almoco = v_entrada_almoco,
      saida_almoco = v_saida_almoco,
      entrada_extra1 = v_entrada_extra1,
      saida_extra1 = v_saida_extra1,
      updated_at = NOW()
    WHERE id = v_time_record_id;

    -- Recalcular horas
    PERFORM rh.recalculate_time_record_hours(v_time_record_id);

    v_count_updated := v_count_updated + 1;
    RAISE NOTICE 'Dados recuperados para %: Entrada=%, Saída=%', 
      v_correction.data_original, v_entrada, v_saida;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Recuperação concluída! Total de registros atualizados: %', v_count_updated;
END;
$$;

-- Verificar resultados
SELECT 
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.horas_trabalhadas,
  tr.horas_noturnas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.status
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;

