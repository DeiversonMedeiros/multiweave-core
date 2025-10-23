-- =====================================================
-- POLÍTICAS RLS PARA TABELA DE DEPENDENTES
-- =====================================================

-- Habilitar RLS na tabela dependents
ALTER TABLE rh.dependents ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver dependentes da sua empresa
CREATE POLICY "Users can view dependents from their company" ON rh.dependents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem inserir dependentes na sua empresa
CREATE POLICY "Users can insert dependents in their company" ON rh.dependents
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar dependentes da sua empresa
CREATE POLICY "Users can update dependents from their company" ON rh.dependents
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem excluir dependentes da sua empresa
CREATE POLICY "Users can delete dependents from their company" ON rh.dependents
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Comentários das políticas
COMMENT ON POLICY "Users can view dependents from their company" ON rh.dependents IS 'Permite visualizar dependentes da empresa do usuário';
COMMENT ON POLICY "Users can insert dependents in their company" ON rh.dependents IS 'Permite inserir dependentes na empresa do usuário';
COMMENT ON POLICY "Users can update dependents from their company" ON rh.dependents IS 'Permite atualizar dependentes da empresa do usuário';
COMMENT ON POLICY "Users can delete dependents from their company" ON rh.dependents IS 'Permite excluir dependentes da empresa do usuário';
