-- =====================================================
-- CORREÇÃO v2: get_correction_status - alinhar com bloqueio mensal e prazo
-- =====================================================
-- Data: 2026-03-02
-- Objetivos:
-- 1) Reutilizar a função get_signature_month_status para ler o bloqueio mensal
--    (mesma lógica usada em /rh/assinatura-ponto-config), evitando divergências.
-- 2) Corrigir a lógica de prazo: não liberar meses FUTUROS ou ainda em curso.
--    A liberação automática só deve ocorrer APÓS o fim do mês, e dentro da
--    janela de dias configurada em rh.correction_settings.
-- 3) Manter a regra de que permissão explícita por funcionário (tabela
--    rh.employee_correction_permissions) continua sobrepondo o prazo e o
--    bloqueio mensal.

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
    v_dias_desde_fim INTEGER;
    v_has_permission_row BOOLEAN;
    v_company_id UUID;
    v_month_status JSONB;
    v_is_locked BOOLEAN;
BEGIN
    -- Formatar mês/ano no padrão YYYY-MM
    v_mes_ano := p_year || '-' || LPAD(p_month::TEXT, 2, '0');

    -- Buscar empresa do funcionário
    SELECT company_id
    INTO v_company_id
    FROM rh.employees
    WHERE id = p_employee_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Funcionário não encontrado para p_employee_id=%', p_employee_id;
    END IF;

    -- Buscar permissão específica do funcionário para o mês/ano
    SELECT *
    INTO v_permission_record
    FROM rh.employee_correction_permissions
    WHERE employee_id = p_employee_id
      AND mes_ano = v_mes_ano;

    v_has_permission_row := FOUND;

    -- 1) Permissão explícita LIBERADA: sobrepõe tudo (prazo + bloqueio mensal)
    IF v_has_permission_row AND v_permission_record.liberado = true THEN
        SELECT *
        INTO v_settings
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

    -- 2) Permissão explícita BLOQUEADA: sobrepõe tudo (prazo + bloqueio mensal)
    IF v_has_permission_row AND v_permission_record.liberado = false THEN
        SELECT *
        INTO v_settings
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

    -- 3) Sem permissão explícita: carregar configurações padrão
    SELECT *
    INTO v_settings
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

    -- 4) Consultar status mensal de assinatura via função oficial
    --    (mesma usada na tela /rh/assinatura-ponto-config)
    v_month_status := get_signature_month_status(v_company_id, v_mes_ano);
    v_is_locked := COALESCE((v_month_status ->> 'is_locked')::BOOLEAN, false);

    -- Se o mês está BLOQUEADO na assinatura, correções devem ser BLOQUEADAS
    IF v_is_locked THEN
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

    -- 5) Aplicar regra de prazo de liberação automática
    --    - Considera o ÚLTIMO dia do mês.
    --    - Só libera APÓS o fim do mês, e dentro de N dias.
    v_last_day_of_month :=
        (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01')::DATE
        + INTERVAL '1 month' - INTERVAL '1 day';

    -- Dias desde o fim do mês (>= 0 significa que o mês já acabou)
    v_dias_desde_fim := (CURRENT_DATE - v_last_day_of_month)::INTEGER;

    IF v_dias_desde_fim < 0 THEN
        -- Mês ainda em curso ou futuro: não liberar automaticamente
        v_result := jsonb_build_object(
            'liberado', false,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', 'Correções ainda não liberadas para este mês. O período de correção começa após o fechamento do mês.',
            'configuracoes', jsonb_build_object(
                'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
                'permitir_correcao_futura', v_settings.permitir_correcao_futura,
                'exigir_justificativa', v_settings.exigir_justificativa,
                'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
    ELSIF v_dias_desde_fim <= v_settings.dias_liberacao_correcao THEN
        -- Dentro da janela de correção após o fim do mês
        v_result := jsonb_build_object(
            'liberado', true,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', 'Liberação automática dentro do prazo (' || v_dias_desde_fim || ' dias após o fim do mês)',
            'configuracoes', jsonb_build_object(
                'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
                'permitir_correcao_futura', v_settings.permitir_correcao_futura,
                'exigir_justificativa', v_settings.exigir_justificativa,
                'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
                'dias_limite_correcao', v_settings.dias_limite_correcao
            )
        );
    ELSE
        -- Prazo expirado
        v_result := jsonb_build_object(
            'liberado', false,
            'liberado_por', null,
            'liberado_em', null,
            'observacoes', 'Prazo de correção expirado. O mês terminou há ' || v_dias_desde_fim || ' dias.',
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

COMMENT ON FUNCTION public.get_correction_status(UUID, INTEGER, INTEGER) IS
'Verifica se um funcionário pode fazer correções de ponto.
Regras:
- Permissão explícita em rh.employee_correction_permissions sobrepõe prazo e bloqueio mensal.
- Na ausência de permissão explícita, bloqueios mensais de assinatura (get_signature_month_status)
  também bloqueiam correções para o mês/ano correspondente.
- A liberação automática só ocorre após o fim do mês, dentro do prazo configurado em rh.correction_settings.';

