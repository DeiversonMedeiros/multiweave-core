-- =====================================================
-- CORREÇÃO: Ao liberar assinatura para um mês já passado,
-- expires_at não pode ficar no passado (fim do mês + N dias).
-- Usar "agora + N dias" quando o prazo calculado já expirou.
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
    minimum_deadline TIMESTAMP WITH TIME ZONE;
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
    
    -- Prazo "normal": fim do mês + 1 dia + N dias
    signature_deadline := month_end_date + INTERVAL '1 day' + (config_record.signature_period_days || ' days')::INTERVAL;
    
    -- Se o prazo já passou (ex.: RH liberou janeiro em fevereiro), dar N dias a partir de agora
    minimum_deadline := NOW() + (config_record.signature_period_days || ' days')::INTERVAL;
    IF signature_deadline < minimum_deadline THEN
        signature_deadline := minimum_deadline;
    END IF;
    
    -- Buscar funcionários ativos que tiveram registros de ponto no mês
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

COMMENT ON FUNCTION create_monthly_signature_records IS 'Cria registros de assinatura. Se o prazo (fim do mês + N dias) já passou, usa agora + N dias para permitir assinatura ao liberar mês em atraso.';

-- Estender prazo de assinaturas pendentes que já expiraram mas o mês está liberado (is_locked = false)
UPDATE rh.time_record_signatures trs
SET expires_at = NOW() + (c.signature_period_days || ' days')::INTERVAL,
    updated_at = NOW()
FROM rh.time_record_signature_config c,
     rh.signature_month_control smc
WHERE trs.company_id = c.company_id
  AND trs.company_id = smc.company_id
  AND trs.month_year = smc.month_year
  AND smc.is_locked = false
  AND trs.status = 'pending'
  AND trs.expires_at < NOW();
