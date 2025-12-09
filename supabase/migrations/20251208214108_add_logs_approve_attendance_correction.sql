-- =====================================================
-- ADICIONAR LOGS DETALHADOS: approve_attendance_correction
-- Adiciona logs detalhados para debug do erro 409
-- =====================================================

-- Remover função antiga se existir
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
BEGIN
    -- Log inicial
    RAISE NOTICE '[APPROVE_CORRECTION] Iniciando aprovação - correction_id: %, approved_by: %', p_correction_id, p_approved_by;
    
    -- Buscar a correção
    SELECT * INTO v_correction
    FROM rh.attendance_corrections
    WHERE id = p_correction_id;
    
    -- Verificar se a correção existe
    IF v_correction IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correção não encontrada - id: %', p_correction_id;
        RAISE EXCEPTION 'Correção não encontrada' USING ERRCODE = 'P0001', HINT = 'Verifique se o ID da correção está correto';
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Correção encontrada - id: %, status: %, employee_id: %, company_id: %', 
        v_correction.id, v_correction.status, v_correction.employee_id, v_correction.company_id;
    
    -- Verificar se a correção já foi aprovada
    IF v_correction.status = 'aprovado' THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correção já foi aprovada - id: %, status: %, aprovado_por: %, aprovado_em: %', 
            v_correction.id, v_correction.status, v_correction.aprovado_por, v_correction.aprovado_em;
        RAISE EXCEPTION 'Correção já foi aprovada anteriormente' 
            USING ERRCODE = '23505', 
            HINT = format('Aprovada por: %, em: %', v_correction.aprovado_por, v_correction.aprovado_em);
    END IF;
    
    -- Verificar se a correção já foi rejeitada
    IF v_correction.status = 'rejeitado' THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correção já foi rejeitada - id: %, status: %', 
            v_correction.id, v_correction.status;
        RAISE EXCEPTION 'Correção já foi rejeitada e não pode ser aprovada' 
            USING ERRCODE = '23505';
    END IF;
    
    -- Verificar se a correção está pendente
    IF v_correction.status != 'pendente' THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correção não está pendente - id: %, status: %', 
            v_correction.id, v_correction.status;
        RAISE EXCEPTION 'Correção não está pendente (status: %s)', v_correction.status 
            USING ERRCODE = '23505';
    END IF;
    
    -- Verificar acesso do usuário à empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = p_approved_by
          AND uc.company_id = v_correction.company_id
          AND uc.ativo = true
    ) THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Usuário não tem acesso à empresa - user_id: %, company_id: %', 
            p_approved_by, v_correction.company_id;
        RAISE EXCEPTION 'Usuário não tem acesso a esta empresa' 
            USING ERRCODE = '42501';
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Validações passadas. Tentando atualizar correção...';
    
    -- Atualizar status da correção
    UPDATE rh.attendance_corrections
    SET 
        status = 'aprovado',
        aprovado_por = p_approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_correction_id
      AND status = 'pendente';  -- Garantir que só atualiza se ainda estiver pendente
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    
    -- Verificar se a atualização foi bem-sucedida
    IF v_update_count = 0 THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Nenhuma linha atualizada. Correção pode ter sido modificada por outro processo.';
        RAISE EXCEPTION 'Falha ao atualizar correção. Pode ter sido modificada por outro processo.' 
            USING ERRCODE = '23505';
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Correção atualizada com sucesso. Linhas atualizadas: %', v_update_count;
    
    -- Buscar ou criar registro de ponto
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_correction.employee_id
    AND data_registro = v_correction.data_original;
    
    IF v_time_record_id IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] Criando novo registro de ponto...';
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
        RAISE NOTICE '[APPROVE_CORRECTION] Novo registro de ponto criado - id: %', v_time_record_id;
    ELSE
        RAISE NOTICE '[APPROVE_CORRECTION] Atualizando registro de ponto existente - id: %', v_time_record_id;
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
    RAISE NOTICE '[APPROVE_CORRECTION] Atualizando eventos de ponto...';
    
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
    RAISE NOTICE '[APPROVE_CORRECTION] Recalculando horas trabalhadas...';
    PERFORM rh.recalculate_time_record_hours(v_time_record_id);
    
    RAISE NOTICE '[APPROVE_CORRECTION] Recalculando horas extras...';
    PERFORM rh.calculate_overtime_by_scale(v_time_record_id);
    
    -- Registrar no histórico
    RAISE NOTICE '[APPROVE_CORRECTION] Registrando no histórico...';
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
    
    RAISE NOTICE '[APPROVE_CORRECTION] Aprovacao concluida com sucesso!';
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS 
'Aprova uma correcao de ponto e atualiza o registro original incluindo almoco e hora extra.
 Recalcula automaticamente as horas trabalhadas e horas extras apos a aprovacao.
 Inclui logs detalhados para debug usando RAISE NOTICE.';

