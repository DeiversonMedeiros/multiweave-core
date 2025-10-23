-- =====================================================
-- Portal do Gestor - Tabelas de Aprovação
-- =====================================================

-- Tabela para solicitações de reembolso
CREATE TABLE IF NOT EXISTS rh.reimbursement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tipo_despesa VARCHAR(50) NOT NULL CHECK (tipo_despesa IN ('alimentacao', 'transporte', 'hospedagem', 'combustivel', 'outros')),
    valor_solicitado NUMERIC(10,2) NOT NULL,
    data_despesa DATE NOT NULL,
    descricao TEXT NOT NULL,
    comprovante_url TEXT,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    solicitado_por UUID REFERENCES profiles(id),
    aprovado_por UUID REFERENCES profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para aprovações de equipamentos
CREATE TABLE IF NOT EXISTS rh.equipment_rental_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tipo_equipamento VARCHAR(100) NOT NULL,
    valor_mensal NUMERIC(10,2) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    justificativa TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'ativo', 'finalizado')),
    aprovado_por UUID REFERENCES profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para correções de ponto
CREATE TABLE IF NOT EXISTS rh.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    data_original DATE NOT NULL,
    entrada_original TIME,
    saida_original TIME,
    entrada_corrigida TIME,
    saida_corrigida TIME,
    justificativa TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    solicitado_por UUID REFERENCES profiles(id),
    aprovado_por UUID REFERENCES profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para consolidação de eventos (aprovações em lote)
CREATE TABLE IF NOT EXISTS rh.event_consolidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN ('ferias', 'compensacao', 'atestado', 'reembolso', 'equipamento', 'correcao_ponto')),
    total_solicitacoes INTEGER DEFAULT 0,
    total_aprovadas INTEGER DEFAULT 0,
    total_rejeitadas INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
    processado_por UUID REFERENCES profiles(id),
    processado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para notificações do gestor
CREATE TABLE IF NOT EXISTS rh.gestor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    gestor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tipo_notificacao VARCHAR(50) NOT NULL CHECK (tipo_notificacao IN ('aprovacao_pendente', 'aprovacao_realizada', 'solicitacao_nova', 'alerta_vencimento')),
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    dados_extras JSONB,
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Índices para Performance
-- =====================================================

-- Índices para reimbursement_requests
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_company_id ON rh.reimbursement_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_employee_id ON rh.reimbursement_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_status ON rh.reimbursement_requests(status);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_data_despesa ON rh.reimbursement_requests(data_despesa);

-- Índices para equipment_rental_approvals
CREATE INDEX IF NOT EXISTS idx_equipment_rental_approvals_company_id ON rh.equipment_rental_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_approvals_employee_id ON rh.equipment_rental_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_approvals_status ON rh.equipment_rental_approvals(status);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_approvals_data_inicio ON rh.equipment_rental_approvals(data_inicio);

-- Índices para attendance_corrections
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_company_id ON rh.attendance_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_employee_id ON rh.attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON rh.attendance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_data_original ON rh.attendance_corrections(data_original);

