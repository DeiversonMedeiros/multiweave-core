-- =====================================================
-- AJUSTAR HORAS NEGATIVAS COM ATESTADOS APROVADOS
-- =====================================================
-- Data: 2026-02-04
-- Descrição: Ao aprovar um atestado médico, ajusta as horas negativas do funcionário:
--            - Atestado de comparecimento: desconta horas_comparecimento das horas_negativas do mesmo dia
--            - Atestado normal: zera ou ajusta horas_negativas dos dias do período de afastamento
-- =====================================================

-- Função auxiliar para ajustar horas negativas baseado em atestado aprovado
CREATE OR REPLACE FUNCTION rh.adjust_negative_hours_for_medical_certificate(
    p_certificate_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_certificate RECORD;
    v_current_date DATE;
    v_horas_negativas_atual DECIMAL(4,2);
    v_horas_negativas_ajustadas DECIMAL(4,2);
    v_time_record RECORD;
BEGIN
    -- Buscar dados do atestado
    SELECT 
        id,
        employee_id,
        company_id,
        data_inicio,
        data_fim,
        atestado_comparecimento,
        horas_comparecimento,
        dias_afastamento
    INTO v_certificate
    FROM rh.medical_certificates
    WHERE id = p_certificate_id
      AND status = 'aprovado';
    
    -- Se não encontrou ou não está aprovado, não faz nada
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- CASO 1: Atestado de comparecimento (com horas específicas)
    IF v_certificate.atestado_comparecimento = true 
       AND v_certificate.horas_comparecimento IS NOT NULL 
       AND v_certificate.horas_comparecimento > 0 THEN
        
        -- Para cada dia do período (pode ser um ou mais dias)
        v_current_date := v_certificate.data_inicio;
        
        WHILE v_current_date <= v_certificate.data_fim LOOP
            -- Buscar registro de ponto deste dia (incluir pendentes também para ajustar quando forem aprovados)
            SELECT id, horas_negativas
            INTO v_time_record
            FROM rh.time_records
            WHERE employee_id = v_certificate.employee_id
              AND company_id = v_certificate.company_id
              AND data_registro = v_current_date
              AND status IN ('aprovado', 'pendente');
            
            -- Se encontrou registro com horas negativas, ajustar (mesmo se pendente)
            IF FOUND AND v_time_record.horas_negativas > 0 THEN
                -- Descontar horas de comparecimento das horas negativas
                -- Se for múltiplos dias, divide as horas proporcionalmente
                IF v_certificate.data_inicio = v_certificate.data_fim THEN
                    -- Um único dia: desconta todas as horas
                    v_horas_negativas_ajustadas := GREATEST(0, v_time_record.horas_negativas - v_certificate.horas_comparecimento);
                ELSE
                    -- Múltiplos dias: divide proporcionalmente (simplificado: desconta do primeiro dia encontrado)
                    -- Na prática, atestado de comparecimento geralmente é de um dia só
                    v_horas_negativas_ajustadas := GREATEST(0, v_time_record.horas_negativas - v_certificate.horas_comparecimento);
                END IF;
                
                -- Atualizar horas negativas do registro
                UPDATE rh.time_records
                SET 
                    horas_negativas = v_horas_negativas_ajustadas,
                    horas_extras = CASE 
                        WHEN v_horas_negativas_ajustadas > 0 THEN -v_horas_negativas_ajustadas
                        ELSE horas_extras
                    END,
                    updated_at = NOW()
                WHERE id = v_time_record.id;
                
                -- Recalcular horas extras por escala
                PERFORM rh.calculate_overtime_by_scale(v_time_record.id);
            END IF;
            
            -- Próximo dia
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
    
    -- CASO 2: Atestado normal (período de dias)
    ELSE
        -- Para cada dia do período de afastamento
        v_current_date := v_certificate.data_inicio;
        
        WHILE v_current_date <= v_certificate.data_fim LOOP
            -- Buscar registros de ponto deste dia com horas negativas
            FOR v_time_record IN
                SELECT id, horas_negativas
                FROM rh.time_records
                WHERE employee_id = v_certificate.employee_id
                  AND company_id = v_certificate.company_id
                  AND data_registro = v_current_date
                  AND status = 'aprovado'
                  AND horas_negativas > 0
            LOOP
                -- Zerar horas negativas (o funcionário estava de atestado neste dia)
                UPDATE rh.time_records
                SET 
                    horas_negativas = 0,
                    horas_extras = CASE 
                        WHEN horas_extras < 0 THEN 0  -- Se era negativo (horas negativas), zerar
                        ELSE horas_extras
                    END,
                    updated_at = NOW()
                WHERE id = v_time_record.id;
                
                -- Recalcular horas extras por escala
                PERFORM rh.calculate_overtime_by_scale(v_time_record.id);
            END LOOP;
            
            -- Próximo dia
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
    END IF;
END;
$$;

COMMENT ON FUNCTION rh.adjust_negative_hours_for_medical_certificate(UUID) IS 
'Ajusta as horas negativas dos registros de ponto quando um atestado médico é aprovado. 
Para atestados de comparecimento: desconta horas_comparecimento das horas_negativas do mesmo dia.
Para atestados normais: zera horas_negativas dos dias do período de afastamento.';

-- Atualizar função approve_medical_certificate para chamar a função de ajuste
CREATE OR REPLACE FUNCTION public.approve_medical_certificate(
    p_certificate_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_certificate RECORD;
    v_update_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Obter o user_id do usuário autenticado
    v_user_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
    END IF;
    
    -- Buscar o atestado primeiro para obter o company_id
    SELECT * INTO v_certificate
    FROM rh.medical_certificates
    WHERE id = p_certificate_id;
    
    -- Verificar se o atestado existe
    IF v_certificate IS NULL THEN
        RAISE EXCEPTION 'Atestado nao encontrado' USING ERRCODE = 'P0001';
    END IF;
    
    -- Verificar se já foi aprovado
    IF v_certificate.status = 'aprovado' THEN
        RAISE EXCEPTION 'Atestado ja foi aprovado anteriormente' USING ERRCODE = '23505';
    END IF;
    
    -- Verificar se já foi rejeitado
    IF v_certificate.status = 'rejeitado' THEN
        RAISE EXCEPTION 'Atestado ja foi rejeitado e nao pode ser aprovado' USING ERRCODE = '23505';
    END IF;
    
    -- Verificar acesso do usuário à empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = v_user_id
          AND uc.company_id = v_certificate.company_id
          AND uc.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuario nao tem acesso a esta empresa' USING ERRCODE = '42501';
    END IF;
    
    -- Atualizar o atestado usando o user_id diretamente
    UPDATE rh.medical_certificates mc
    SET 
        status = 'aprovado',
        aprovado_por = v_user_id,  -- Usar o user_id diretamente
        aprovado_em = NOW(),
        observacoes = CASE 
            WHEN p_observacoes IS NOT NULL AND p_observacoes != '' THEN 
                COALESCE(mc.observacoes || E'\n\nObservacoes da aprovacao: ' || p_observacoes, p_observacoes)
            ELSE 
                mc.observacoes
        END,
        updated_at = NOW()
    WHERE mc.id = p_certificate_id
      AND mc.status = 'pendente';
    
    GET DIAGNOSTICS v_update_count = ROW_COUNT;
    
    IF v_update_count = 0 THEN
        RAISE EXCEPTION 'Falha ao atualizar atestado. Pode ter sido modificado por outro processo.' USING ERRCODE = '23505';
    END IF;
    
    -- AJUSTAR HORAS NEGATIVAS após aprovar o atestado
    PERFORM rh.adjust_negative_hours_for_medical_certificate(p_certificate_id);
    
    RETURN true;
END;
$$;

-- Atualizar comentário da função
COMMENT ON FUNCTION public.approve_medical_certificate(UUID, UUID, TEXT) IS 
'Aprova um atestado medico. Usa o user_id diretamente da tabela users. 
Após aprovar, ajusta automaticamente as horas negativas:
- Atestado de comparecimento: desconta horas_comparecimento das horas_negativas do mesmo dia
- Atestado normal: zera horas_negativas dos dias do período de afastamento';

-- Garantir permissões
GRANT EXECUTE ON FUNCTION rh.adjust_negative_hours_for_medical_certificate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rh.adjust_negative_hours_for_medical_certificate(UUID) TO anon;
