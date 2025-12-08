-- =====================================================
-- FUNÇÃO RPC: Buscar status de liberação/bloqueio de um mês/ano
-- =====================================================

CREATE OR REPLACE FUNCTION get_signature_month_status(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    is_locked BOOLEAN;
    locked_by UUID;
    locked_at TIMESTAMP WITH TIME ZONE;
    unlocked_by UUID;
    unlocked_at TIMESTAMP WITH TIME ZONE;
    notes TEXT;
BEGIN
    -- Validar formato do mês/ano
    IF p_month_year !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Formato de mês/ano inválido. Use YYYY-MM';
    END IF;

    -- Buscar status do mês
    SELECT 
        smc.is_locked,
        smc.locked_by,
        smc.locked_at,
        smc.unlocked_by,
        smc.unlocked_at,
        smc.notes
    INTO 
        is_locked,
        locked_by,
        locked_at,
        unlocked_by,
        unlocked_at,
        notes
    FROM rh.signature_month_control smc
    WHERE smc.company_id = p_company_id
    AND smc.month_year = p_month_year;

    -- Construir resultado
    -- Se não encontrou registro, assume que está liberado (padrão)
    SELECT json_build_object(
        'month_year', p_month_year,
        'is_locked', COALESCE(is_locked, false),
        'has_control', (is_locked IS NOT NULL),
        'locked_by', locked_by,
        'locked_at', locked_at,
        'unlocked_by', unlocked_by,
        'unlocked_at', unlocked_at,
        'notes', notes
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_signature_month_status IS 'Retorna o status de liberação/bloqueio de um mês/ano específico';

