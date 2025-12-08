-- =====================================================
-- CORRIGIR FUNÇÃO approve_attendance_correction
-- Para recalcular horas trabalhadas e horas extras após aprovar correção
-- =====================================================

CREATE OR REPLACE FUNCTION approve_attendance_correction(
    p_correction_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_correction RECORD;
    v_time_record_id UUID;
BEGIN
    -- Buscar a correção
    SELECT * INTO v_correction
    FROM rh.attendance_corrections
    WHERE id = p_correction_id;
    
    IF v_correction IS NULL THEN
        RETURN false;
    END IF;
    
    -- Atualizar status da correção
    UPDATE rh.attendance_corrections
    SET 
        status = 'aprovado',
        aprovado_por = p_approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_correction_id;
    
    -- Buscar ou criar registro de ponto
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_correction.employee_id
    AND data_registro = v_correction.data_original;
    
    IF v_time_record_id IS NULL THEN
        -- Criar novo registro
        INSERT INTO rh.time_records (
            employee_id,
            company_id,
            data_registro,
            entrada,
            saida,
            entrada_almoco,
            saida_almoco,
            entrada_extra1,
            saida_extra1,
            status,
            observacoes,
            created_at,
            updated_at
        ) VALUES (
            v_correction.employee_id,
            v_correction.company_id,
            v_correction.data_original,
            v_correction.entrada_corrigida,
            v_correction.saida_corrigida,
            v_correction.entrada_almoco_corrigida,
            v_correction.saida_almoco_corrigida,
            v_correction.entrada_extra1_corrigida,
            v_correction.saida_extra1_corrigida,
            'aprovado',
            'Registro corrigido e aprovado',
            NOW(),
            NOW()
        ) RETURNING id INTO v_time_record_id;
    ELSE
        -- Atualizar registro existente
        UPDATE rh.time_records
        SET 
            entrada = COALESCE(v_correction.entrada_corrigida, entrada),
            saida = COALESCE(v_correction.saida_corrigida, saida),
            entrada_almoco = COALESCE(v_correction.entrada_almoco_corrigida, entrada_almoco),
            saida_almoco = COALESCE(v_correction.saida_almoco_corrigida, saida_almoco),
            entrada_extra1 = COALESCE(v_correction.entrada_extra1_corrigida, entrada_extra1),
            saida_extra1 = COALESCE(v_correction.saida_extra1_corrigida, saida_extra1),
            status = 'aprovado',
            observacoes = COALESCE(observacoes, '') || ' | Registro corrigido e aprovado',
            updated_at = NOW()
        WHERE id = v_time_record_id;
    END IF;
    
    -- IMPORTANTE: Atualizar ou criar eventos corrigidos
    -- Isso garante que recalculate_time_record_hours use os horários corrigidos
    IF v_correction.entrada_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de entrada
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'entrada', 
              (v_correction.data_original + v_correction.entrada_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      -- Se já existe, atualizar
      UPDATE rh.time_record_events
      SET event_at = (v_correction.data_original + v_correction.entrada_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'entrada'
        AND (event_at AT TIME ZONE 'UTC')::date = v_correction.data_original;
    END IF;
    
    IF v_correction.saida_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de saída
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'saida', 
              (v_correction.data_original + v_correction.saida_corrigida)::timestamptz, 'correcao_manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_correction.data_original + v_correction.saida_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'saida'
        AND (event_at AT TIME ZONE 'UTC')::date = v_correction.data_original;
    END IF;
    
    IF v_correction.entrada_almoco_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de entrada almoço
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'entrada_almoco', 
              (v_correction.data_original + v_correction.entrada_almoco_corrigida)::timestamptz, 'correcao_manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_correction.data_original + v_correction.entrada_almoco_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'entrada_almoco'
        AND (event_at AT TIME ZONE 'UTC')::date = v_correction.data_original;
    END IF;
    
    IF v_correction.saida_almoco_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de saída almoço
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'saida_almoco', 
              (v_correction.data_original + v_correction.saida_almoco_corrigida)::timestamptz, 'correcao_manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_correction.data_original + v_correction.saida_almoco_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'saida_almoco'
        AND (event_at AT TIME ZONE 'UTC')::date = v_correction.data_original;
    END IF;
    
    -- IMPORTANTE: Recalcular horas trabalhadas e horas extras após atualizar os eventos
    -- Primeiro recalcular horas trabalhadas baseado nos eventos corrigidos
    PERFORM rh.recalculate_time_record_hours(v_time_record_id);
    
    -- Depois recalcular horas extras/negativas baseado na escala
    PERFORM rh.calculate_overtime_by_scale(v_time_record_id);
    
    -- Registrar no histórico
    INSERT INTO rh.correction_history (
        correction_id,
        action,
        new_values,
        changed_by,
        changed_at,
        reason
    ) VALUES (
        p_correction_id,
        'approved',
        jsonb_build_object(
            'entrada', v_correction.entrada_corrigida,
            'saida', v_correction.saida_corrigida,
            'entrada_almoco', v_correction.entrada_almoco_corrigida,
            'saida_almoco', v_correction.saida_almoco_corrigida,
            'entrada_extra1', v_correction.entrada_extra1_corrigida,
            'saida_extra1', v_correction.saida_extra1_corrigida
        ),
        p_approved_by,
        NOW(),
        p_observacoes
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS 
'Aprova uma correção de ponto e atualiza o registro original incluindo almoço e hora extra.
 Recalcula automaticamente as horas trabalhadas e horas extras após a aprovação.';

