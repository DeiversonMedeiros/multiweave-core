-- =====================================================
-- TESTE FASE 3: Validação de Banco de Horas
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Testa se as funções de banco de horas agregam corretamente
--            registros que cruzam meia-noite.
-- =====================================================

\echo '========================================'
\echo 'TESTE: Banco de Horas'
\echo '========================================'
\echo ''

-- =====================================================
-- TESTE 1: Verificar se funções existem
-- =====================================================
\echo 'TESTE 1: Verificar se funções existem'
\echo ''

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'rh'
        AND p.proname = 'get_monthly_bank_hours_balance'
    ) THEN '✅ get_monthly_bank_hours_balance existe'
    ELSE '❌ get_monthly_bank_hours_balance não encontrada'
  END as resultado_1,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'rh'
        AND p.proname = 'calculate_and_accumulate_bank_hours'
    ) THEN '✅ calculate_and_accumulate_bank_hours existe'
    ELSE '❌ calculate_and_accumulate_bank_hours não encontrada'
  END as resultado_2;

\echo ''

-- =====================================================
-- TESTE 2: Verificar registros que cruzam meia-noite no mês
-- =====================================================
\echo 'TESTE 2: Verificar registros que cruzam meia-noite no mês'
\echo 'Buscando registros de janeiro/2026 que cruzam meia-noite...'
\echo ''

SELECT 
  tr.id,
  tr.employee_id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.entrada_date,
  tr.saida_date,
  tr.horas_extras_50,
  tr.horas_negativas,
  tr.status,
  -- Verificar se data_registro está no mês de janeiro
  CASE 
    WHEN tr.data_registro >= '2026-01-01'::DATE 
     AND tr.data_registro <= '2026-01-31'::DATE THEN '✅ No mês de janeiro'
    ELSE '❌ Fora do mês'
  END as status_mes
FROM rh.time_records tr
WHERE tr.data_registro >= '2026-01-01'::DATE
  AND tr.data_registro <= '2026-01-31'::DATE
  AND tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL
  AND (
    tr.entrada_date != tr.saida_date
    OR EXISTS (
      SELECT 1
      FROM rh.time_record_events tre1
      JOIN rh.time_record_events tre2 ON tre2.time_record_id = tre1.time_record_id
      WHERE tre1.time_record_id = tr.id
        AND tre1.event_type = 'entrada'
        AND tre2.event_type = 'saida'
        AND (tre1.event_at AT TIME ZONE 'America/Sao_Paulo')::date != 
            (tre2.event_at AT TIME ZONE 'America/Sao_Paulo')::date
    )
  )
ORDER BY tr.data_registro DESC
LIMIT 10;

\echo ''

-- =====================================================
-- TESTE 3: Testar get_monthly_bank_hours_balance
-- =====================================================
\echo 'TESTE 3: Testar get_monthly_bank_hours_balance'
\echo 'Calculando saldo para janeiro/2026...'
\echo ''

DO $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_saldo DECIMAL(6,2);
BEGIN
  -- Encontrar um funcionário com registros em janeiro/2026
  SELECT DISTINCT tr.employee_id, tr.company_id
  INTO v_employee_id, v_company_id
  FROM rh.time_records tr
  WHERE tr.data_registro >= '2026-01-01'::DATE
    AND tr.data_registro <= '2026-01-31'::DATE
    AND tr.status = 'aprovado'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE NOTICE 'Nenhum funcionário encontrado com registros em janeiro/2026';
    RETURN;
  END IF;

  RAISE NOTICE 'Funcionário: %, Empresa: %', v_employee_id, v_company_id;

  -- Calcular saldo mensal
  SELECT rh.get_monthly_bank_hours_balance(
    v_employee_id,
    v_company_id,
    2026,
    1
  ) INTO v_saldo;

  RAISE NOTICE 'Saldo mensal (janeiro/2026): %', v_saldo;

  -- Verificar se cálculo retornou valor (pode ser 0)
  IF v_saldo IS NOT NULL THEN
    RAISE NOTICE '✅ PASSOU: Função retornou valor';
  ELSE
    RAISE NOTICE '❌ FALHOU: Função não retornou valor';
  END IF;

