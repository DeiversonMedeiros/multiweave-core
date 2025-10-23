-- Create schema core for the ERP system
CREATE SCHEMA IF NOT EXISTS core;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE core.partner_type AS ENUM ('cliente', 'fornecedor', 'transportador');
CREATE TYPE core.material_type AS ENUM ('produto', 'servico', 'materia_prima');
CREATE TYPE core.user_role AS ENUM ('admin', 'user', 'manager');

-- Companies table
CREATE TABLE core.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  inscricao_estadual TEXT,
  endereco JSONB,
  contato JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (access levels)
CREATE TABLE core.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  permissoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends auth.users)
CREATE TABLE core.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Company relationship (multiempresa)
CREATE TABLE core.user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES core.companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES core.profiles(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Cost Centers
CREATE TABLE core.cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES core.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo)
);

-- Projects
CREATE TABLE core.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES core.companies(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES core.cost_centers(id),
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo)
);

-- Partners (clientes/fornecedores/transportadores)
CREATE TABLE core.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES core.companies(id) ON DELETE CASCADE,
  tipo core.partner_type[] NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  matriz_id UUID REFERENCES core.partners(id),
  endereco JSONB,
  contato JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, cnpj)
);

-- Materials and Services
CREATE TABLE core.materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES core.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  tipo core.material_type NOT NULL,
  unidade_medida TEXT NOT NULL,
  classe TEXT,
  ncm TEXT,
  cfop TEXT,
  cst TEXT,
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo)
);

-- Enable Row Level Security
ALTER TABLE core.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.materials ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION core.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.user_companies uc
    JOIN core.profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = $1 
    AND p.nome = 'Administrador'
    AND uc.ativo = true
  );
$$;

-- Helper function to get user companies
CREATE OR REPLACE FUNCTION core.user_has_company_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.user_companies
    WHERE user_id = $1 
    AND company_id = $2
    AND ativo = true
  );
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their companies"
  ON core.companies FOR SELECT
  USING (
    core.user_has_company_access(auth.uid(), id)
    OR core.is_admin(auth.uid())
  );

CREATE POLICY "Admins can insert companies"
  ON core.companies FOR INSERT
  WITH CHECK (core.is_admin(auth.uid()));

CREATE POLICY "Admins can update companies"
  ON core.companies FOR UPDATE
  USING (core.is_admin(auth.uid()));

-- RLS Policies for users
CREATE POLICY "Users can view all users"
  ON core.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON core.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON core.users FOR INSERT
  WITH CHECK (core.is_admin(auth.uid()));

-- RLS Policies for user_companies
CREATE POLICY "Users can view their company associations"
  ON core.user_companies FOR SELECT
  USING (user_id = auth.uid() OR core.is_admin(auth.uid()));

CREATE POLICY "Admins can manage user_companies"
  ON core.user_companies FOR ALL
  USING (core.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Everyone can view profiles"
  ON core.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage profiles"
  ON core.profiles FOR ALL
  USING (core.is_admin(auth.uid()));

-- RLS Policies for cost_centers
CREATE POLICY "Users can view cost_centers of their companies"
  ON core.cost_centers FOR SELECT
  USING (core.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage cost_centers of their companies"
  ON core.cost_centers FOR ALL
  USING (core.user_has_company_access(auth.uid(), company_id));

-- RLS Policies for projects
CREATE POLICY "Users can view projects of their companies"
  ON core.projects FOR SELECT
  USING (core.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage projects of their companies"
  ON core.projects FOR ALL
  USING (core.user_has_company_access(auth.uid(), company_id));

-- RLS Policies for partners
CREATE POLICY "Users can view partners of their companies"
  ON core.partners FOR SELECT
  USING (core.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage partners of their companies"
  ON core.partners FOR ALL
  USING (core.user_has_company_access(auth.uid(), company_id));

-- RLS Policies for materials
CREATE POLICY "Users can view materials of their companies"
  ON core.materials FOR SELECT
  USING (core.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage materials of their companies"
  ON core.materials FOR ALL
  USING (core.user_has_company_access(auth.uid(), company_id));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION core.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON core.companies
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON core.users
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON core.cost_centers
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON core.projects
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON core.partners
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON core.materials
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON core.profiles
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at();

-- Create trigger to auto-populate core.users when auth.users is created
CREATE OR REPLACE FUNCTION core.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  INSERT INTO core.users (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION core.handle_new_user();

-- Insert default admin profile
INSERT INTO core.profiles (nome, descricao, permissoes) VALUES
  ('Administrador', 'Acesso completo ao sistema', '{"admin": true, "all_modules": true}'),
  ('Gerente', 'Acesso de gerência', '{"manager": true, "view_reports": true}'),
  ('Usuário', 'Acesso básico', '{"user": true, "view_only": false}');

-- Create indexes for better performance
CREATE INDEX idx_user_companies_user_id ON core.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON core.user_companies(company_id);
CREATE INDEX idx_cost_centers_company_id ON core.cost_centers(company_id);
CREATE INDEX idx_projects_company_id ON core.projects(company_id);
CREATE INDEX idx_partners_company_id ON core.partners(company_id);
CREATE INDEX idx_materials_company_id ON core.materials(company_id);
