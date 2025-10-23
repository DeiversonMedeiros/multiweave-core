-- =====================================================
-- CRIAÇÃO DA TABELA EMPLOYEE_SHIFTS (TURNOS DE FUNCIONÁRIOS)
-- =====================================================

-- Criar tabela de turnos de funcionários
CREATE TABLE IF NOT EXISTS rh.employee_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    funcionario_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    turno_id UUID NOT NULL REFERENCES rh.work_shifts(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_employee_shifts_data_fim CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_employee_shifts_company_id ON rh.employee_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_funcionario_id ON rh.employee_shifts(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_turno_id ON rh.employee_shifts(turno_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_data_inicio ON rh.employee_shifts(data_inicio);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_ativo ON rh.employee_shifts(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_employee_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employee_shifts_updated_at
    BEFORE UPDATE ON rh.employee_shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_shifts_updated_at();

-- Habilitar RLS
ALTER TABLE rh.employee_shifts ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view employee_shifts from their company" ON rh.employee_shifts
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert employee_shifts in their company" ON rh.employee_shifts
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update employee_shifts from their company" ON rh.employee_shifts
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete employee_shifts from their company" ON rh.employee_shifts
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.employee_shifts IS 'Tabela de turnos atribuídos aos funcionários';
COMMENT ON COLUMN rh.employee_shifts.data_inicio IS 'Data de início do turno para o funcionário';
COMMENT ON COLUMN rh.employee_shifts.data_fim IS 'Data de fim do turno (NULL se ainda ativo)';
COMMENT ON COLUMN rh.employee_shifts.ativo IS 'Se o turno está ativo para o funcionário';
