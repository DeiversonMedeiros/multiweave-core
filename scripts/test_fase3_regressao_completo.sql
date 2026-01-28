-- =====================================================
-- TESTE FASE 3: Regressão Completo
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Teste de regressão completo para validar todas as correções
--            implementadas nas Fases 1 e 2.
-- =====================================================

\echo '========================================'
\echo 'TESTE DE REGRESSÃO COMPLETO - FASE 3'
\echo '========================================'
\echo ''

-- =====================================================
-- RESUMO DAS CORREÇÕES IMPLEMENTADAS
-- =====================================================
\echo 'CORREÇÕES IMPLEMENTADAS:'
\echo '1. recalculate_time_record_hours: Usa event_at completo'
\echo '2. calculate_night_hours: Aceita datas explícitas'
\echo '3. calculate_overtime_by_scale: Passa datas para calculate_night_hours'
\echo '4. Banco de horas: Filtro por data_registro (correto)'
\echo ''

-- =====================================================
-- TESTE 1: Verificar integridade dos dados
-- =====================================================
\echo 'TESTE 1: Verificar integridade dos dados'
\echo ''

SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN entrada IS NOT NULL AND saida IS NOT NULL THEN 1 END) as registros_completos,
  COUNT(CASE WHEN entrada_date IS NOT NULL OR saida_date IS NOT NULL THEN 1 END) as registros_com_datas,
  COUNT(CASE WHEN horas_trabalhadas IS NOT NULL AND horas_trabalhadas > 0 THEN 1 END) as registros_com_horas,
  COUNT(CASE WHEN horas_noturnas IS NOT NULL THEN 1 END) as registros_com_noturnas
FROM rh.time_records
WHERE data_registro >= CURRENT_DATE - INTERVAL '30 days';

\echo ''

-- =====================================================
-- TESTE 2: Verificar registros que cruzam meia-noite
-- =====================================================
\echo 'TESTE 2: Verificar registros que cruzam meia-noite'
\echo ''

SELECT 
  COUNT(*) as total_cruzam_meianoite,
  COUNT(CASE WHEN horas_trabalhadas IS NOT NULL AND horas_trabalhadas > 0 THEN 1 END) as com_horas_calculadas,
  COUNT(CASE WHEN horas_noturnas IS NOT NULL AND horas_noturnas > 0 THEN 1 END) as com_noturnas_calculadas,
  AVG(horas_trabalhadas) as media_horas_trabalhadas,
  AVG(horas_noturnas) as media_horas_noturnas
FROM rh.time_records
WHERE entrada IS NOT NULL
  AND saida IS NOT NULL
  AND (
    entrada_date != saida_date
    OR EXISTS (
      SELECT 1
      FROM rh.time_record_events tre1
      JOIN rh.time_record_events tre2 ON tre2.time_record_id = tre1.time_record_id
      WHERE tre1.time_record_id = rh.time_records.id
        AND tre1.event_type = 'entrada'
        AND tre2.event_type = 'saida'
        AND (tre1.event_at AT TIME ZONE 'America/Sao_Paulo')::date != 
            (tre2.event_at AT TIME ZONE 'America/Sao_Paulo')::date
    )
  )
  AND data_registro >= CURRENT_DATE - INTERVAL '30 days';

\echo ''

-- =====================================================
-- TESTE 3: Verificar consistência entre time_records e events
-- =====================================================
\echo 'TESTE 3: Verificar consistência entre time_records e events'
\echo ''

SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE 
    WHEN EXISTS (
      SELECT 1
      FROM rh.time_record_events
      WHERE time_record_id = tr.id
    ) THEN 1
  END) as registros_com_events,
  COUNT(CASE 
    WHEN tr.entrada IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM rh.time_record_events
       WHERE time_record_id = tr.id
         AND event_type = 'entrada'
     ) THEN 1
  END) as entrada_consistente,
  COUNT(CASE 
    WHEN tr.saida IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM rh.time_record_events
       WHERE time_record_id = tr.id
         AND event_type = 'saida'
     ) THEN 1
  END) as saida_consistente
FROM rh.time_records tr
WHERE tr.data_registro >= CURRENT_DATE - INTERVAL '30 days'
  AND tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL;

\echo ''

-- =====================================================
-- TESTE 4: Verificar cálculos de horas noturnas
-- =====================================================
\echo 'TESTE 4: Verificar cálculos de horas noturnas'
\echo ''

SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN horas_noturnas > 0 THEN 1 END) as com_noturnas,
  COUNT(CASE 
    WHEN horas_noturnas > 0 
     AND entrada IS NOT NULL 
     AND saida IS NOT NULL
     AND (
       entrada::TIME >= '22:00:00'::TIME
       OR saida::TIME <= '05:00:00'::TIME
       OR entrada_date != saida_date
     )
    THEN 1
  END) as noturnas_consistentes,
  AVG(horas_noturnas) FILTER (WHERE horas_noturnas > 0) as media_noturnas
FROM rh.time_records
WHERE data_registro >= CURRENT_DATE - INTERVAL '30 days'
  AND entrada IS NOT NULL
  AND saida IS NOT NULL;

\echo ''

-- =====================================================
-- TESTE 5: Verificar banco de horas
-- =====================================================
\echo 'TESTE 5: Verificar banco de horas'
\echo ''

SELECT 
  COUNT(*) as total_registros_aprovados,
  SUM(COALESCE(horas_extras_50, 0)) as total_extras_50,
  SUM(COALESCE(horas_negativas, 0)) as total_negativas,
  SUM(COALESCE(horas_extras_50, 0)) - SUM(COALESCE(horas_negativas, 0)) as saldo_total
FROM rh.time_records
WHERE data_registro >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'aprovado'
  AND entrada IS NOT NULL
  AND saida IS NOT NULL;

\echo ''

-- =====================================================
-- TESTE 6: Verificar se recalculate funciona corretamente
-- =====================================================
\echo 'TESTE 6: Testar recalculate em amostra de registros'
\echo ''

DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  FOR v_record IN
    SELECT id
    FROM rh.time_records
    WHERE data_registro >= CURRENT_DATE - INTERVAL '7 days'
      AND entrada IS NOT NULL
      AND saida IS NOT NULL
      AND status IN ('aprovado', 'pendente', 'corrigido')
    ORDER BY RANDOM()
    LIMIT 10
  LOOP
    BEGIN
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      v_success_count := v_success_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Testados: % registros', v_count;
  RAISE NOTICE 'Sucesso: %', v_success_count;
  RAISE NOTICE 'Erros: %', v_error_count;

  IF v_error_count = 0 THEN
    RAISE NOTICE '✅ PASSOU: Todos os recalculates funcionaram';
  ELSE
    RAISE NOTICE '❌ FALHOU: % erros encontrados', v_error_count;
  END IF;
END $$;

\echo ''

-- =====================================================
-- TESTE 7: Verificar campos *_date
-- =====================================================
\echo 'TESTE 7: Verificar campos *_date'
\echo ''

SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN entrada_date IS NOT NULL THEN 1 END) as com_entrada_date,
  COUNT(CASE WHEN saida_date IS NOT NULL THEN 1 END) as com_saida_date,
  COUNT(CASE WHEN entrada_date != saida_date THEN 1 END) as cruzam_meianoite,
  COUNT(CASE 
    WHEN entrada_date IS NOT NULL 
     AND EXISTS (
       SELECT 1
       FROM rh.time_record_events
       WHERE time_record_id = tr.id
         AND event_type = 'entrada'
         AND (event_at AT TIME ZONE 'America/Sao_Paulo')::date = entrada_date
     )
    THEN 1
  END) as entrada_date_consistente,
  COUNT(CASE 
    WHEN saida_date IS NOT NULL 
     AND EXISTS (
       SELECT 1
       FROM rh.time_record_events
       WHERE time_record_id = tr.id
         AND event_type = 'saida'
         AND (event_at AT TIME ZONE 'America/Sao_Paulo')::date = saida_date
     )
    THEN 1
  END) as saida_date_consistente
FROM rh.time_records tr
WHERE tr.data_registro >= CURRENT_DATE - INTERVAL '30 days'
  AND tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL;

\echo ''
\echo '========================================'
\echo 'RESUMO DO TESTE DE REGRESSÃO'
\echo '========================================'
\echo 'Verifique os resultados acima para validar:'
\echo '1. Integridade dos dados'
\echo '2. Registros que cruzam meia-noite'
\echo '3. Consistência entre time_records e events'
\echo '4. Cálculos de horas noturnas'
\echo '5. Banco de horas'
\echo '6. Função recalculate'
\echo '7. Campos *_date'
\echo ''
