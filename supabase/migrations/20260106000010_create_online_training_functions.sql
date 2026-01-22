-- =====================================================
-- FUNÇÕES RPC PARA SISTEMA DE TREINAMENTOS ONLINE
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: Calcular progresso geral do treinamento
-- =====================================================
CREATE OR REPLACE FUNCTION rh.calculate_training_progress(
    p_training_id UUID,
    p_employee_id UUID,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_content INTEGER;
    v_completed_content INTEGER;
    v_total_progress DECIMAL;
    v_total_time_segments INTEGER;
    v_total_time_watched INTEGER;
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

    -- Contar total de conteúdos
    SELECT COUNT(*) INTO v_total_content
    FROM rh.training_content
    WHERE training_id = p_training_id
    AND is_active = true;

    -- Contar conteúdos concluídos
    SELECT COUNT(*) INTO v_completed_content
    FROM rh.training_progress
    WHERE training_id = p_training_id
    AND employee_id = p_employee_id
    AND concluido = true;

    -- Calcular percentual de progresso
    IF v_total_content > 0 THEN
        v_total_progress := (v_completed_content::DECIMAL / v_total_content::DECIMAL) * 100;
    ELSE
        v_total_progress := 0;
    END IF;

    -- Calcular tempo total assistido
    SELECT 
        COALESCE(SUM(duracao_minutos), 0),
        COALESCE(SUM(tempo_assistido_segundos), 0)
    INTO v_total_time_segments, v_total_time_watched
    FROM rh.training_content tc
    LEFT JOIN rh.training_progress tp ON tc.id = tp.content_id 
        AND tp.employee_id = p_employee_id
    WHERE tc.training_id = p_training_id
    AND tc.is_active = true;

    -- Construir resultado
    v_result := jsonb_build_object(
        'total_content', v_total_content,
        'completed_content', v_completed_content,
        'progress_percent', ROUND(v_total_progress, 2),
        'total_time_minutes', v_total_time_segments,
        'time_watched_seconds', v_total_time_watched,
        'time_watched_minutes', ROUND(v_total_time_watched / 60.0, 2)
    );

    RETURN v_result;
END;
$$;

-- =====================================================
-- 2. FUNÇÃO: Verificar se pode avançar para próxima aula
-- =====================================================
CREATE OR REPLACE FUNCTION rh.can_advance_to_next_content(
    p_training_id UUID,
    p_employee_id UUID,
    p_content_id UUID,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_content RECORD;
    v_progress RECORD;
    v_previous_content_completed BOOLEAN;
    v_required_exam_passed BOOLEAN;
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

    -- Buscar conteúdo atual
    SELECT * INTO v_current_content
    FROM rh.training_content
    WHERE id = p_content_id
    AND training_id = p_training_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', true, 'message', 'Conteúdo não encontrado');
    END IF;

    -- Verificar se conteúdo anterior foi concluído (se requer conclusão)
    IF v_current_content.ordem > 1 THEN
        SELECT EXISTS (
            SELECT 1 FROM rh.training_content tc
            INNER JOIN rh.training_progress tp ON tc.id = tp.content_id
            WHERE tc.training_id = p_training_id
            AND tc.ordem = v_current_content.ordem - 1
            AND tp.employee_id = p_employee_id
            AND tp.concluido = true
        ) INTO v_previous_content_completed;
    ELSE
        v_previous_content_completed := true; -- Primeira aula sempre pode ser acessada
    END IF;

    -- Verificar se há prova entre aulas e se foi aprovada
    SELECT EXISTS (
        SELECT 1 FROM rh.training_exams te
        INNER JOIN rh.training_exam_attempts tea ON te.id = tea.exam_id
        WHERE te.training_id = p_training_id
        AND te.content_id = (
            SELECT id FROM rh.training_content
            WHERE training_id = p_training_id
            AND ordem = v_current_content.ordem - 1
            LIMIT 1
        )
        AND tea.employee_id = p_employee_id
        AND tea.aprovado = true
        AND tea.tentativa_numero = (
            SELECT MAX(tentativa_numero) 
            FROM rh.training_exam_attempts 
            WHERE exam_id = te.id 
            AND employee_id = p_employee_id
        )
    ) INTO v_required_exam_passed;

    -- Se não há prova entre aulas, considerar como aprovada
    IF NOT EXISTS (
        SELECT 1 FROM rh.training_exams
        WHERE training_id = p_training_id
        AND content_id = (
            SELECT id FROM rh.training_content
            WHERE training_id = p_training_id
            AND ordem = v_current_content.ordem - 1
            LIMIT 1
        )
        AND tipo_avaliacao = 'entre_aulas'
    ) THEN
        v_required_exam_passed := true;
    END IF;

    -- Construir resultado
    v_result := jsonb_build_object(
        'can_advance', v_previous_content_completed AND v_required_exam_passed,
        'previous_content_completed', v_previous_content_completed,
        'required_exam_passed', v_required_exam_passed,
        'requires_completion', v_current_content.requer_conclusao,
        'allows_skip', v_current_content.permite_pular
    );

    RETURN v_result;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO: Obter estatísticas do dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION rh.get_training_dashboard_stats(
    p_company_id UUID,
    p_training_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total_trainings INTEGER;
    v_trainings_to_start INTEGER;
    v_trainings_in_progress INTEGER;
    v_trainings_completed INTEGER;
    v_total_enrollments INTEGER;
    v_total_certificates INTEGER;
    v_avg_completion_rate DECIMAL;
    v_avg_reaction_score DECIMAL;
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

    -- Total de treinamentos
    SELECT COUNT(*) INTO v_total_trainings
    FROM rh.trainings
    WHERE company_id = p_company_id
    AND is_active = true
    AND (p_training_id IS NULL OR id = p_training_id)
    AND modalidade = 'online';

    -- Treinamentos a iniciar (inscritos mas sem progresso)
    SELECT COUNT(DISTINCT te.training_id) INTO v_trainings_to_start
    FROM rh.training_enrollments te
    LEFT JOIN rh.training_progress tp ON te.training_id = tp.training_id 
        AND te.employee_id = tp.employee_id
    WHERE te.company_id = p_company_id
    AND te.is_active = true
    AND te.status IN ('inscrito', 'confirmado')
    AND tp.id IS NULL
    AND (p_training_id IS NULL OR te.training_id = p_training_id);

    -- Treinamentos em andamento (com progresso mas não concluído)
    SELECT COUNT(DISTINCT tp.training_id) INTO v_trainings_in_progress
    FROM rh.training_progress tp
    INNER JOIN rh.training_enrollments te ON tp.training_id = te.training_id 
        AND tp.employee_id = te.employee_id
    WHERE tp.company_id = p_company_id
    AND te.is_active = true
    AND EXISTS (
        SELECT 1 FROM rh.training_progress tp2
        WHERE tp2.training_id = tp.training_id
        AND tp2.employee_id = tp.employee_id
        AND tp2.concluido = false
    )
    AND (p_training_id IS NULL OR tp.training_id = p_training_id);

    -- Treinamentos finalizados (todos os conteúdos concluídos)
    SELECT COUNT(DISTINCT tp.training_id) INTO v_trainings_completed
    FROM rh.training_progress tp
    INNER JOIN rh.training_enrollments te ON tp.training_id = te.training_id 
        AND tp.employee_id = te.employee_id
    WHERE tp.company_id = p_company_id
    AND te.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM rh.training_content tc
        WHERE tc.training_id = tp.training_id
        AND tc.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_progress tp2
            WHERE tp2.content_id = tc.id
            AND tp2.employee_id = tp.employee_id
            AND tp2.concluido = true
        )
    )
    AND (p_training_id IS NULL OR tp.training_id = p_training_id);

    -- Total de inscrições
    SELECT COUNT(*) INTO v_total_enrollments
    FROM rh.training_enrollments
    WHERE company_id = p_company_id
    AND is_active = true
    AND (p_training_id IS NULL OR training_id = p_training_id);

    -- Total de certificados
    SELECT COUNT(*) INTO v_total_certificates
    FROM rh.training_certificates
    WHERE company_id = p_company_id
    AND status = 'valido'
    AND (p_training_id IS NULL OR training_id = p_training_id);

    -- Taxa média de conclusão
    SELECT COALESCE(AVG(
        CASE 
            WHEN v_total_trainings > 0 THEN 
                (v_trainings_completed::DECIMAL / v_total_enrollments::DECIMAL) * 100
            ELSE 0
        END
    ), 0) INTO v_avg_completion_rate;

    -- Média de avaliação de reação
    SELECT COALESCE(AVG(nota_geral), 0) INTO v_avg_reaction_score
    FROM rh.training_reaction_evaluations
    WHERE company_id = p_company_id
    AND (p_training_id IS NULL OR training_id = p_training_id);

    -- Construir resultado
    v_result := jsonb_build_object(
        'total_trainings', v_total_trainings,
        'trainings_to_start', v_trainings_to_start,
        'trainings_in_progress', v_trainings_in_progress,
        'trainings_completed', v_trainings_completed,
        'total_enrollments', v_total_enrollments,
        'total_certificates', v_total_certificates,
        'avg_completion_rate', ROUND(v_avg_completion_rate, 2),
        'avg_reaction_score', ROUND(v_avg_reaction_score, 2)
    );

    RETURN v_result;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO: Verificar treinamentos obrigatórios pendentes
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

    -- Buscar treinamentos obrigatórios pendentes
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
    AND ta.tipo_atribuicao = 'obrigatorio'
    AND t.is_active = true
    AND t.modalidade = 'online'
    AND (
        ta.employee_id = p_employee_id
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
-- 5. FUNÇÃO: Finalizar tentativa de prova
-- =====================================================
CREATE OR REPLACE FUNCTION rh.finish_exam_attempt(
    p_attempt_id UUID,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt RECORD;
    v_total_questions INTEGER;
    v_correct_answers INTEGER;
    v_total_score DECIMAL;
    v_percent_correct DECIMAL;
    v_minimum_score DECIMAL;
    v_approved BOOLEAN;
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

    -- Buscar tentativa
    SELECT * INTO v_attempt
    FROM rh.training_exam_attempts
    WHERE id = p_attempt_id
    AND company_id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', true, 'message', 'Tentativa não encontrada');
    END IF;

    -- Verificar se é do usuário
    IF NOT EXISTS (
        SELECT 1 FROM rh.employees
        WHERE id = v_attempt.employee_id
        AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Contar questões e respostas corretas
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE ea.is_correct = true),
        COALESCE(SUM(ea.pontuacao_obtida), 0)
    INTO v_total_questions, v_correct_answers, v_total_score
    FROM rh.training_exam_answers ea
    WHERE ea.attempt_id = p_attempt_id;

    -- Calcular percentual de acerto
    IF v_total_questions > 0 THEN
        v_percent_correct := (v_correct_answers::DECIMAL / v_total_questions::DECIMAL) * 100;
    ELSE
        v_percent_correct := 0;
    END IF;

    -- Buscar nota mínima de aprovação
    SELECT COALESCE(nota_minima_aprovacao, 70.00) INTO v_minimum_score
    FROM rh.training_exams
    WHERE id = v_attempt.exam_id;

    -- Verificar se foi aprovado
    v_approved := v_percent_correct >= v_minimum_score;

    -- Atualizar tentativa
    UPDATE rh.training_exam_attempts
    SET 
        data_fim = NOW(),
        nota_final = v_total_score,
        percentual_acerto = v_percent_correct,
        aprovado = v_approved,
        status = 'finalizado',
        tempo_gasto_segundos = EXTRACT(EPOCH FROM (NOW() - data_inicio))::INTEGER
    WHERE id = p_attempt_id;

    -- Construir resultado
    v_result := jsonb_build_object(
        'attempt_id', p_attempt_id,
        'total_questions', v_total_questions,
        'correct_answers', v_correct_answers,
        'score', v_total_score,
        'percent_correct', ROUND(v_percent_correct, 2),
        'approved', v_approved
    );

    RETURN v_result;
END;
$$;

-- =====================================================
-- 6. FUNÇÃO: Marcar conteúdo como concluído
-- =====================================================
CREATE OR REPLACE FUNCTION rh.mark_content_as_completed(
    p_training_id UUID,
    p_content_id UUID,
    p_employee_id UUID,
    p_company_id UUID,
    p_tempo_assistido_segundos INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enrollment_id UUID;
    v_progress_id UUID;
    v_content RECORD;
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

    -- Verificar se é o próprio usuário
    IF NOT EXISTS (
        SELECT 1 FROM rh.employees
        WHERE id = p_employee_id
        AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar conteúdo
    SELECT * INTO v_content
    FROM rh.training_content
    WHERE id = p_content_id
    AND training_id = p_training_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', true, 'message', 'Conteúdo não encontrado');
    END IF;

    -- Buscar ou criar inscrição
    SELECT id INTO v_enrollment_id
    FROM rh.training_enrollments
    WHERE training_id = p_training_id
    AND employee_id = p_employee_id
    AND company_id = p_company_id
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        INSERT INTO rh.training_enrollments (
            company_id, training_id, employee_id, status
        ) VALUES (
            p_company_id, p_training_id, p_employee_id, 'confirmado'
        ) RETURNING id INTO v_enrollment_id;
    END IF;

    -- Buscar ou criar progresso
    SELECT id INTO v_progress_id
    FROM rh.training_progress
    WHERE training_id = p_training_id
    AND content_id = p_content_id
    AND employee_id = p_employee_id;

    IF v_progress_id IS NULL THEN
        INSERT INTO rh.training_progress (
            company_id, training_id, content_id, employee_id, 
            enrollment_id, status, data_inicio, tempo_assistido_segundos
        ) VALUES (
            p_company_id, p_training_id, p_content_id, p_employee_id,
            v_enrollment_id, 'em_andamento', NOW(), p_tempo_assistido_segundos
        ) RETURNING id INTO v_progress_id;
    END IF;

    -- Atualizar progresso como concluído
    UPDATE rh.training_progress
    SET 
        concluido = true,
        status = 'concluido',
        percentual_concluido = 100,
        tempo_assistido_segundos = GREATEST(tempo_assistido_segundos, p_tempo_assistido_segundos),
        data_conclusao = NOW(),
        data_ultima_atualizacao = NOW()
    WHERE id = v_progress_id;

    -- Calcular progresso geral
    SELECT * INTO v_result
    FROM rh.calculate_training_progress(p_training_id, p_employee_id, p_company_id);

    RETURN jsonb_build_object(
        'success', true,
        'progress_id', v_progress_id,
        'overall_progress', v_result
    );
END;
$$;



