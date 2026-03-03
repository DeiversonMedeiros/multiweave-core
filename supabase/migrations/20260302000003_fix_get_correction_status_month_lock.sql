-- =====================================================
-- CORREÇÃO: get_correction_status - respeitar bloqueio mensal de assinatura
-- =====================================================
-- Data: 2026-03-02
-- Descrição:
-- - Ajusta a função public.get_correction_status para também considerar o
--   controle mensal de assinatura de ponto (tabela rh.signature_month_control),
--   utilizado na tela "rh/assinatura-ponto-config".
-- - Regra de negócio:
--     * Permissão explícita em rh.employee_correction_permissions continua
--       sobrepondo o prazo automático.
--     * Na ausência de permissão explícita, se o mês estiver BLOQUEADO em
--       rh.signature_month_control, a correção deve ficar BLOQUEADA, mesmo que
--       ainda esteja dentro do prazo automático.
--
-- Isso garante que, ao bloquear o mês de assinatura de ponto no RH, o
-- colaborador não consiga mais fazer correções naquele mês no portal.

CREATE OR REPLACE FUNCTION public.get_correction_status(
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
    v_has_permission_row BOOLEAN;  -- FOUND após SELECT em permissões
    v_company_id UUID;
    v_is_locked BOOLEAN;
BEGIN
    -- Formatar mês/ano
    v_mes_ano := p_year || '-' || LPAD(p_month::TEXT, 2, '0');

    -- Buscar empresa do funcionário
    SELECT company_id
    INTO v_company_id
    FROM rh.employees
    WHERE id = p_employee_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Funcionário não encontrado para p_employee_id=%', p_employee_id;
    END IF;
    
    -- Buscar permissão específica do funcionário
    SELECT * INTO v_permission_record
    FROM rh.employee_correction_permissions
    WHERE employee_id = p_employee_id 
      AND mes_ano = v_mes_ano;
    
    -- Usar FOUND imediatamente (próximo SELECT sobrescreve FOUND)
    v_has_permission_row := FOUND;
    
    -- Se tem permissão explícita liberada, retorna liberado (sobrepõe prazo e bloqueio)
    IF v_has_permission_row AND v_permission_record.liberado = true THEN
        -- Buscar configurações para incluir no resultado
        SELECT * INTO v_settings
        FROM rh.correction_settings
        WHERE company_id = v_company_id
          AND is_active = true;
        
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
    IF v_has_permission_row AND v_permission_record.liberado = false THEN
        SELECT * INTO v_settings
        FROM rh.correction_settings
        WHERE company_id = v_company_id
          AND is_active = true;
        
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
    
    -- Sem permissão explícita: usar regra do prazo de liberação,
    -- mas primeiro verificar se o mês está BLOQUEADO no controle de assinatura.
    SELECT * INTO v_settings
    FROM rh.correction_settings
    WHERE company_id = v_company_id
      AND is_active = true;
    
    IF v_settings IS NULL THEN
        v_settings.dias_liberacao_correcao := 7;
        v_settings.permitir_correcao_futura := false;
        v_settings.exigir_justificativa := true;
        v_settings.permitir_correcao_apos_aprovacao := false;
        v_settings.dias_limite_correcao := 30;
    END IF;

    -- Verificar controle mensal de assinatura de ponto
    SELECT smc.is_locked
    INTO v_is_locked
    FROM rh.signature_month_control smc
    WHERE smc.company_id = v_company_id
      AND smc.month_year = v_mes_ano;

    -- Se o mês está bloqueado no RH, correções devem ser bloqueadas
    IF COALESCE(v_is_locked, false) THEN
        v_result := jsonb_build_object(
            'liberado', false,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', 'Correções bloqueadas para este mês, pois o período de assinatura de ponto está bloqueado pelo RH.',
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
    
    -- Aplicar regra de prazo de liberação (mês ainda não bloqueado no controle de assinatura)
    v_last_day_of_month := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
    v_dias_restantes := (CURRENT_DATE - v_last_day_of_month)::INTEGER;
    
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
                'permitir_correcao_apos_aprovacao', v_settings.exigir_justificativa,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_correction_status(UUID, INTEGER, INTEGER) IS
'Verifica se um funcionário pode fazer correções de ponto. 
Permissão explícita (modal Gerenciar Permissões) sobrepõe o prazo de liberação.
Na ausência de permissão explícita, bloqueios mensais de assinatura (rh.signature_month_control)
também bloqueiam correções para o mês/ano correspondente.';

