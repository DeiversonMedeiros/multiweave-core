-- =====================================================
-- CORREÇÃO: Adicionar filtro de company_id na verificação de assinaturas existentes
-- =====================================================

CREATE OR REPLACE FUNCTION create_monthly_signature_records(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS INTEGER AS $$
DECLARE
    config_record rh.time_record_signature_config%ROWTYPE;
    month_end_date DATE;
    signature_deadline TIMESTAMP WITH TIME ZONE;
    records_created INTEGER := 0;
    employee_record RECORD;
BEGIN
    -- Buscar configuração da empresa
    SELECT * INTO config_record
    FROM rh.time_record_signature_config
    WHERE company_id = p_company_id;
    
    -- Se não há configuração ou está desabilitada, retorna 0
    IF NOT FOUND OR NOT config_record.is_enabled THEN
        RETURN 0;
    END IF;
    
    -- Calcular data de fim do mês
    month_end_date := (p_month_year || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- Calcular prazo para assinatura
    signature_deadline := month_end_date + INTERVAL '1 day' + (config_record.signature_period_days || ' days')::INTERVAL;
    
    -- Buscar funcionários ativos que tiveram registros de ponto no mês
    -- CORREÇÃO: Adicionar filtro de company_id na verificação de assinaturas existentes
    FOR employee_record IN
        SELECT DISTINCT e.id, e.nome
        FROM rh.employees e
        INNER JOIN rh.time_records tr ON tr.employee_id = e.id
        WHERE e.company_id = p_company_id
        AND e.status = 'ativo'
        AND tr.data_registro >= (p_month_year || '-01')::DATE
        AND tr.data_registro <= month_end_date
        AND e.id NOT IN (
            SELECT employee_id 
            FROM rh.time_record_signatures 
            WHERE company_id = p_company_id
            AND month_year = p_month_year
        )
    LOOP
        -- Criar registro de assinatura
        INSERT INTO rh.time_record_signatures (
            company_id,
            employee_id,
            month_year,
            status,
            manager_approval_required,
            expires_at
        ) VALUES (
            p_company_id,
            employee_record.id,
            p_month_year,
            'pending',
            config_record.require_manager_approval,
            signature_deadline
        );
        
        records_created := records_created + 1;
    END LOOP;
    
    RETURN records_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_monthly_signature_records IS 'Cria registros de assinatura para funcionários que tiveram registros de ponto no mês especificado. Corrigido para filtrar por company_id na verificação de assinaturas existentes.';

