-- =====================================================
-- SISTEMA DE CORREÇÃO DE PONTO - ESTRUTURA BASE
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Criação das tabelas e funções para sistema de correção de ponto

-- =====================================================
-- 1. TABELA DE MOTIVOS DE ATRASO
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.delay_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE rh.delay_reasons IS 'Motivos de atraso para correções de ponto';

-- =====================================================
-- 2. CONFIGURAÇÕES DE CORREÇÃO DE PONTO
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.correction_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    dias_liberacao_correcao INTEGER DEFAULT 7,
    permitir_correcao_futura BOOLEAN DEFAULT false,
    exigir_justificativa BOOLEAN DEFAULT true,
    permitir_correcao_apos_aprovacao BOOLEAN DEFAULT false,
    dias_limite_correcao INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

COMMENT ON TABLE rh.correction_settings IS 'Configurações de correção de ponto por empresa';

-- =====================================================
-- 3. CONTROLE DE LIBERAÇÃO POR FUNCIONÁRIO
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.employee_correction_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    mes_ano VARCHAR(7) NOT NULL, -- YYYY-MM
    liberado BOOLEAN DEFAULT false,
    liberado_por UUID REFERENCES profiles(id),
    liberado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, mes_ano)
);

COMMENT ON TABLE rh.employee_correction_permissions IS 'Controle de liberação de correção por funcionário e mês';

-- =====================================================
-- 4. HISTÓRICO DE CORREÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.correction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correction_id UUID NOT NULL REFERENCES rh.attendance_corrections(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'rejected', 'cancelled')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID NOT NULL REFERENCES profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

COMMENT ON TABLE rh.correction_history IS 'Histórico de alterações nas correções de ponto';

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para delay_reasons
CREATE INDEX IF NOT EXISTS idx_delay_reasons_company_id ON rh.delay_reasons(company_id);
CREATE INDEX IF NOT EXISTS idx_delay_reasons_active ON rh.delay_reasons(is_active);

-- Índices para correction_settings
CREATE INDEX IF NOT EXISTS idx_correction_settings_company_id ON rh.correction_settings(company_id);

-- Índices para employee_correction_permissions
CREATE INDEX IF NOT EXISTS idx_employee_correction_permissions_employee_id ON rh.employee_correction_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_correction_permissions_company_id ON rh.employee_correction_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_correction_permissions_mes_ano ON rh.employee_correction_permissions(mes_ano);
CREATE INDEX IF NOT EXISTS idx_employee_correction_permissions_liberado ON rh.employee_correction_permissions(liberado);

-- Índices para correction_history
CREATE INDEX IF NOT EXISTS idx_correction_history_correction_id ON rh.correction_history(correction_id);
CREATE INDEX IF NOT EXISTS idx_correction_history_changed_at ON rh.correction_history(changed_at);

-- =====================================================
-- 6. RPC FUNCTIONS
-- =====================================================

