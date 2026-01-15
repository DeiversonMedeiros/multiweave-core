-- =====================================================
-- ATUALIZAR FUNÇÃO: Verificar se pode avançar para próxima aula
-- Adiciona validação de percentual (90% para vídeo/áudio) e tempo mínimo (2min para texto/PDF/link)
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
    v_previous_content RECORD;
    v_progress RECORD;
    v_previous_content_completed BOOLEAN;
    v_required_exam_passed BOOLEAN;
    v_result JSONB;
    v_percentual_ok BOOLEAN;
    v_tempo_ok BOOLEAN;
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
        -- Buscar conteúdo anterior
        SELECT * INTO v_previous_content
        FROM rh.training_content
        WHERE training_id = p_training_id
        AND ordem = v_current_content.ordem - 1
        AND is_active = true
        LIMIT 1;

        IF FOUND THEN
            -- Buscar progresso do conteúdo anterior
            SELECT * INTO v_progress
            FROM rh.training_progress
            WHERE training_id = p_training_id
            AND content_id = v_previous_content.id
            AND employee_id = p_employee_id
            LIMIT 1;

            -- Se está marcado como concluído, pode avançar
            IF v_progress.concluido = true THEN
                v_previous_content_completed := true;
            ELSE
                -- Verificar critérios baseado no tipo de conteúdo
                IF v_previous_content.tipo_conteudo IN ('video', 'audio') THEN
                    -- Para vídeo/áudio: precisa de pelo menos 90% assistido
                    v_percentual_ok := COALESCE(v_progress.percentual_concluido, 0) >= 90;
                    v_previous_content_completed := v_percentual_ok;
                ELSIF v_previous_content.tipo_conteudo IN ('texto', 'pdf', 'link_externo') THEN
                    -- Para texto, PDF e link: precisa de pelo menos 2 minutos (120 segundos)
                    v_tempo_ok := COALESCE(v_progress.tempo_assistido_segundos, 0) >= 120;
                    v_previous_content_completed := v_tempo_ok;
                ELSE
                    -- Para outros tipos, considerar como não concluído se não está marcado como concluído
                    v_previous_content_completed := false;
                END IF;
            END IF;
        ELSE
            -- Se não encontrou conteúdo anterior, considerar como concluído
            v_previous_content_completed := true;
        END IF;
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