-- Índices para event_consolidations
CREATE INDEX IF NOT EXISTS idx_event_consolidations_company_id ON rh.event_consolidations(company_id);
CREATE INDEX IF NOT EXISTS idx_event_consolidations_periodo ON rh.event_consolidations(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_event_consolidations_tipo_evento ON rh.event_consolidations(tipo_evento);

-- Índices para gestor_notifications
CREATE INDEX IF NOT EXISTS idx_gestor_notifications_company_id ON rh.gestor_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_gestor_notifications_gestor_id ON rh.gestor_notifications(gestor_id);
CREATE INDEX IF NOT EXISTS idx_gestor_notifications_lida ON rh.gestor_notifications(lida);
CREATE INDEX IF NOT EXISTS idx_gestor_notifications_tipo ON rh.gestor_notifications(tipo_notificacao);

-- =====================================================
-- Triggers para updated_at
-- =====================================================

-- Trigger para reimbursement_requests
CREATE OR REPLACE FUNCTION update_reimbursement_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reimbursement_requests_updated_at
    BEFORE UPDATE ON rh.reimbursement_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_reimbursement_requests_updated_at();

-- Trigger para equipment_rental_approvals
CREATE OR REPLACE FUNCTION update_equipment_rental_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipment_rental_approvals_updated_at
    BEFORE UPDATE ON rh.equipment_rental_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_equipment_rental_approvals_updated_at();

-- Trigger para attendance_corrections
CREATE OR REPLACE FUNCTION update_attendance_corrections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendance_corrections_updated_at
    BEFORE UPDATE ON rh.attendance_corrections
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_corrections_updated_at();

-- Trigger para event_consolidations
CREATE OR REPLACE FUNCTION update_event_consolidations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_consolidations_updated_at
    BEFORE UPDATE ON rh.event_consolidations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_consolidations_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE rh.reimbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.equipment_rental_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.event_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.gestor_notifications ENABLE ROW LEVEL SECURITY;

-- Policies para reimbursement_requests
CREATE POLICY "Users can view reimbursement_requests from their company" ON rh.reimbursement_requests
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert reimbursement_requests in their company" ON rh.reimbursement_requests
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update reimbursement_requests from their company" ON rh.reimbursement_requests
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete reimbursement_requests from their company" ON rh.reimbursement_requests
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Policies para equipment_rental_approvals
CREATE POLICY "Users can view equipment_rental_approvals from their company" ON rh.equipment_rental_approvals
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert equipment_rental_approvals in their company" ON rh.equipment_rental_approvals
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update equipment_rental_approvals from their company" ON rh.equipment_rental_approvals
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete equipment_rental_approvals from their company" ON rh.equipment_rental_approvals
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Policies para attendance_corrections
CREATE POLICY "Users can view attendance_corrections from their company" ON rh.attendance_corrections
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert attendance_corrections in their company" ON rh.attendance_corrections
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update attendance_corrections from their company" ON rh.attendance_corrections
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete attendance_corrections from their company" ON rh.attendance_corrections
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Policies para event_consolidations
CREATE POLICY "Users can view event_consolidations from their company" ON rh.event_consolidations
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert event_consolidations in their company" ON rh.event_consolidations
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update event_consolidations from their company" ON rh.event_consolidations
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

-- Policies para gestor_notifications
CREATE POLICY "Users can view gestor_notifications from their company" ON rh.gestor_notifications
    FOR SELECT USING (
        user_has_company_access(company_id) AND 
        gestor_id = auth.uid()
    );

CREATE POLICY "Users can insert gestor_notifications in their company" ON rh.gestor_notifications
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id) AND 
        gestor_id = auth.uid()
    );

CREATE POLICY "Users can update gestor_notifications from their company" ON rh.gestor_notifications
    FOR UPDATE USING (
        user_has_company_access(company_id) AND 
        gestor_id = auth.uid()
    );

-- =====================================================
-- Funções de Aprovação
-- =====================================================

