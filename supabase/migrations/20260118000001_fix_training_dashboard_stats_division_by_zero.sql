-- =====================================================
-- CORREÇÃO: Divisão por zero em get_training_dashboard_stats
-- E inclusão de atribuições (training_assignments) nas estatísticas
-- =====================================================
-- Problema 1: A função estava dividindo por v_total_enrollments
-- sem verificar se o valor é zero, causando erro "division by zero"
-- Problema 2: A função não considerava training_assignments,
-- apenas training_enrollments, então treinamentos atribuídos
-- mas ainda não iniciados não apareciam nas estatísticas
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
    v_total_assignments INTEGER;
    v_total_certificates INTEGER;
    v_avg_completion_rate DECIMAL;
    v_avg_reaction_score DECIMAL;
BEGIN
    RAISE NOTICE '[DEBUG] Iniciando get_training_dashboard_stats - company_id: %, training_id: %', p_company_id, p_training_id;
    RAISE NOTICE '[DEBUG] auth.uid(): %', auth.uid();
    
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RAISE NOTICE '[DEBUG] Acesso negado para user_id: %, company_id: %', auth.uid(), p_company_id;
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;
    
    RAISE NOTICE '[DEBUG] Acesso autorizado';

    -- Total de treinamentos
    SELECT COUNT(*) INTO v_total_trainings
    FROM rh.trainings
    WHERE company_id = p_company_id
    AND is_active = true
    AND (p_training_id IS NULL OR id = p_training_id)
    AND modalidade = 'online';
    
    RAISE NOTICE '[DEBUG] v_total_trainings: %', v_total_trainings;

    -- Total de atribuições (todas as atribuições, incluindo públicas)
    SELECT COUNT(*) INTO v_total_assignments
    FROM rh.training_assignments ta
    WHERE ta.company_id = p_company_id
    AND (p_training_id IS NULL OR ta.training_id = p_training_id);
    
    RAISE NOTICE '[DEBUG] v_total_assignments: %', v_total_assignments;

    -- Treinamentos a iniciar: 
    -- 1. Inscrições sem progresso
    -- 2. Atribuições individuais sem enrollment correspondente
    -- 3. Treinamentos com atribuições (públicas ou não) mas sem enrollments
    SELECT COUNT(DISTINCT combined.training_id) INTO v_trainings_to_start
    FROM (
        -- Inscrições sem progresso
        SELECT te.training_id
        FROM rh.training_enrollments te
        LEFT JOIN rh.training_progress tp ON te.training_id = tp.training_id 
            AND te.employee_id = tp.employee_id
        WHERE te.company_id = p_company_id
        AND te.is_active = true
        AND te.status IN ('inscrito', 'confirmado')
        AND tp.id IS NULL
        AND (p_training_id IS NULL OR te.training_id = p_training_id)
        
        UNION
        
        -- Atribuições individuais sem enrollment
        SELECT ta.training_id
        FROM rh.training_assignments ta
        LEFT JOIN rh.training_enrollments te ON ta.training_id = te.training_id 
            AND ta.employee_id = te.employee_id
            AND te.is_active = true
        WHERE ta.company_id = p_company_id
        AND ta.employee_id IS NOT NULL
        AND te.id IS NULL
        AND (p_training_id IS NULL OR ta.training_id = p_training_id)
        
        UNION
        
        -- Treinamentos com atribuições públicas mas sem enrollments
        SELECT ta.training_id
        FROM rh.training_assignments ta
        WHERE ta.company_id = p_company_id
        AND ta.tipo_atribuicao = 'publica'
        AND ta.employee_id IS NULL
        AND ta.position_id IS NULL
        AND ta.unit_id IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_enrollments te 
            WHERE te.training_id = ta.training_id 
            AND te.is_active = true
        )
        AND (p_training_id IS NULL OR ta.training_id = p_training_id)
    ) AS combined;
    
    RAISE NOTICE '[DEBUG] v_trainings_to_start: %', v_trainings_to_start;

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
    
    RAISE NOTICE '[DEBUG] v_trainings_in_progress: %', v_trainings_in_progress;

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
    
    RAISE NOTICE '[DEBUG] v_trainings_completed: %', v_trainings_completed;

    -- Total de inscrições
    SELECT COUNT(*) INTO v_total_enrollments
    FROM rh.training_enrollments
    WHERE company_id = p_company_id
    AND is_active = true
    AND (p_training_id IS NULL OR training_id = p_training_id);
    
    RAISE NOTICE '[DEBUG] v_total_enrollments: %', v_total_enrollments;

    -- Total de certificados
    SELECT COUNT(*) INTO v_total_certificates
    FROM rh.training_certificates
    WHERE company_id = p_company_id
    AND status = 'valido'
    AND (p_training_id IS NULL OR training_id = p_training_id);
    
    RAISE NOTICE '[DEBUG] v_total_certificates: %', v_total_certificates;

    -- Taxa média de conclusão
    -- CORREÇÃO: Verificar se v_total_enrollments > 0 antes de dividir
    -- Usar apenas enrollments, pois assignments não criam enrollments automaticamente
    IF v_total_enrollments > 0 THEN
        v_avg_completion_rate := (v_trainings_completed::DECIMAL / v_total_enrollments::DECIMAL) * 100;
    ELSE
        v_avg_completion_rate := 0;
    END IF;

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
        'total_assignments', v_total_assignments,
        'total_certificates', v_total_certificates,
        'avg_completion_rate', ROUND(v_avg_completion_rate, 2),
        'avg_reaction_score', ROUND(v_avg_reaction_score, 2)
    );
    
    RAISE NOTICE '[DEBUG] Resultado final: %', v_result;

    RETURN v_result;
END;
$$;
