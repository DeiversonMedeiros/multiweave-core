-- =====================================================
-- MÓDULO DE RECURSOS HUMANOS - POLÍTICAS RLS
-- =====================================================

-- =====================================================
-- 1. POLÍTICAS PARA EMPLOYEES
-- =====================================================

-- Habilitar RLS
ALTER TABLE rh.employees ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver funcionários da sua empresa
CREATE POLICY "Users can view employees from their company" ON rh.employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem inserir funcionários na sua empresa
CREATE POLICY "Users can insert employees in their company" ON rh.employees
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar funcionários da sua empresa
CREATE POLICY "Users can update employees from their company" ON rh.employees
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem deletar funcionários da sua empresa
CREATE POLICY "Users can delete employees from their company" ON rh.employees
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. POLÍTICAS PARA POSITIONS
-- =====================================================

ALTER TABLE rh.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view positions from their company" ON rh.positions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert positions in their company" ON rh.positions
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update positions from their company" ON rh.positions
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete positions from their company" ON rh.positions
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. POLÍTICAS PARA UNITS
-- =====================================================

ALTER TABLE rh.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view units from their company" ON rh.units
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert units in their company" ON rh.units
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update units from their company" ON rh.units
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete units from their company" ON rh.units
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. POLÍTICAS PARA TIME_RECORDS
-- =====================================================

ALTER TABLE rh.time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time_records from their company" ON rh.time_records
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert time_records in their company" ON rh.time_records
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update time_records from their company" ON rh.time_records
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete time_records from their company" ON rh.time_records
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. POLÍTICAS PARA WORK_SCHEDULES
-- =====================================================

ALTER TABLE rh.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work_schedules from their company" ON rh.work_schedules
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work_schedules in their company" ON rh.work_schedules
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update work_schedules from their company" ON rh.work_schedules
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete work_schedules from their company" ON rh.work_schedules
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. POLÍTICAS PARA EMPLOYEE_SCHEDULES
-- =====================================================

ALTER TABLE rh.employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee_schedules from their company" ON rh.employee_schedules
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employee_schedules in their company" ON rh.employee_schedules
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update employee_schedules from their company" ON rh.employee_schedules
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employee_schedules from their company" ON rh.employee_schedules
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. POLÍTICAS PARA BENEFIT_CONFIGURATIONS
-- =====================================================

ALTER TABLE rh.benefit_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view benefit_configurations from their company" ON rh.benefit_configurations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert benefit_configurations in their company" ON rh.benefit_configurations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update benefit_configurations from their company" ON rh.benefit_configurations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete benefit_configurations from their company" ON rh.benefit_configurations
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. POLÍTICAS PARA EMPLOYEE_BENEFIT_ASSIGNMENTS
-- =====================================================

ALTER TABLE rh.employee_benefit_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee_benefit_assignments from their company" ON rh.employee_benefit_assignments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employee_benefit_assignments in their company" ON rh.employee_benefit_assignments
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update employee_benefit_assignments from their company" ON rh.employee_benefit_assignments
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employee_benefit_assignments from their company" ON rh.employee_benefit_assignments
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. POLÍTICAS PARA MONTHLY_BENEFIT_PROCESSING
-- =====================================================

ALTER TABLE rh.monthly_benefit_processing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view monthly_benefit_processing from their company" ON rh.monthly_benefit_processing
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert monthly_benefit_processing in their company" ON rh.monthly_benefit_processing
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update monthly_benefit_processing from their company" ON rh.monthly_benefit_processing
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete monthly_benefit_processing from their company" ON rh.monthly_benefit_processing
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. POLÍTICAS PARA VACATIONS
-- =====================================================

ALTER TABLE rh.vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vacations from their company" ON rh.vacations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vacations in their company" ON rh.vacations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vacations from their company" ON rh.vacations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vacations from their company" ON rh.vacations
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 11. POLÍTICAS PARA MEDICAL_CERTIFICATES
-- =====================================================

ALTER TABLE rh.medical_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medical_certificates from their company" ON rh.medical_certificates
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert medical_certificates in their company" ON rh.medical_certificates
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update medical_certificates from their company" ON rh.medical_certificates
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete medical_certificates from their company" ON rh.medical_certificates
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 12. POLÍTICAS PARA PAYROLL
-- =====================================================

ALTER TABLE rh.payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll from their company" ON rh.payroll
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payroll in their company" ON rh.payroll
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payroll from their company" ON rh.payroll
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payroll from their company" ON rh.payroll
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );
