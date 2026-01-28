-- Script de teste para verificar o retorno da função get_consolidated_time_record_by_window
-- Execute este script para ver o que a função está retornando

-- Substitua pelos valores corretos
DO $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_result jsonb;
BEGIN
  -- Buscar employee_id e company_id do usuário deiverson.medeiros
  SELECT u.id, u.company_id INTO v_employee_id, v_company_id
  FROM public.users u
  WHERE u.username = 'deiverson.medeiros'
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado';
    RETURN;
  END IF;

  RAISE NOTICE 'Employee ID: %, Company ID: %', v_employee_id, v_company_id;

  -- Testar a função para o dia 28/01/2026
  SELECT public.get_consolidated_time_record_by_window(
    v_employee_id,
    v_company_id,
    '2026-01-28'::date,
    'America/Sao_Paulo'
  ) INTO v_result;

  RAISE NOTICE 'Resultado: %', v_result::text;

  -- Mostrar campos específicos
  IF v_result IS NOT NULL THEN
    RAISE NOTICE 'base_date: %', v_result->>'base_date';
    RAISE NOTICE 'entrada: %', v_result->>'entrada';
    RAISE NOTICE 'entrada_almoco: %', v_result->>'entrada_almoco';
    RAISE NOTICE 'saida_almoco: %', v_result->>'saida_almoco';
    RAISE NOTICE 'saida_almoco_date: %', v_result->>'saida_almoco_date';
    RAISE NOTICE 'saida: %', v_result->>'saida';
  ELSE
    RAISE NOTICE 'Nenhum registro encontrado';
  END IF;

  -- Verificar eventos diretamente
  RAISE NOTICE '--- Eventos do registro ---';
  FOR v_result IN
    SELECT 
      tre.event_type,
      tre.event_at,
      (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::date as local_date,
      (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::time as local_time
    FROM rh.time_record_events tre
    WHERE tre.employee_id = v_employee_id
      AND tre.event_at >= '2026-01-27'::date
      AND tre.event_at < '2026-01-29'::date
    ORDER BY tre.event_at ASC
  LOOP
    RAISE NOTICE 'Event: % | Date: % | Time: % | Event_at: %', 
      v_result->>'event_type',
      v_result->>'local_date',
      v_result->>'local_time',
      v_result->>'event_at';
  END LOOP;
END;
$$;
