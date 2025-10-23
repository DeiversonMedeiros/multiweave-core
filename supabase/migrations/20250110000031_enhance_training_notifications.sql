-- Migration: Enhance Training Notifications System
-- Description: Implements comprehensive notification system for training management

-- Create training notification types table
CREATE TABLE IF NOT EXISTS rh.training_notification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL, -- 'inscricao_aberta', 'lembrete_inscricao', 'inicio_treinamento', 'fim_treinamento', 'certificado_disponivel', 'treinamento_atrasado', 'presenca_obrigatoria'
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    template_titulo TEXT NOT NULL,
    template_mensagem TEXT NOT NULL,
    dias_antecedencia INTEGER DEFAULT 0, -- dias antes do evento para enviar notificação
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, tipo)
);

-- Create training notification rules table
CREATE TABLE IF NOT EXISTS rh.training_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID REFERENCES rh.trainings(id) ON DELETE CASCADE,
    notification_type_id UUID NOT NULL REFERENCES rh.training_notification_types(id) ON DELETE CASCADE,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'inscritos', -- 'inscritos', 'todos_funcionarios', 'gestores', 'rh'
    dias_antecedencia INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training notification queue table
CREATE TABLE IF NOT EXISTS rh.training_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID REFERENCES rh.trainings(id) ON DELETE CASCADE,
    notification_type_id UUID NOT NULL REFERENCES rh.training_notification_types(id) ON DELETE CASCADE,
    user_id UUID  ON DELETE CASCADE,
    employee_id UUID REFERENCES rh.employees(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    data_agendamento TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- 'pendente', 'enviada', 'falhou', 'cancelada'
    tentativas INTEGER DEFAULT 0,
    max_tentativas INTEGER DEFAULT 3,
    data_envio TIMESTAMP WITH TIME ZONE,
    erro_mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training notification history table
CREATE TABLE IF NOT EXISTS rh.training_notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID REFERENCES rh.trainings(id) ON DELETE CASCADE,
    notification_type_id UUID NOT NULL REFERENCES rh.training_notification_types(id) ON DELETE CASCADE,
    user_id UUID  ON DELETE CASCADE,
    employee_id UUID REFERENCES rh.employees(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    data_envio TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'enviada', 'falhou'
    metodo_envio VARCHAR(50) NOT NULL, -- 'email', 'sistema', 'sms'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_notification_queue_status ON rh.training_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_training_notification_queue_data_agendamento ON rh.training_notification_queue(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_training_notification_queue_company_id ON rh.training_notification_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_training_notification_history_employee_id ON rh.training_notification_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_notification_history_training_id ON rh.training_notification_history(training_id);

-- Insert default notification types
INSERT INTO rh.training_notification_types (company_id, tipo, nome, descricao, template_titulo, template_mensagem, dias_antecedencia) VALUES
('a9784891-9d58-4cc4-8404-18032105c335', 'inscricao_aberta', 'Inscrições Abertas', 'Notificação quando as inscrições para um treinamento são abertas', 'Inscrições Abertas: {training_name}', 'As inscrições para o treinamento "{training_name}" estão abertas! Data: {training_date} | Local: {training_location} | Vagas: {available_slots}', 0),
('a9784891-9d58-4cc4-8404-18032105c335', 'lembrete_inscricao', 'Lembrete de Inscrição', 'Lembrete para funcionários se inscreverem em treinamentos', 'Lembrete: Inscrições para {training_name}', 'Não esqueça de se inscrever no treinamento "{training_name}". Prazo: {deadline_date}', 3),
('a9784891-9d58-4cc4-8404-18032105c335', 'inicio_treinamento', 'Início do Treinamento', 'Notificação do início de um treinamento', 'Início do Treinamento: {training_name}', 'O treinamento "{training_name}" começa hoje! Horário: {training_time} | Local: {training_location}', 0),
('a9784891-9d58-4cc4-8404-18032105c335', 'fim_treinamento', 'Fim do Treinamento', 'Notificação do fim de um treinamento', 'Treinamento Concluído: {training_name}', 'O treinamento "{training_name}" foi concluído. Certificado disponível em breve!', 0),
('a9784891-9d58-4cc4-8404-18032105c335', 'certificado_disponivel', 'Certificado Disponível', 'Notificação quando o certificado está disponível', 'Certificado Disponível: {training_name}', 'Seu certificado do treinamento "{training_name}" está disponível para download!', 0),
('a9784891-9d58-4cc4-8404-18032105c335', 'treinamento_atrasado', 'Treinamento Atrasado', 'Notificação de treinamento atrasado', 'Treinamento Atrasado: {training_name}', 'O treinamento "{training_name}" foi atrasado. Nova data: {new_date}', 0),
('a9784891-9d58-4cc4-8404-18032105c335', 'presenca_obrigatoria', 'Presença Obrigatória', 'Lembrete de presença obrigatória', 'Presença Obrigatória: {training_name}', 'Lembrete: Sua presença é obrigatória no treinamento "{training_name}" hoje às {training_time}', 1);

-- Create function to schedule training notifications
CREATE OR REPLACE FUNCTION rh.schedule_training_notifications()
RETURNS void AS $$
DECLARE
    training_record RECORD;
    notification_type_record RECORD;
    employee_record RECORD;
    user_record RECORD;
    scheduled_date TIMESTAMP WITH TIME ZONE;
    template_titulo TEXT;
    template_mensagem TEXT;
BEGIN
    -- Process each active training
    FOR training_record IN 
        SELECT t.*, nt.dias_antecedencia, nt.template_titulo, nt.template_mensagem, nt.tipo
        FROM rh.trainings t
        JOIN rh.training_notification_rules tnr ON tnr.training_id = t.id
        JOIN rh.training_notification_types nt ON nt.id = tnr.notification_type_id
        WHERE t.is_active = true 
        AND tnr.is_enabled = true
        AND t.status IN ('inscricoes_abertas', 'em_andamento', 'concluido')
    LOOP
        -- Calculate scheduled date based on training date and days_antecedencia
        CASE training_record.tipo
            WHEN 'inscricao_aberta' THEN
                scheduled_date := training_record.data_limite_inscricao - INTERVAL '0 days';
            WHEN 'lembrete_inscricao' THEN
                scheduled_date := training_record.data_limite_inscricao - INTERVAL '3 days';
            WHEN 'inicio_treinamento' THEN
                scheduled_date := training_record.data_inicio;
            WHEN 'fim_treinamento' THEN
                scheduled_date := training_record.data_fim;
            WHEN 'certificado_disponivel' THEN
                scheduled_date := training_record.data_fim + INTERVAL '1 day';
            WHEN 'presenca_obrigatoria' THEN
                scheduled_date := training_record.data_inicio - INTERVAL '1 day';
            ELSE
                scheduled_date := NOW() + INTERVAL '1 hour';
        END CASE;

        -- Get target audience
        FOR employee_record IN
            SELECT DISTINCT e.*, u.id as user_id
            FROM rh.employees e
            LEFT JOIN public.users u ON u.id = e.user_id
            WHERE e.company_id = training_record.company_id
            AND e.status = 'ativo'
            AND (
                training_record.tipo IN ('inscricao_aberta', 'lembrete_inscricao') OR
                EXISTS (
                    SELECT 1 FROM rh.training_enrollments te 
                    WHERE te.training_id = training_record.id 
                    AND te.employee_id = e.id
                    AND te.status IN ('inscrito', 'confirmado', 'presente')
                )
            )
        LOOP
            -- Replace template variables
            template_titulo := training_record.template_titulo;
            template_mensagem := training_record.template_mensagem;
            
            template_titulo := REPLACE(template_titulo, '{training_name}', training_record.nome);
            template_titulo := REPLACE(template_titulo, '{training_date}', training_record.data_inicio::text);
            template_titulo := REPLACE(template_titulo, '{training_time}', '08:00');
            template_titulo := REPLACE(template_titulo, '{training_location}', COALESCE(training_record.local, 'A definir'));
            template_titulo := REPLACE(template_titulo, '{available_slots}', COALESCE(training_record.vagas_disponiveis::text, 'Ilimitadas'));
            template_titulo := REPLACE(template_titulo, '{deadline_date}', COALESCE(training_record.data_limite_inscricao::text, 'Não definido'));
            
            template_mensagem := REPLACE(template_mensagem, '{training_name}', training_record.nome);
            template_mensagem := REPLACE(template_mensagem, '{training_date}', training_record.data_inicio::text);
            template_mensagem := REPLACE(template_mensagem, '{training_time}', '08:00');
            template_mensagem := REPLACE(template_mensagem, '{training_location}', COALESCE(training_record.local, 'A definir'));
            template_mensagem := REPLACE(template_mensagem, '{available_slots}', COALESCE(training_record.vagas_disponiveis::text, 'Ilimitadas'));
            template_mensagem := REPLACE(template_mensagem, '{deadline_date}', COALESCE(training_record.data_limite_inscricao::text, 'Não definido'));
            template_mensagem := REPLACE(template_mensagem, '{new_date}', training_record.data_inicio::text);

            -- Insert notification into queue
            INSERT INTO rh.training_notification_queue (
                company_id, training_id, notification_type_id, user_id, employee_id,
                titulo, mensagem, data_agendamento, status
            ) VALUES (
                training_record.company_id,
                training_record.id,
                (SELECT id FROM rh.training_notification_types WHERE tipo = training_record.tipo AND company_id = training_record.company_id LIMIT 1),
                employee_record.user_id,
                employee_record.id,
                template_titulo,
                template_mensagem,
                scheduled_date,
                'pendente'
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to process notification queue
CREATE OR REPLACE FUNCTION rh.process_notification_queue()
RETURNS void AS $$
DECLARE
    notification_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Process pending notifications
    FOR notification_record IN
        SELECT * FROM rh.training_notification_queue
        WHERE status = 'pendente'
        AND data_agendamento <= NOW()
        AND tentativas < max_tentativas
        ORDER BY data_agendamento ASC
        LIMIT 100
    LOOP
        BEGIN
            -- Insert into public notifications table
            INSERT INTO public.notifications (
                user_id, company_id, title, message, type, is_read, created_at
            ) VALUES (
                notification_record.user_id,
                notification_record.company_id,
                notification_record.titulo,
                notification_record.mensagem,
                'training',
                false,
                NOW()
            );

            -- Update queue status
            UPDATE rh.training_notification_queue
            SET status = 'enviada',
                data_envio = NOW(),
                tentativas = tentativas + 1
            WHERE id = notification_record.id;

            -- Insert into history
            INSERT INTO rh.training_notification_history (
                company_id, training_id, notification_type_id, user_id, employee_id,
                titulo, mensagem, data_envio, status, metodo_envio
            ) VALUES (
                notification_record.company_id,
                notification_record.training_id,
                notification_record.notification_type_id,
                notification_record.user_id,
                notification_record.employee_id,
                notification_record.titulo,
                notification_record.mensagem,
                NOW(),
                'enviada',
                'sistema'
            );

            success_count := success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Update queue with error
            UPDATE rh.training_notification_queue
            SET status = CASE 
                WHEN tentativas + 1 >= max_tentativas THEN 'falhou'
                ELSE 'pendente'
            END,
            tentativas = tentativas + 1,
            erro_mensagem = SQLERRM
            WHERE id = notification_record.id;

            error_count := error_count + 1;
        END;
    END LOOP;

    -- Log processing results
    RAISE NOTICE 'Processed % notifications successfully, % failed', success_count, error_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to create training notification rules
CREATE OR REPLACE FUNCTION rh.create_training_notification_rules(
    p_training_id UUID,
    p_company_id UUID
)
RETURNS void AS $$
DECLARE
    notification_type_record RECORD;
BEGIN
    -- Create notification rules for all default types
    FOR notification_type_record IN
        SELECT id, tipo FROM rh.training_notification_types
        WHERE company_id = p_company_id
        AND is_active = true
    LOOP
        INSERT INTO rh.training_notification_rules (
            company_id, training_id, notification_type_id, target_audience, dias_antecedencia
        ) VALUES (
            p_company_id,
            p_training_id,
            notification_type_record.id,
            CASE 
                WHEN notification_type_record.tipo IN ('inscricao_aberta', 'lembrete_inscricao') THEN 'todos_funcionarios'
                ELSE 'inscritos'
            END,
            (SELECT dias_antecedencia FROM rh.training_notification_types WHERE id = notification_type_record.id)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create notification rules when training is created
CREATE OR REPLACE FUNCTION rh.trigger_create_training_notification_rules()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM rh.create_training_notification_rules(NEW.id, NEW.company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_training_notification_rules
    AFTER INSERT ON rh.trainings
    FOR EACH ROW
    EXECUTE FUNCTION rh.trigger_create_training_notification_rules();

-- Create function to get training notifications for a user
CREATE OR REPLACE FUNCTION rh.get_training_notifications(
    p_user_id UUID,
    p_company_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    training_id UUID,
    training_name VARCHAR,
    titulo TEXT,
    mensagem TEXT,
    data_envio TIMESTAMP WITH TIME ZONE,
    status VARCHAR,
    tipo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tnh.id,
        tnh.training_id,
        t.nome as training_name,
        tnh.titulo,
        tnh.mensagem,
        tnh.data_envio,
        tnh.status,
        tnt.tipo
    FROM rh.training_notification_history tnh
    JOIN rh.training_notification_types tnt ON tnt.id = tnh.notification_type_id
    LEFT JOIN rh.trainings t ON t.id = tnh.training_id
    WHERE tnh.user_id = p_user_id
    AND tnh.company_id = p_company_id
    ORDER BY tnh.data_envio DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON TABLE rh.training_notification_types TO anon, authenticated, service_role;
GRANT ALL ON TABLE rh.training_notification_rules TO anon, authenticated, service_role;
GRANT ALL ON TABLE rh.training_notification_queue TO anon, authenticated, service_role;
GRANT ALL ON TABLE rh.training_notification_history TO anon, authenticated, service_role;

GRANT ALL ON FUNCTION rh.schedule_training_notifications() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION rh.process_notification_queue() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION rh.create_training_notification_rules(UUID, UUID) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION rh.get_training_notifications(UUID, UUID, INTEGER, INTEGER) TO anon, authenticated, service_role;

-- Create RLS policies
ALTER TABLE rh.training_notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_notification_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_notification_types
CREATE POLICY "Users can view notification types of their company" ON rh.training_notification_types
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can manage notification types of their company" ON rh.training_notification_types
    FOR ALL USING (company_id = ANY(public.get_user_companies()) 
    AND public.check_access_permission('rh', 'training_notification_types', 'manage'));

-- RLS policies for training_notification_rules
CREATE POLICY "Users can view notification rules of their company" ON rh.training_notification_rules
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can manage notification rules of their company" ON rh.training_notification_rules
    FOR ALL USING (company_id = ANY(public.get_user_companies()) 
    AND public.check_access_permission('rh', 'training_notification_rules', 'manage'));

-- RLS policies for training_notification_queue
CREATE POLICY "Users can view notification queue of their company" ON rh.training_notification_queue
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "System can manage notification queue" ON rh.training_notification_queue
    FOR ALL USING (true);

-- RLS policies for training_notification_history
CREATE POLICY "Users can view their own notification history" ON rh.training_notification_history
    FOR SELECT USING (user_id = auth.uid() AND company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can view notification history of their company" ON rh.training_notification_history
    FOR SELECT USING (company_id = ANY(public.get_user_companies()) 
    AND public.check_access_permission('rh', 'training_notification_history', 'read'));
