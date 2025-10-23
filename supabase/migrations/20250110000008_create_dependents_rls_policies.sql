-- =====================================================
-- POLÍTICAS RLS PARA TABELA DE DEPENDENTES
-- =====================================================

-- Habilitar RLS na tabela de dependentes
ALTER TABLE rh.dependents ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários podem ver dependentes da sua empresa
CREATE POLICY "Users can view dependents from their company" ON rh.dependents
  FOR SELECT
  USING (
    company_id IN (
      SELECT uc.company_id 
      FROM core.user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    )
  );

-- Política para INSERT - usuários podem criar dependentes na sua empresa
CREATE POLICY "Users can create dependents in their company" ON rh.dependents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT uc.company_id 
      FROM core.user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    )
  );

-- Política para UPDATE - usuários podem atualizar dependentes da sua empresa
CREATE POLICY "Users can update dependents from their company" ON rh.dependents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT uc.company_id 
      FROM core.user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT uc.company_id 
      FROM core.user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    )
  );

-- Política para DELETE - usuários podem deletar dependentes da sua empresa
CREATE POLICY "Users can delete dependents from their company" ON rh.dependents
  FOR DELETE
  USING (
    company_id IN (
      SELECT uc.company_id 
      FROM core.user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    )
  );

-- Habilitar RLS na view de dependentes com funcionário
ALTER VIEW rh.dependents_with_employee SET (security_invoker = true);

-- Comentários nas políticas
COMMENT ON POLICY "Users can view dependents from their company" ON rh.dependents IS 
  'Permite que usuários vejam dependentes apenas da sua empresa';

COMMENT ON POLICY "Users can create dependents in their company" ON rh.dependents IS 
  'Permite que usuários criem dependentes apenas na sua empresa';

COMMENT ON POLICY "Users can update dependents from their company" ON rh.dependents IS 
  'Permite que usuários atualizem dependentes apenas da sua empresa';

COMMENT ON POLICY "Users can delete dependents from their company" ON rh.dependents IS 
  'Permite que usuários deletem dependentes apenas da sua empresa';
