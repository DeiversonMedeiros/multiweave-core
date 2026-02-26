-- =====================================================
-- 1) CORREÇÃO IMEDIATA: Axiseng jan/2026
-- Colaboradores viam "Essa assinatura expirou" porque
-- expires_at estava em 2026-02-08 e já passou. Ao liberar
-- o mês tardiamente, registros já existentes não tinham
-- expires_at atualizado.
-- =====================================================

-- Garantir que o mês 2026-01 esteja liberado para axiseng (controle pode não ter sido criado)
INSERT INTO rh.signature_month_control (
    company_id, month_year, is_locked, unlocked_at, notes
)
SELECT
    c.id,
    '2026-01',
    false,
    NOW(),
    'Correção: liberação jan/2026 - expires_at estendido'
FROM companies c
WHERE c.nome_fantasia = 'AXISENG'
ON CONFLICT (company_id, month_year)
DO UPDATE SET
    is_locked = false,
    unlocked_at = COALESCE(rh.signature_month_control.unlocked_at, NOW()),
    updated_at = NOW();

-- Estender prazo de todas as assinaturas pendentes de jan/2026 da axiseng
UPDATE rh.time_record_signatures trs
SET
    expires_at = NOW() + (c.signature_period_days || ' days')::INTERVAL,
    updated_at = NOW()
FROM rh.time_record_signature_config c
WHERE trs.company_id = c.company_id
  AND trs.month_year = '2026-01'
  AND trs.status = 'pending'
  AND c.company_id = (SELECT id FROM companies WHERE nome_fantasia = 'AXISENG' LIMIT 1);

-- =====================================================
-- 2) FUNÇÃO: Ao liberar mês, estender expires_at dos
--    registros pendentes já expirados (evita repetir o problema)
-- =====================================================

CREATE OR REPLACE FUNCTION unlock_signatures_for_month(
    p_company_id UUID,
    p_month_year VARCHAR(7),
    p_unlocked_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    records_created INTEGER := 0;
    records_updated INTEGER := 0;
    config_record rh.time_record_signature_config%ROWTYPE;
BEGIN
    IF p_month_year !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Formato de mês/ano inválido. Use YYYY-MM';
    END IF;

    SELECT * INTO config_record
    FROM rh.time_record_signature_config
    WHERE company_id = p_company_id;

    IF NOT FOUND OR NOT config_record.is_enabled THEN
        SELECT json_build_object(
            'success', false,
            'error', 'Sistema de assinatura não está habilitado para esta empresa'
        ) INTO result;
        RETURN result;
    END IF;

    INSERT INTO rh.signature_month_control (
        company_id, month_year, is_locked, unlocked_by, unlocked_at, notes
    )
    VALUES (
        p_company_id, p_month_year, false, p_unlocked_by, NOW(), p_notes
    )
    ON CONFLICT (company_id, month_year)
    DO UPDATE SET
        is_locked = false,
        unlocked_by = p_unlocked_by,
        unlocked_at = NOW(),
        notes = COALESCE(p_notes, rh.signature_month_control.notes),
        updated_at = NOW();

    SELECT create_monthly_signature_records(p_company_id, p_month_year) INTO records_created;

    -- Estender prazo de assinaturas pendentes que já expiraram (mês liberado tardiamente)
    WITH updated AS (
        UPDATE rh.time_record_signatures trs
        SET
            expires_at = NOW() + (config_record.signature_period_days || ' days')::INTERVAL,
            updated_at = NOW()
        WHERE trs.company_id = p_company_id
          AND trs.month_year = p_month_year
          AND trs.status = 'pending'
          AND trs.expires_at < NOW()
        RETURNING trs.id
    )
    SELECT COUNT(*) INTO records_updated FROM updated;

    SELECT json_build_object(
        'success', true,
        'month_year', p_month_year,
        'is_locked', false,
        'records_created', records_created,
        'records_updated', records_updated,
        'message', 'Assinaturas liberadas com sucesso'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unlock_signatures_for_month IS 'Libera assinaturas para um mês/ano: cria controle, cria registros faltantes e estende expires_at dos pendentes já expirados.';
