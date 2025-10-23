-- =====================================================
-- SISTEMA DE AUDITORIA COMPLETA
-- =====================================================

-- Tabela principal de auditoria
CREATE TABLE IF NOT EXISTS rh.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para configurações de auditoria
CREATE TABLE IF NOT EXISTS rh.audit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    log_level VARCHAR(20) DEFAULT 'all' CHECK (log_level IN ('all', 'changes', 'critical')),
    retention_days INTEGER DEFAULT 2555, -- 7 anos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, entity_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON rh.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON rh.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON rh.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON rh.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON rh.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_entity ON rh.audit_logs(company_id, entity_type);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_audit_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_audit_config_updated_at
    BEFORE UPDATE ON rh.audit_config
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_config_updated_at();

-- Habilitar RLS
ALTER TABLE rh.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.audit_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_logs
CREATE POLICY "Users can view audit logs of their company" ON rh.audit_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "System can insert audit logs" ON rh.audit_logs
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para audit_config
CREATE POLICY "Admins can manage audit config" ON rh.audit_config
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND permissoes->>'admin' = 'true'
            )
        )
    );

-- Função para registrar auditoria
CREATE OR REPLACE FUNCTION audit_log(
    p_company_id UUID,
    p_user_id UUID,
    p_action VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_config RECORD;
    v_should_log BOOLEAN := false;
BEGIN
    -- Verificar se auditoria está habilitada para esta entidade
    SELECT * INTO v_config
    FROM rh.audit_config
    WHERE company_id = p_company_id
    AND entity_type = p_entity_type
    AND is_enabled = true;
    
    -- Se não há configuração específica, usar configuração padrão
    IF NOT FOUND THEN
        v_should_log := true; -- Log por padrão
    ELSE
        -- Verificar nível de log
        CASE v_config.log_level
            WHEN 'all' THEN
                v_should_log := true;
            WHEN 'changes' THEN
                v_should_log := (p_old_values IS NOT NULL OR p_new_values IS NOT NULL);
            WHEN 'critical' THEN
                v_should_log := p_action IN ('create', 'delete', 'approve', 'reject');
            ELSE
                v_should_log := true;
        END CASE;
    END IF;
    
    -- Registrar log se necessário
    IF v_should_log THEN
        INSERT INTO rh.audit_logs (
            company_id,
            user_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            ip_address,
            user_agent,
            session_id
        ) VALUES (
            p_company_id,
            p_user_id,
            p_action,
            p_entity_type,
            p_entity_id,
            p_old_values,
            p_new_values,
            p_ip_address,
            p_user_agent,
            p_session_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS VOID AS $$
DECLARE
    v_config RECORD;
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Para cada configuração de auditoria
    FOR v_config IN
        SELECT DISTINCT company_id, entity_type, retention_days
        FROM rh.audit_config
        WHERE is_enabled = true
    LOOP
        -- Calcular data de corte
        v_cutoff_date := NOW() - INTERVAL '1 day' * v_config.retention_days;
        
        -- Remover logs antigos
        DELETE FROM rh.audit_logs
        WHERE company_id = v_config.company_id
        AND entity_type = v_config.entity_type
        AND created_at < v_cutoff_date;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auditoria automática

-- Trigger para compensation_requests
CREATE OR REPLACE FUNCTION audit_compensation_requests()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'create',
            'compensation_requests',
            NEW.id,
            NULL,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'update',
            'compensation_requests',
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM audit_log(
            OLD.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'delete',
            'compensation_requests',
            OLD.id,
            row_to_json(OLD),
            NULL,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_compensation_requests
    AFTER INSERT OR UPDATE OR DELETE ON rh.compensation_requests
    FOR EACH ROW
    EXECUTE FUNCTION audit_compensation_requests();

-- Trigger para compensation_approvals
CREATE OR REPLACE FUNCTION audit_compensation_approvals()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Buscar company_id da solicitação relacionada
    SELECT company_id INTO v_company_id
    FROM rh.compensation_requests
    WHERE id = COALESCE(NEW.compensation_request_id, OLD.compensation_request_id);
    
    IF TG_OP = 'INSERT' THEN
        PERFORM audit_log(
            v_company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'approve',
            'compensation_approvals',
            NEW.id,
            NULL,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit_log(
            v_company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            CASE 
                WHEN OLD.status = 'pending' AND NEW.status = 'approved' THEN 'approve'
                WHEN OLD.status = 'pending' AND NEW.status = 'rejected' THEN 'reject'
                ELSE 'update'
            END,
            'compensation_approvals',
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_compensation_approvals
    AFTER INSERT OR UPDATE ON rh.compensation_approvals
    FOR EACH ROW
    EXECUTE FUNCTION audit_compensation_approvals();

-- Trigger para approval_levels
CREATE OR REPLACE FUNCTION audit_approval_levels()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'create',
            'approval_levels',
            NEW.id,
            NULL,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'update',
            'approval_levels',
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM audit_log(
            OLD.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'delete',
            'approval_levels',
            OLD.id,
            row_to_json(OLD),
            NULL,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_approval_levels
    AFTER INSERT OR UPDATE OR DELETE ON rh.approval_levels
    FOR EACH ROW
    EXECUTE FUNCTION audit_approval_levels();

-- Função para buscar logs de auditoria com filtros
CREATE OR REPLACE FUNCTION get_audit_logs(
    p_company_id UUID,
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_action VARCHAR(50) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    company_id UUID,
    user_id UUID,
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    user_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.company_id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.session_id,
        al.created_at,
        p.nome::TEXT
    FROM rh.audit_logs al
    LEFT JOIN profiles p ON p.id = al.user_id
    WHERE al.company_id = p_company_id
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_entity_id IS NULL OR al.entity_id = p_entity_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Inserir configurações padrão de auditoria
INSERT INTO rh.audit_config (company_id, entity_type, is_enabled, log_level, retention_days)
SELECT 
    c.id,
    'compensation_requests',
    true,
    'all',
    2555
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM rh.audit_config 
    WHERE company_id = c.id AND entity_type = 'compensation_requests'
);

INSERT INTO rh.audit_config (company_id, entity_type, is_enabled, log_level, retention_days)
SELECT 
    c.id,
    'compensation_approvals',
    true,
    'all',
    2555
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM rh.audit_config 
    WHERE company_id = c.id AND entity_type = 'compensation_approvals'
);

INSERT INTO rh.audit_config (company_id, entity_type, is_enabled, log_level, retention_days)
SELECT 
    c.id,
    'approval_levels',
    true,
    'changes',
    2555
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM rh.audit_config 
    WHERE company_id = c.id AND entity_type = 'approval_levels'
);

-- Comentários
COMMENT ON TABLE rh.audit_logs IS 'Log de auditoria para todas as ações do sistema';
COMMENT ON TABLE rh.audit_config IS 'Configurações de auditoria por empresa e entidade';
COMMENT ON FUNCTION audit_log IS 'Função para registrar logs de auditoria';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Função para limpeza automática de logs antigos';
COMMENT ON FUNCTION get_audit_logs IS 'Função para buscar logs de auditoria com filtros';
