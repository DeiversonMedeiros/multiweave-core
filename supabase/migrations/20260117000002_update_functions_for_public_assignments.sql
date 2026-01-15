-- =====================================================
-- ATUALIZAR FUNÇÕES PARA CONSIDERAR ATRIBUIÇÕES PÚBLICAS
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR: Verificar treinamentos obrigatórios pendentes
-- Inclui treinamentos públicos (tipo_atribuicao = 'publica')
-- =====================================================
CREATE OR REPLACE FUNCTION rh.get_mandatory_trainings_pending(
    p_employee_id UUID,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_trainings JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar treinamentos obrigatórios e públicos pendentes
    SELECT jsonb_agg(
        jsonb_build_object(
            'training_id', t.id,
            'training_name', t.nome,
            'deadline', ta.data_limite,
            'progress', COALESCE(
                (SELECT progress_percent::TEXT 
                 FROM rh.calculate_training_progress(t.id, p_employee_id, p_company_id)
                 LIMIT 1), 
                '0'
            )
        )
    ) INTO v_trainings
    FROM rh.trainings t
    INNER JOIN rh.training_assignments ta ON t.id = ta.training_id
    WHERE ta.company_id = p_company_id
    AND ta.tipo_atribuicao IN ('obrigatorio', 'publica')
    AND t.is_active = true
    AND t.modalidade = 'online'
    AND (
        -- Atribuição pública (todos têm acesso)
        ta.tipo_atribuicao = 'publica'
        -- Ou atribuição específica para este funcionário
        OR ta.employee_id = p_employee_id
        OR ta.position_id IN (SELECT position_id FROM rh.employees WHERE id = p_employee_id)
        OR ta.unit_id IN (SELECT unit_id FROM rh.employees WHERE id = p_employee_id)
    )
    AND NOT EXISTS (
        SELECT 1 FROM rh.training_progress tp
        WHERE tp.training_id = t.id
        AND tp.employee_id = p_employee_id
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_content tc
            WHERE tc.training_id = t.id
            AND tc.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM rh.training_progress tp2
                WHERE tp2.content_id = tc.id
                AND tp2.employee_id = p_employee_id
                AND tp2.concluido = true
            )
        )
    );

    v_result := jsonb_build_object(
        'pending_trainings', COALESCE(v_trainings, '[]'::jsonb),
        'count', jsonb_array_length(COALESCE(v_trainings, '[]'::jsonb))
    );

    RETURN v_result;
END;
$$;

