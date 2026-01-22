-- =====================================================
-- CORREÇÃO: Função calculate_training_progress
-- Problema: Progresso geral não está sendo calculado corretamente
-- Causa: Pode estar retornando valores null ou NaN
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

    -- Inicializar variáveis com valores padrão
    v_total_content := 0;
    v_completed_content := 0;
    v_total_progress := 0;
    v_total_time_segments := 0;
    v_total_time_watched := 0;

    -- Contar total de conteúdos ativos
    SELECT COALESCE(COUNT(*), 0) INTO v_total_content
    FROM rh.training_content
    WHERE training_id = p_training_id
    AND is_active = true;

    -- Contar conteúdos concluídos
    -- IMPORTANTE: Contar apenas registros de progresso onde concluido = true
    -- e que correspondem a conteúdos ativos do treinamento
    SELECT COALESCE(COUNT(DISTINCT tp.content_id), 0) INTO v_completed_content
    FROM rh.training_progress tp
    INNER JOIN rh.training_content tc ON tp.content_id = tc.id
    WHERE tp.training_id = p_training_id
    AND tp.employee_id = p_employee_id
    AND tp.concluido = true
    AND tc.is_active = true;

    -- Calcular percentual de progresso
    -- Garantir que nunca seja null ou NaN
    IF v_total_content > 0 THEN
        v_total_progress := (v_completed_content::DECIMAL / v_total_content::DECIMAL) * 100;
    ELSE
        v_total_progress := 0;
    END IF;

    -- Garantir que o progresso seja um número válido
    IF v_total_progress IS NULL OR v_total_progress < 0 THEN
        v_total_progress := 0;
    END IF;
    
    IF v_total_progress > 100 THEN
        v_total_progress := 100;
    END IF;

    -- Calcular tempo total assistido
    SELECT 
        COALESCE(SUM(COALESCE(tc.duracao_minutos, 0)), 0),
        COALESCE(SUM(COALESCE(tp.tempo_assistido_segundos, 0)), 0)
    INTO v_total_time_segments, v_total_time_watched
    FROM rh.training_content tc
    LEFT JOIN rh.training_progress tp ON tc.id = tp.content_id 
        AND tp.employee_id = p_employee_id
        AND tp.training_id = p_training_id
    WHERE tc.training_id = p_training_id
    AND tc.is_active = true;

    -- Garantir que os valores de tempo sejam válidos
    IF v_total_time_segments IS NULL THEN
        v_total_time_segments := 0;
    END IF;
    
    IF v_total_time_watched IS NULL THEN
        v_total_time_watched := 0;
    END IF;

    -- Construir resultado garantindo que todos os valores sejam válidos
    v_result := jsonb_build_object(
        'total_content', COALESCE(v_total_content, 0),
        'completed_content', COALESCE(v_completed_content, 0),
        'progress_percent', COALESCE(ROUND(v_total_progress, 2), 0),
        'total_time_minutes', COALESCE(v_total_time_segments, 0),
        'time_watched_seconds', COALESCE(v_total_time_watched, 0),
        'time_watched_minutes', COALESCE(ROUND(v_total_time_watched / 60.0, 2), 0)
    );

    RETURN v_result;
END;
$$;