END $$;

\echo ''

-- =====================================================
-- TESTE 4: Verificar se registros que cruzam meia-noite são incluídos
-- =====================================================
\echo 'TESTE 4: Verificar se registros que cruzam meia-noite são incluídos'
\echo 'Verificando se registros com data_registro no mês são incluídos...'
\echo ''

SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN entrada_date != saida_date THEN 1 END) as registros_cruzam_meianoite,
  SUM(COALESCE(horas_extras_50, 0)) as total_horas_extras_50,
  SUM(COALESCE(horas_negativas, 0)) as total_horas_negativas,
  SUM(COALESCE(horas_extras_50, 0)) - SUM(COALESCE(horas_negativas, 0)) as saldo_calculado
FROM rh.time_records
WHERE data_registro >= '2026-01-01'::DATE
  AND data_registro <= '2026-01-31'::DATE
  AND status = 'aprovado'
  AND entrada IS NOT NULL
  AND saida IS NOT NULL;

\echo ''

-- =====================================================
-- TESTE 5: Comparar cálculo manual vs função
-- =====================================================
\echo 'TESTE 5: Comparar cálculo manual vs função'
\echo ''

DO $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_saldo_funcao DECIMAL(6,2);
  v_saldo_manual DECIMAL(6,2);
  v_horas_extras_50 DECIMAL(6,2);
  v_horas_negativas DECIMAL(6,2);
BEGIN
  -- Encontrar um funcionário com registros
  SELECT DISTINCT tr.employee_id, tr.company_id
  INTO v_employee_id, v_company_id
  FROM rh.time_records tr
  WHERE tr.data_registro >= '2026-01-01'::DATE
    AND tr.data_registro <= '2026-01-31'::DATE
    AND tr.status = 'aprovado'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE NOTICE 'Nenhum funcionário encontrado';
    RETURN;
  END IF;

  -- Calcular usando função
  SELECT rh.get_monthly_bank_hours_balance(
    v_employee_id,
    v_company_id,
    2026,
    1
  ) INTO v_saldo_funcao;

  -- Calcular manualmente
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(horas_extras_50, 0) > 0 THEN horas_extras_50
        WHEN COALESCE(horas_extras_50, 0) = 0 THEN
          CASE 
            WHEN COALESCE(horas_extras, 0) > 0 AND COALESCE(horas_extras_100, 0) = 0 THEN horas_extras
            ELSE 0
          END
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(COALESCE(horas_negativas, 0)), 0)
  INTO v_horas_extras_50, v_horas_negativas
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND company_id = v_company_id
    AND data_registro >= '2026-01-01'::DATE
    AND data_registro <= '2026-01-31'::DATE
    AND status = 'aprovado';

  v_saldo_manual := v_horas_extras_50 - v_horas_negativas;

  RAISE NOTICE 'Saldo (função): %', v_saldo_funcao;
  RAISE NOTICE 'Saldo (manual): %', v_saldo_manual;
  RAISE NOTICE 'Horas extras 50%%: %', v_horas_extras_50;
  RAISE NOTICE 'Horas negativas: %', v_horas_negativas;

  -- Comparar (tolerância de 0.01)
  IF ABS(v_saldo_funcao - v_saldo_manual) < 0.01 THEN
    RAISE NOTICE '✅ PASSOU: Cálculos coincidem';
  ELSE
    RAISE NOTICE '❌ FALHOU: Diferença entre cálculos: %', ABS(v_saldo_funcao - v_saldo_manual);
  END IF;

END $$;

\echo ''
\echo '========================================'
\echo 'RESUMO DOS TESTES'
\echo '========================================'