-- =====================================================
-- 2. ATUALIZAR: Criar notificações para treinamentos obrigatórios
-- Inclui treinamentos públicos
-- =====================================================
CREATE OR REPLACE FUNCTION rh.create_training_notifications(
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notifications_created INTEGER := 0;
    v_employee_record RECORD;
    v_training_record RECORD;
    v_assignment_record RECORD;
    v_enrollment_exists BOOLEAN;
    v_notification_id UUID;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar todos os funcionários com treinamentos obrigatórios ou públicos pendentes
    FOR v_employee_record IN
        SELECT DISTINCT e.id, e.user_id, e.nome
        FROM rh.employees e
        WHERE e.company_id = p_company_id
        AND e.is_active = true
    LOOP
        -- Buscar treinamentos obrigatórios e públicos para este funcionário
        FOR v_assignment_record IN
            SELECT ta.*, t.nome as training_name, t.data_fim, ta.data_limite
            FROM rh.training_assignments ta
            INNER JOIN rh.trainings t ON ta.training_id = t.id
            WHERE ta.company_id = p_company_id
            AND ta.tipo_atribuicao IN ('obrigatorio', 'publica')
            AND t.is_active = true
            AND t.modalidade = 'online'
            AND (
                -- Atribuição pública (todos têm acesso)
                ta.tipo_atribuicao = 'publica'
                -- Ou atribuição específica para este funcionário
                OR ta.employee_id = v_employee_record.id
                OR ta.position_id IN (SELECT position_id FROM rh.employees WHERE id = v_employee_record.id)
                OR ta.unit_id IN (SELECT unit_id FROM rh.employees WHERE id = v_employee_record.id)
            )
            AND ta.notificar = true
        LOOP
            -- Verificar se já existe inscrição
            SELECT EXISTS (
                SELECT 1 FROM rh.training_enrollments
                WHERE training_id = v_assignment_record.training_id
                AND employee_id = v_employee_record.id
                AND is_active = true
            ) INTO v_enrollment_exists;

            -- Verificar se treinamento está pendente (não concluído)
            IF NOT EXISTS (
                SELECT 1 FROM rh.training_progress tp
                WHERE tp.training_id = v_assignment_record.training_id
                AND tp.employee_id = v_employee_record.id
                AND NOT EXISTS (
                    SELECT 1 FROM rh.training_content tc
                    WHERE tc.training_id = v_assignment_record.training_id
                    AND tc.is_active = true
                    AND NOT EXISTS (
                        SELECT 1 FROM rh.training_progress tp2
                        WHERE tp2.content_id = tc.id
                        AND tp2.employee_id = v_employee_record.id
                        AND tp2.concluido = true
                    )
                )
            ) THEN
                -- Verificar se já existe notificação recente (últimas 24 horas)
                IF NOT EXISTS (
                    SELECT 1 FROM public.notifications
                    WHERE user_id = v_employee_record.user_id
                    AND company_id = p_company_id
                    AND tipo = 'treinamento_obrigatorio'
                    AND data->>'training_id' = v_assignment_record.training_id::TEXT
                    AND created_at > NOW() - INTERVAL '24 hours'
                ) THEN
                    -- Criar notificação
                    INSERT INTO public.notifications (
                        user_id,
                        company_id,
                        tipo,
                        titulo,
                        mensagem,
                        data,
                        is_read,
                        created_at
                    ) VALUES (
                        v_employee_record.user_id,
                        p_company_id,
                        'treinamento_obrigatorio',
                        CASE 
                            WHEN v_assignment_record.tipo_atribuicao = 'publica' THEN 'Treinamento Disponível'
                            ELSE 'Treinamento Obrigatório Pendente'
                        END,
                        CASE 
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite < CURRENT_DATE THEN
                                'O treinamento "' || v_assignment_record.training_name || '" está vencido. Por favor, conclua o quanto antes.'
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite <= CURRENT_DATE + INTERVAL '7 days' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" vence em breve. Por favor, conclua antes de ' || 
                                TO_CHAR(v_assignment_record.data_limite, 'DD/MM/YYYY') || '.'
                            WHEN v_assignment_record.tipo_atribuicao = 'publica' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" está disponível para você.'
                            ELSE
                                'Você possui o treinamento obrigatório "' || v_assignment_record.training_name || '" pendente.'
                        END,
                        jsonb_build_object(
                            'training_id', v_assignment_record.training_id,
                            'training_name', v_assignment_record.training_name,
                            'deadline', v_assignment_record.data_limite,
                            'is_overdue', COALESCE(v_assignment_record.data_limite < CURRENT_DATE, false),
                            'is_public', v_assignment_record.tipo_atribuicao = 'publica'
                        ),
                        false,
                        NOW()
                    ) RETURNING id INTO v_notification_id;

                    v_notifications_created := v_notifications_created + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'notifications_created', v_notifications_created,
        'message', 'Notificações criadas com sucesso'
    );
END;
$$;

-- =====================================================
-- 3. ATUALIZAR: Verificar e criar notificações para treinamentos vencidos
-- Inclui treinamentos públicos
-- =====================================================
CREATE OR REPLACE FUNCTION rh.check_overdue_trainings(
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_overdue_count INTEGER;
    v_result JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Contar treinamentos vencidos (obrigatórios e públicos)
    SELECT COUNT(DISTINCT ta.training_id) INTO v_overdue_count
    FROM rh.training_assignments ta
    INNER JOIN rh.trainings t ON ta.training_id = t.id
    INNER JOIN rh.employees e ON (
        -- Atribuição pública (todos têm acesso)
        ta.tipo_atribuicao = 'publica'
        -- Ou atribuição específica
        OR ta.employee_id = e.id
        OR ta.position_id = e.position_id
        OR ta.unit_id = e.unit_id
    )
    WHERE ta.company_id = p_company_id
    AND ta.tipo_atribuicao IN ('obrigatorio', 'publica')
    AND t.is_active = true
    AND ta.data_limite IS NOT NULL
    AND ta.data_limite < CURRENT_DATE
    AND ta.notificar = true
    AND NOT EXISTS (
        SELECT 1 FROM rh.training_progress tp
        WHERE tp.training_id = ta.training_id
        AND tp.employee_id = e.id
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_content tc
            WHERE tc.training_id = ta.training_id
            AND tc.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM rh.training_progress tp2
                WHERE tp2.content_id = tc.id
                AND tp2.employee_id = e.id
                AND tp2.concluido = true
            )
        )
    );

    -- Criar notificações se houver treinamentos vencidos
    IF v_overdue_count > 0 THEN
        SELECT * INTO v_result FROM rh.create_training_notifications(p_company_id);
    ELSE
        v_result := jsonb_build_object(
            'success', true,
            'notifications_created', 0,
            'overdue_count', 0,
            'message', 'Nenhum treinamento vencido encontrado'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'overdue_count', v_overdue_count,
        'notifications', v_result
    );
END;
$$;
