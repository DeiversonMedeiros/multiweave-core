-- =====================================================
-- FUNÇÕES PARA NOTIFICAÇÕES DE TREINAMENTOS
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: Criar notificações para treinamentos obrigatórios
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

    -- Buscar todos os funcionários com treinamentos obrigatórios pendentes
    FOR v_employee_record IN
        SELECT DISTINCT e.id, e.user_id, e.nome
        FROM rh.employees e
        WHERE e.company_id = p_company_id
        AND e.is_active = true
    LOOP
        -- Buscar treinamentos obrigatórios para este funcionário
        FOR v_assignment_record IN
            SELECT ta.*, t.nome as training_name, t.data_fim, ta.data_limite
            FROM rh.training_assignments ta
            INNER JOIN rh.trainings t ON ta.training_id = t.id
            WHERE ta.company_id = p_company_id
            AND ta.tipo_atribuicao = 'obrigatorio'
            AND t.is_active = true
            AND t.modalidade = 'online'
            AND (
                ta.employee_id = v_employee_record.id
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
                        'Treinamento Obrigatório Pendente',
                        CASE 
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite < CURRENT_DATE THEN
                                'O treinamento "' || v_assignment_record.training_name || '" está vencido. Por favor, conclua o quanto antes.'
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite <= CURRENT_DATE + INTERVAL '7 days' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" vence em breve. Por favor, conclua antes de ' || 
                                TO_CHAR(v_assignment_record.data_limite, 'DD/MM/YYYY') || '.'
                            ELSE
                                'Você possui o treinamento obrigatório "' || v_assignment_record.training_name || '" pendente.'
                        END,
                        jsonb_build_object(
                            'training_id', v_assignment_record.training_id,
                            'training_name', v_assignment_record.training_name,
                            'deadline', v_assignment_record.data_limite,
                            'is_overdue', COALESCE(v_assignment_record.data_limite < CURRENT_DATE, false)
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
-- 2. FUNÇÃO: Verificar e criar notificações para treinamentos vencidos
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

    -- Contar treinamentos vencidos
    SELECT COUNT(DISTINCT ta.training_id) INTO v_overdue_count
    FROM rh.training_assignments ta
    INNER JOIN rh.trainings t ON ta.training_id = t.id
    INNER JOIN rh.employees e ON (
        ta.employee_id = e.id
        OR ta.position_id = e.position_id
        OR ta.unit_id = e.unit_id
    )
    WHERE ta.company_id = p_company_id
    AND ta.tipo_atribuicao = 'obrigatorio'
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

-- =====================================================
-- 3. FUNÇÃO: Obter histórico de uploads de arquivos
-- =====================================================
CREATE OR REPLACE FUNCTION rh.get_training_file_history(
    p_company_id UUID,
    p_training_id UUID DEFAULT NULL,
    p_content_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_files JSONB;
    v_file_record RECORD;
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

    -- Buscar arquivos do storage (via metadata na tabela de conteúdo)
    SELECT jsonb_agg(
        jsonb_build_object(
            'content_id', tc.id,
            'content_title', tc.titulo,
            'file_path', tc.arquivo_path,
            'file_url', tc.url_conteudo,
            'file_type', tc.tipo_conteudo,
            'uploaded_at', tc.created_at,
            'updated_at', tc.updated_at
        )
    ) INTO v_files
    FROM rh.training_content tc
    WHERE tc.company_id = p_company_id
    AND tc.is_active = true
    AND (p_training_id IS NULL OR tc.training_id = p_training_id)
    AND (p_content_id IS NULL OR tc.id = p_content_id)
    AND tc.arquivo_path IS NOT NULL;

    RETURN jsonb_build_object(
        'success', true,
        'files', COALESCE(v_files, '[]'::jsonb),
        'count', jsonb_array_length(COALESCE(v_files, '[]'::jsonb))
    );
END;
$$;



