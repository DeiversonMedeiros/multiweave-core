-- =====================================================
-- CORRIGIR AGRUPAMENTO DE ENTRADA EXTRA DO GILCIMAR (VERSÃO FLEXÍVEL)
-- =====================================================
-- Data: 2026-02-09
-- Descrição: Agrupa marcação de entrada extra isolada com registro do dia anterior
--            Versão flexível que busca automaticamente o registro mais próximo
-- =====================================================

-- PRIMEIRO: Diagnóstico completo
\echo '=== DIAGNÓSTICO: Registros do GILCIMAR ==='

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
    WHEN tr.entrada IS NULL AND tr.entrada_almoco IS NULL AND tr.saida_almoco IS NULL 
         AND tr.saida IS NULL AND tr.saida_extra1 IS NOT NULL 
    THEN 'SAIDA_EXTRA_ISOLADA'
    ELSE 'OK'
  END as status_verificacao
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
WHERE e.id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tr.data_registro >= '2026-01-15'  -- Buscar mais amplo
  AND tr.data_registro <= '2026-01-25'
ORDER BY tr.data_registro, tr.created_at;

\echo ''
\echo '=== DIAGNÓSTICO: Eventos do GILCIMAR ==='

SELECT 
  tre.id,
  tre.event_type,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' as event_at_local,
  tre.time_record_id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_extra1
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
WHERE tr.employee_id = '2109a7db-701a-4391-8246-ac2b4b874a9d'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-20 00:00:00'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' <= '2026-01-23 23:59:59'
ORDER BY tre.event_at;

\echo ''
\echo '=== INICIANDO CORREÇÃO ==='

DO $$
DECLARE
  v_employee_id uuid := '2109a7db-701a-4391-8246-ac2b4b874a9d'; -- GILCIMAR OLIVEIRA DA SILVA
  v_company_id uuid := 'f83704f6-3278-4d59-81ca-45925a1ab855'; -- SMARTVIEW
  v_record_21_id uuid;
  v_record_22_id uuid;
  v_entrada_extra1_time time;
  v_event_id uuid;
  v_updated_count integer;
  v_target_date date := '2026-01-22';
  v_previous_date date := '2026-01-21';
BEGIN
  -- Buscar registro com entrada_extra1 isolada no dia 22/01 ou próximo
  SELECT id, entrada_extra1, data_registro 
  INTO v_record_22_id, v_entrada_extra1_time, v_target_date
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND company_id = v_company_id
    AND entrada_extra1 IS NOT NULL
    AND entrada IS NULL
    AND entrada_almoco IS NULL
    AND saida_almoco IS NULL
    AND saida IS NULL
    AND data_registro BETWEEN '2026-01-20' AND '2026-01-25'
  ORDER BY data_registro
  LIMIT 1;

  IF v_record_22_id IS NULL THEN
    RAISE NOTICE 'Nenhum registro com entrada_extra1 isolada encontrado.';
    RAISE NOTICE 'Verifique os dados de diagnóstico acima.';
    RETURN;
  END IF;

  RAISE NOTICE 'Registro com entrada_extra1 isolada encontrado: Data %, ID %, Hora %', 
    v_target_date, v_record_22_id, v_entrada_extra1_time;

  -- Buscar registro do dia anterior que tenha entrada (para agrupar)
  v_previous_date := v_target_date - INTERVAL '1 day';
  
  SELECT id INTO v_record_21_id
  FROM rh.time_records
  WHERE employee_id = v_employee_id
    AND company_id = v_company_id
    AND data_registro = v_previous_date
    AND entrada IS NOT NULL
  LIMIT 1;

  -- Se não encontrou no dia anterior, buscar até 3 dias antes
  IF v_record_21_id IS NULL THEN
    SELECT id, data_registro INTO v_record_21_id, v_previous_date
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND company_id = v_company_id
      AND entrada IS NOT NULL
      AND data_registro < v_target_date
      AND data_registro >= v_target_date - INTERVAL '3 days'
    ORDER BY data_registro DESC
    LIMIT 1;
  END IF;

  IF v_record_21_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível encontrar um registro com entrada para agrupar. Data alvo: %, Registro isolado: %', 
      v_previous_date, v_record_22_id;
  END IF;

  RAISE NOTICE 'Registro para agrupar encontrado: Data %, ID %', v_previous_date, v_record_21_id;

  -- Verificar se o registro de destino já tem entrada_extra1
  IF EXISTS (
    SELECT 1 FROM rh.time_records
    WHERE id = v_record_21_id
      AND entrada_extra1 IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'O registro do dia % já possui uma entrada_extra1. Verifique manualmente antes de continuar.', v_previous_date;
  END IF;

  -- Mover entrada_extra1 do registro isolado para o registro do dia anterior
  UPDATE rh.time_records
  SET entrada_extra1 = v_entrada_extra1_time,
      updated_at = NOW()
  WHERE id = v_record_21_id;

  RAISE NOTICE 'Entrada extra movida para o registro do dia %', v_previous_date;

  -- Atualizar o evento time_record_event para apontar para o registro correto
  UPDATE rh.time_record_events
  SET time_record_id = v_record_21_id
  WHERE time_record_id = v_record_22_id
    AND event_type = 'extra_inicio';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RAISE WARNING 'Nenhum evento time_record_event foi atualizado. Verifique se o evento existe.';
  ELSE
    RAISE NOTICE 'Eventos atualizados: %', v_updated_count;
  END IF;

  -- Limpar entrada_extra1 do registro isolado
  UPDATE rh.time_records
  SET entrada_extra1 = NULL,
      updated_at = NOW()
  WHERE id = v_record_22_id;

  -- Verificar se o registro isolado está vazio e deletá-lo se necessário
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
    
    RAISE NOTICE 'Registro vazio do dia % foi deletado.', v_target_date;
  ELSE
    RAISE NOTICE 'Registro do dia % ainda possui outras marcações. Mantido no banco.', v_target_date;
  END IF;

  -- Exibir resumo da operação
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO CONCLUÍDA COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registro de destino: Data %, ID %', v_previous_date, v_record_21_id;
  RAISE NOTICE 'Entrada extra movida: %', v_entrada_extra1_time;
  RAISE NOTICE 'Registro isolado removido: Data %, ID %', v_target_date, v_record_22_id;
  RAISE NOTICE 'Eventos atualizados: %', v_updated_count;
  RAISE NOTICE '========================================';

END $$;

-- Verificar o resultado final
\echo ''
\echo '=== RESULTADO FINAL ==='

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
  AND tr.data_registro >= '2026-01-15'
  AND tr.data_registro <= '2026-01-25'
ORDER BY tr.data_registro;
