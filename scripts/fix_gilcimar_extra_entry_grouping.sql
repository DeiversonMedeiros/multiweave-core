-- =====================================================
-- CORRIGIR AGRUPAMENTO DE ENTRADA EXTRA DO GILCIMAR
-- =====================================================
-- Data: 2026-02-09
-- Descrição: Agrupa a marcação de entrada extra às 00:32 do dia 22/01/2026
--            com o registro do dia 21/01/2026 do funcionário GILCIMAR OLIVEIRA DA SILVA
-- =====================================================

-- PRIMEIRO: Diagnóstico - Verificar quais registros existem
SELECT 
  '=== DIAGNÓSTICO: Registros do GILCIMAR ===' as info;

SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.created_at,
  e.nome,
  CASE 
    WHEN tr.entrada IS NULL AND tr.entrada_almoco IS NULL AND tr.saida_almoco IS NULL 
         AND tr.saida IS NULL AND tr.entrada_extra1 IS NOT NULL 
    THEN 'ENTRADA_EXTRA_ISOLADA'
    ELSE 'OK'
  END as status_verificacao
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro BETWEEN '2026-01-20' AND '2026-01-23'
ORDER BY tr.data_registro, tr.created_at;

-- Verificar eventos relacionados
SELECT 
  '=== DIAGNÓSTICO: Eventos do GILCIMAR ===' as info;

SELECT 
  tre.id,
  tre.event_type,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' as event_at_local,
  tre.time_record_id,
  tr.data_registro
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-21 00:00:00'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' <= '2026-01-22 23:59:59'
ORDER BY tre.event_at;

-- AGORA: Script de correção (só executa se encontrar os registros)
DO $$
DECLARE
  v_employee_id uuid := '2109a7db-701a-4391-8246-ac2b4b874a9d'; -- GILCIMAR OLIVEIRA DA SILVA
  v_company_id uuid := 'f83704f6-3278-4d59-81ca-45925a1ab855'; -- SMARTVIEW
  v_record_21_id uuid;
  v_record_22_id uuid;
  v_entrada_extra1_time time;
  v_event_id uuid;
  v_updated_count integer;
  v_found_record_21 boolean := false;
  v_found_record_22 boolean := false;
