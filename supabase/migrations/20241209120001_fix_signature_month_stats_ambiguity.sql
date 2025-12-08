-- =====================================================
-- CORREÇÃO: Ambiguidade na função get_signature_month_stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_signature_month_stats(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_employees INTEGER;
    total_signatures INTEGER;
    signed_count INTEGER;
    pending_count INTEGER;
    expired_count INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
    is_locked BOOLEAN;
    month_start DATE;
    month_end DATE;
BEGIN
    -- Validar formato do mês/ano
    IF p_month_year !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Formato de mês/ano inválido. Use YYYY-MM';
    END IF;

    -- Calcular início e fim do mês
    month_start := (p_month_year || '-01')::DATE;
    month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Buscar total de funcionários ativos no mês
    SELECT COUNT(DISTINCT e.id) INTO total_employees
    FROM rh.employees e
    INNER JOIN rh.time_records tr ON tr.employee_id = e.id
    WHERE e.company_id = p_company_id
    AND e.status = 'ativo'
    AND tr.data_registro >= month_start
    AND tr.data_registro <= month_end;

    -- Buscar estatísticas de assinaturas
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
    INTO 
        total_signatures,
        signed_count,
        pending_count,
        expired_count,
        approved_count,
        rejected_count
    FROM rh.time_record_signatures
    WHERE company_id = p_company_id
    AND month_year = p_month_year;

    -- Verificar se está bloqueado (corrigido: usando alias da tabela)
    SELECT COALESCE(smc.is_locked, false) INTO is_locked
    FROM rh.signature_month_control smc
    WHERE smc.company_id = p_company_id
    AND smc.month_year = p_month_year;

    -- Construir resultado
    SELECT json_build_object(
        'month_year', p_month_year,
        'is_locked', COALESCE(is_locked, false),
        'total_employees', COALESCE(total_employees, 0),
        'total_signatures', COALESCE(total_signatures, 0),
        'signed_count', COALESCE(signed_count, 0),
        'pending_count', COALESCE(pending_count, 0),
        'expired_count', COALESCE(expired_count, 0),
        'approved_count', COALESCE(approved_count, 0),
        'rejected_count', COALESCE(rejected_count, 0),
        'not_signed_count', GREATEST(0, COALESCE(total_employees, 0) - COALESCE(signed_count, 0) - COALESCE(approved_count, 0))
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

