-- =====================================================
-- IMPLEMENTAÇÃO DE RLS PARA EXAMES PERIÓDICOS
-- =====================================================

-- Habilitar RLS na tabela periodic_exams
ALTER TABLE rh.periodic_exams ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA EXAMES PERIÓDICOS
-- =====================================================

-- Política: Usuários podem visualizar exames da sua empresa
CREATE POLICY "Users can view periodic exams from their company" ON rh.periodic_exams
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Política: Usuários podem inserir exames na sua empresa
CREATE POLICY "Users can insert periodic exams in their company" ON rh.periodic_exams
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Política: Usuários podem atualizar exames da sua empresa
CREATE POLICY "Users can update periodic exams from their company" ON rh.periodic_exams
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Política: Usuários podem deletar exames da sua empresa
CREATE POLICY "Users can delete periodic exams from their company" ON rh.periodic_exams
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- =====================================================
-- POLÍTICA ESPECIAL PARA COLABORADORES
-- =====================================================

-- Política: Colaboradores podem visualizar apenas seus próprios exames
CREATE POLICY "Employees can view their own periodic exams" ON rh.periodic_exams
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM rh.employees 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON POLICY "Users can view periodic exams from their company" ON rh.periodic_exams IS 
'Permite que usuários visualizem exames periódicos da sua empresa';

COMMENT ON POLICY "Users can insert periodic exams in their company" ON rh.periodic_exams IS 
'Permite que usuários insiram exames periódicos na sua empresa';

COMMENT ON POLICY "Users can update periodic exams from their company" ON rh.periodic_exams IS 
'Permite que usuários atualizem exames periódicos da sua empresa';

COMMENT ON POLICY "Users can delete periodic exams from their company" ON rh.periodic_exams IS 
'Permite que usuários deletem exames periódicos da sua empresa';

COMMENT ON POLICY "Employees can view their own periodic exams" ON rh.periodic_exams IS 
'Permite que colaboradores visualizem apenas seus próprios exames periódicos';
