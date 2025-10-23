-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES PARA EXAMES PERIÓDICOS
-- =====================================================

-- =====================================================
-- FUNÇÕES DE NOTIFICAÇÃO
-- =====================================================

-- Função para buscar exames que precisam de notificação
CREATE OR REPLACE FUNCTION rh.get_exams_needing_notification(
    p_company_id UUID,
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    exam_id UUID,
    employee_id UUID,
    employee_name VARCHAR,
    exam_type VARCHAR,
    scheduled_date DATE,
    days_until_exam INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.id as exam_id,
        pe.employee_id,
        e.nome as employee_name,
        pe.tipo_exame as exam_type,
        pe.data_agendamento as scheduled_date,
        (pe.data_agendamento - CURRENT_DATE)::INTEGER as days_until_exam
    FROM rh.periodic_exams pe
    JOIN rh.employees e ON pe.employee_id = e.id
    WHERE pe.company_id = p_company_id
    AND pe.status = 'agendado'
    AND pe.data_agendamento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
    ORDER BY pe.data_agendamento ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar exames vencidos
CREATE OR REPLACE FUNCTION rh.get_expired_exams(
    p_company_id UUID
)
RETURNS TABLE (
    exam_id UUID,
    employee_id UUID,
    employee_name VARCHAR,
    exam_type VARCHAR,
    scheduled_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.id as exam_id,
        pe.employee_id,
        e.nome as employee_name,
        pe.tipo_exame as exam_type,
        pe.data_agendamento as scheduled_date,
        (CURRENT_DATE - pe.data_agendamento)::INTEGER as days_overdue
    FROM rh.periodic_exams pe
    JOIN rh.employees e ON pe.employee_id = e.id
    WHERE pe.company_id = p_company_id
    AND pe.status = 'agendado'
    AND pe.data_agendamento < CURRENT_DATE
    ORDER BY pe.data_agendamento ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para criar notificação de exame
CREATE OR REPLACE FUNCTION rh.create_exam_notification(
    p_user_id UUID,
    p_company_id UUID,
    p_exam_id UUID,
    p_notification_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        id,
        user_id,
        company_id,
        type,
        title,
        message,
        data,
        is_read,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_company_id,
        p_notification_type,
        p_title,
        p_message,
        jsonb_build_object('exam_id', p_exam_id),
        false,
        NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Função para agendar notificações automáticas
CREATE OR REPLACE FUNCTION rh.schedule_exam_notifications(
    p_company_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_notifications_created INTEGER := 0;
    v_exam RECORD;
    v_user_id UUID;
    v_title VARCHAR;
    v_message TEXT;
BEGIN
    -- Buscar exames que precisam de notificação (30 dias antes)
    FOR v_exam IN 
        SELECT * FROM rh.get_exams_needing_notification(p_company_id, 30)
    LOOP
        -- Buscar user_id do funcionário
        SELECT user_id INTO v_user_id 
        FROM rh.employees 
        WHERE id = v_exam.employee_id;
        
        -- Só criar notificação se o funcionário tiver user_id
        IF v_user_id IS NOT NULL THEN
            -- Definir título e mensagem baseado nos dias restantes
            IF v_exam.days_until_exam = 0 THEN
                v_title := 'Exame Agendado para Hoje';
                v_message := 'Você tem um exame ' || v_exam.exam_type || ' agendado para hoje.';
            ELSIF v_exam.days_until_exam <= 7 THEN
                v_title := 'Exame Próximo';
                v_message := 'Você tem um exame ' || v_exam.exam_type || ' agendado para ' || 
                           v_exam.days_until_exam || ' dias.';
            ELSIF v_exam.days_until_exam <= 30 THEN
                v_title := 'Lembrete de Exame';
                v_message := 'Você tem um exame ' || v_exam.exam_type || ' agendado para ' || 
                           v_exam.days_until_exam || ' dias.';
            END IF;
            
            -- Criar notificação
            PERFORM rh.create_exam_notification(
                v_user_id,
                p_company_id,
                v_exam.exam_id,
                'exam_reminder',
                v_title,
                v_message
            );
            
            v_notifications_created := v_notifications_created + 1;
        END IF;
    END LOOP;
    
    -- Buscar exames vencidos
    FOR v_exam IN 
        SELECT * FROM rh.get_expired_exams(p_company_id)
    LOOP
        -- Buscar user_id do funcionário
        SELECT user_id INTO v_user_id 
        FROM rh.employees 
        WHERE id = v_exam.employee_id;
        
        -- Só criar notificação se o funcionário tiver user_id
        IF v_user_id IS NOT NULL THEN
            v_title := 'Exame Vencido';
            v_message := 'Seu exame ' || v_exam.exam_type || ' estava agendado para ' || 
                        v_exam.scheduled_date || ' e está ' || v_exam.days_overdue || ' dias atrasado.';
            
            -- Criar notificação
            PERFORM rh.create_exam_notification(
                v_user_id,
                p_company_id,
                v_exam.exam_id,
                'exam_overdue',
                v_title,
                v_message
            );
            
            v_notifications_created := v_notifications_created + 1;
        END IF;
    END LOOP;
    
    RETURN v_notifications_created;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION rh.get_exams_needing_notification IS 
'Busca exames que precisam de notificação baseado nos dias de antecedência';

COMMENT ON FUNCTION rh.get_expired_exams IS 
'Busca exames que estão vencidos (data de agendamento no passado)';

COMMENT ON FUNCTION rh.create_exam_notification IS 
'Cria uma notificação para um exame específico';

COMMENT ON FUNCTION rh.schedule_exam_notifications IS 
'Agenda notificações automáticas para exames (30 dias antes e vencidos)';
