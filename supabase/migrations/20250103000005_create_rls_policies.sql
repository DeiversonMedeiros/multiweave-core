-- Habilitar RLS em todas as tabelas (quando existirem)
-- ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE entity_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para module_permissions (quando a tabela existir)
-- CREATE POLICY "Admins can manage module permissions" ON module_permissions
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view their module permissions" ON module_permissions
--   FOR SELECT USING (
--     profile_id IN (
--       SELECT uc.profile_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- Políticas RLS para entity_permissions (quando a tabela existir)
-- CREATE POLICY "Admins can manage entity permissions" ON entity_permissions
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view their entity permissions" ON entity_permissions
--   FOR SELECT USING (
--     profile_id IN (
--       SELECT uc.profile_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- Políticas RLS para profiles (quando a tabela existir)
-- CREATE POLICY "Admins can manage profiles" ON profiles
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view profiles" ON profiles
--   FOR SELECT USING (true);

-- Políticas RLS para users (quando a tabela existir)
-- CREATE POLICY "Admins can manage users" ON users
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view all users" ON users
--   FOR SELECT USING (true);

-- CREATE POLICY "Users can update their own profile" ON users
--   FOR UPDATE USING (id = auth.uid());

-- Políticas RLS para companies (quando a tabela existir)
-- CREATE POLICY "Admins can manage companies" ON companies
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view their companies" ON companies
--   FOR SELECT USING (
--     id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- Políticas RLS para user_companies (quando a tabela existir)
-- CREATE POLICY "Admins can manage user companies" ON user_companies
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view their company associations" ON user_companies
--   FOR SELECT USING (
--     user_id = auth.uid() OR is_admin(auth.uid())
--   );

-- Políticas RLS para cost_centers (quando a tabela existir)
-- CREATE POLICY "Admins can manage cost centers" ON cost_centers
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view cost centers of their companies" ON cost_centers
--   FOR SELECT USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- CREATE POLICY "Users can manage cost centers of their companies" ON cost_centers
--   FOR ALL USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- Políticas RLS para materials (quando a tabela existir)
-- CREATE POLICY "Admins can manage materials" ON materials
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view materials of their companies" ON materials
--   FOR SELECT USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- CREATE POLICY "Users can manage materials of their companies" ON materials
--   FOR ALL USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- Políticas RLS para partners (quando a tabela existir)
-- CREATE POLICY "Admins can manage partners" ON partners
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view partners of their companies" ON partners
--   FOR SELECT USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- CREATE POLICY "Users can manage partners of their companies" ON partners
--   FOR ALL USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- Políticas RLS para projects (quando a tabela existir)
-- CREATE POLICY "Admins can manage projects" ON projects
--   FOR ALL USING (is_admin(auth.uid()));

-- CREATE POLICY "Users can view projects of their companies" ON projects
--   FOR SELECT USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

-- CREATE POLICY "Users can manage projects of their companies" ON projects
--   FOR ALL USING (
--     company_id IN (
--       SELECT uc.company_id 
--       FROM user_companies uc 
--       WHERE uc.user_id = auth.uid() 
--       AND uc.ativo = true
--     )
--   );

