-- =====================================================
-- CORREÇÃO: Bypass RLS na função calculate_training_progress
-- Problema: RLS está bloqueando acesso mesmo com SECURITY DEFINER
-- Solução: Usar função auxiliar que desabilita RLS temporariamente
-- =====================================================

-- Primeiro, criar função auxiliar que executa com RLS desabilitado
CREATE OR REPLACE FUNCTION rh._calculate_training_progress_internal(
    p_training_id UUID,
    p_employee_id UUID,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
DECLARE
    v_total_content INTEGER;
    v_completed_content INTEGER;
    v_total_progress DECIMAL;
    v_total_time_segments INTEGER;
    v_total_time_watched INTEGER;
    v_result JSONB;
BEGIN
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
    AND is_active = true
    AND company_id = p_company_id;
    
    -- Log para debug
    RAISE NOTICE '[_calculate_training_progress_internal] Total de conteúdos encontrados: %', v_total_content;

    -- Contar conteúdos concluídos
    SELECT COALESCE(COUNT(DISTINCT tp.content_id), 0) INTO v_completed_content
    FROM rh.training_progress tp
    INNER JOIN rh.training_content tc ON tp.content_id = tc.id
    WHERE tp.training_id = p_training_id
    AND tp.employee_id = p_employee_id
    AND tp.company_id = p_company_id
    AND tc.is_active = true
    AND tc.company_id = p_company_id
    AND (tp.concluido = true OR tp.percentual_concluido >= 100);
    
    -- Log para debug
    RAISE NOTICE '[_calculate_training_progress_internal] Conteúdos concluídos encontrados: %', v_completed_content;

    -- Calcular percentual de progresso
    IF v_total_content > 0 THEN
        v_total_progress := (v_completed_content::DECIMAL / v_total_content::DECIMAL) * 100;
        
        -- CORREÇÃO: Se todos os conteúdos foram concluídos, garantir que seja exatamente 100
        IF v_completed_content = v_total_content AND v_completed_content > 0 THEN
            v_total_progress := 100;
        END IF;
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
        AND tp.company_id = p_company_id
    WHERE tc.training_id = p_training_id
    AND tc.is_active = true
    AND tc.company_id = p_company_id;

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
    
    -- Log final para debug
    RAISE NOTICE '[_calculate_training_progress_internal] Resultado final: total_content=%, completed_content=%, progress_percent=%', 
        v_total_content, v_completed_content, v_total_progress;

    RETURN v_result;
END;
$$;

-- Agora atualizar a função principal para usar a função auxiliar
CREATE OR REPLACE FUNCTION rh.calculate_training_progress(
    p_training_id UUID,
    p_employee_id UUID,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_has_access BOOLEAN;
BEGIN
    -- Obter user_id atual
    v_user_id := auth.uid();
    
    -- Log para debug
    RAISE NOTICE '[calculate_training_progress] Verificando acesso: user_id=%, company_id=%', v_user_id, p_company_id;
    
    -- Verificar acesso
    -- Primeiro verificar se é admin
    BEGIN
        v_is_admin := public.is_admin_simple(v_user_id);
        RAISE NOTICE '[calculate_training_progress] is_admin_simple retornou: %', v_is_admin;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[calculate_training_progress] Erro ao verificar admin: %', SQLERRM;
        v_is_admin := false;
    END;
    
    IF v_is_admin THEN
        -- Admin tem acesso a todas as empresas
        RAISE NOTICE '[calculate_training_progress] Usuário é admin, permitindo acesso';
        NULL; -- Continuar execução
    ELSE
        -- Verificar se tem acesso à empresa
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.user_companies
                WHERE user_id = v_user_id
                AND company_id = p_company_id
                AND ativo = true
            ) INTO v_has_access;
            
            RAISE NOTICE '[calculate_training_progress] Verificação de acesso retornou: %', v_has_access;
            
            IF NOT v_has_access THEN
                RAISE NOTICE '[calculate_training_progress] Acesso negado - usuário não tem acesso à empresa';
                RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[calculate_training_progress] Erro ao verificar acesso: %', SQLERRM;
            RETURN jsonb_build_object('error', true, 'message', 'Erro ao verificar acesso: ' || SQLERRM);
        END;
    END IF;

    RAISE NOTICE '[calculate_training_progress] Acesso permitido, chamando função auxiliar';
    
    -- Chamar função auxiliar que tem RLS desabilitado
    RETURN rh._calculate_training_progress_internal(
        p_training_id,
        p_employee_id,
        p_company_id
    );
END;
$$;
