-- =====================================================
-- CRIAÇÃO DA TABELA SCHEDULE_PLANNING (PROGRAMAÇÃO DE ESCALAS)
-- =====================================================

-- Criar tabela de programação de escalas
CREATE TABLE IF NOT EXISTS rh.schedule_planning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovado', 'ativo', 'finalizado')),
    total_funcionarios INTEGER DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_schedule_planning_periodo CHECK (periodo_fim >= periodo_inicio)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_schedule_planning_company_id ON rh.schedule_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_schedule_planning_periodo_inicio ON rh.schedule_planning(periodo_inicio);
CREATE INDEX IF NOT EXISTS idx_schedule_planning_periodo_fim ON rh.schedule_planning(periodo_fim);
CREATE INDEX IF NOT EXISTS idx_schedule_planning_status ON rh.schedule_planning(status);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_schedule_planning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_planning_updated_at
    BEFORE UPDATE ON rh.schedule_planning
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_planning_updated_at();

-- Habilitar RLS
ALTER TABLE rh.schedule_planning ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view schedule_planning from their company" ON rh.schedule_planning
    FOR SELECT USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can insert schedule_planning in their company" ON rh.schedule_planning
    FOR INSERT WITH CHECK (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can update schedule_planning from their company" ON rh.schedule_planning
    FOR UPDATE USING (
        user_has_company_access(company_id)
    );

CREATE POLICY "Users can delete schedule_planning from their company" ON rh.schedule_planning
    FOR DELETE USING (
        user_has_company_access(company_id)
    );

-- Comentários
COMMENT ON TABLE rh.schedule_planning IS 'Tabela de programação de escalas de trabalho';
COMMENT ON COLUMN rh.schedule_planning.nome IS 'Nome da programação de escala';
COMMENT ON COLUMN rh.schedule_planning.periodo_inicio IS 'Data de início do período da escala';
COMMENT ON COLUMN rh.schedule_planning.periodo_fim IS 'Data de fim do período da escala';
COMMENT ON COLUMN rh.schedule_planning.status IS 'Status da programação: rascunho, aprovado, ativo, finalizado';
COMMENT ON COLUMN rh.schedule_planning.total_funcionarios IS 'Total de funcionários incluídos na programação';
