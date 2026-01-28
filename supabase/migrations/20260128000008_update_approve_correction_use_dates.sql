-- =====================================================
-- ATUALIZAR approve_attendance_correction PARA USAR DATAS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Atualiza a função approve_attendance_correction para usar
--            os campos *_corrigida_date quando disponíveis, permitindo
--            que correções especifiquem data+hora quando a marcação
--            ocorreu em dia diferente de data_original.
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
BEGIN
    -- Log inicial
    RAISE NOTICE '[APPROVE_CORRECTION] Iniciando aprovacao - correction_id: %, approved_by: %, auth.uid(): %', 
        p_correction_id, p_approved_by, auth.uid();
    
    -- Obter o user_id do usuário autenticado
    v_profile_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF v_profile_id IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Usuario nao autenticado';
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Usuario autenticado - user_id: %', v_profile_id;
    
    -- Buscar a correção primeiro para obter o company_id
    SELECT * INTO v_correction
    FROM rh.attendance_corrections
    WHERE id = p_correction_id;
    
    -- Verificar se a correção existe
    IF v_correction IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correcao nao encontrada - id: %', p_correction_id;
        RAISE EXCEPTION 'Correcao nao encontrada' USING ERRCODE = 'P0001', HINT = 'Verifique se o ID da correcao esta correto';
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Correcao encontrada - id: %, status: %, employee_id: %, company_id: %', 
        v_correction.id, v_correction.status, v_correction.employee_id, v_correction.company_id;
    
    -- Verificar se a correção já foi aprovada
    IF v_correction.status = 'aprovado' THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correcao ja foi aprovada - id: %, status: %, aprovado_por: %, aprovado_em: %', 
            v_correction.id, v_correction.status, v_correction.aprovado_por, v_correction.aprovado_em;
        RAISE EXCEPTION 'Correcao ja foi aprovada' USING ERRCODE = 'P0002', 
            HINT = 'Esta correcao ja foi aprovada anteriormente';
    END IF;
    
    -- Verificar se a correção foi rejeitada
    IF v_correction.status = 'rejeitado' THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correcao ja foi rejeitada - id: %, status: %', 
            v_correction.id, v_correction.status;
        RAISE EXCEPTION 'Correcao ja foi rejeitada' USING ERRCODE = 'P0003', 
            HINT = 'Esta correcao ja foi rejeitada e nao pode ser aprovada';
    END IF;
    
    -- Verificar se a correção está pendente
    IF v_correction.status != 'pendente' THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Correcao nao esta pendente - id: %, status: %', 
            v_correction.id, v_correction.status;
        RAISE EXCEPTION 'Correcao nao esta pendente' USING ERRCODE = 'P0004', 
            HINT = 'Apenas correcoes pendentes podem ser aprovadas';
    END IF;
    
    -- Verificar se o usuário tem acesso à empresa
    -- Primeiro, tentar encontrar o profile_id em user_companies
    SELECT uc.user_id INTO v_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = v_correction.company_id
      AND uc.ativo = true
    LIMIT 1;
    
    -- Se não encontrou, verificar se o user_id tem acesso direto
    IF v_profile_id IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] AVISO: profile_id nao encontrado em user_companies. Verificando acesso...';
        
        -- Verificar acesso direto
        IF NOT EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = v_correction.company_id
              AND uc.ativo = true
        ) THEN
            RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Usuario nao tem acesso a empresa - user_id: %, company_id: %', 
                auth.uid(), v_correction.company_id;
            RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
        END IF;
        
        -- Se passou na verificação, usar o user_id como profile_id
        v_profile_id := auth.uid();
        RAISE NOTICE '[APPROVE_CORRECTION] Usando user_id como profile_id: %', v_profile_id;
    ELSE
        RAISE NOTICE '[APPROVE_CORRECTION] profile_id encontrado em user_companies: %', v_profile_id;
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Validacoes passadas. Tentando atualizar correcao...';
    
    -- Atualizar o status da correção para 'aprovado'
    UPDATE rh.attendance_corrections
    SET status = 'aprovado',
        aprovado_por = v_profile_id,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_correction_id
      AND status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    
    -- Verificar se a atualização foi bem-sucedida
    IF v_update_count = 0 THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: Nenhuma linha atualizada. Correcao pode ter sido modificada por outro processo.';
        RAISE EXCEPTION 'Falha ao atualizar correcao' USING ERRCODE = 'P0005', 
            HINT = 'A correcao pode ter sido modificada por outro processo. Tente novamente.';
    END IF;
    
    RAISE NOTICE '[APPROVE_CORRECTION] Correcao atualizada com sucesso. Linhas atualizadas: %', v_update_count;
    
    -- Determinar datas a serem usadas (usar campos *_date se disponíveis, senão usar data_original)
    v_entrada_date := COALESCE(v_correction.entrada_corrigida_date, v_correction.data_original);
    v_saida_date := COALESCE(v_correction.saida_corrigida_date, v_correction.data_original);
    v_entrada_almoco_date := COALESCE(v_correction.entrada_almoco_corrigida_date, v_correction.data_original);
    v_saida_almoco_date := COALESCE(v_correction.saida_almoco_corrigida_date, v_correction.data_original);
    v_entrada_extra1_date := COALESCE(v_correction.entrada_extra1_corrigida_date, v_correction.data_original);
    v_saida_extra1_date := COALESCE(v_correction.saida_extra1_corrigida_date, v_correction.data_original);
    
    -- Buscar ou criar o registro de ponto
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_correction.employee_id
      AND data_registro = v_correction.data_original;
    
    IF v_time_record_id IS NULL THEN
        RAISE NOTICE '[APPROVE_CORRECTION] Criando novo registro de ponto...';
        
        -- Criar novo registro de ponto
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
            NOW(),
            NOW()
        ) RETURNING id INTO v_time_record_id;
        
        RAISE NOTICE '[APPROVE_CORRECTION] Novo registro de ponto criado - id: %', v_time_record_id;
    ELSE
        RAISE NOTICE '[APPROVE_CORRECTION] Atualizando registro de ponto existente - id: %', v_time_record_id;
        
        -- Atualizar registro existente
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
    
    -- Atualizar eventos de ponto usando as datas corretas
    RAISE NOTICE '[APPROVE_CORRECTION] Atualizando eventos de ponto...';
    
    IF v_correction.entrada_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de entrada usando a data correta
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'entrada', 
              (v_entrada_date + v_correction.entrada_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      -- Se já existe, atualizar
      UPDATE rh.time_record_events
      SET event_at = (v_entrada_date + v_correction.entrada_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'entrada';
    END IF;
    
    IF v_correction.saida_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de saída usando a data correta
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'saida', 
              (v_saida_date + v_correction.saida_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_saida_date + v_correction.saida_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'saida';
    END IF;
    
    IF v_correction.entrada_almoco_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de entrada almoço usando a data correta
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'entrada_almoco', 
              (v_entrada_almoco_date + v_correction.entrada_almoco_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_entrada_almoco_date + v_correction.entrada_almoco_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'entrada_almoco';
    END IF;
    
    IF v_correction.saida_almoco_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de saída almoço usando a data correta
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'saida_almoco', 
              (v_saida_almoco_date + v_correction.saida_almoco_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_saida_almoco_date + v_correction.saida_almoco_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'saida_almoco';
    END IF;
    
    IF v_correction.entrada_extra1_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de entrada extra1 usando a data correta
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'extra_inicio', 
              (v_entrada_extra1_date + v_correction.entrada_extra1_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_entrada_extra1_date + v_correction.entrada_extra1_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'extra_inicio';
    END IF;
    
    IF v_correction.saida_extra1_corrigida IS NOT NULL THEN
      -- Atualizar ou inserir evento de saída extra1 usando a data correta
      INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
      VALUES (v_time_record_id, v_correction.employee_id, v_correction.company_id, 'extra_fim', 
              (v_saida_extra1_date + v_correction.saida_extra1_corrigida)::timestamptz, 'manual')
      ON CONFLICT DO NOTHING;
      
      UPDATE rh.time_record_events
      SET event_at = (v_saida_extra1_date + v_correction.saida_extra1_corrigida)::timestamptz,
          source = 'manual'
      WHERE time_record_id = v_time_record_id 
        AND event_type = 'extra_fim';
    END IF;
    
    -- IMPORTANTE: Recalcular horas trabalhadas e horas extras após atualizar os eventos
    RAISE NOTICE '[APPROVE_CORRECTION] Recalculando horas trabalhadas...';
    PERFORM rh.recalculate_time_record_hours(v_time_record_id);
    
    RAISE NOTICE '[APPROVE_CORRECTION] Recalculando horas extras...';
    PERFORM rh.calculate_overtime_by_scale(v_time_record_id);
    
    -- Registrar no histórico usando o profile_id correto
    RAISE NOTICE '[APPROVE_CORRECTION] Registrando no historico com profile_id: %', v_profile_id;
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
            'saida_extra1', v_correction.saida_extra1_corrigida,
            'entrada_date', v_entrada_date,
            'saida_date', v_saida_date,
            'entrada_almoco_date', v_entrada_almoco_date,
            'saida_almoco_date', v_saida_almoco_date,
            'entrada_extra1_date', v_entrada_extra1_date,
            'saida_extra1_date', v_saida_extra1_date
        ),
        v_profile_id,
        NOW(),
        p_observacoes
    );
    
    RAISE NOTICE '[APPROVE_CORRECTION] Aprovacao concluida com sucesso!';
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[APPROVE_CORRECTION] ERRO: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS 
'Aprova uma correção de ponto e atualiza o registro original.
Agora suporta campos de data para horários corrigidos quando a marcação ocorreu em dia diferente de data_original.';

GRANT EXECUTE ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) TO authenticated;
