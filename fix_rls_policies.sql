-- Criar política simples para permitir que funcionários vejam seus próprios dados
CREATE POLICY "Employees can view their own data" ON rh.employees 
FOR SELECT USING (user_id = auth.uid());

-- Criar política para permitir que funcionários vejam posições da sua empresa
CREATE POLICY "Employees can view positions from their company" ON rh.positions 
FOR SELECT USING (
  company_id IN (
    SELECT uc.company_id 
    FROM user_companies uc 
    WHERE uc.user_id = auth.uid() AND uc.ativo = true
  )
);

-- Criar política para permitir que funcionários vejam unidades da sua empresa
CREATE POLICY "Employees can view units from their company" ON rh.units 
FOR SELECT USING (
  company_id IN (
    SELECT uc.company_id 
    FROM user_companies uc 
    WHERE uc.user_id = auth.uid() AND uc.ativo = true
  )
);
