-- =====================================================
-- SISTEMA DE DEDUÇÕES E COPARTICIPAÇÃO
-- =====================================================
-- Data: 2025-11-03
-- Descrição: Cria sistema completo de deduções de funcionários e coparticipação em planos de saúde

-- =====================================================
-- 1. ADICIONAR SUPORTE A COPARTICIPAÇÃO NOS PLANOS MÉDICOS
-- =====================================================

-- Adicionar campos de coparticipação na tabela de planos médicos
ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS tem_coparticipacao BOOLEAN DEFAULT false;

ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS percentual_coparticipacao DECIMAL(5,2) DEFAULT 0 CHECK (percentual_coparticipacao >= 0 AND percentual_coparticipacao <= 100);

ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS valor_minimo_coparticipacao DECIMAL(10,2) DEFAULT 0;

ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS valor_maximo_coparticipacao DECIMAL(10,2);

COMMENT ON COLUMN rh.medical_plans.tem_coparticipacao IS 'Se o plano tem coparticipação (funcionário paga percentual dos serviços)';
COMMENT ON COLUMN rh.medical_plans.percentual_coparticipacao IS 'Percentual que o funcionário paga (ex: 10%, 20%)';
COMMENT ON COLUMN rh.medical_plans.valor_minimo_coparticipacao IS 'Valor mínimo que o funcionário paga por serviço';
COMMENT ON COLUMN rh.medical_plans.valor_maximo_coparticipacao IS 'Valor máximo que o funcionário paga por serviço (NULL = sem limite)';

-- =====================================================
-- 2. TABELA DE UTILIZAÇÃO DE SERVIÇOS MÉDICOS
-- =====================================================
-- Armazena consultas, exames e cirurgias para cálculo de coparticipação

