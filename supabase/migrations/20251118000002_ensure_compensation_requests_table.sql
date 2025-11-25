-- =====================================================
-- MIGRATION: ENSURE COMPENSATION_REQUESTS TABLE EXISTS
-- =====================================================
-- Garantir que a tabela compensation_requests existe com a estrutura correta
-- Esta migration é idempotente e não altera a estrutura existente
-- =====================================================

-- Criar tabela se não existir (estrutura conforme o banco de dados existente)
CREATE TABLE IF NOT EXISTS rh.compensation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_inicio DATE NOT NULL,
    quantidade_horas DECIMAL(5,2) NOT NULL,
    descricao TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim DATE,
    valor_hora DECIMAL(10,2),
    valor_total DECIMAL(10,2),
    motivo_rejeicao TEXT,
    anexos TEXT[],
    CONSTRAINT compensation_requests_status_check 
        CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'realizado')),
    CONSTRAINT compensation_requests_tipo_check 
        CHECK (tipo IN ('horas_extras', 'banco_horas', 'adicional_noturno', 
                        'adicional_periculosidade', 'adicional_insalubridade', 
                        'dsr', 'feriado', 'outros'))
);

-- Adicionar colunas que podem não existir (idempotente)
DO $$ 
BEGIN
    -- Adicionar data_fim se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'compensation_requests' 
                   AND column_name = 'data_fim') THEN
        ALTER TABLE rh.compensation_requests ADD COLUMN data_fim DATE;
    END IF;
    
    -- Adicionar valor_hora se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'compensation_requests' 
                   AND column_name = 'valor_hora') THEN
        ALTER TABLE rh.compensation_requests ADD COLUMN valor_hora DECIMAL(10,2);
    END IF;
    
    -- Adicionar valor_total se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'compensation_requests' 
                   AND column_name = 'valor_total') THEN
        ALTER TABLE rh.compensation_requests ADD COLUMN valor_total DECIMAL(10,2);
    END IF;
    
    -- Adicionar motivo_rejeicao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'compensation_requests' 
                   AND column_name = 'motivo_rejeicao') THEN
        ALTER TABLE rh.compensation_requests ADD COLUMN motivo_rejeicao TEXT;
    END IF;
    
    -- Adicionar anexos se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'compensation_requests' 
                   AND column_name = 'anexos') THEN
        ALTER TABLE rh.compensation_requests ADD COLUMN anexos TEXT[];
    END IF;
END $$;

-- Criar índices se não existirem (idempotente)
CREATE INDEX IF NOT EXISTS idx_compensation_requests_company_id 
    ON rh.compensation_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_employee_id 
    ON rh.compensation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_status 
    ON rh.compensation_requests(status);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_data_inicio 
    ON rh.compensation_requests(data_inicio);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_data_fim 
    ON rh.compensation_requests(data_fim);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_aprovado_por 
    ON rh.compensation_requests(aprovado_por);

-- Criar/atualizar função para updated_at (idempotente)
CREATE OR REPLACE FUNCTION update_compensation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir (idempotente)
DROP TRIGGER IF EXISTS trigger_update_compensation_requests_updated_at ON rh.compensation_requests;
CREATE TRIGGER trigger_update_compensation_requests_updated_at
    BEFORE UPDATE ON rh.compensation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_compensation_requests_updated_at();

-- Habilitar RLS (idempotente)
ALTER TABLE rh.compensation_requests ENABLE ROW LEVEL SECURITY;

-- Comentários (idempotente)
COMMENT ON TABLE rh.compensation_requests IS 'Tabela de solicitações de compensação de horas - ESTRUTURA PADRONIZADA';
COMMENT ON COLUMN rh.compensation_requests.employee_id IS 'ID do funcionário que solicitou a compensação';
COMMENT ON COLUMN rh.compensation_requests.tipo IS 'Tipo de compensação: horas_extras, banco_horas, adicional_noturno, etc.';
COMMENT ON COLUMN rh.compensation_requests.data_inicio IS 'Data de início da compensação';
COMMENT ON COLUMN rh.compensation_requests.data_fim IS 'Data de fim da compensação';
COMMENT ON COLUMN rh.compensation_requests.quantidade_horas IS 'Quantidade de horas solicitadas para compensação';
COMMENT ON COLUMN rh.compensation_requests.descricao IS 'Descrição/justificativa da solicitação';
COMMENT ON COLUMN rh.compensation_requests.status IS 'Status: pendente, aprovado, rejeitado, realizado';

