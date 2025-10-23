-- =====================================================
-- SISTEMA DE APROVAÇÃO HIERÁRQUICA
-- =====================================================

-- Tabela para definir níveis de aprovação
CREATE TABLE IF NOT EXISTS rh.approval_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    level_order INTEGER NOT NULL,
    required_approvals INTEGER DEFAULT 1,
    max_amount DECIMAL(10,2),
    max_hours DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para definir aprovadores por nível
CREATE TABLE IF NOT EXISTS rh.approval_level_approvers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_level_id UUID NOT NULL REFERENCES rh.approval_levels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para histórico de aprovações
CREATE TABLE IF NOT EXISTS rh.compensation_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compensation_request_id UUID NOT NULL REFERENCES rh.compensation_requests(id) ON DELETE CASCADE,
    approval_level_id UUID NOT NULL REFERENCES rh.approval_levels(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_approval_levels_company_id ON rh.approval_levels(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_levels_order ON rh.approval_levels(company_id, level_order);
CREATE INDEX IF NOT EXISTS idx_approval_level_approvers_level_id ON rh.approval_level_approvers(approval_level_id);
CREATE INDEX IF NOT EXISTS idx_approval_level_approvers_user_id ON rh.approval_level_approvers(user_id);
CREATE INDEX IF NOT EXISTS idx_compensation_approvals_request_id ON rh.compensation_approvals(compensation_request_id);
CREATE INDEX IF NOT EXISTS idx_compensation_approvals_approver_id ON rh.compensation_approvals(approver_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_approval_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_approval_levels_updated_at
    BEFORE UPDATE ON rh.approval_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_levels_updated_at();

CREATE OR REPLACE FUNCTION update_compensation_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compensation_approvals_updated_at
    BEFORE UPDATE ON rh.compensation_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_compensation_approvals_updated_at();

-- Habilitar RLS
ALTER TABLE rh.approval_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.approval_level_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.compensation_approvals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para approval_levels
CREATE POLICY "Users can view approval levels of their company" ON rh.approval_levels
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Admins can manage approval levels" ON rh.approval_levels
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

-- Políticas RLS para approval_level_approvers
CREATE POLICY "Users can view approvers of their company" ON rh.approval_level_approvers
    FOR SELECT USING (
        approval_level_id IN (
            SELECT id FROM rh.approval_levels 
            WHERE company_id IN (
                SELECT company_id FROM user_companies 
                WHERE user_id = auth.uid() AND ativo = true
            )
        )
    );

CREATE POLICY "Admins can manage approvers" ON rh.approval_level_approvers
    FOR ALL USING (
        approval_level_id IN (
            SELECT id FROM rh.approval_levels 
            WHERE company_id IN (
                SELECT company_id FROM user_companies 
                WHERE user_id = auth.uid() AND ativo = true
                AND EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND permissoes->>'admin' = 'true'
                )
            )
        )
    );

-- Políticas RLS para compensation_approvals
CREATE POLICY "Users can view approvals of their company" ON rh.compensation_approvals
    FOR SELECT USING (
        compensation_request_id IN (
            SELECT id FROM rh.compensation_requests 
            WHERE company_id IN (
                SELECT company_id FROM user_companies 
                WHERE user_id = auth.uid() AND ativo = true
            )
        )
    );

CREATE POLICY "Approvers can manage their approvals" ON rh.compensation_approvals
    FOR ALL USING (
        approver_id = auth.uid() OR
        compensation_request_id IN (
            SELECT id FROM rh.compensation_requests 
            WHERE company_id IN (
                SELECT company_id FROM user_companies 
                WHERE user_id = auth.uid() AND ativo = true
                AND EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND (permissoes->>'admin' = 'true' OR permissoes->>'manager' = 'true')
                )
            )
        )
    );

-- Função para determinar o nível de aprovação necessário
CREATE OR REPLACE FUNCTION get_required_approval_level(
    p_company_id UUID,
    p_hours DECIMAL(5,2),
    p_amount DECIMAL(10,2) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_level_id UUID;
BEGIN
    SELECT id INTO v_level_id
    FROM rh.approval_levels
    WHERE company_id = p_company_id
    AND is_active = true
    AND (
        (max_hours IS NULL OR p_hours <= max_hours) AND
        (max_amount IS NULL OR p_amount IS NULL OR p_amount <= max_amount)
    )
    ORDER BY level_order ASC
    LIMIT 1;
    
    RETURN v_level_id;
END;
$$ LANGUAGE plpgsql;

-- Função para criar aprovações necessárias
CREATE OR REPLACE FUNCTION create_compensation_approvals(
    p_compensation_request_id UUID,
    p_company_id UUID
) RETURNS VOID AS $$
DECLARE
    v_request RECORD;
    v_level_id UUID;
    v_approver RECORD;
BEGIN
    -- Buscar dados da solicitação
    SELECT * INTO v_request
    FROM rh.compensation_requests
    WHERE id = p_compensation_request_id;
    
    -- Determinar nível de aprovação necessário
    v_level_id := get_required_approval_level(
        p_company_id,
        v_request.quantidade_horas,
        v_request.valor_total
    );
    
    -- Criar aprovações para cada aprovador do nível
    FOR v_approver IN
        SELECT ala.user_id, ala.is_primary
        FROM rh.approval_level_approvers ala
        WHERE ala.approval_level_id = v_level_id
        AND ala.is_active = true
    LOOP
        INSERT INTO rh.compensation_approvals (
            compensation_request_id,
            approval_level_id,
            approver_id,
            status
        ) VALUES (
            p_compensation_request_id,
            v_level_id,
            v_approver.user_id,
            'pending'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se todas as aprovações foram concluídas
CREATE OR REPLACE FUNCTION check_compensation_approval_status(
    p_compensation_request_id UUID
) RETURNS VARCHAR(20) AS $$
DECLARE
    v_total_approvals INTEGER;
    v_approved_count INTEGER;
    v_rejected_count INTEGER;
BEGIN
    -- Contar total de aprovações necessárias
    SELECT COUNT(*) INTO v_total_approvals
    FROM rh.compensation_approvals
    WHERE compensation_request_id = p_compensation_request_id;
    
    -- Contar aprovações aprovadas
    SELECT COUNT(*) INTO v_approved_count
    FROM rh.compensation_approvals
    WHERE compensation_request_id = p_compensation_request_id
    AND status = 'approved';
    
    -- Contar aprovações rejeitadas
    SELECT COUNT(*) INTO v_rejected_count
    FROM rh.compensation_approvals
    WHERE compensation_request_id = p_compensation_request_id
    AND status = 'rejected';
    
    -- Determinar status
    IF v_rejected_count > 0 THEN
        RETURN 'rejected';
    ELSIF v_approved_count = v_total_approvals THEN
        RETURN 'approved';
    ELSE
        RETURN 'pending';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar aprovações automaticamente
CREATE OR REPLACE FUNCTION trigger_create_compensation_approvals()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar aprovações apenas para novas solicitações
    IF TG_OP = 'INSERT' AND NEW.status = 'pendente' THEN
        PERFORM create_compensation_approvals(NEW.id, NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_compensation_approvals
    AFTER INSERT ON rh.compensation_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_compensation_approvals();

-- Comentários
COMMENT ON TABLE rh.approval_levels IS 'Níveis de aprovação hierárquica para compensações';
COMMENT ON TABLE rh.approval_level_approvers IS 'Aprovadores por nível de aprovação';
COMMENT ON TABLE rh.compensation_approvals IS 'Histórico de aprovações de compensações';
COMMENT ON FUNCTION get_required_approval_level IS 'Determina o nível de aprovação necessário baseado em horas e valor';
COMMENT ON FUNCTION create_compensation_approvals IS 'Cria as aprovações necessárias para uma solicitação';
COMMENT ON FUNCTION check_compensation_approval_status IS 'Verifica o status geral de aprovação de uma solicitação';
