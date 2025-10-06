-- =====================================================
-- CRIAÇÃO DA TABELA DISCIPLINARY_ACTIONS (AÇÕES DISCIPLINARES)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.disciplinary_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    tipo_acao VARCHAR(30) NOT NULL CHECK (tipo_acao IN ('advertencia', 'suspensao', 'demissao_justa_causa', 'transferencia', 'outros')),
    data_ocorrencia DATE NOT NULL,
    data_aplicacao DATE NOT NULL,
    gravidade VARCHAR(20) NOT NULL CHECK (gravidade IN ('leve', 'moderada', 'grave', 'gravissima')),
    motivo TEXT NOT NULL,
    descricao_ocorrencia TEXT NOT NULL,
    medidas_corretivas TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'arquivado')),
    aplicado_por UUID REFERENCES auth.users(id),
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    anexos TEXT[], -- URLs dos arquivos anexados
    data_arquivamento TIMESTAMP WITH TIME ZONE,
    motivo_arquivamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_company_id ON rh.disciplinary_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_employee_id ON rh.disciplinary_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_tipo_acao ON rh.disciplinary_actions(tipo_acao);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_gravidade ON rh.disciplinary_actions(gravidade);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_status ON rh.disciplinary_actions(status);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_data_ocorrencia ON rh.disciplinary_actions(data_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_data_aplicacao ON rh.disciplinary_actions(data_aplicacao);

-- Comentários das colunas
COMMENT ON TABLE rh.disciplinary_actions IS 'Ações disciplinares aplicadas aos funcionários';
COMMENT ON COLUMN rh.disciplinary_actions.tipo_acao IS 'Tipo: advertencia, suspensao, demissao_justa_causa, transferencia, outros';
COMMENT ON COLUMN rh.disciplinary_actions.gravidade IS 'Gravidade: leve, moderada, grave, gravissima';
COMMENT ON COLUMN rh.disciplinary_actions.status IS 'Status: ativo, suspenso, cancelado, arquivado';
COMMENT ON COLUMN rh.disciplinary_actions.anexos IS 'Array de URLs dos arquivos anexados (evidências, testemunhos, etc.)';
COMMENT ON COLUMN rh.disciplinary_actions.aplicado_por IS 'Usuário que aplicou a ação disciplinar';
COMMENT ON COLUMN rh.disciplinary_actions.aprovado_por IS 'Usuário que aprovou a ação disciplinar';
