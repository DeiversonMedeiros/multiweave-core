-- =====================================================
-- CRIAÇÃO DA TABELA SERVICES (SERVIÇOS)
-- =====================================================

-- Criar tabela de serviços
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  descricao TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_services_company_id ON public.services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_project_id ON public.services(project_id);
CREATE INDEX IF NOT EXISTS idx_services_partner_id ON public.services(partner_id);
CREATE INDEX IF NOT EXISTS idx_services_codigo ON public.services(codigo);
CREATE INDEX IF NOT EXISTS idx_services_ativo ON public.services(ativo);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION update_services_updated_at();

-- Habilitar RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS básicas (ajustar conforme necessário)
-- Política para SELECT: usuários podem ver serviços da empresa
CREATE POLICY "Users can view services from their company"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = services.company_id
      AND uc.ativo = true
    )
  );

-- Política para INSERT: usuários podem criar serviços na empresa
CREATE POLICY "Users can create services in their company"
  ON public.services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = services.company_id
      AND uc.ativo = true
    )
  );

-- Política para UPDATE: usuários podem atualizar serviços da empresa
CREATE POLICY "Users can update services from their company"
  ON public.services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = services.company_id
      AND uc.ativo = true
    )
  );

-- Política para DELETE: usuários podem deletar serviços da empresa
CREATE POLICY "Users can delete services from their company"
  ON public.services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = services.company_id
      AND uc.ativo = true
    )
  );

