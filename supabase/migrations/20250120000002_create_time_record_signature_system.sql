-- =====================================================
-- SISTEMA DE ASSINATURA DE REGISTROS DE PONTO
-- =====================================================

-- Tabela para configurações de assinatura de ponto
CREATE TABLE IF NOT EXISTS rh.time_record_signature_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    signature_period_days INTEGER NOT NULL DEFAULT 5, -- Dias para assinar após fechamento do mês
    reminder_days INTEGER NOT NULL DEFAULT 3, -- Dias antes do vencimento para enviar lembrete
    require_manager_approval BOOLEAN NOT NULL DEFAULT true,
    auto_close_month BOOLEAN NOT NULL DEFAULT true, -- Fechar mês automaticamente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Tabela para assinaturas de ponto mensais
CREATE TABLE IF NOT EXISTS rh.time_record_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    signature_data JSONB, -- Dados da assinatura digital
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'rejected', 'approved')),
    manager_approval_required BOOLEAN NOT NULL DEFAULT true,
    manager_approved_by UUID ,
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- Data de expiração da assinatura
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month_year)
);

-- Tabela para histórico de notificações de assinatura
CREATE TABLE IF NOT EXISTS rh.signature_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    signature_id UUID NOT NULL REFERENCES rh.time_record_signatures(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('initial', 'reminder', 'expiration_warning', 'expired')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_via VARCHAR(20) NOT NULL CHECK (sent_via IN ('email', 'sms', 'system')),
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_record_signature_config_company ON rh.time_record_signature_config(company_id);
CREATE INDEX IF NOT EXISTS idx_time_record_signatures_company ON rh.time_record_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_time_record_signatures_employee ON rh.time_record_signatures(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_record_signatures_month_year ON rh.time_record_signatures(month_year);
CREATE INDEX IF NOT EXISTS idx_time_record_signatures_status ON rh.time_record_signatures(status);
CREATE INDEX IF NOT EXISTS idx_time_record_signatures_expires_at ON rh.time_record_signatures(expires_at);
CREATE INDEX IF NOT EXISTS idx_signature_notifications_employee ON rh.signature_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_signature_notifications_signature ON rh.signature_notifications(signature_id);

-- Comentários das tabelas
COMMENT ON TABLE rh.time_record_signature_config IS 'Configurações de assinatura de registros de ponto por empresa';
COMMENT ON TABLE rh.time_record_signatures IS 'Assinaturas de registros de ponto mensais dos funcionários';
COMMENT ON TABLE rh.signature_notifications IS 'Histórico de notificações enviadas para assinatura de ponto';

-- Comentários das colunas
COMMENT ON COLUMN rh.time_record_signature_config.signature_period_days IS 'Número de dias para assinar após fechamento do mês';
COMMENT ON COLUMN rh.time_record_signature_config.reminder_days IS 'Dias antes do vencimento para enviar lembrete';
COMMENT ON COLUMN rh.time_record_signature_config.require_manager_approval IS 'Se requer aprovação do gestor após assinatura';
COMMENT ON COLUMN rh.time_record_signature_config.auto_close_month IS 'Se fecha o mês automaticamente no último dia';

COMMENT ON COLUMN rh.time_record_signatures.month_year IS 'Mês e ano no formato YYYY-MM';
COMMENT ON COLUMN rh.time_record_signatures.signature_data IS 'Dados da assinatura digital (coordenadas, timestamp, etc.)';
COMMENT ON COLUMN rh.time_record_signatures.status IS 'Status: pending, signed, expired, rejected, approved';
COMMENT ON COLUMN rh.time_record_signatures.expires_at IS 'Data e hora de expiração da assinatura';

-- RLS Policies
ALTER TABLE rh.time_record_signature_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.time_record_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.signature_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para time_record_signature_config
CREATE POLICY "Users can view signature config for their company" ON rh.time_record_signature_config
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update signature config for their company" ON rh.time_record_signature_config
    FOR UPDATE USING (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert signature config for their company" ON rh.time_record_signature_config
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

-- Políticas para time_record_signatures
CREATE POLICY "Users can view signatures for their company" ON rh.time_record_signatures
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert signatures for their company" ON rh.time_record_signatures
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update signatures for their company" ON rh.time_record_signatures
    FOR UPDATE USING (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

-- Políticas para signature_notifications
CREATE POLICY "Users can view notifications for their company" ON rh.signature_notifications
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert notifications for their company" ON rh.signature_notifications
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    ));

-- Função para criar configuração padrão para empresas existentes
CREATE OR REPLACE FUNCTION create_default_signature_config()
RETURNS void AS $$
BEGIN
    INSERT INTO rh.time_record_signature_config (company_id, is_enabled, signature_period_days, reminder_days, require_manager_approval, auto_close_month)
    SELECT 
        id as company_id,
        false as is_enabled,
        5 as signature_period_days,
        3 as reminder_days,
        true as require_manager_approval,
        true as auto_close_month
    FROM companies
    WHERE id NOT IN (SELECT company_id FROM rh.time_record_signature_config)
    ON CONFLICT (company_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Executar função para criar configurações padrão
SELECT create_default_signature_config();

-- Função para verificar se um mês está aberto para assinatura
CREATE OR REPLACE FUNCTION is_month_open_for_signature(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS BOOLEAN AS $$
DECLARE
    config_record rh.time_record_signature_config%ROWTYPE;
    month_end_date DATE;
    signature_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar configuração da empresa
    SELECT * INTO config_record
    FROM rh.time_record_signature_config
    WHERE company_id = p_company_id;
    
    -- Se não há configuração ou está desabilitada, retorna false
    IF NOT FOUND OR NOT config_record.is_enabled THEN
        RETURN false;
    END IF;
    
    -- Calcular data de fim do mês
    month_end_date := (p_month_year || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- Calcular prazo para assinatura
    signature_deadline := month_end_date + INTERVAL '1 day' + (config_record.signature_period_days || ' days')::INTERVAL;
    
    -- Verificar se ainda está dentro do prazo
    RETURN NOW() <= signature_deadline;
END;
$$ LANGUAGE plpgsql;

-- Função para criar registros de assinatura para um mês
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
            WHERE month_year = p_month_year
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
$$ LANGUAGE plpgsql;

-- Função para marcar assinatura como expirada
CREATE OR REPLACE FUNCTION expire_signatures()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    UPDATE rh.time_record_signatures
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_record_signature_config_updated_at
    BEFORE UPDATE ON rh.time_record_signature_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_record_signatures_updated_at
    BEFORE UPDATE ON rh.time_record_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar configuração de assinatura de ponto
CREATE OR REPLACE FUNCTION update_time_record_signature_config(
    p_id UUID,
    p_company_id UUID,
    p_is_enabled BOOLEAN,
    p_signature_period_days INTEGER,
    p_reminder_days INTEGER,
    p_require_manager_approval BOOLEAN,
    p_auto_close_month BOOLEAN
)
RETURNS rh.time_record_signature_config AS $$
DECLARE
    result rh.time_record_signature_config;
BEGIN
    UPDATE rh.time_record_signature_config
    SET 
        is_enabled = p_is_enabled,
        signature_period_days = p_signature_period_days,
        reminder_days = p_reminder_days,
        require_manager_approval = p_require_manager_approval,
        auto_close_month = p_auto_close_month,
        updated_at = NOW()
    WHERE id = p_id AND company_id = p_company_id
    RETURNING * INTO result;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuração não encontrada ou sem permissão';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
