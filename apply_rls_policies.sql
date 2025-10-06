-- Aplicar políticas RLS para o módulo RH

-- Habilitar RLS em todas as tabelas
ALTER TABLE rh.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.benefit_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.employee_benefit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.monthly_benefit_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.medical_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.payroll ENABLE ROW LEVEL SECURITY;

-- Políticas para employees
CREATE POLICY "Users can view employees from their company" ON rh.employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employees in their company" ON rh.employees
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update employees from their company" ON rh.employees
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employees from their company" ON rh.employees
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );
