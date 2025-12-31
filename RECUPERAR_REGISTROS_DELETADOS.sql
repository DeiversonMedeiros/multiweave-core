-- =====================================================
-- RECUPERAR REGISTROS DELETADOS
-- Funcionário: VITOR ALVES DA COSTA NETO (Matrícula: 03027)
-- Período: Novembro/2025
-- =====================================================
-- ATENÇÃO: Este script tenta RECRIAR registros baseado nos eventos de ponto
-- que ainda existem no banco. Use com EXTREMO CUIDADO e apenas após
-- confirmar que os registros foram realmente deletados.
-- =====================================================

-- IMPORTANTE: Execute primeiro o script DIAGNOSTICO_EMERGENCIA_REGISTROS_DELETADOS.sql
-- para entender o que aconteceu antes de executar este script!

DO $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_event RECORD;
  v_time_record_id uuid;
  v_data_registro date;
  v_entrada time;
  v_saida time;
  v_entrada_almoco time;
  v_saida_almoco time;
  v_entrada_extra1 time;
  v_saida_extra1 time;
  v_count_created integer := 0;
  v_count_skipped integer := 0;
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
  RAISE NOTICE 'Iniciando recuperação de registros baseado em eventos...';
  RAISE NOTICE '';

  -- Agrupar eventos por data e recriar registros
  FOR v_data_registro IN 
    SELECT DISTINCT (tre.event_at AT TIME ZONE 'UTC')::date as data_evento
    FROM rh.time_record_events tre
    WHERE tre.employee_id = v_employee_id
      AND (tre.event_at AT TIME ZONE 'UTC')::date >= '2025-11-01'
      AND (tre.event_at AT TIME ZONE 'UTC')::date <= '2025-11-30'
    ORDER BY data_evento DESC
  LOOP
    -- Verificar se já existe registro para esta data
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND data_registro = v_data_registro
    LIMIT 1;

    IF v_time_record_id IS NOT NULL THEN
      -- Registro já existe, pular
      v_count_skipped := v_count_skipped + 1;
      RAISE NOTICE 'Registro já existe para % - pulando', v_data_registro;
      CONTINUE;
    END IF;

    -- Buscar horários dos eventos
    SELECT 
      (event_at AT TIME ZONE 'UTC')::time INTO v_entrada
    FROM rh.time_record_events
    WHERE employee_id = v_employee_id
      AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
      AND event_type = 'entrada'
    ORDER BY event_at ASC
    LIMIT 1;

    SELECT 
      (event_at AT TIME ZONE 'UTC')::time INTO v_saida
    FROM rh.time_record_events
    WHERE employee_id = v_employee_id
      AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
      AND event_type = 'saida'
    ORDER BY event_at DESC
    LIMIT 1;

    SELECT 
      (event_at AT TIME ZONE 'UTC')::time INTO v_entrada_almoco
    FROM rh.time_record_events
    WHERE employee_id = v_employee_id
      AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
      AND event_type = 'entrada_almoco'
    ORDER BY event_at ASC
    LIMIT 1;

    SELECT 
      (event_at AT TIME ZONE 'UTC')::time INTO v_saida_almoco
    FROM rh.time_record_events
    WHERE employee_id = v_employee_id
      AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
      AND event_type = 'saida_almoco'
    ORDER BY event_at DESC
    LIMIT 1;

    SELECT 
      (event_at AT TIME ZONE 'UTC')::time INTO v_entrada_extra1
    FROM rh.time_record_events
    WHERE employee_id = v_employee_id
      AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
      AND event_type = 'extra_inicio'
    ORDER BY event_at ASC
    LIMIT 1;

    SELECT 
      (event_at AT TIME ZONE 'UTC')::time INTO v_saida_extra1
    FROM rh.time_record_events
    WHERE employee_id = v_employee_id
      AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
      AND event_type = 'extra_fim'
    ORDER BY event_at DESC
    LIMIT 1;

    -- Criar novo registro apenas se houver pelo menos entrada ou saída
    IF v_entrada IS NOT NULL OR v_saida IS NOT NULL THEN
      -- Inserir novo registro
      INSERT INTO rh.time_records (
        employee_id,
        company_id,
        data_registro,
        entrada,
        saida,
        entrada_almoco,
        saida_almoco,
        entrada_extra1,
        saida_extra1,
        status,
        created_at,
        updated_at
      ) VALUES (
        v_employee_id,
        v_company_id,
        v_data_registro,
        v_entrada,
        v_saida,
        v_entrada_almoco,
        v_saida_almoco,
        v_entrada_extra1,
        v_saida_extra1,
        'pendente',
        NOW(),
        NOW()
      )
      RETURNING id INTO v_time_record_id;

      -- Atualizar eventos para apontar para o novo registro
      UPDATE rh.time_record_events
      SET time_record_id = v_time_record_id
      WHERE employee_id = v_employee_id
        AND (event_at AT TIME ZONE 'UTC')::date = v_data_registro
        AND time_record_id IS NULL;

      -- Recalcular horas do registro recriado
      PERFORM rh.recalculate_time_record_hours(v_time_record_id);

      v_count_created := v_count_created + 1;
      RAISE NOTICE 'Registro recriado para % (ID: %)', v_data_registro, v_time_record_id;
    ELSE
      v_count_skipped := v_count_skipped + 1;
      RAISE NOTICE 'Sem eventos suficientes para % - pulando', v_data_registro;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Recuperação concluída!';
  RAISE NOTICE 'Registros criados: %', v_count_created;
  RAISE NOTICE 'Registros pulados (já existiam ou sem eventos): %', v_count_skipped;
END;
$$;

-- Verificar resultados após recuperação
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_trabalhadas,
  tr.horas_noturnas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.status,
  (SELECT COUNT(*) FROM rh.time_record_events tre WHERE tre.time_record_id = tr.id) as eventos_count
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;

