-- Adicionar suporte multi-tenant
-- Adicionar company_id na tabela profiles (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    END IF;
END $$;

-- Criar índices para performance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
    END IF;
END $$;
-- Índices para tabelas que serão criadas posteriormente
-- CREATE INDEX IF NOT EXISTS idx_cost_centers_company_id ON cost_centers(company_id);
-- CREATE INDEX IF NOT EXISTS idx_materials_company_id ON materials(company_id);
-- CREATE INDEX IF NOT EXISTS idx_partners_company_id ON partners(company_id);
-- CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

-- Atualizar políticas RLS para suporte multi-tenant
-- Políticas para users serão criadas quando a tabela existir
-- (Comentado temporariamente)

-- Função para verificar se usuário tem acesso à empresa
CREATE OR REPLACE FUNCTION user_has_company_access(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin tem acesso a todas as empresas
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se o usuário tem acesso à empresa
  RETURN EXISTS (
    SELECT 1
    FROM user_companies uc
    WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter empresas do usuário (comentada - duplicada)
-- CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID DEFAULT auth.uid())
-- RETURNS TABLE (
--   company_id UUID,
--   razao_social TEXT,
--   nome_fantasia TEXT,
--   cnpj TEXT,
--   inscricao_estadual TEXT,
--   endereco JSONB,
--   contato JSONB,
--   ativo BOOLEAN,
--   created_at TIMESTAMP WITH TIME ZONE,
--   updated_at TIMESTAMP WITH TIME ZONE
-- ) AS $$
-- BEGIN
--   -- Se for super admin, retorna todas as empresas
--   IF is_admin(p_user_id) THEN
--     RETURN QUERY
--     SELECT 
--       c.id as company_id,
--       c.razao_social,
--       c.nome_fantasia,
--       c.cnpj,
--       c.inscricao_estadual,
--       c.endereco,
--       c.contato,
--       c.ativo,
--       c.created_at,
--       c.updated_at
--     FROM companies c
--     WHERE c.ativo = true
--     ORDER BY c.nome_fantasia;
--     RETURN;
--   END IF;
--   
--   -- Retorna empresas do usuário
--   RETURN QUERY
--   SELECT 
--     c.id as company_id,
--     c.razao_social,
--     c.nome_fantasia,
--     c.cnpj,
--     c.inscricao_estadual,
--     c.endereco,
--     c.contato,
--     c.ativo,
--     c.created_at,
--     c.updated_at
--   FROM user_companies uc
--   JOIN companies c ON uc.company_id = c.id
--   WHERE uc.user_id = p_user_id
--     AND uc.ativo = true
--     AND c.ativo = true
--   ORDER BY c.nome_fantasia;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar isolamento de tabela
CREATE OR REPLACE FUNCTION table_has_company_isolation(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN table_name IN (
    'users',
    'cost_centers',
    'materials',
    'partners',
    'projects'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

