-- =====================================================
-- CORREÇÃO: Erro de tipo boolean na função finish_exam_attempt
-- =====================================================
-- Problema: A variável v_approved (BOOLEAN) estava recebendo 
-- o valor de nota_minima_aprovacao (DECIMAL), causando erro
-- "invalid input syntax for type boolean: "80.00""
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
