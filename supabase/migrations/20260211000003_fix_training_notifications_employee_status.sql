-- =====================================================
-- CORRECAO: create_training_notifications usa status do empregado
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

    -- Buscar todos os funcionarios com treinamentos obrigatorios ou publicos pendentes
    FOR v_employee_record IN
        SELECT DISTINCT e.id, e.user_id, e.nome
        FROM rh.employees e
        WHERE e.company_id = p_company_id
        AND e.status = 'ativo'
    LOOP
        -- Buscar treinamentos obrigatorios e publicos para este funcionario
        FOR v_assignment_record IN
            SELECT ta.*, t.nome as training_name, t.data_fim, ta.data_limite
            FROM rh.training_assignments ta
            INNER JOIN rh.trainings t ON ta.training_id = t.id
            WHERE ta.company_id = p_company_id
            AND ta.tipo_atribuicao IN ('obrigatorio', 'publica')
            AND t.is_active = true
            AND t.modalidade = 'online'
            AND (
                -- Atribuicao publica (todos tem acesso)
                ta.tipo_atribuicao = 'publica'
                -- Ou atribuicao especifica para este funcionario
                OR ta.employee_id = v_employee_record.id
                OR ta.position_id IN (SELECT position_id FROM rh.employees WHERE id = v_employee_record.id)
                OR ta.unit_id IN (SELECT unit_id FROM rh.employees WHERE id = v_employee_record.id)
            )
            AND ta.notificar = true
        LOOP
            -- Verificar se ja existe inscricao
            SELECT EXISTS (
                SELECT 1 FROM rh.training_enrollments
                WHERE training_id = v_assignment_record.training_id
                AND employee_id = v_employee_record.id
                AND is_active = true
            ) INTO v_enrollment_exists;

            -- Verificar se treinamento esta pendente (nao concluido)
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
                -- Verificar se ja existe notificacao recente (ultimas 24 horas)
                IF NOT EXISTS (
                    SELECT 1 FROM public.notifications
                    WHERE user_id = v_employee_record.user_id
                    AND company_id = p_company_id
                    AND tipo = 'treinamento_obrigatorio'
                    AND data->>'training_id' = v_assignment_record.training_id::TEXT
                    AND created_at > NOW() - INTERVAL '24 hours'
                ) THEN
                    -- Criar notificacao
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
                            WHEN v_assignment_record.tipo_atribuicao = 'publica' THEN 'Treinamento Disponivel'
                            ELSE 'Treinamento Obrigatorio Pendente'
                        END,
                        CASE 
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite < CURRENT_DATE THEN
                                'O treinamento "' || v_assignment_record.training_name || '" esta vencido. Por favor, conclua o quanto antes.'
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite <= CURRENT_DATE + INTERVAL '7 days' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" vence em breve. Por favor, conclua antes de ' || 
                                TO_CHAR(v_assignment_record.data_limite, 'DD/MM/YYYY') || '.'
                            WHEN v_assignment_record.tipo_atribuicao = 'publica' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" esta disponivel para voce.'
                            ELSE
                                'Voce possui o treinamento obrigatorio "' || v_assignment_record.training_name || '" pendente.'
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
        'message', 'Notificacoes criadas com sucesso'
    );
END;
$$;
