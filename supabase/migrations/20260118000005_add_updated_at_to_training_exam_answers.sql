-- =====================================================
-- ADICIONAR COLUNA updated_at À TABELA training_exam_answers
-- =====================================================
-- A tabela training_exam_answers não tinha a coluna updated_at,
-- mas o EntityService tenta atualizá-la automaticamente
-- =====================================================

ALTER TABLE rh.training_exam_answers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION rh.update_training_exam_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir
DROP TRIGGER IF EXISTS trigger_update_training_exam_answers_updated_at ON rh.training_exam_answers;

-- Criar trigger
CREATE TRIGGER trigger_update_training_exam_answers_updated_at
    BEFORE UPDATE ON rh.training_exam_answers
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_training_exam_answers_updated_at();
