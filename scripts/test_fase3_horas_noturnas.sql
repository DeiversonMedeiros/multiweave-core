-- =====================================================
-- TESTE FASE 3: Validação de Cálculo de Horas Noturnas
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Testa o cálculo de horas noturnas com diferentes cenários,
--            incluindo registros que cruzam meia-noite.
-- =====================================================

\echo '========================================'
\echo 'TESTE: Cálculo de Horas Noturnas'
\echo '========================================'
\echo ''

-- =====================================================
-- TESTE 1: Registro que cruza meia-noite
-- =====================================================
\echo 'TESTE 1: Registro que cruza meia-noite'
\echo 'Entrada: 27/01/2026 21:24'
\echo 'Saída:   28/01/2026 01:00'
\echo 'Período noturno: 22h às 5h'
\echo 'Esperado: 3 horas noturnas (22h-01h)'
\echo ''

SELECT 
  rh.calculate_night_hours(
    '21:24:00'::TIME,
    '01:00:00'::TIME,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE,  -- entrada_date
    '2026-01-28'::DATE   -- saida_date
  ) as horas_noturnas_corretas,
  3.0 as horas_noturnas_esperadas,
  CASE 
    WHEN rh.calculate_night_hours(
      '21:24:00'::TIME,
      '01:00:00'::TIME,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE,
      '2026-01-28'::DATE
    ) BETWEEN 2.9 AND 3.1 THEN '✅ PASSOU'
    ELSE '❌ FALHOU'
  END as resultado;

\echo ''

-- =====================================================
-- TESTE 2: Registro dentro do período noturno
-- =====================================================
\echo 'TESTE 2: Registro dentro do período noturno'
\echo 'Entrada: 27/01/2026 23:00'
\echo 'Saída:   28/01/2026 03:00'
\echo 'Esperado: 4 horas noturnas (23h-03h)'
\echo ''

SELECT 
  rh.calculate_night_hours(
    '23:00:00'::TIME,
    '03:00:00'::TIME,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE,
    '2026-01-28'::DATE
  ) as horas_noturnas_corretas,
  4.0 as horas_noturnas_esperadas,
  CASE 
    WHEN rh.calculate_night_hours(
      '23:00:00'::TIME,
      '03:00:00'::TIME,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE,
      '2026-01-28'::DATE
    ) BETWEEN 3.9 AND 4.1 THEN '✅ PASSOU'
    ELSE '❌ FALHOU'
  END as resultado;

\echo ''

-- =====================================================
-- TESTE 3: Registro que não cruza período noturno
-- =====================================================
\echo 'TESTE 3: Registro que não cruza período noturno'
\echo 'Entrada: 27/01/2026 08:00'
\echo 'Saída:   27/01/2026 17:00'
\echo 'Esperado: 0 horas noturnas'
\echo ''

SELECT 
  rh.calculate_night_hours(
    '08:00:00'::TIME,
    '17:00:00'::TIME,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE
  ) as horas_noturnas_corretas,
  0.0 as horas_noturnas_esperadas,
  CASE 
    WHEN rh.calculate_night_hours(
      '08:00:00'::TIME,
      '17:00:00'::TIME,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE
    ) = 0 THEN '✅ PASSOU'
    ELSE '❌ FALHOU'
  END as resultado;

\echo ''

-- =====================================================
-- TESTE 4: Registro parcialmente no período noturno (início)
-- =====================================================
\echo 'TESTE 4: Registro parcialmente no período noturno (início)'
\echo 'Entrada: 27/01/2026 20:00'
\echo 'Saída:   27/01/2026 23:30'
\echo 'Esperado: 1.5 horas noturnas (22h-23:30h)'
\echo ''

SELECT 
  rh.calculate_night_hours(
    '20:00:00'::TIME,
    '23:30:00'::TIME,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE
  ) as horas_noturnas_corretas,
  1.5 as horas_noturnas_esperadas,
  CASE 
    WHEN rh.calculate_night_hours(
      '20:00:00'::TIME,
      '23:30:00'::TIME,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE
    ) BETWEEN 1.4 AND 1.6 THEN '✅ PASSOU'
    ELSE '❌ FALHOU'
  END as resultado;

\echo ''

-- =====================================================
-- TESTE 5: Registro parcialmente no período noturno (fim)
-- =====================================================
\echo 'TESTE 5: Registro parcialmente no período noturno (fim)'
\echo 'Entrada: 27/01/2026 04:00'
\echo 'Saída:   27/01/2026 08:00'
\echo 'Esperado: 1 hora noturna (04h-05h)'
\echo ''

SELECT 
  rh.calculate_night_hours(
    '04:00:00'::TIME,
    '08:00:00'::TIME,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE,
    '2026-01-27'::DATE
  ) as horas_noturnas_corretas,
  1.0 as horas_noturnas_esperadas,
  CASE 
    WHEN rh.calculate_night_hours(
      '04:00:00'::TIME,
      '08:00:00'::TIME,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE,
      '2026-01-27'::DATE
    ) BETWEEN 0.9 AND 1.1 THEN '✅ PASSOU'
    ELSE '❌ FALHOU'
  END as resultado;

\echo ''

-- =====================================================
-- TESTE 6: Compatibilidade com função antiga (sem datas)
-- =====================================================
\echo 'TESTE 6: Compatibilidade com função antiga (sem datas)'
\echo 'Entrada: 27/01/2026 23:00'
\echo 'Saída:   28/01/2026 01:00 (detectado automaticamente)'
\echo 'Esperado: Deve funcionar com fallback'
\echo ''

SELECT 
  rh.calculate_night_hours(
    '23:00:00'::TIME,
    '01:00:00'::TIME,
    '2026-01-27'::DATE
    -- Sem datas explícitas, deve usar detecção automática
  ) as horas_noturnas_fallback,
  CASE 
    WHEN rh.calculate_night_hours(
      '23:00:00'::TIME,
      '01:00:00'::TIME,
      '2026-01-27'::DATE
    ) > 0 THEN '✅ PASSOU (fallback funciona)'
    ELSE '❌ FALHOU'
  END as resultado;

\echo ''
\echo '========================================'
\echo 'RESUMO DOS TESTES'
\echo '========================================'