BEGIN
  -- 1. Verificar se existe registro do dia 21/01/2026
  SELECT id INTO v_record_21_id
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND company_id = v_company_id
    AND data_registro = '2026-01-21'
  LIMIT 1;

  v_found_record_21 := (v_record_21_id IS NOT NULL);

  -- 2. Verificar se existe registro do dia 22/01/2026 com entrada_extra1
  SELECT id, entrada_extra1 INTO v_record_22_id, v_entrada_extra1_time
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND company_id = v_company_id
    AND data_registro = '2026-01-22'
    AND entrada_extra1 IS NOT NULL
  LIMIT 1;

  v_found_record_22 := (v_record_22_id IS NOT NULL);

  -- Se não encontrou os registros, exibir mensagem informativa
  IF NOT v_found_record_21 AND NOT v_found_record_22 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NENHUM REGISTRO ENCONTRADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Não foram encontrados registros do dia 21/01 ou 22/01 para o funcionário GILCIMAR.';
    RAISE NOTICE 'Possíveis causas:';
    RAISE NOTICE '1. Os registros foram deletados';
    RAISE NOTICE '2. Os registros estão em datas diferentes';
    RAISE NOTICE '3. O problema já foi corrigido anteriormente';
    RAISE NOTICE '';
    RAISE NOTICE 'Execute as consultas de diagnóstico acima para verificar o estado atual.';
    RAISE NOTICE '========================================';
    RETURN;
  END IF;

  IF NOT v_found_record_21 THEN
    RAISE EXCEPTION 'Registro do dia 21/01/2026 não encontrado para o funcionário GILCIMAR. Verifique os dados acima.';
  END IF;

  IF NOT v_found_record_22 THEN
    RAISE EXCEPTION 'Registro do dia 22/01/2026 com entrada_extra1 não encontrado para o funcionário GILCIMAR. Verifique os dados acima.';
  END IF;

  -- 2. Verificar se existe registro do dia 22/01/2026 com entrada_extra1
  SELECT id, entrada_extra1 INTO v_record_22_id, v_entrada_extra1_time
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND company_id = v_company_id
    AND data_registro = '2026-01-22'
    AND entrada_extra1 IS NOT NULL
  LIMIT 1;

  IF v_record_22_id IS NULL THEN
    RAISE EXCEPTION 'Registro do dia 22/01/2026 com entrada_extra1 não encontrado para o funcionário GILCIMAR';
  END IF;

  -- 3. Verificar se o registro do dia 21/01 já tem entrada_extra1
  IF EXISTS (
    SELECT 1 FROM rh.time_records
    WHERE id = v_record_21_id
      AND entrada_extra1 IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'O registro do dia 21/01/2026 já possui uma entrada_extra1. Verifique manualmente antes de continuar.';
  END IF;

  -- 4. Mover entrada_extra1 do registro do dia 22/01 para o registro do dia 21/01
  UPDATE rh.time_records
  SET entrada_extra1 = v_entrada_extra1_time,
      updated_at = NOW()
  WHERE id = v_record_21_id;

  -- 5. Atualizar o evento time_record_event para apontar para o registro correto
  UPDATE rh.time_record_events
  SET time_record_id = v_record_21_id
  WHERE time_record_id = v_record_22_id
    AND event_type = 'extra_inicio'
    AND event_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-22 00:00:00'
    AND event_at AT TIME ZONE 'America/Sao_Paulo' < '2026-01-22 01:00:00';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RAISE WARNING 'Nenhum evento time_record_event foi atualizado. Verifique se o evento existe.';
  END IF;

  -- 6. Limpar entrada_extra1 do registro do dia 22/01
  UPDATE rh.time_records
  SET entrada_extra1 = NULL,
      updated_at = NOW()
  WHERE id = v_record_22_id;

  -- 7. Verificar se o registro do dia 22/01 está vazio (sem outras marcações)
  -- Se estiver vazio, podemos deletá-lo ou deixá-lo como está
  IF NOT EXISTS (
    SELECT 1 FROM rh.time_records
    WHERE id = v_record_22_id
      AND (entrada IS NOT NULL 
           OR entrada_almoco IS NOT NULL 
           OR saida_almoco IS NOT NULL 
           OR saida IS NOT NULL 
           OR saida_extra1 IS NOT NULL)
  ) THEN
    -- Deletar eventos associados ao registro vazio
    DELETE FROM rh.time_record_events
    WHERE time_record_id = v_record_22_id;
    
    -- Deletar o registro vazio
    DELETE FROM rh.time_records
    WHERE id = v_record_22_id;
    
    RAISE NOTICE 'Registro vazio do dia 22/01/2026 foi deletado.';
  ELSE
    RAISE NOTICE 'Registro do dia 22/01/2026 ainda possui outras marcações. Mantido no banco.';
  END IF;

  -- 8. Exibir resumo da operação
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO CONCLUÍDA COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registro do dia 21/01/2026 (ID: %)', v_record_21_id;
  RAISE NOTICE 'Entrada extra movida: %', v_entrada_extra1_time;
  RAISE NOTICE 'Eventos atualizados: %', v_updated_count;
  RAISE NOTICE '========================================';

END $$;

-- Verificar o resultado
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  e.nome,
  c.nome_fantasia
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
JOIN public.companies c ON tr.company_id = c.id
WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro BETWEEN '2026-01-21' AND '2026-01-22'
ORDER BY tr.data_registro;

-- Verificar eventos
SELECT 
  tre.id,
  tre.event_type,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' as event_at_local,
  tre.time_record_id,
  tr.data_registro
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-21 00:00:00'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' <= '2026-01-22 23:59:59'
ORDER BY tre.event_at;