CREATE TABLE IF NOT EXISTS rh.medical_services_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    employee_plan_id UUID NOT NULL REFERENCES rh.employee_medical_plans(id) ON DELETE CASCADE,
    dependent_id UUID REFERENCES rh.employee_plan_dependents(id) ON DELETE SET NULL, -- NULL = titular
    
    -- Dados do serviço
    tipo_servico VARCHAR(50) NOT NULL CHECK (tipo_servico IN ('consulta', 'exame', 'cirurgia', 'procedimento', 'internacao', 'outros')),
    descricao TEXT NOT NULL,
    data_utilizacao DATE NOT NULL,
    prestador_nome VARCHAR(255),
    prestador_cnpj VARCHAR(14),
    
    -- Valores
    valor_total DECIMAL(10,2) NOT NULL,
    valor_coparticipacao DECIMAL(10,2) NOT NULL DEFAULT 0, -- Valor calculado que o funcionário deve pagar
    percentual_aplicado DECIMAL(5,2), -- Percentual que foi aplicado
    
    -- Status e controle
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    mes_referencia_folha INTEGER CHECK (mes_referencia_folha >= 1 AND mes_referencia_folha <= 12),
    ano_referencia_folha INTEGER CHECK (ano_referencia_folha >= 2000 AND ano_referencia_folha <= 2100),
    payroll_event_id UUID REFERENCES rh.payroll_events(id) ON DELETE SET NULL, -- Link para evento na folha
    
    -- Documentação
    nota_fiscal_numero VARCHAR(50),
    nota_fiscal_valor DECIMAL(10,2),
    anexo_url TEXT,
    
    -- Metadados
    observacoes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_company_id ON rh.medical_services_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_employee_id ON rh.medical_services_usage(employee_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_employee_plan_id ON rh.medical_services_usage(employee_plan_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_status ON rh.medical_services_usage(status);
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_data_utilizacao ON rh.medical_services_usage(data_utilizacao);
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_folha_ref ON rh.medical_services_usage(mes_referencia_folha, ano_referencia_folha);
CREATE INDEX IF NOT EXISTS idx_medical_services_usage_payroll_event_id ON rh.medical_services_usage(payroll_event_id);

COMMENT ON TABLE rh.medical_services_usage IS 'Histórico de utilização de serviços médicos para cálculo de coparticipação';
COMMENT ON COLUMN rh.medical_services_usage.tipo_servico IS 'Tipo: consulta, exame, cirurgia, procedimento, internacao, outros';
COMMENT ON COLUMN rh.medical_services_usage.status IS 'Status: pendente (não descontado), pago (já descontado na folha), cancelado';

-- =====================================================
-- 3. TABELA GENÉRICA DE DEDUÇÕES DE FUNCIONÁRIOS
-- =====================================================
-- Armazena todos os tipos de deduções: coparticipação, empréstimos, multas, avarias, etc.

CREATE TABLE IF NOT EXISTS rh.employee_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    
    -- Classificação da dedução
    tipo_deducao VARCHAR(50) NOT NULL CHECK (tipo_deducao IN (
        'coparticipacao_medica',
        'emprestimo',
        'multa',
        'avaria_veiculo',
        'danos_materiais',
        'adiantamento',
        'desconto_combinado',
        'outros'
    )),
    categoria VARCHAR(100), -- Categoria livre para organização (ex: "Empréstimo Consignado", "Multa de Trânsito")
    descricao TEXT NOT NULL,
    
    -- Valores e parcelamento
    valor_total DECIMAL(10,2) NOT NULL,
    valor_parcela DECIMAL(10,2), -- Valor por parcela (se parcelado)
    numero_parcelas INTEGER DEFAULT 1,
    parcela_atual INTEGER DEFAULT 1,
    
    -- Período e controle
    data_origem DATE NOT NULL, -- Data em que a dedução foi originada
    mes_referencia_inicio INTEGER NOT NULL CHECK (mes_referencia_inicio >= 1 AND mes_referencia_inicio <= 12),
    ano_referencia_inicio INTEGER NOT NULL CHECK (ano_referencia_inicio >= 2000 AND ano_referencia_inicio <= 2100),
    mes_referencia_fim INTEGER CHECK (mes_referencia_fim >= 1 AND mes_referencia_fim <= 12), -- NULL = sem data fim
    ano_referencia_fim INTEGER CHECK (ano_referencia_fim >= 2000 AND ano_referencia_fim <= 2100),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_aberto', 'pago', 'cancelado', 'parcelado')),
    valor_total_pago DECIMAL(10,2) DEFAULT 0, -- Total já pago (para parcelas)
    
    -- Relacionamentos
    medical_service_usage_id UUID REFERENCES rh.medical_services_usage(id) ON DELETE SET NULL, -- Se origem for coparticipação
    related_entity_type VARCHAR(50), -- Tipo de entidade relacionada (ex: 'vehicle', 'loan')
    related_entity_id UUID, -- ID da entidade relacionada
    
    -- Controle de folha
    aplicar_na_folha BOOLEAN DEFAULT true,
    mes_referencia_folha INTEGER CHECK (mes_referencia_folha >= 1 AND mes_referencia_folha <= 12),
    ano_referencia_folha INTEGER CHECK (ano_referencia_folha >= 2000 AND ano_referencia_folha <= 2100),
    payroll_event_id UUID REFERENCES rh.payroll_events(id) ON DELETE SET NULL,
    
    -- Documentação
    documento_referencia VARCHAR(255), -- Número de documento, nota fiscal, etc.
    anexo_url TEXT,
    
    -- Metadados
    observacoes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employee_deductions_company_id ON rh.employee_deductions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee_id ON rh.employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_tipo_deducao ON rh.employee_deductions(tipo_deducao);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_status ON rh.employee_deductions(status);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_folha_ref ON rh.employee_deductions(mes_referencia_folha, ano_referencia_folha);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_data_origem ON rh.employee_deductions(data_origem);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_medical_service ON rh.employee_deductions(medical_service_usage_id);

COMMENT ON TABLE rh.employee_deductions IS 'Deduções diversas de funcionários (coparticipação, empréstimos, multas, avarias, etc.)';
COMMENT ON COLUMN rh.employee_deductions.tipo_deducao IS 'Tipo: coparticipacao_medica, emprestimo, multa, avaria_veiculo, danos_materiais, adiantamento, desconto_combinado, outros';
COMMENT ON COLUMN rh.employee_deductions.status IS 'Status: pendente, em_aberto, pago, cancelado, parcelado';

-- =====================================================
-- 4. FUNÇÃO PARA CALCULAR COPARTICIPAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION rh.calculate_coparticipation(
    p_medical_service_usage_id UUID,
    p_company_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_plan_id UUID;
    v_tem_coparticipacao BOOLEAN;
    v_percentual DECIMAL(5,2);
    v_valor_min DECIMAL(10,2);
    v_valor_max DECIMAL(10,2);
    v_valor_total DECIMAL(10,2);
    v_coparticipacao DECIMAL(10,2);
BEGIN
    -- Buscar dados do serviço e do plano
    SELECT 
        emp.plan_id,
        mp.tem_coparticipacao,
        mp.percentual_coparticipacao,
        mp.valor_minimo_coparticipacao,
        mp.valor_maximo_coparticipacao,
        msu.valor_total
    INTO 
        v_plan_id,
        v_tem_coparticipacao,
        v_percentual,
        v_valor_min,
        v_valor_max,
        v_valor_total
    FROM rh.medical_services_usage msu
    JOIN rh.employee_medical_plans emp ON emp.id = msu.employee_plan_id
    JOIN rh.medical_plans mp ON mp.id = emp.plan_id
    WHERE msu.id = p_medical_service_usage_id
      AND msu.company_id = p_company_id;
    
    -- Se não tem coparticipação, retorna 0
    IF NOT v_tem_coparticipacao OR v_percentual IS NULL OR v_percentual = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calcular coparticipação (percentual do valor total)
    v_coparticipacao := (v_valor_total * v_percentual / 100);
    
    -- Aplicar valor mínimo
    IF v_valor_min > 0 AND v_coparticipacao < v_valor_min THEN
        v_coparticipacao := v_valor_min;
    END IF;
    
    -- Aplicar valor máximo (se definido)
    IF v_valor_max IS NOT NULL AND v_valor_max > 0 AND v_coparticipacao > v_valor_max THEN
        v_coparticipacao := v_valor_max;
    END IF;
    
    RETURN v_coparticipacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.calculate_coparticipation IS 'Calcula o valor de coparticipação para uma utilização de serviço médico';

-- =====================================================
-- 5. TRIGGER PARA ATUALIZAR COPARTICIPAÇÃO AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION rh.update_coparticipation_on_service_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_coparticipacao DECIMAL(10,2);
    v_percentual DECIMAL(5,2);
BEGIN
    -- Se não tem plano vinculado, não calcula
    IF NEW.employee_plan_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calcular coparticipação
    v_coparticipacao := rh.calculate_coparticipation(NEW.id, NEW.company_id);
    
    -- Buscar percentual aplicado
    SELECT mp.percentual_coparticipacao INTO v_percentual
    FROM rh.employee_medical_plans emp
    JOIN rh.medical_plans mp ON mp.id = emp.plan_id
    WHERE emp.id = NEW.employee_plan_id;
    
    -- Atualizar valores na tabela de serviços
    NEW.valor_coparticipacao := v_coparticipacao;
    NEW.percentual_aplicado := v_percentual;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coparticipation
    BEFORE INSERT OR UPDATE ON rh.medical_services_usage
    FOR EACH ROW
    WHEN (NEW.employee_plan_id IS NOT NULL)
    EXECUTE FUNCTION rh.update_coparticipation_on_service_insert();

-- =====================================================
-- 6. TRIGGERS PARA updated_at
-- =====================================================

CREATE TRIGGER update_medical_services_usage_updated_at 
    BEFORE UPDATE ON rh.medical_services_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at 
    BEFORE UPDATE ON rh.employee_deductions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. FUNÇÃO PARA BUSCAR DEDUÇÕES PENDENTES DE UM FUNCIONÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION rh.get_pending_deductions(
    p_company_id UUID,
    p_employee_id UUID DEFAULT NULL,
    p_mes_referencia INTEGER DEFAULT NULL,
    p_ano_referencia INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    employee_name VARCHAR,
    tipo_deducao VARCHAR,
    categoria VARCHAR,
    descricao TEXT,
    valor_total NUMERIC,
    valor_parcela NUMERIC,
    parcela_atual INTEGER,
    numero_parcelas INTEGER,
    status VARCHAR,
    data_origem DATE,
    mes_referencia_folha INTEGER,
    ano_referencia_folha INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.employee_id,
        e.nome AS employee_name,
        ed.tipo_deducao,
        ed.categoria,
        ed.descricao,
        ed.valor_total,
        ed.valor_parcela,
        ed.parcela_atual,
        ed.numero_parcelas,
        ed.status,
        ed.data_origem,
        ed.mes_referencia_folha,
        ed.ano_referencia_folha
    FROM rh.employee_deductions ed
    JOIN rh.employees e ON e.id = ed.employee_id
    WHERE ed.company_id = p_company_id
      AND ed.aplicar_na_folha = true
      AND ed.status IN ('pendente', 'em_aberto', 'parcelado')
      AND (p_employee_id IS NULL OR ed.employee_id = p_employee_id)
      AND (
          (p_mes_referencia IS NULL AND p_ano_referencia IS NULL) OR
          (ed.mes_referencia_folha = p_mes_referencia AND ed.ano_referencia_folha = p_ano_referencia) OR
          (ed.mes_referencia_folha IS NULL AND ed.ano_referencia_folha IS NULL)
      )
    ORDER BY ed.data_origem DESC, ed.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.get_pending_deductions IS 'Busca deduções pendentes de funcionários para aplicar na folha';

-- =====================================================
-- 8. FUNÇÃO PARA CRIAR DEDUÇÃO A PARTIR DE SERVIÇO MÉDICO
-- =====================================================

CREATE OR REPLACE FUNCTION rh.create_deduction_from_medical_service(
    p_medical_service_usage_id UUID,
    p_company_id UUID,
    p_mes_referencia INTEGER,
    p_ano_referencia INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_employee_id UUID;
    v_valor_coparticipacao DECIMAL(10,2);
    v_descricao TEXT;
    v_tipo_servico VARCHAR(50);
    v_data_utilizacao DATE;
    v_deduction_id UUID;
BEGIN
    -- Buscar dados do serviço médico
    SELECT 
        msu.employee_id,
        msu.valor_coparticipacao,
        msu.descricao,
        msu.tipo_servico,
        msu.data_utilizacao
    INTO 
        v_employee_id,
        v_valor_coparticipacao,
        v_descricao,
        v_tipo_servico,
        v_data_utilizacao
    FROM rh.medical_services_usage msu
    WHERE msu.id = p_medical_service_usage_id
      AND msu.company_id = p_company_id;
    
    -- Se não encontrou ou valor é zero, retorna NULL
    IF v_employee_id IS NULL OR v_valor_coparticipacao IS NULL OR v_valor_coparticipacao = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Criar dedução
    INSERT INTO rh.employee_deductions (
        company_id,
        employee_id,
        tipo_deducao,
        categoria,
        descricao,
        valor_total,
        valor_parcela,
        numero_parcelas,
        parcela_atual,
        data_origem,
        mes_referencia_inicio,
        ano_referencia_inicio,
        mes_referencia_folha,
        ano_referencia_folha,
        status,
        medical_service_usage_id,
        aplicar_na_folha
    ) VALUES (
        p_company_id,
        v_employee_id,
        'coparticipacao_medica',
        'Coparticipação - ' || INITCAP(v_tipo_servico),
        'Coparticipação: ' || v_descricao,
        v_valor_coparticipacao,
        v_valor_coparticipacao,
        1,
        1,
        v_data_utilizacao,
        p_mes_referencia,
        p_ano_referencia,
        p_mes_referencia,
        p_ano_referencia,
        'pendente',
        p_medical_service_usage_id,
        true
    )
    RETURNING id INTO v_deduction_id;
    
    -- Atualizar status do serviço médico
    UPDATE rh.medical_services_usage
    SET status = 'pago',
        mes_referencia_folha = p_mes_referencia,
        ano_referencia_folha = p_ano_referencia
    WHERE id = p_medical_service_usage_id;
    
    RETURN v_deduction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.create_deduction_from_medical_service IS 'Cria dedução a partir de utilização de serviço médico';

