-- =====================================================
-- RPC: Atualizar registro de ponto manualmente e recalcular horas
-- =====================================================
-- Objetivo: Na tela rh/time-records, ao editar um registro (data e horários),
--           atualizar a tabela time_records, sincronizar time_record_events
--           e recalcular horas trabalhadas, extras, negativas e noturnas.
-- Uso: Frontend chama esta RPC após o usuário salvar o modal "Editar Registro de Ponto".
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_time_record_manual(
  p_time_record_id UUID,
  p_data_registro DATE,
  p_entrada TIME DEFAULT NULL,
  p_saida TIME DEFAULT NULL,
  p_entrada_almoco TIME DEFAULT NULL,
  p_saida_almoco TIME DEFAULT NULL,
  p_entrada_extra1 TIME DEFAULT NULL,
  p_saida_extra1 TIME DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_tz TEXT := 'America/Sao_Paulo';
BEGIN
  -- Buscar registro e validar permissão (mesma empresa do usuário)
  SELECT tr.employee_id, tr.company_id
  INTO v_employee_id, v_company_id
  FROM rh.time_records tr
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de ponto não encontrado' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = v_company_id
      AND uc.ativo = true
  ) THEN
    RAISE EXCEPTION 'Sem permissão para editar este registro' USING ERRCODE = '42501';
  END IF;

  -- 1) Atualizar a tabela time_records (data + horários)
  UPDATE rh.time_records
  SET
    data_registro = p_data_registro,
    entrada = p_entrada,
    saida = p_saida,
    entrada_almoco = p_entrada_almoco,
    saida_almoco = p_saida_almoco,
    entrada_extra1 = p_entrada_extra1,
    saida_extra1 = p_saida_extra1,
    observacoes = COALESCE(p_observacoes, observacoes),
    updated_at = NOW()
  WHERE id = p_time_record_id;

  -- 2) Sincronizar eventos: atualizar ou inserir um evento por tipo com (data + time) em America/Sao_Paulo
  IF p_entrada IS NOT NULL THEN
    UPDATE rh.time_record_events
    SET event_at = ((p_data_registro + p_entrada)::timestamp AT TIME ZONE v_tz),
        source = 'manual'
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada';
    IF NOT FOUND THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (p_time_record_id, v_employee_id, v_company_id, 'entrada',
              ((p_data_registro + p_entrada)::timestamp AT TIME ZONE v_tz), 'manual');
    END IF;
  END IF;

  IF p_saida IS NOT NULL THEN
    UPDATE rh.time_record_events
    SET event_at = ((p_data_registro + p_saida)::timestamp AT TIME ZONE v_tz),
        source = 'manual'
    WHERE time_record_id = p_time_record_id AND event_type = 'saida';
    IF NOT FOUND THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (p_time_record_id, v_employee_id, v_company_id, 'saida',
              ((p_data_registro + p_saida)::timestamp AT TIME ZONE v_tz), 'manual');
    END IF;
  END IF;

  IF p_entrada_almoco IS NOT NULL THEN
    UPDATE rh.time_record_events
    SET event_at = ((p_data_registro + p_entrada_almoco)::timestamp AT TIME ZONE v_tz),
        source = 'manual'
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco';
    IF NOT FOUND THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (p_time_record_id, v_employee_id, v_company_id, 'entrada_almoco',
              ((p_data_registro + p_entrada_almoco)::timestamp AT TIME ZONE v_tz), 'manual');
    END IF;
  END IF;

  IF p_saida_almoco IS NOT NULL THEN
    UPDATE rh.time_record_events
    SET event_at = ((p_data_registro + p_saida_almoco)::timestamp AT TIME ZONE v_tz),
        source = 'manual'
    WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco';
    IF NOT FOUND THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (p_time_record_id, v_employee_id, v_company_id, 'saida_almoco',
              ((p_data_registro + p_saida_almoco)::timestamp AT TIME ZONE v_tz), 'manual');
    END IF;
  END IF;

  IF p_entrada_extra1 IS NOT NULL THEN
    UPDATE rh.time_record_events
    SET event_at = ((p_data_registro + p_entrada_extra1)::timestamp AT TIME ZONE v_tz),
        source = 'manual'
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio';
    IF NOT FOUND THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (p_time_record_id, v_employee_id, v_company_id, 'extra_inicio',
              ((p_data_registro + p_entrada_extra1)::timestamp AT TIME ZONE v_tz), 'manual');
    END IF;
  END IF;

  IF p_saida_extra1 IS NOT NULL THEN
    UPDATE rh.time_record_events
    SET event_at = ((p_data_registro + p_saida_extra1)::timestamp AT TIME ZONE v_tz),
        source = 'manual'
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim';
    IF NOT FOUND THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (p_time_record_id, v_employee_id, v_company_id, 'extra_fim',
              ((p_data_registro + p_saida_extra1)::timestamp AT TIME ZONE v_tz), 'manual');
    END IF;
  ELSE
    DELETE FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim';
  END IF;

  -- Remover eventos cujo horário foi limpo
  IF p_entrada IS NULL THEN DELETE FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada'; END IF;
  IF p_saida IS NULL THEN DELETE FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida'; END IF;
  IF p_entrada_almoco IS NULL THEN DELETE FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'; END IF;
  IF p_saida_almoco IS NULL THEN DELETE FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'; END IF;
  IF p_entrada_extra1 IS NULL THEN DELETE FROM rh.time_record_events WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'; END IF;

  -- 3) Recalcular horas trabalhadas, faltas, noturnas e depois horas extras
  PERFORM rh.recalculate_time_record_hours(p_time_record_id);
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);

  -- 4) Ajustar status (pendente se tiver hora extra; aprovado caso contrário) – recalculate_time_record_hours já faz isso
  -- Nada mais necessário aqui.
END;
$$;

COMMENT ON FUNCTION public.update_time_record_manual(UUID, DATE, TIME, TIME, TIME, TIME, TIME, TIME, TEXT) IS
'Atualiza registro de ponto (data e horários), sincroniza time_record_events e recalcula horas trabalhadas, extras, negativas e noturnas. Usado pelo modal Editar Registro de Ponto em rh/time-records.';

GRANT EXECUTE ON FUNCTION public.update_time_record_manual(UUID, DATE, TIME, TIME, TIME, TIME, TIME, TIME, TEXT) TO authenticated;
