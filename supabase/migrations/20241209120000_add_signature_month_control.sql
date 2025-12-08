-- =====================================================
-- SISTEMA DE CONTROLE DE LIBERAÇÃO/BLOQUEIO DE ASSINATURAS POR MÊS/ANO
-- =====================================================

-- Tabela para controle de liberação/bloqueio de assinaturas por mês/ano
CREATE TABLE IF NOT EXISTS rh.signature_month_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    is_locked BOOLEAN NOT NULL DEFAULT false, -- true = bloqueado, false = liberado
    locked_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    unlocked_by UUID REFERENCES auth.users(id),
    unlocked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT, -- Observações sobre o bloqueio/liberação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, month_year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_signature_month_control_company ON rh.signature_month_control(company_id);
CREATE INDEX IF NOT EXISTS idx_signature_month_control_month_year ON rh.signature_month_control(month_year);
CREATE INDEX IF NOT EXISTS idx_signature_month_control_locked ON rh.signature_month_control(is_locked);
CREATE INDEX IF NOT EXISTS idx_signature_month_control_company_month ON rh.signature_month_control(company_id, month_year);

-- Comentários
COMMENT ON TABLE rh.signature_month_control IS 'Controle de liberação/bloqueio de assinaturas de ponto por mês/ano';
COMMENT ON COLUMN rh.signature_month_control.month_year IS 'Mês e ano no formato YYYY-MM';
COMMENT ON COLUMN rh.signature_month_control.is_locked IS 'true = bloqueado (não permite assinaturas), false = liberado (permite assinaturas)';

-- RLS Policies
ALTER TABLE rh.signature_month_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view month control for their company" 
    ON rh.signature_month_control FOR SELECT 
    USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage month control for their company" 
    ON rh.signature_month_control FOR ALL 
    USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_signature_month_control_updated_at
    BEFORE UPDATE ON rh.signature_month_control
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÕES RPC
-- =====================================================

-- Função 1: Liberar assinaturas para um mês/ano
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
    config_record rh.time_record_signature_config%ROWTYPE;
BEGIN
    -- Validar formato do mês/ano
    IF p_month_year !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Formato de mês/ano inválido. Use YYYY-MM';
    END IF;

    -- Verificar se configuração está habilitada
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

    -- Criar ou atualizar controle do mês
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

    -- Criar registros de assinatura se não existirem
    SELECT create_monthly_signature_records(p_company_id, p_month_year) INTO records_created;

    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'month_year', p_month_year,
        'is_locked', false,
        'records_created', records_created,
        'message', 'Assinaturas liberadas com sucesso'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função 2: Bloquear assinaturas para um mês/ano
CREATE OR REPLACE FUNCTION lock_signatures_for_month(
    p_company_id UUID,
    p_month_year VARCHAR(7),
    p_locked_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Validar formato do mês/ano
    IF p_month_year !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Formato de mês/ano inválido. Use YYYY-MM';
    END IF;

    -- Criar ou atualizar controle do mês
    INSERT INTO rh.signature_month_control (
        company_id, month_year, is_locked, locked_by, locked_at, notes
    )
    VALUES (
        p_company_id, p_month_year, true, p_locked_by, NOW(), p_notes
    )
    ON CONFLICT (company_id, month_year) 
    DO UPDATE SET 
        is_locked = true,
        locked_by = p_locked_by,
        locked_at = NOW(),
        notes = COALESCE(p_notes, rh.signature_month_control.notes),
        updated_at = NOW();

    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'month_year', p_month_year,
        'is_locked', true,
        'message', 'Assinaturas bloqueadas com sucesso'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função 3: Buscar estatísticas detalhadas por mês/ano
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

    -- Verificar se está bloqueado
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

-- Função 4: Listar funcionários que assinaram/não assinaram
CREATE OR REPLACE FUNCTION get_signature_employee_list(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR,
    employee_matricula VARCHAR,
    signature_id UUID,
    signature_status VARCHAR,
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    has_signed BOOLEAN
) AS $$
DECLARE
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

    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.nome as employee_name,
        COALESCE(e.matricula, '') as employee_matricula,
        trs.id as signature_id,
        COALESCE(trs.status, 'not_created') as signature_status,
        trs.signature_timestamp,
        CASE 
            WHEN trs.status IN ('signed', 'approved') THEN true
            ELSE false
        END as has_signed
    FROM rh.employees e
    INNER JOIN rh.time_records tr ON tr.employee_id = e.id
    LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id AND trs.month_year = p_month_year
    WHERE e.company_id = p_company_id
    AND e.status = 'ativo'
    AND tr.data_registro >= month_start
    AND tr.data_registro <= month_end
    GROUP BY e.id, e.nome, e.matricula, trs.id, trs.status, trs.signature_timestamp
    ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION unlock_signatures_for_month IS 'Libera assinaturas para um mês/ano específico e cria registros se necessário';
COMMENT ON FUNCTION lock_signatures_for_month IS 'Bloqueia assinaturas para um mês/ano específico';
COMMENT ON FUNCTION get_signature_month_stats IS 'Retorna estatísticas detalhadas de assinaturas para um mês/ano';
COMMENT ON FUNCTION get_signature_employee_list IS 'Lista funcionários que assinaram/não assinaram para um mês/ano específico';

