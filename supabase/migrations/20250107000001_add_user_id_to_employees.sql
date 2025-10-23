-- Adicionar coluna user_id à tabela employees para conectar com auth.users
ALTER TABLE rh.employees 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Criar índice para melhor performance
CREATE INDEX idx_employees_user_id ON rh.employees(user_id);

-- Atualizar RLS policies para incluir user_id
DROP POLICY IF EXISTS "Users can view employees from their company" ON rh.employees;
DROP POLICY IF EXISTS "Users can update employees from their company" ON rh.employees;
DROP POLICY IF EXISTS "Users can insert employees in their company" ON rh.employees;
DROP POLICY IF EXISTS "Users can delete employees from their company" ON rh.employees;

-- Recriar policies com suporte a user_id
CREATE POLICY "Users can view employees from their company or own profile" ON rh.employees
FOR SELECT USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()) 
  OR user_id = auth.uid()
);

CREATE POLICY "Users can update employees from their company or own profile" ON rh.employees
FOR UPDATE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()) 
  OR user_id = auth.uid()
);

CREATE POLICY "Users can insert employees in their company" ON rh.employees
FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete employees from their company" ON rh.employees
FOR DELETE USING (
  company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);

-- Atualizar policies existentes do RH
DROP POLICY IF EXISTS "rh_employees_select_policy" ON rh.employees;
DROP POLICY IF EXISTS "rh_employees_update_policy" ON rh.employees;
DROP POLICY IF EXISTS "rh_employees_insert_policy" ON rh.employees;
DROP POLICY IF EXISTS "rh_employees_delete_policy" ON rh.employees;

-- Recriar policies do RH com suporte a user_id
CREATE POLICY "rh_employees_select_policy" ON rh.employees
FOR SELECT USING (
  (user_has_company_access(company_id))
  OR user_id = auth.uid()
);

CREATE POLICY "rh_employees_update_policy" ON rh.employees
FOR UPDATE USING (
  (user_has_company_access(company_id))
  OR user_id = auth.uid()
);

CREATE POLICY "rh_employees_insert_policy" ON rh.employees
FOR INSERT WITH CHECK (
  user_has_company_access(company_id)
);

CREATE POLICY "rh_employees_delete_policy" ON rh.employees
FOR DELETE USING (
  user_has_company_access(company_id)
);
