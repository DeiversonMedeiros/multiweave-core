-- =====================================================
-- CORRIGIR TIMEZONE AO GRAVAR event_at NA APROVAÇÃO DE CORREÇÃO
-- =====================================================
-- Data: 2026-02-04
-- Problema: Após aprovar correção de ponto, os horários apareciam 3h ANTES
--           (ex.: usuário corrige para 08:01, sistema mostrava 05:01).
-- Causa: (date + time)::timestamptz usa o timezone da SESSÃO (geralmente UTC).
--        Assim, 08:01 era armazenado como 08:01 UTC; ao exibir em America/Sao_Paulo
--        vira 05:01 (UTC-3). O recalculate_time_record_hours lê dos eventos e
--        sobrescreve time_records, então o horário errado aparecia na tela.
-- Solução: Interpretar (date + time) como horário local em America/Sao_Paulo
--          antes de converter para timestamptz: usar
--          ((date + time)::timestamp AT TIME ZONE 'America/Sao_Paulo').
-- =====================================================

DROP FUNCTION IF EXISTS approve_attendance_correction(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION approve_attendance_correction(
    p_correction_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_correction RECORD;
    v_time_record_id UUID;
    v_update_count INTEGER;
    v_profile_id UUID;
    v_entrada_date DATE;
    v_saida_date DATE;
    v_entrada_almoco_date DATE;
    v_saida_almoco_date DATE;
    v_entrada_extra1_date DATE;
    v_saida_extra1_date DATE;
    v_tz text := 'America/Sao_Paulo';
BEGIN
    RAISE NOTICE '[APPROVE_CORRECTION] Iniciando aprovacao - correction_id: %, approved_by: %, auth.uid(): %',
        p_correction_id, p_approved_by, auth.uid();

    v_profile_id := auth.uid();

    IF v_profile_id IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Usuario nao autenticado';
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_correction
    FROM rh.attendance_corrections
    WHERE id = p_correction_id;

    IF v_correction IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correcao nao encontrada - id: %', p_correction_id;
        RAISE EXCEPTION 'Correcao nao encontrada' USING ERRCODE = 'P0001', HINT = 'Verifique se o ID da correcao esta correto';
    END IF;

    IF v_correction.status = 'aprovado' THEN
        RAISE EXCEPTION 'Correcao ja foi aprovada' USING ERRCODE = 'P0002', HINT = 'Esta correcao ja foi aprovada anteriormente';
    END IF;

    IF v_correction.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Correcao ja foi rejeitada' USING ERRCODE = 'P0003', HINT = 'Esta correcao ja foi rejeitada e nao pode ser aprovada';
    END IF;

    IF v_correction.status != 'pendente' THEN
        RAISE EXCEPTION 'Correcao nao esta pendente' USING ERRCODE = 'P0004', HINT = 'Apenas correcoes pendentes podem ser aprovadas';
    END IF;

    SELECT uc.user_id INTO v_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = v_correction.company_id
      AND uc.ativo = true
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = v_correction.company_id
              AND uc.ativo = true
        ) THEN
            RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
        END IF;
        v_profile_id := auth.uid();
    END IF;

    UPDATE rh.attendance_corrections
    SET status = 'aprovado',
        aprovado_por = v_profile_id,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_correction_id
      AND status = 'pendente';

    GET DIAGNOSTICS v_update_count = ROW_COUNT;

    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar correcao' USING ERRCODE = 'P0005',
            HINT = 'A correcao pode ter sido modificada por outro processo. Tente novamente.';
    END IF;

    v_entrada_date := COALESCE(v_correction.entrada_corrigida_date, v_correction.data_original);
    v_saida_date := COALESCE(v_correction.saida_corrigida_date, v_correction.data_original);
    v_entrada_almoco_date := COALESCE(v_correction.entrada_almoco_corrigida_date, v_correction.data_original);
    v_saida_almoco_date := COALESCE(v_correction.saida_almoco_corrigida_date, v_correction.data_original);
    v_entrada_extra1_date := COALESCE(v_correction.entrada_extra1_corrigida_date, v_correction.data_original);
    v_saida_extra1_date := COALESCE(v_correction.saida_extra1_corrigida_date, v_correction.data_original);

    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_correction.employee_id
      AND data_registro = v_correction.data_original;

    IF v_time_record_id IS NULL THEN
        INSERT INTO rh.time_records (
            employee_id, company_id, data_registro,
            entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1,
            status, created_at, updated_at
        ) VALUES (
            v_correction.employee_id, v_correction.company_id, v_correction.data_original,
            v_correction.entrada_corrigida, v_correction.saida_corrigida,
            v_correction.entrada_almoco_corrigida, v_correction.saida_almoco_corrigida,
            v_correction.entrada_extra1_corrigida, v_correction.saida_extra1_corrigida,
            'aprovado', NOW(), NOW()
        ) RETURNING id INTO v_time_record_id;
    ELSE
        UPDATE rh.time_records
        SET entrada = COALESCE(v_correction.entrada_corrigida, entrada),
            saida = COALESCE(v_correction.saida_corrigida, saida),
            entrada_almoco = COALESCE(v_correction.entrada_almoco_corrigida, entrada_almoco),
            saida_almoco = COALESCE(v_correction.saida_almoco_corrigida, saida_almoco),
            entrada_extra1 = COALESCE(v_correction.entrada_extra1_corrigida, entrada_extra1),
            saida_extra1 = COALESCE(v_correction.saida_extra1_corrigida, saida_extra1),
            updated_at = NOW()
        WHERE id = v_time_record_id;
    END IF;

    -- event_at: interpretar (date + time) como horário LOCAL (America/Sao_Paulo) antes de gravar timestamptz
    IF v_correction.entrada_corrigida IS NOT NULL THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'entrada',
              ((v_entrada_date + v_correction.entrada_corrigida)::timestamp AT TIME ZONE v_tz), 'manual')
      ON CONFLICT DO NOTHING;
      UPDATE rh.time_record_events
      SET event_at = ((v_entrada_date + v_correction.entrada_corrigida)::timestamp AT TIME ZONE v_tz),
          source = 'manual'
      WHERE time_record_id = v_time_record_id AND event_type = 'entrada';
    END IF;

    IF v_correction.saida_corrigida IS NOT NULL THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'saida',
              ((v_saida_date + v_correction.saida_corrigida)::timestamp AT TIME ZONE v_tz), 'manual')
      ON CONFLICT DO NOTHING;
      UPDATE rh.time_record_events
      SET event_at = ((v_saida_date + v_correction.saida_corrigida)::timestamp AT TIME ZONE v_tz),
          source = 'manual'
      WHERE time_record_id = v_time_record_id AND event_type = 'saida';
    END IF;

    IF v_correction.entrada_almoco_corrigida IS NOT NULL THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'entrada_almoco',
              ((v_entrada_almoco_date + v_correction.entrada_almoco_corrigida)::timestamp AT TIME ZONE v_tz), 'manual')
      ON CONFLICT DO NOTHING;
      UPDATE rh.time_record_events
      SET event_at = ((v_entrada_almoco_date + v_correction.entrada_almoco_corrigida)::timestamp AT TIME ZONE v_tz),
          source = 'manual'
      WHERE time_record_id = v_time_record_id AND event_type = 'entrada_almoco';
    END IF;

    IF v_correction.saida_almoco_corrigida IS NOT NULL THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'saida_almoco',
              ((v_saida_almoco_date + v_correction.saida_almoco_corrigida)::timestamp AT TIME ZONE v_tz), 'manual')
      ON CONFLICT DO NOTHING;
      UPDATE rh.time_record_events
      SET event_at = ((v_saida_almoco_date + v_correction.saida_almoco_corrigida)::timestamp AT TIME ZONE v_tz),
          source = 'manual'
      WHERE time_record_id = v_time_record_id AND event_type = 'saida_almoco';
    END IF;

    IF v_correction.entrada_extra1_corrigida IS NOT NULL THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'extra_inicio',
              ((v_entrada_extra1_date + v_correction.entrada_extra1_corrigida)::timestamp AT TIME ZONE v_tz), 'manual')
      ON CONFLICT DO NOTHING;
      UPDATE rh.time_record_events
      SET event_at = ((v_entrada_extra1_date + v_correction.entrada_extra1_corrigida)::timestamp AT TIME ZONE v_tz),
          source = 'manual'
      WHERE time_record_id = v_time_record_id AND event_type = 'extra_inicio';
    END IF;

    IF v_correction.saida_extra1_corrigida IS NOT NULL THEN
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'extra_fim',
              ((v_saida_extra1_date + v_correction.saida_extra1_corrigida)::timestamp AT TIME ZONE v_tz), 'manual')
      ON CONFLICT DO NOTHING;
      UPDATE rh.time_record_events
      SET event_at = ((v_saida_extra1_date + v_correction.saida_extra1_corrigida)::timestamp AT TIME ZONE v_tz),
          source = 'manual'
      WHERE time_record_id = v_time_record_id AND event_type = 'extra_fim';
    END IF;

    PERFORM rh.recalculate_time_record_hours(v_time_record_id);
    PERFORM rh.calculate_overtime_by_scale(v_time_record_id);

    INSERT INTO rh.correction_history (
        correction_id, action, new_values, changed_by, changed_at, reason
    ) VALUES (
        p_correction_id, 'approved',
        jsonb_build_object(
            'entrada', v_correction.entrada_corrigida, 'saida', v_correction.saida_corrigida,
            'entrada_almoco', v_correction.entrada_almoco_corrigida, 'saida_almoco', v_correction.saida_almoco_corrigida,
            'entrada_extra1', v_correction.entrada_extra1_corrigida, 'saida_extra1', v_correction.saida_extra1_corrigida,
            'entrada_date', v_entrada_date, 'saida_date', v_saida_date,
            'entrada_almoco_date', v_entrada_almoco_date, 'saida_almoco_date', v_saida_almoco_date,
            'entrada_extra1_date', v_entrada_extra1_date, 'saida_extra1_date', v_saida_extra1_date
        ),
        v_profile_id, NOW(), p_observacoes
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS
'Aprova uma correção de ponto e atualiza o registro original. Os horários corrigidos são interpretados como America/Sao_Paulo ao gravar event_at, evitando deslocamento de 3h na exibição.';

GRANT EXECUTE ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) TO authenticated;
