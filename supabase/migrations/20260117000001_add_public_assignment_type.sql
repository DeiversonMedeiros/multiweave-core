-- =====================================================
-- ADICIONAR TIPO DE ATRIBUIÇÃO "PÚBLICA"
-- Permite que treinamentos sejam acessíveis a todos os usuários
-- =====================================================

-- Remover constraint antiga
ALTER TABLE rh.training_assignments 
DROP CONSTRAINT IF EXISTS chk_assignment_target;

-- Adicionar nova constraint que permite todos os campos NULL quando tipo_atribuicao = 'publica'
ALTER TABLE rh.training_assignments 
ADD CONSTRAINT chk_assignment_target CHECK (
    (tipo_atribuicao = 'publica') OR 
    (employee_id IS NOT NULL) OR 
    (position_id IS NOT NULL) OR 
    (unit_id IS NOT NULL)
);

-- Atualizar comentário do campo tipo_atribuicao
COMMENT ON COLUMN rh.training_assignments.tipo_atribuicao IS 'Tipo de atribuição: obrigatorio, opcional ou publica (acesso para todos os usuários)';
