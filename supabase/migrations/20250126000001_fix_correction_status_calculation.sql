-- =====================================================
-- CORREÇÃO: FUNÇÃO get_correction_status
-- =====================================================
-- Data: 2025-01-26
-- Descrição: Corrige o cálculo de liberação de correção
-- Problema: A função estava comparando com o dia 1 do mês em vez do último dia
-- Solução: Corrigir para comparar com o último dia do mês + dias de liberação

CREATE OR REPLACE FUNCTION get_correction_status(
    p_employee_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_mes_ano VARCHAR(7);
    v_permission_record RECORD;
    v_settings RECORD;
    v_result JSONB;
    v_last_day_of_month DATE;
    v_dias_restantes INTEGER;
BEGIN
    -- Formatar mês/ano
    v_mes_ano := p_year || '-' || LPAD(p_month::TEXT, 2, '0');
    
    -- Buscar permissão específica do funcionário
    SELECT * INTO v_permission_record
    FROM rh.employee_correction_permissions
    WHERE employee_id = p_employee_id 
    AND mes_ano = v_mes_ano;
    
    -- Se tem permissão explícita liberada, retorna liberado
    IF v_permission_record IS NOT NULL AND v_permission_record.liberado = true THEN
        -- Buscar configurações para incluir no resultado
        SELECT * INTO v_settings
        FROM rh.correction_settings
        WHERE company_id = (SELECT company_id FROM rh.employees WHERE id = p_employee_id)
        AND is_active = true;
        
        -- Se não há configuração, usar padrões
        IF v_settings IS NULL THEN
            v_settings.dias_liberacao_correcao := 7;
            v_settings.permitir_correcao_futura := false;
            v_settings.exigir_justificativa := true;
            v_settings.permitir_correcao_apos_aprovacao := false;
            v_settings.dias_limite_correcao := 30;
        END IF;
        
        v_result := jsonb_build_object(
            'liberado', true,
            'liberado_por', v_permission_record.liberado_por,
            'liberado_em', v_permission_record.liberado_em,
            'observacoes', v_permission_record.observacoes,
            'configuracoes', jsonb_build_object(
                'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
                'permitir_correcao_futura', v_settings.permitir_correcao_futura,
                'exigir_justificativa', v_settings.exigir_justificativa,
                'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
        
        RETURN v_result;
    END IF;
    
    -- Se tem permissão explícita bloqueada, retorna bloqueado
    IF v_permission_record IS NOT NULL AND v_permission_record.liberado = false THEN
        -- Buscar configurações para incluir no resultado
        SELECT * INTO v_settings
        FROM rh.correction_settings
        WHERE company_id = (SELECT company_id FROM rh.employees WHERE id = p_employee_id)
        AND is_active = true;
        
        -- Se não há configuração, usar padrões
        IF v_settings IS NULL THEN
            v_settings.dias_liberacao_correcao := 7;
            v_settings.permitir_correcao_futura := false;
            v_settings.exigir_justificativa := true;
            v_settings.permitir_correcao_apos_aprovacao := false;
            v_settings.dias_limite_correcao := 30;
        END IF;
        
        v_result := jsonb_build_object(
            'liberado', false,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', COALESCE(v_permission_record.observacoes, 'Correção não liberada para este período'),
            'configuracoes', jsonb_build_object(
                'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
                'permitir_correcao_futura', v_settings.permitir_correcao_futura,
                'exigir_justificativa', v_settings.exigir_justificativa,
                'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
        
        RETURN v_result;
    END IF;
    
    -- Buscar configurações da empresa
    SELECT * INTO v_settings
    FROM rh.correction_settings
    WHERE company_id = (SELECT company_id FROM rh.employees WHERE id = p_employee_id)
    AND is_active = true;
    
    -- Se não há configuração, usar padrões
    IF v_settings IS NULL THEN
        v_settings.dias_liberacao_correcao := 7;
        v_settings.permitir_correcao_futura := false;
        v_settings.exigir_justificativa := true;
        v_settings.permitir_correcao_apos_aprovacao := false;
        v_settings.dias_limite_correcao := 30;
    END IF;
    
    -- Calcular o último dia do mês
    v_last_day_of_month := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- Calcular quantos dias restam para fazer correção
    -- (data atual - último dia do mês) - retorna o número de dias
    v_dias_restantes := (CURRENT_DATE - v_last_day_of_month)::INTEGER;
    
    -- Se está dentro do prazo de liberação automática, liberar
    IF v_dias_restantes <= v_settings.dias_liberacao_correcao THEN
        v_result := jsonb_build_object(
            'liberado', true,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', 'Liberação automática dentro do prazo (' || v_dias_restantes || ' dias restantes)',
            'configuracoes', jsonb_build_object(
                'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
                'permitir_correcao_futura', v_settings.permitir_correcao_futura,
                'exigir_justificativa', v_settings.exigir_justificativa,
                'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
    ELSE
        v_result := jsonb_build_object(
            'liberado', false,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', 'Prazo de correção expirado. Este mês expirou há ' || v_dias_restantes || ' dias.',
            'configuracoes', jsonb_build_object(
                'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
                'permitir_correcao_futura', v_settings.permitir_correcao_futura,
                'exigir_justificativa', v_settings.exigir_justificativa,
                'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_correction_status(UUID, INTEGER, INTEGER) IS 'Verifica se um funcionário pode fazer correções de ponto em um determinado mês/ano - CORRIGIDO: compara com último dia do mês';

