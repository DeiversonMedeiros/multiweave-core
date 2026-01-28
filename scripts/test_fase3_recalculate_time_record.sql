-- =====================================================
-- TESTE FASE 3: Validação de recalculate_time_record_hours
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Testa se recalculate_time_record_hours calcula corretamente
--            usando event_at completo de time_record_events.
-- =====================================================

\echo '========================================'
\echo 'TESTE: recalculate_time_record_hours'
\echo '========================================'
\echo ''

-- =====================================================
-- TESTE 1: Verificar se função existe e está acessível
-- =====================================================
\echo 'TESTE 1: Verificar se função existe'
\echo ''

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'rh'
        AND p.proname = 'recalculate_time_record_hours'
    ) THEN '✅ Função existe'
    ELSE '❌ Função não encontrada'
  END as resultado;

\echo ''

-- =====================================================
-- TESTE 2: Encontrar registro que cruza meia-noite
-- =====================================================
\echo 'TESTE 2: Encontrar registro que cruza meia-noite'
\echo 'Buscando registros com entrada e saída em dias diferentes...'
\echo ''

SELECT 
  tr.id,
  tr.employee_id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.entrada_date,
  tr.saida_date,
  tr.horas_trabalhadas,
  tr.horas_noturnas,
  -- Verificar se há eventos com datas diferentes
  (SELECT MIN((event_at AT TIME ZONE 'America/Sao_Paulo')::date)
   FROM rh.time_record_events
   WHERE time_record_id = tr.id
     AND event_type = 'entrada') as entrada_event_date,
  (SELECT MAX((event_at AT TIME ZONE 'America/Sao_Paulo')::date)
   FROM rh.time_record_events
   WHERE time_record_id = tr.id
     AND event_type = 'saida') as saida_event_date
FROM rh.time_records tr
WHERE tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM rh.time_record_events tre1
    JOIN rh.time_record_events tre2 ON tre2.time_record_id = tre1.time_record_id
    WHERE tre1.time_record_id = tr.id
      AND tre1.event_type = 'entrada'
      AND tre2.event_type = 'saida'
      AND (tre1.event_at AT TIME ZONE 'America/Sao_Paulo')::date != 
          (tre2.event_at AT TIME ZONE 'America/Sao_Paulo')::date
  )
ORDER BY tr.data_registro DESC
LIMIT 5;

\echo ''

-- =====================================================
-- TESTE 3: Recalcular um registro específico
-- =====================================================
\echo 'TESTE 3: Recalcular registro específico'
\echo 'Usando o primeiro registro encontrado acima...'
\echo ''

DO $$
DECLARE
  v_record_id UUID;
  v_horas_antes DECIMAL(4,2);
  v_horas_depois DECIMAL(4,2);
  v_noturnas_antes DECIMAL(4,2);
  v_noturnas_depois DECIMAL(4,2);
BEGIN
  -- Encontrar um registro que cruza meia-noite
  SELECT tr.id
  INTO v_record_id
  FROM rh.time_records tr
  WHERE tr.entrada IS NOT NULL
    AND tr.saida IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM rh.time_record_events tre1
      JOIN rh.time_record_events tre2 ON tre2.time_record_id = tre1.time_record_id
      WHERE tre1.time_record_id = tr.id
        AND tre1.event_type = 'entrada'
        AND tre2.event_type = 'saida'
        AND (tre1.event_at AT TIME ZONE 'America/Sao_Paulo')::date != 
            (tre2.event_at AT TIME ZONE 'America/Sao_Paulo')::date
    )
  ORDER BY tr.data_registro DESC
  LIMIT 1;

  IF v_record_id IS NULL THEN
    RAISE NOTICE 'Nenhum registro que cruza meia-noite encontrado para teste';
    RETURN;
  END IF;

  -- Capturar valores antes
  SELECT horas_trabalhadas, horas_noturnas
  INTO v_horas_antes, v_noturnas_antes
  FROM rh.time_records
  WHERE id = v_record_id;

  RAISE NOTICE 'Registro encontrado: %', v_record_id;
  RAISE NOTICE 'Antes - Horas trabalhadas: %, Horas noturnas: %', 
    v_horas_antes, v_noturnas_antes;

  -- Recalcular
  PERFORM rh.recalculate_time_record_hours(v_record_id);

  -- Capturar valores depois
  SELECT horas_trabalhadas, horas_noturnas
  INTO v_horas_depois, v_noturnas_depois
  FROM rh.time_records
  WHERE id = v_record_id;

  RAISE NOTICE 'Depois - Horas trabalhadas: %, Horas noturnas: %', 
    v_horas_depois, v_noturnas_depois;

  -- Validar
  IF v_horas_depois IS NOT NULL AND v_horas_depois > 0 THEN
    RAISE NOTICE '✅ PASSOU: Horas trabalhadas calculadas corretamente';
  ELSE
    RAISE NOTICE '❌ FALHOU: Horas trabalhadas não foram calculadas';
  END IF;

  IF v_noturnas_depois IS NOT NULL THEN
    RAISE NOTICE '✅ PASSOU: Horas noturnas calculadas';
  ELSE
    RAISE NOTICE '❌ FALHOU: Horas noturnas não foram calculadas';
  END IF;

END $$;

\echo ''

-- =====================================================
-- TESTE 4: Verificar se eventos estão sendo usados
-- =====================================================
\echo 'TESTE 4: Verificar se eventos estão sendo usados corretamente'
\echo ''

SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  -- Eventos
  (SELECT MIN(event_at)
   FROM rh.time_record_events
   WHERE time_record_id = tr.id
     AND event_type = 'entrada') as entrada_event_at,
  (SELECT MAX(event_at)
   FROM rh.time_record_events
   WHERE time_record_id = tr.id
     AND event_type = 'saida') as saida_event_at,
  -- Verificar se há diferença entre data_registro e data do evento
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM rh.time_record_events
      WHERE time_record_id = tr.id
        AND event_type = 'entrada'
        AND (event_at AT TIME ZONE 'America/Sao_Paulo')::date != tr.data_registro
    ) THEN '⚠️ Data do evento diferente de data_registro'
    ELSE '✅ Datas consistentes'
  END as status_datas
FROM rh.time_records tr
WHERE tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM rh.time_record_events
    WHERE time_record_id = tr.id
  )
ORDER BY tr.data_registro DESC
LIMIT 10;

\echo ''
\echo '========================================'
\echo 'RESUMO DOS TESTES'
\echo '========================================'