-- Função para aprovar férias
CREATE OR REPLACE FUNCTION approve_vacation(
    vacation_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.vacations 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(observacoes, observacoes)
    WHERE id = vacation_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para rejeitar férias
CREATE OR REPLACE FUNCTION reject_vacation(
    vacation_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.vacations 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        aprovado_em = NOW(),
        observacoes = observacoes
    WHERE id = vacation_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar compensação
CREATE OR REPLACE FUNCTION approve_compensation(
    compensation_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.compensation_requests 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        data_aprovacao = NOW(),
        observacoes = COALESCE(observacoes, observacoes)
    WHERE id = compensation_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para rejeitar compensação
CREATE OR REPLACE FUNCTION reject_compensation(
    compensation_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.compensation_requests 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        data_aprovacao = NOW(),
        observacoes = observacoes
    WHERE id = compensation_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar atestado médico
CREATE OR REPLACE FUNCTION approve_medical_certificate(
    certificate_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.medical_certificates 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(observacoes, observacoes)
    WHERE id = certificate_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para rejeitar atestado médico
CREATE OR REPLACE FUNCTION reject_medical_certificate(
    certificate_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.medical_certificates 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        aprovado_em = NOW(),
        observacoes = observacoes
    WHERE id = certificate_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar reembolso
CREATE OR REPLACE FUNCTION approve_reimbursement(
    reimbursement_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.reimbursement_requests 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(observacoes, observacoes)
    WHERE id = reimbursement_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para rejeitar reembolso
CREATE OR REPLACE FUNCTION reject_reimbursement(
    reimbursement_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.reimbursement_requests 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        aprovado_em = NOW(),
        observacoes = observacoes
    WHERE id = reimbursement_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar equipamento
CREATE OR REPLACE FUNCTION approve_equipment(
    equipment_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.equipment_rental_approvals 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(observacoes, observacoes)
    WHERE id = equipment_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para rejeitar equipamento
CREATE OR REPLACE FUNCTION reject_equipment(
    equipment_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.equipment_rental_approvals 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        aprovado_em = NOW(),
        observacoes = observacoes
    WHERE id = equipment_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar correção de ponto
CREATE OR REPLACE FUNCTION approve_attendance_correction(
    correction_id UUID,
    approved_by UUID,
    observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.attendance_corrections 
    SET 
        status = 'aprovado',
        aprovado_por = approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(observacoes, observacoes)
    WHERE id = correction_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para rejeitar correção de ponto
CREATE OR REPLACE FUNCTION reject_attendance_correction(
    correction_id UUID,
    rejected_by UUID,
    observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.attendance_corrections 
    SET 
        status = 'rejeitado',
        aprovado_por = rejected_by,
        aprovado_em = NOW(),
        observacoes = observacoes
    WHERE id = correction_id AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Funções de Dashboard
-- =====================================================

-- Função para obter estatísticas do dashboard do gestor
CREATE OR REPLACE FUNCTION get_gestor_dashboard_stats(company_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_funcionarios', (
            SELECT COUNT(*) FROM rh.employees 
            WHERE company_id = company_uuid AND status = 'ativo'
        ),
        'solicitacoes_pendentes', (
            SELECT COUNT(*) FROM (
                SELECT 1 FROM rh.vacations WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.compensation_requests WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.medical_certificates WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.reimbursement_requests WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.equipment_rental_approvals WHERE company_id = company_uuid AND status = 'pendente'
                UNION ALL
                SELECT 1 FROM rh.attendance_corrections WHERE company_id = company_uuid AND status = 'pendente'
            ) as all_pending
        ),
        'ferias_pendentes', (
            SELECT COUNT(*) FROM rh.vacations 
            WHERE company_id = company_uuid AND status = 'pendente'
        ),
        'compensacoes_pendentes', (
            SELECT COUNT(*) FROM rh.compensation_requests 
            WHERE company_id = company_uuid AND status = 'pendente'
        ),
        'atestados_pendentes', (
            SELECT COUNT(*) FROM rh.medical_certificates 
            WHERE company_id = company_uuid AND status = 'pendente'
        ),
        'reembolsos_pendentes', (
            SELECT COUNT(*) FROM rh.reimbursement_requests 
            WHERE company_id = company_uuid AND status = 'pendente'
        ),
        'equipamentos_pendentes', (
            SELECT COUNT(*) FROM rh.equipment_rental_approvals 
            WHERE company_id = company_uuid AND status = 'pendente'
        ),
        'correcoes_pendentes', (
            SELECT COUNT(*) FROM rh.attendance_corrections 
            WHERE company_id = company_uuid AND status = 'pendente'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para obter atividades recentes
CREATE OR REPLACE FUNCTION get_gestor_recent_activities(company_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    tipo VARCHAR(50),
    funcionario_nome VARCHAR(255),
    data_solicitacao TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    descricao TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        'ferias'::VARCHAR(50) as tipo,
        e.nome as funcionario_nome,
        v.created_at as data_solicitacao,
        v.status,
        CONCAT('Solicitação de férias de ', v.dias_solicitados, ' dias') as descricao
    FROM rh.vacations v
    JOIN rh.employees e ON v.employee_id = e.id
    WHERE v.company_id = company_uuid
    
    UNION ALL
    
    SELECT 
        cr.id,
        'compensacao'::VARCHAR(50) as tipo,
        e.nome as funcionario_nome,
        cr.created_at as data_solicitacao,
        cr.status,
        CONCAT('Solicitação de compensação de ', cr.horas_solicitadas, ' horas') as descricao
    FROM rh.compensation_requests cr
    JOIN rh.employees e ON cr.funcionario_id = e.id
    WHERE cr.company_id = company_uuid
    
    UNION ALL
    
    SELECT 
        mc.id,
        'atestado'::VARCHAR(50) as tipo,
        e.nome as funcionario_nome,
        mc.created_at as data_solicitacao,
        mc.status,
        CONCAT('Atestado médico de ', mc.dias_afastamento, ' dias') as descricao
    FROM rh.medical_certificates mc
    JOIN rh.employees e ON mc.employee_id = e.id
    WHERE mc.company_id = company_uuid
    
    ORDER BY data_solicitacao DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