-- Função para verificar se correção está liberada
CREATE OR REPLACE FUNCTION get_correction_status(
    p_employee_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_mes_ano VARCHAR(7);
    v_permission_record RECORD;
    v_settings RECORD;
    v_result JSONB;
BEGIN
    -- Formatar mês/ano
    v_mes_ano := p_year || '-' || LPAD(p_month::TEXT, 2, '0');
    
    -- Buscar permissão específica do funcionário
    SELECT * INTO v_permission_record
    FROM rh.employee_correction_permissions
    WHERE employee_id = p_employee_id 
    AND mes_ano = v_mes_ano;
    
    -- Buscar configurações da empresa
    SELECT * INTO v_settings
    FROM rh.correction_settings
    WHERE company_id = (SELECT company_id FROM rh.employees WHERE id = p_employee_id)
    AND is_active = true;
    
    -- Se não há configuração, usar padrões
    IF v_settings IS NULL THEN
        v_settings.dias_liberacao_correcao := 7;
        v_settings.permitir_correcao_futura := false;
        v_settings.exigir_justificativa := true;
        v_settings.permitir_correcao_apos_aprovacao := false;
        v_settings.dias_limite_correcao := 30;
    END IF;
    
    -- Verificar se está liberado
    IF v_permission_record IS NOT NULL AND v_permission_record.liberado = true THEN
        v_result := jsonb_build_object(
            'liberado', true,
            'liberado_por', v_permission_record.liberado_por,
            'liberado_em', v_permission_record.liberado_em,
            'observacoes', v_permission_record.observacoes
        );
    ELSE
        -- Verificar se está dentro do prazo de liberação automática
        IF (CURRENT_DATE - (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01')::DATE) <= v_settings.dias_liberacao_correcao THEN
            v_result := jsonb_build_object(
                'liberado', true,
                'liberado_por', null,
                'liberado_em', null,
                'observacoes', 'Liberação automática dentro do prazo'
            );
        ELSE
            v_result := jsonb_build_object(
                'liberado', false,
                'liberado_por', null,
                'liberado_em', null,
                'observacoes', 'Prazo de correção expirado'
            );
        END IF;
    END IF;
    
    -- Adicionar configurações
    v_result := v_result || jsonb_build_object(
        'configuracoes', jsonb_build_object(
            'dias_liberacao_correcao', v_settings.dias_liberacao_correcao,
            'permitir_correcao_futura', v_settings.permitir_correcao_futura,
            'exigir_justificativa', v_settings.exigir_justificativa,
            'permitir_correcao_apos_aprovacao', v_settings.permitir_correcao_apos_aprovacao,
            'dias_limite_correcao', v_settings.dias_limite_correcao
        )
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular horas trabalhadas
CREATE OR REPLACE FUNCTION calculate_work_hours(
    p_entrada TIME,
    p_saida TIME,
    p_entrada_almoco TIME DEFAULT NULL,
    p_saida_almoco TIME DEFAULT NULL
)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    v_horas_trabalhadas DECIMAL(4,2) := 0;
    v_horas_manha DECIMAL(4,2) := 0;
    v_horas_tarde DECIMAL(4,2) := 0;
    v_horas_almoco DECIMAL(4,2) := 0;
BEGIN
    -- Verificar se entrada e saída são válidas
    IF p_entrada IS NULL OR p_saida IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Verificar se entrada é anterior à saída
    IF p_entrada >= p_saida THEN
        RETURN 0;
    END IF;
    
    -- Calcular horas totais do período
    v_horas_trabalhadas := EXTRACT(EPOCH FROM (p_saida - p_entrada)) / 3600;
    
    -- Se há horário de almoço, subtrair
    IF p_entrada_almoco IS NOT NULL AND p_saida_almoco IS NOT NULL THEN
        -- Verificar se horário de almoço está dentro do período de trabalho
        IF p_entrada_almoco >= p_entrada AND p_saida_almoco <= p_saida THEN
            v_horas_almoco := EXTRACT(EPOCH FROM (p_saida_almoco - p_entrada_almoco)) / 3600;
            v_horas_trabalhadas := v_horas_trabalhadas - v_horas_almoco;
        END IF;
    END IF;
    
    -- Arredondar para 2 casas decimais
    RETURN ROUND(v_horas_trabalhadas, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar correção de ponto
CREATE OR REPLACE FUNCTION approve_attendance_correction(
    p_correction_id UUID,
    p_approved_by UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_correction RECORD;
    v_time_record_id UUID;
BEGIN
    -- Buscar a correção
    SELECT * INTO v_correction
    FROM rh.attendance_corrections
    WHERE id = p_correction_id;
    
    IF v_correction IS NULL THEN
        RETURN false;
    END IF;
    
    -- Atualizar status da correção
    UPDATE rh.attendance_corrections
    SET 
        status = 'aprovado',
        aprovado_por = p_approved_by,
        aprovado_em = NOW(),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE id = p_correction_id;
    
    -- Buscar ou criar registro de ponto
    SELECT id INTO v_time_record_id
    FROM rh.time_records
    WHERE employee_id = v_correction.employee_id
    AND data_registro = v_correction.data_original;
    
    IF v_time_record_id IS NULL THEN
        -- Criar novo registro
        INSERT INTO rh.time_records (
            employee_id,
            company_id,
            data_registro,
            entrada,
            saida,
            status,
            observacoes,
            created_at,
            updated_at
        ) VALUES (
            v_correction.employee_id,
            v_correction.company_id,
            v_correction.data_original,
            v_correction.entrada_corrigida,
            v_correction.saida_corrigida,
            'aprovado',
            'Registro corrigido e aprovado',
            NOW(),
            NOW()
        ) RETURNING id INTO v_time_record_id;
    ELSE
        -- Atualizar registro existente
        UPDATE rh.time_records
        SET 
            entrada = v_correction.entrada_corrigida,
            saida = v_correction.saida_corrigida,
            status = 'aprovado',
            observacoes = COALESCE(observacoes, '') || ' | Registro corrigido e aprovado',
            updated_at = NOW()
        WHERE id = v_time_record_id;
    END IF;
    
    -- Registrar no histórico
    INSERT INTO rh.correction_history (
        correction_id,
        action,
        new_values,
        changed_by,
        reason
    ) VALUES (
        p_correction_id,
        'approved',
        jsonb_build_object(
            'aprovado_por', p_approved_by,
            'aprovado_em', NOW(),
            'observacoes', p_observacoes
        ),
        p_approved_by,
        'Correção aprovada'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar correção de ponto
CREATE OR REPLACE FUNCTION reject_attendance_correction(
    p_correction_id UUID,
    p_rejected_by UUID,
    p_observacoes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Atualizar status da correção
    UPDATE rh.attendance_corrections
    SET 
        status = 'rejeitado',
        aprovado_por = p_rejected_by,
        aprovado_em = NOW(),
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_correction_id;
    
    -- Registrar no histórico
    INSERT INTO rh.correction_history (
        correction_id,
        action,
        new_values,
        changed_by,
        reason
    ) VALUES (
        p_correction_id,
        'rejected',
        jsonb_build_object(
            'rejeitado_por', p_rejected_by,
            'rejeitado_em', NOW(),
            'observacoes', p_observacoes
        ),
        p_rejected_by,
        'Correção rejeitada: ' || p_observacoes
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. DADOS INICIAIS
-- =====================================================

-- Inserir motivos de atraso padrão
INSERT INTO rh.delay_reasons (company_id, nome, descricao) VALUES
('a9784891-9d58-4cc4-8404-18032105c335', 'Problemas de Trânsito', 'Atraso devido a congestionamentos ou acidentes no trânsito'),
('a9784891-9d58-4cc4-8404-18032105c335', 'Problemas de Transporte', 'Atraso devido a problemas com transporte público ou particular'),
('a9784891-9d58-4cc4-8404-18032105c335', 'Problemas de Saúde', 'Atraso devido a problemas de saúde pessoal ou familiar'),
('a9784891-9d58-4cc4-8404-18032105c335', 'Emergência Familiar', 'Atraso devido a emergência ou problema familiar'),
('a9784891-9d58-4cc4-8404-18032105c335', 'Problemas Técnicos', 'Atraso devido a problemas técnicos com equipamentos ou sistemas'),
('a9784891-9d58-4cc4-8404-18032105c335', 'Reunião Externa', 'Atraso devido a reunião ou compromisso externo autorizado'),
('a9784891-9d58-4cc4-8404-18032105c335', 'Outros', 'Outros motivos não especificados');

-- Inserir configurações padrão para a empresa
INSERT INTO rh.correction_settings (
    company_id,
    dias_liberacao_correcao,
    permitir_correcao_futura,
    exigir_justificativa,
    permitir_correcao_apos_aprovacao,
    dias_limite_correcao,
    is_active
) VALUES (
    'a9784891-9d58-4cc4-8404-18032105c335',
    7,
    false,
    true,
    false,
    30,
    true
);

-- =====================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION get_correction_status(UUID, INTEGER, INTEGER) IS 'Verifica se um funcionário pode fazer correções de ponto em um determinado mês/ano';
COMMENT ON FUNCTION calculate_work_hours(TIME, TIME, TIME, TIME) IS 'Calcula as horas trabalhadas considerando entrada, saída e horário de almoço';
COMMENT ON FUNCTION approve_attendance_correction(UUID, UUID, TEXT) IS 'Aprova uma correção de ponto e atualiza o registro original';
COMMENT ON FUNCTION reject_attendance_correction(UUID, UUID, TEXT) IS 'Rejeita uma correção de ponto com justificativa';

-- =====================================================
-- 9. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE rh.delay_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.correction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.employee_correction_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.correction_history ENABLE ROW LEVEL SECURITY;

-- Políticas para delay_reasons
CREATE POLICY "delay_reasons_company_access" ON rh.delay_reasons
    FOR ALL USING (company_id IN (
        SELECT company_id FROM user_companies 
        WHERE user_id = auth.uid()
    ));

-- Políticas para correction_settings
CREATE POLICY "correction_settings_company_access" ON rh.correction_settings
    FOR ALL USING (company_id IN (
        SELECT company_id FROM user_companies 
        WHERE user_id = auth.uid()
    ));

-- Políticas para employee_correction_permissions
CREATE POLICY "employee_correction_permissions_company_access" ON rh.employee_correction_permissions
    FOR ALL USING (company_id IN (
        SELECT company_id FROM user_companies 
        WHERE user_id = auth.uid()
    ));

-- Políticas para correction_history
CREATE POLICY "correction_history_company_access" ON rh.correction_history
    FOR ALL USING (correction_id IN (
        SELECT ac.id FROM rh.attendance_corrections ac
        WHERE ac.company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    ));

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
