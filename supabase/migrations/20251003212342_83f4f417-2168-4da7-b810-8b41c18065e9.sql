-- Move all tables from core schema to public schema (Supabase standard)

-- Drop existing core schema objects
DROP SCHEMA IF EXISTS core CASCADE;

-- Recreate enum types in public schema
CREATE TYPE public.partner_type AS ENUM ('cliente', 'fornecedor', 'transportador');
CREATE TYPE public.material_type AS ENUM ('produto', 'servico', 'materia_prima');
CREATE TYPE public.user_role AS ENUM ('admin', 'user', 'manager');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  permissoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Company relationship (multiempresa)
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Cost Centers
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo)
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo)
);

-- Partners (clientes/fornecedores/transportadores)
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo public.partner_type[] NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  matriz_id UUID REFERENCES public.partners(id),
  endereco JSONB,
  contato JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, cnpj)
);

-- Materials and Services
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  tipo public.material_type NOT NULL,
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
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies uc
    JOIN public.profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = $1 
    AND p.nome = 'Administrador'
    AND uc.ativo = true
  );
$$;

-- Helper function to get user companies
CREATE OR REPLACE FUNCTION public.user_has_company_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = $1 
    AND company_id = $2
    AND ativo = true
  );
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their companies"
  ON public.companies FOR SELECT
  USING (
    public.user_has_company_access(auth.uid(), id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for users
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for user_companies
CREATE POLICY "Users can view their company associations"
  ON public.user_companies FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage user_companies"
  ON public.user_companies FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Everyone can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for cost_centers
CREATE POLICY "Users can view cost_centers of their companies"
  ON public.cost_centers FOR SELECT
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage cost_centers of their companies"
  ON public.cost_centers FOR ALL
  USING (public.user_has_company_access(auth.uid(), company_id));

-- RLS Policies for projects
CREATE POLICY "Users can view projects of their companies"
  ON public.projects FOR SELECT
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage projects of their companies"
  ON public.projects FOR ALL
  USING (public.user_has_company_access(auth.uid(), company_id));

-- RLS Policies for partners
CREATE POLICY "Users can view partners of their companies"
  ON public.partners FOR SELECT
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage partners of their companies"
  ON public.partners FOR ALL
  USING (public.user_has_company_access(auth.uid(), company_id));

-- RLS Policies for materials
CREATE POLICY "Users can view materials of their companies"
  ON public.materials FOR SELECT
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage materials of their companies"
  ON public.materials FOR ALL
  USING (public.user_has_company_access(auth.uid(), company_id));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create trigger to auto-populate public.users when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, nome, email)
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default admin profile
INSERT INTO public.profiles (nome, descricao, permissoes) VALUES
  ('Administrador', 'Acesso completo ao sistema', '{"admin": true, "all_modules": true}'),
  ('Gerente', 'Acesso de gerência', '{"manager": true, "view_reports": true}'),
  ('Usuário', 'Acesso básico', '{"user": true, "view_only": false}');

-- Create indexes for better performance
CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX idx_cost_centers_company_id ON public.cost_centers(company_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_partners_company_id ON public.partners(company_id);
CREATE INDEX idx_materials_company_id ON public.materials(company_id);