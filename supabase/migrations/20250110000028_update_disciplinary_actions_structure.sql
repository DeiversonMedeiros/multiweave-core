-- =====================================================
-- ATUALIZAÇÃO DA ESTRUTURA DA TABELA DISCIPLINARY_ACTIONS
-- =====================================================

-- Adicionar campos faltantes conforme documentação
ALTER TABLE rh.disciplinary_actions 
ADD COLUMN IF NOT EXISTS duration_days INTEGER;

ALTER TABLE rh.disciplinary_actions 
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE rh.disciplinary_actions 
ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE rh.disciplinary_actions 
ADD COLUMN IF NOT EXISTS documents JSONB;

ALTER TABLE rh.disciplinary_actions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Atualizar constraint de tipos para separar advertência verbal/escrita
ALTER TABLE rh.disciplinary_actions 
DROP CONSTRAINT IF EXISTS disciplinary_actions_tipo_acao_check;

ALTER TABLE rh.disciplinary_actions 
ADD CONSTRAINT disciplinary_actions_tipo_acao_check 
CHECK (tipo_acao IN ('advertencia_verbal', 'advertencia_escrita', 'suspensao', 'demissao_justa_causa'));

-- Adicionar comentários para os novos campos
COMMENT ON COLUMN rh.disciplinary_actions.duration_days IS 'Duração em dias para suspensões';
COMMENT ON COLUMN rh.disciplinary_actions.start_date IS 'Data de início da suspensão';
COMMENT ON COLUMN rh.disciplinary_actions.end_date IS 'Data de fim da suspensão';
COMMENT ON COLUMN rh.disciplinary_actions.documents IS 'Documentos anexados (evidências, testemunhos, etc.)';
COMMENT ON COLUMN rh.disciplinary_actions.is_active IS 'Indica se a ação está ativa';

-- Atualizar comentário da tabela
COMMENT ON TABLE rh.disciplinary_actions IS 'Ações disciplinares aplicadas aos funcionários - Estrutura atualizada conforme documentação';

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_duration_days ON rh.disciplinary_actions(duration_days);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_start_date ON rh.disciplinary_actions(start_date);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_end_date ON rh.disciplinary_actions(end_date);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_is_active ON rh.disciplinary_actions(is_active);

-- Atualizar constraint de status para incluir novos status
ALTER TABLE rh.disciplinary_actions 
DROP CONSTRAINT IF EXISTS disciplinary_actions_status_check;

ALTER TABLE rh.disciplinary_actions 
ADD CONSTRAINT disciplinary_actions_status_check 
CHECK (status IN ('active', 'suspended', 'expired', 'cancelled'));

-- Atualizar constraint de gravidade para incluir novos níveis
ALTER TABLE rh.disciplinary_actions 
DROP CONSTRAINT IF EXISTS disciplinary_actions_gravidade_check;

ALTER TABLE rh.disciplinary_actions 
ADD CONSTRAINT disciplinary_actions_gravidade_check 
CHECK (gravidade IN ('leve', 'moderada', 'grave', 'gravissima'));

-- Adicionar trigger para updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_disciplinary_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_disciplinary_actions_updated_at'
        AND tgrelid = 'rh.disciplinary_actions'::regclass
    ) THEN
        CREATE TRIGGER trigger_update_disciplinary_actions_updated_at
            BEFORE UPDATE ON rh.disciplinary_actions
            FOR EACH ROW
            EXECUTE FUNCTION update_disciplinary_actions_updated_at();
    END IF;
END $$;
