-- =====================================================
-- CORRIGIR SAÍDA NA JANELA DE 15h - GENIVALDO e FLORISVALDO (TECHSTEEL)
-- =====================================================
-- Data: 2026-02-10
-- Descrição: A marcação de SAÍDA às 00:12 do dia 22/01/2026 pertence ao dia de
--            trabalho que começou em 21/01 (janela de tempo de 15h). Move o
--            evento de saída do registro do dia 22/01 para o registro do dia 21/01.
--            Baseado na correção do GILCIMAR (entrada extra), adaptado para SAÍDA.
-- Funcionários: GENIVALDO SANTOS DA SILVA, FLORISVALDO SENA LIMA
-- Empresa: TECHSTEEL
-- =====================================================

-- DIAGNÓSTICO: Registros dos funcionários nas datas 21/01 e 22/01
SELECT '=== DIAGNÓSTICO: Registros GENIVALDO e FLORISVALDO (TECHSTEEL) 21-22/01 ===' AS info;

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
    WHEN tr.saida IS NOT NULL AND tr.entrada IS NULL AND tr.entrada_almoco IS NULL
         AND tr.saida_almoco IS NULL AND tr.entrada_extra1 IS NULL AND tr.saida_extra1 IS NULL
    THEN 'SAIDA_ISOLADA_DIA_SEGUINTE'
    WHEN tr.entrada IS NOT NULL AND tr.saida IS NULL
    THEN 'FALTA_SAIDA'
    ELSE 'OK'
  END AS status_verificacao
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
WHERE e.id IN (
  'f7d2bbc7-a9da-4843-9d75-c318f64cbc87',  -- GENIVALDO SANTOS DA SILVA
  '3f6c860d-2d1c-48a6-a866-66198573460e'   -- FLORISVALDO SENA LIMA
)
  AND tr.company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'  -- TECHSTEEL
  AND tr.data_registro BETWEEN '2026-01-20' AND '2026-01-23'
ORDER BY e.nome, tr.data_registro, tr.created_at;

-- DIAGNÓSTICO: Eventos de saida nas datas
SELECT '=== DIAGNÓSTICO: Eventos (saída) 21-22/01 ===' AS info;

SELECT
  tre.id,
  tre.event_type,
  tre.event_at AT TIME ZONE 'America/Sao_Paulo' AS event_at_local,
  tre.time_record_id,
  tr.data_registro,
  e.nome
FROM rh.time_record_events tre
JOIN rh.time_records tr ON tre.time_record_id = tr.id
JOIN public.users e ON tr.employee_id = e.id
WHERE tr.employee_id IN (
  'f7d2bbc7-a9da-4843-9d75-c318f64cbc87',
  '3f6c860d-2d1c-48a6-a866-66198573460e'
)
  AND tr.company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-21 00:00:00'
  AND tre.event_at AT TIME ZONE 'America/Sao_Paulo' <= '2026-01-22 23:59:59'
  AND tre.event_type = 'saida'
ORDER BY e.nome, tre.event_at;

-- ========== CORREÇÃO ==========
DO $$
DECLARE
  v_company_id uuid := 'ce92d32f-0503-43ca-b3cc-fb09a462b839';  -- TECHSTEEL
  v_record_21_id uuid;
  v_record_22_id uuid;
  v_saida_time time;
  v_updated_events integer;
  v_employee_id uuid;
  v_employee_name text;
  v_employees uuid[] := ARRAY[
    'f7d2bbc7-a9da-4843-9d75-c318f64cbc87'::uuid,  -- GENIVALDO SANTOS DA SILVA
    '3f6c860d-2d1c-48a6-a866-66198573460e'::uuid   -- FLORISVALDO SENA LIMA
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(v_employees, 1) LOOP
    v_employee_id := v_employees[i];

    SELECT nome INTO v_employee_name FROM public.users WHERE id = v_employee_id;

    -- 1. Registro do dia 22/01 com apenas SAÍDA (marcação que deveria ser do dia 21)
    SELECT id, saida INTO v_record_22_id, v_saida_time
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND company_id = v_company_id
      AND data_registro = '2026-01-22'
      AND saida IS NOT NULL
      AND entrada IS NULL
      AND entrada_almoco IS NULL
      AND saida_almoco IS NULL
      AND entrada_extra1 IS NULL
      AND saida_extra1 IS NULL
    LIMIT 1;

    IF v_record_22_id IS NULL THEN
      RAISE NOTICE 'Funcionário %: Nenhum registro do dia 22/01 com saída isolada encontrado (pode já estar corrigido).', v_employee_name;
      CONTINUE;
    END IF;

    -- 2. Registro do dia 21/01 sem saída (para receber a marcação)
    SELECT id INTO v_record_21_id
    FROM rh.time_records
    WHERE employee_id = v_employee_id
      AND company_id = v_company_id
      AND data_registro = '2026-01-21'
      AND saida IS NULL
      AND entrada IS NOT NULL
    LIMIT 1;

    IF v_record_21_id IS NULL THEN
      RAISE WARNING 'Funcionário %: Registro do dia 21/01 sem saída não encontrado. Ignorando.', v_employee_name;
      CONTINUE;
    END IF;

    -- 3. Atualizar eventos: mover evento 'saida' do registro 22 para o registro 21
    UPDATE rh.time_record_events
    SET time_record_id = v_record_21_id
    WHERE time_record_id = v_record_22_id
      AND event_type = 'saida';

    GET DIAGNOSTICS v_updated_events = ROW_COUNT;

    -- 4. Atualizar time_records: preencher saida no registro do dia 21
    UPDATE rh.time_records
    SET saida = v_saida_time,
        updated_at = NOW()
    WHERE id = v_record_21_id;

    -- 5. Limpar saida do registro do dia 22
    UPDATE rh.time_records
    SET saida = NULL,
        updated_at = NOW()
    WHERE id = v_record_22_id;

    -- 6. Recalcular horas do registro do dia 21
    PERFORM rh.recalculate_time_record_hours(v_record_21_id);

    -- 7. Se o registro do dia 22 ficou vazio, remover
    IF NOT EXISTS (
      SELECT 1 FROM rh.time_records
      WHERE id = v_record_22_id
        AND (entrada IS NOT NULL OR entrada_almoco IS NOT NULL OR saida_almoco IS NOT NULL
             OR saida IS NOT NULL OR entrada_extra1 IS NOT NULL OR saida_extra1 IS NOT NULL)
    ) THEN
      DELETE FROM rh.time_record_events WHERE time_record_id = v_record_22_id;
      DELETE FROM rh.time_records WHERE id = v_record_22_id;
      RAISE NOTICE 'Funcionário %: Registro vazio do dia 22/01 removido.', v_employee_name;
    END IF;

    RAISE NOTICE 'Funcionário %: Saída % movida do registro 22/01 para 21/01. Eventos atualizados: %.',
      v_employee_name, v_saida_time, v_updated_events;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
END $$;

-- Verificação final
SELECT '=== RESULTADO FINAL ===' AS info;

SELECT
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.saida,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.horas_trabalhadas,
  tr.horas_faltas,
  e.nome,
  c.nome_fantasia
FROM rh.time_records tr
JOIN public.users e ON tr.employee_id = e.id
JOIN public.companies c ON tr.company_id = c.id
WHERE e.id IN (
  'f7d2bbc7-a9da-4843-9d75-c318f64cbc87',
  '3f6c860d-2d1c-48a6-a866-66198573460e'
)
  AND tr.company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
  AND tr.data_registro BETWEEN '2026-01-21' AND '2026-01-22'
ORDER BY e.nome, tr.data_registro;
