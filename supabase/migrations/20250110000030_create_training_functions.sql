-- Migration: Create Training Module Functions
-- Description: Creates helper functions for training management

-- Function to get training data with employee information
CREATE OR REPLACE FUNCTION public.get_trainings(
    p_company_id UUID,
    p_tipo_treinamento VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    nome VARCHAR,
    descricao TEXT,
    tipo_treinamento VARCHAR,
    categoria VARCHAR,
    carga_horaria INTEGER,
    data_inicio DATE,
    data_fim DATE,
    data_limite_inscricao DATE,
    vagas_totais INTEGER,
    vagas_disponiveis INTEGER,
    local VARCHAR,
    modalidade VARCHAR,
    instrutor VARCHAR,
    status VARCHAR,
    total_inscritos BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.company_id,
        t.nome,
        t.descricao,
        t.tipo_treinamento,
        t.categoria,
        t.carga_horaria,
        t.data_inicio,
        t.data_fim,
        t.data_limite_inscricao,
        t.vagas_totais,
        t.vagas_disponiveis,
        t.local,
        t.modalidade,
        t.instrutor,
        t.status,
        COUNT(te.id) as total_inscritos,
        t.created_at,
        t.updated_at
    FROM rh.trainings t
    LEFT JOIN rh.training_enrollments te ON t.id = te.training_id AND te.is_active = true
    WHERE t.company_id = p_company_id
        AND t.is_active = true
        AND (p_tipo_treinamento IS NULL OR t.tipo_treinamento = p_tipo_treinamento)
        AND (p_status IS NULL OR t.status = p_status)
        AND (p_data_inicio IS NULL OR t.data_inicio >= p_data_inicio)
        AND (p_data_fim IS NULL OR t.data_fim <= p_data_fim)
    GROUP BY t.id, t.company_id, t.nome, t.descricao, t.tipo_treinamento, 
             t.categoria, t.carga_horaria, t.data_inicio, t.data_fim, 
             t.data_limite_inscricao, t.vagas_totais, t.vagas_disponiveis, 
             t.local, t.modalidade, t.instrutor, t.status, t.created_at, t.updated_at
    ORDER BY t.data_inicio DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to get training enrollments with employee details
CREATE OR REPLACE FUNCTION public.get_training_enrollments(
    p_company_id UUID,
    p_training_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    training_id UUID,
    training_nome VARCHAR,
    employee_id UUID,
    employee_nome VARCHAR,
    employee_matricula VARCHAR,
    data_inscricao TIMESTAMP WITH TIME ZONE,
    status VARCHAR,
    justificativa_cancelamento TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.id,
        te.company_id,
        te.training_id,
        t.nome as training_nome,
        te.employee_id,
        e.nome as employee_nome,
        e.matricula as employee_matricula,
        te.data_inscricao,
        te.status,
        te.justificativa_cancelamento,
        te.observacoes,
        te.created_at,
        te.updated_at
    FROM rh.training_enrollments te
    JOIN rh.trainings t ON te.training_id = t.id
    JOIN rh.employees e ON te.employee_id = e.id
    WHERE te.company_id = p_company_id
        AND te.is_active = true
        AND (p_training_id IS NULL OR te.training_id = p_training_id)
        AND (p_employee_id IS NULL OR te.employee_id = p_employee_id)
        AND (p_status IS NULL OR te.status = p_status)
    ORDER BY te.data_inscricao DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to get training attendance with employee details
CREATE OR REPLACE FUNCTION public.get_training_attendance(
    p_company_id UUID,
    p_training_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_data_treinamento DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    training_id UUID,
    training_nome VARCHAR,
    employee_id UUID,
    employee_nome VARCHAR,
    employee_matricula VARCHAR,
    data_treinamento DATE,
    hora_entrada TIME,
    hora_saida TIME,
    presenca VARCHAR,
    percentual_presenca DECIMAL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ta.id,
        ta.company_id,
        ta.training_id,
        t.nome as training_nome,
        ta.employee_id,
        e.nome as employee_nome,
        e.matricula as employee_matricula,
        ta.data_treinamento,
        ta.hora_entrada,
        ta.hora_saida,
        ta.presenca,
        ta.percentual_presenca,
        ta.observacoes,
        ta.created_at,
        ta.updated_at
    FROM rh.training_attendance ta
    JOIN rh.trainings t ON ta.training_id = t.id
    JOIN rh.employees e ON ta.employee_id = e.id
    WHERE ta.company_id = p_company_id
        AND (p_training_id IS NULL OR ta.training_id = p_training_id)
        AND (p_employee_id IS NULL OR ta.employee_id = p_employee_id)
        AND (p_data_treinamento IS NULL OR ta.data_treinamento = p_data_treinamento)
    ORDER BY ta.data_treinamento DESC, e.nome
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to get training certificates with employee details
CREATE OR REPLACE FUNCTION public.get_training_certificates(
    p_company_id UUID,
    p_training_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    training_id UUID,
    training_nome VARCHAR,
    employee_id UUID,
    employee_nome VARCHAR,
    employee_matricula VARCHAR,
    numero_certificado VARCHAR,
    data_emissao DATE,
    data_validade DATE,
    status VARCHAR,
    nota_final DECIMAL,
    percentual_presenca_final DECIMAL,
    aprovado BOOLEAN,
    observacoes TEXT,
    arquivo_certificado TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id,
        tc.company_id,
        tc.training_id,
        t.nome as training_nome,
        tc.employee_id,
        e.nome as employee_nome,
        e.matricula as employee_matricula,
        tc.numero_certificado,
        tc.data_emissao,
        tc.data_validade,
        tc.status,
        tc.nota_final,
        tc.percentual_presenca_final,
        tc.aprovado,
        tc.observacoes,
        tc.arquivo_certificado,
        tc.created_at,
        tc.updated_at
    FROM rh.training_certificates tc
    JOIN rh.trainings t ON tc.training_id = t.id
    JOIN rh.employees e ON tc.employee_id = e.id
    WHERE tc.company_id = p_company_id
        AND (p_training_id IS NULL OR tc.training_id = p_training_id)
        AND (p_employee_id IS NULL OR tc.employee_id = p_employee_id)
        AND (p_status IS NULL OR tc.status = p_status)
    ORDER BY tc.data_emissao DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to enroll employee in training
CREATE OR REPLACE FUNCTION public.enroll_employee_training(
    p_company_id UUID,
    p_training_id UUID,
    p_employee_id UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enrollment_id UUID;
    v_vagas_disponiveis INTEGER;
BEGIN
    -- Check if training exists and has available spots
    SELECT vagas_disponiveis INTO v_vagas_disponiveis
    FROM rh.trainings
    WHERE id = p_training_id AND company_id = p_company_id AND is_active = true;
    
    IF v_vagas_disponiveis IS NULL THEN
        RAISE EXCEPTION 'Treinamento não encontrado ou inativo';
    END IF;
    
    IF v_vagas_disponiveis <= 0 THEN
        RAISE EXCEPTION 'Não há vagas disponíveis para este treinamento';
    END IF;
    
    -- Check if employee is already enrolled
    IF EXISTS (
        SELECT 1 FROM rh.training_enrollments 
        WHERE training_id = p_training_id 
        AND employee_id = p_employee_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Funcionário já está inscrito neste treinamento';
    END IF;
    
    -- Create enrollment
    INSERT INTO rh.training_enrollments (
        company_id, training_id, employee_id, observacoes, inscrito_por
    ) VALUES (
        p_company_id, p_training_id, p_employee_id, p_observacoes, auth.uid()
    ) RETURNING id INTO v_enrollment_id;
    
    -- Update available spots
    UPDATE rh.trainings 
    SET vagas_disponiveis = vagas_disponiveis - 1
    WHERE id = p_training_id;
    
    RETURN v_enrollment_id;
END;
$$;

-- Function to cancel training enrollment
CREATE OR REPLACE FUNCTION public.cancel_training_enrollment(
    p_enrollment_id UUID,
    p_justificativa TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_training_id UUID;
BEGIN
    -- Get training_id and update enrollment
    UPDATE rh.training_enrollments 
    SET 
        status = 'cancelado',
        justificativa_cancelamento = p_justificativa,
        updated_at = NOW()
    WHERE id = p_enrollment_id
    AND company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND ativo = true)
    RETURNING training_id INTO v_training_id;
    
    IF v_training_id IS NULL THEN
        RAISE EXCEPTION 'Inscrição não encontrada ou sem permissão';
    END IF;
    
    -- Update available spots
    UPDATE rh.trainings 
    SET vagas_disponiveis = vagas_disponiveis + 1
    WHERE id = v_training_id;
    
    RETURN TRUE;
END;
$$;

-- Function to register training attendance
CREATE OR REPLACE FUNCTION public.register_training_attendance(
    p_company_id UUID,
    p_training_id UUID,
    p_employee_id UUID,
    p_data_treinamento DATE,
    p_hora_entrada TIME DEFAULT NULL,
    p_hora_saida TIME DEFAULT NULL,
    p_presenca VARCHAR DEFAULT 'presente',
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attendance_id UUID;
    v_percentual_presenca DECIMAL(5,2) := 0;
BEGIN
    -- Calculate attendance percentage based on presence status
    CASE p_presenca
        WHEN 'presente' THEN v_percentual_presenca := 100;
        WHEN 'atrasado' THEN v_percentual_presenca := 80;
        WHEN 'saida_antecipada' THEN v_percentual_presenca := 60;
        WHEN 'ausente' THEN v_percentual_presenca := 0;
        ELSE v_percentual_presenca := 0;
    END CASE;
    
    -- Insert or update attendance record
    INSERT INTO rh.training_attendance (
        company_id, training_id, employee_id, data_treinamento,
        hora_entrada, hora_saida, presenca, percentual_presenca,
        observacoes, registrado_por
    ) VALUES (
        p_company_id, p_training_id, p_employee_id, p_data_treinamento,
        p_hora_entrada, p_hora_saida, p_presenca, v_percentual_presenca,
        p_observacoes, auth.uid()
    )
    ON CONFLICT (training_id, employee_id, data_treinamento)
    DO UPDATE SET
        hora_entrada = EXCLUDED.hora_entrada,
        hora_saida = EXCLUDED.hora_saida,
        presenca = EXCLUDED.presenca,
        percentual_presenca = EXCLUDED.percentual_presenca,
        observacoes = EXCLUDED.observacoes,
        registrado_por = EXCLUDED.registrado_por,
        updated_at = NOW()
    RETURNING id INTO v_attendance_id;
    
    RETURN v_attendance_id;
END;
$$;

-- Function to generate training certificate
CREATE OR REPLACE FUNCTION public.generate_training_certificate(
    p_company_id UUID,
    p_training_id UUID,
    p_employee_id UUID,
    p_nota_final DECIMAL DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_certificate_id UUID;
    v_numero_certificado VARCHAR;
    v_percentual_presenca_final DECIMAL(5,2);
    v_aprovado BOOLEAN := false;
    v_training_nome VARCHAR;
    v_employee_nome VARCHAR;
BEGIN
    -- Get training and employee names for certificate number
    SELECT t.nome, e.nome INTO v_training_nome, v_employee_nome
    FROM rh.trainings t
    JOIN rh.employees e ON true
    WHERE t.id = p_training_id AND e.id = p_employee_id;
    
    -- Calculate final attendance percentage
    SELECT COALESCE(AVG(percentual_presenca), 0) INTO v_percentual_presenca_final
    FROM rh.training_attendance
    WHERE training_id = p_training_id AND employee_id = p_employee_id;
    
    -- Determine if approved (minimum 80% attendance and passing grade if provided)
    v_aprovado := (v_percentual_presenca_final >= 80) AND (p_nota_final IS NULL OR p_nota_final >= 7.0);
    
    -- Generate certificate number
    v_numero_certificado := 'CERT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                          LPAD(EXTRACT(DOY FROM CURRENT_DATE)::TEXT, 3, '0') || '-' ||
                          SUBSTRING(p_training_id::TEXT, 1, 8) || '-' ||
                          SUBSTRING(p_employee_id::TEXT, 1, 8);
    
    -- Create certificate
    INSERT INTO rh.training_certificates (
        company_id, training_id, employee_id, numero_certificado,
        nota_final, percentual_presenca_final, aprovado, observacoes, emitido_por
    ) VALUES (
        p_company_id, p_training_id, p_employee_id, v_numero_certificado,
        p_nota_final, v_percentual_presenca_final, v_aprovado, p_observacoes, auth.uid()
    )
    ON CONFLICT (training_id, employee_id)
    DO UPDATE SET
        numero_certificado = EXCLUDED.numero_certificado,
        nota_final = EXCLUDED.nota_final,
        percentual_presenca_final = EXCLUDED.percentual_presenca_final,
        aprovado = EXCLUDED.aprovado,
        observacoes = EXCLUDED.observacoes,
        emitido_por = EXCLUDED.emitido_por,
        updated_at = NOW()
    RETURNING id INTO v_certificate_id;
    
    RETURN v_certificate_id;
END;
$$;

-- Function to get training statistics
CREATE OR REPLACE FUNCTION public.get_training_statistics(
    p_company_id UUID,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE(
    total_treinamentos BIGINT,
    treinamentos_concluidos BIGINT,
    total_inscricoes BIGINT,
    total_participantes BIGINT,
    total_certificados BIGINT,
    taxa_aprovacao DECIMAL(5,2),
    treinamentos_por_categoria JSONB,
    treinamentos_por_tipo JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT t.id) as total_treinamentos,
        COUNT(DISTINCT CASE WHEN t.status = 'concluido' THEN t.id END) as treinamentos_concluidos,
        COUNT(te.id) as total_inscricoes,
        COUNT(DISTINCT te.employee_id) as total_participantes,
        COUNT(tc.id) as total_certificados,
        CASE 
            WHEN COUNT(te.id) > 0 THEN 
                ROUND((COUNT(tc.id)::DECIMAL / COUNT(te.id)::DECIMAL) * 100, 2)
            ELSE 0 
        END as taxa_aprovacao,
        (
            SELECT jsonb_object_agg(categoria, count)
            FROM (
                SELECT categoria, COUNT(*) as count
                FROM rh.trainings
                WHERE company_id = p_company_id
                AND (p_data_inicio IS NULL OR data_inicio >= p_data_inicio)
                AND (p_data_fim IS NULL OR data_fim <= p_data_fim)
                AND is_active = true
                GROUP BY categoria
            ) cat_stats
        ) as treinamentos_por_categoria,
        (
            SELECT jsonb_object_agg(tipo_treinamento, count)
            FROM (
                SELECT tipo_treinamento, COUNT(*) as count
                FROM rh.trainings
                WHERE company_id = p_company_id
                AND (p_data_inicio IS NULL OR data_inicio >= p_data_inicio)
                AND (p_data_fim IS NULL OR data_fim <= p_data_fim)
                AND is_active = true
                GROUP BY tipo_treinamento
            ) tipo_stats
        ) as treinamentos_por_tipo
    FROM rh.trainings t
    LEFT JOIN rh.training_enrollments te ON t.id = te.training_id AND te.is_active = true
    LEFT JOIN rh.training_certificates tc ON t.id = tc.training_id
    WHERE t.company_id = p_company_id
        AND (p_data_inicio IS NULL OR t.data_inicio >= p_data_inicio)
        AND (p_data_fim IS NULL OR t.data_fim <= p_data_fim)
        AND t.is_active = true;
END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.get_trainings TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_training_enrollments TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_training_attendance TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_training_certificates TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.enroll_employee_training TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.cancel_training_enrollment TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.register_training_attendance TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.generate_training_certificate TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_training_statistics TO anon, authenticated, service_role;
