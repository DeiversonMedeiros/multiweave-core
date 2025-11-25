-- =====================================================
-- SISTEMA DE TIPOS DE BANCO DE HORAS
-- =====================================================

-- 1. TABELA DE TIPOS DE BANCO DE HORAS
-- =====================================================
CREATE TABLE rh.bank_hours_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificação do tipo
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20) UNIQUE, -- Código único para o tipo (ex: "PADRAO", "GERENCIAL", "OPERACIONAL")
  
  -- Configuração do banco de horas
  has_bank_hours BOOLEAN NOT NULL DEFAULT true,
  accumulation_period_months INTEGER NOT NULL DEFAULT 12,
  max_accumulation_hours DECIMAL(5,2) DEFAULT 40.00,
  compensation_rate DECIMAL(4,2) DEFAULT 1.00,
  
  -- Configurações de compensação
  auto_compensate BOOLEAN DEFAULT false,
  compensation_priority VARCHAR(20) DEFAULT 'fifo' CHECK (compensation_priority IN ('fifo', 'lifo', 'manual')),
  
  -- Configurações de expiração
  expires_after_months INTEGER DEFAULT 12,
  allow_negative_balance BOOLEAN DEFAULT false,
  
  -- Status e controle
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Se é o tipo padrão da empresa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id, code)
);

-- 2. TABELA DE VÍNCULOS FUNCIONÁRIO-TIPO
-- =====================================================
CREATE TABLE rh.bank_hours_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_hours_type_id UUID NOT NULL REFERENCES rh.bank_hours_types(id) ON DELETE CASCADE,
  
  -- Status do vínculo
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  
  -- Observações
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, company_id) -- Um funcionário só pode ter um tipo ativo por vez
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índices para bank_hours_types
CREATE INDEX idx_bank_hours_types_company ON rh.bank_hours_types(company_id);
CREATE INDEX idx_bank_hours_types_active ON rh.bank_hours_types(is_active) WHERE is_active = true;
CREATE INDEX idx_bank_hours_types_default ON rh.bank_hours_types(is_default) WHERE is_default = true;
CREATE INDEX idx_bank_hours_types_code ON rh.bank_hours_types(code);

-- Índices para bank_hours_assignments
CREATE INDEX idx_bank_hours_assignments_employee ON rh.bank_hours_assignments(employee_id);
CREATE INDEX idx_bank_hours_assignments_company ON rh.bank_hours_assignments(company_id);
CREATE INDEX idx_bank_hours_assignments_type ON rh.bank_hours_assignments(bank_hours_type_id);
CREATE INDEX idx_bank_hours_assignments_active ON rh.bank_hours_assignments(is_active) WHERE is_active = true;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bank_hours_types_updated_at 
    BEFORE UPDATE ON rh.bank_hours_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_hours_assignments_updated_at 
    BEFORE UPDATE ON rh.bank_hours_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para garantir que só existe um tipo padrão por empresa
CREATE OR REPLACE FUNCTION ensure_single_default_bank_hours_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está sendo marcado como padrão, desmarcar outros da mesma empresa
  IF NEW.is_default = true THEN
    UPDATE rh.bank_hours_types 
    SET is_default = false 
    WHERE company_id = NEW.company_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_bank_hours_type_trigger
    BEFORE INSERT OR UPDATE ON rh.bank_hours_types
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_bank_hours_type();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE rh.bank_hours_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.bank_hours_assignments ENABLE ROW LEVEL SECURITY;

-- Policies para bank_hours_types
CREATE POLICY "Users can view bank hours types for their companies" ON rh.bank_hours_types
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can manage bank hours types for their companies" ON rh.bank_hours_types
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Policies para bank_hours_assignments
CREATE POLICY "Users can view bank hours assignments for their companies" ON rh.bank_hours_assignments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Users can manage bank hours assignments for their companies" ON rh.bank_hours_assignments
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para obter configuração de banco de horas de um funcionário
CREATE OR REPLACE FUNCTION rh.get_employee_bank_hours_config(
  p_employee_id UUID,
  p_company_id UUID
)
RETURNS TABLE(
  assignment_id UUID,
  type_id UUID,
  type_name VARCHAR(100),
  type_code VARCHAR(20),
  has_bank_hours BOOLEAN,
  accumulation_period_months INTEGER,
  max_accumulation_hours DECIMAL(5,2),
  compensation_rate DECIMAL(4,2),
  auto_compensate BOOLEAN,
  compensation_priority VARCHAR(20),
  expires_after_months INTEGER,
  allow_negative_balance BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as assignment_id,
    t.id as type_id,
    t.name as type_name,
    t.code as type_code,
    t.has_bank_hours,
    t.accumulation_period_months,
    t.max_accumulation_hours,
    t.compensation_rate,
    t.auto_compensate,
    t.compensation_priority,
    t.expires_after_months,
    t.allow_negative_balance,
    a.is_active
  FROM rh.bank_hours_assignments a
  JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.employee_id = p_employee_id 
    AND a.company_id = p_company_id
    AND a.is_active = true
    AND t.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Função para migrar configurações existentes para o novo sistema
CREATE OR REPLACE FUNCTION rh.migrate_bank_hours_configs_to_types(
  p_company_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_default_type_id UUID;
  v_config_record RECORD;
BEGIN
  -- Criar tipo padrão para a empresa
  INSERT INTO rh.bank_hours_types (
    company_id, name, description, code, is_default,
    has_bank_hours, accumulation_period_months, max_accumulation_hours,
    compensation_rate, auto_compensate, compensation_priority,
    expires_after_months, allow_negative_balance
  ) VALUES (
    p_company_id, 'Padrão', 'Tipo padrão de banco de horas', 'PADRAO', true,
    true, 12, 40.00, 1.00, false, 'fifo', 12, false
  ) RETURNING id INTO v_default_type_id;

  -- Migrar configurações existentes
  FOR v_config_record IN
    SELECT * FROM rh.bank_hours_config 
    WHERE company_id = p_company_id
  LOOP
    -- Criar vínculo com o tipo padrão
    INSERT INTO rh.bank_hours_assignments (
      employee_id, company_id, bank_hours_type_id, is_active
    ) VALUES (
      v_config_record.employee_id, 
      p_company_id, 
      v_default_type_id, 
      v_config_record.is_active
    );
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  RETURN v_migrated_count;
END;
$$ LANGUAGE plpgsql;
