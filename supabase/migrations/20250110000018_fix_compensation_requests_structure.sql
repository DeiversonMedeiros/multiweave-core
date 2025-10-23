-- =====================================================
-- CORREÇÃO DA ESTRUTURA DA TABELA COMPENSATION_REQUESTS
-- =====================================================

-- Renomear colunas para padronizar com o código
ALTER TABLE rh.compensation_requests 
RENAME COLUMN funcionario_id TO employee_id;

ALTER TABLE rh.compensation_requests 
RENAME COLUMN tipo_compensacao TO tipo;

ALTER TABLE rh.compensation_requests 
RENAME COLUMN data_compensacao TO data_inicio;

-- Adicionar coluna data_fim se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'rh' 
                   AND table_name = 'compensation_requests' 
                   AND column_name = 'data_fim') THEN
        ALTER TABLE rh.compensation_requests ADD COLUMN data_fim DATE;
    END IF;
END $$;

ALTER TABLE rh.compensation_requests 
RENAME COLUMN horas_solicitadas TO quantidade_horas;

ALTER TABLE rh.compensation_requests 
RENAME COLUMN motivo TO descricao;

-- Adicionar colunas que faltam
DO $$ 
BEGIN
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

-- Atualizar constraint de status para incluir 'realizado'
ALTER TABLE rh.compensation_requests 
DROP CONSTRAINT IF EXISTS compensation_requests_status_check;

ALTER TABLE rh.compensation_requests 
ADD CONSTRAINT compensation_requests_status_check 
CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'realizado'));

-- Atualizar constraint de tipo
ALTER TABLE rh.compensation_requests 
DROP CONSTRAINT IF EXISTS compensation_requests_tipo_check;

ALTER TABLE rh.compensation_requests 
ADD CONSTRAINT compensation_requests_tipo_check 
CHECK (tipo IN ('horas_extras', 'banco_horas', 'adicional_noturno', 'adicional_periculosidade', 'adicional_insalubridade', 'dsr', 'feriado', 'outros'));

-- Atualizar índices
DROP INDEX IF EXISTS idx_compensation_requests_funcionario_id;
CREATE INDEX IF NOT EXISTS idx_compensation_requests_employee_id ON rh.compensation_requests(employee_id);

DROP INDEX IF EXISTS idx_compensation_requests_data_compensacao;
CREATE INDEX IF NOT EXISTS idx_compensation_requests_data_inicio ON rh.compensation_requests(data_inicio);
CREATE INDEX IF NOT EXISTS idx_compensation_requests_data_fim ON rh.compensation_requests(data_fim);

-- Comentários atualizados
COMMENT ON TABLE rh.compensation_requests IS 'Tabela de solicitações de compensação de horas - ESTRUTURA PADRONIZADA';
COMMENT ON COLUMN rh.compensation_requests.employee_id IS 'ID do funcionário que solicitou a compensação';
COMMENT ON COLUMN rh.compensation_requests.tipo IS 'Tipo de compensação: horas_extras, banco_horas, adicional_noturno, etc.';
COMMENT ON COLUMN rh.compensation_requests.data_inicio IS 'Data de início da compensação';
COMMENT ON COLUMN rh.compensation_requests.data_fim IS 'Data de fim da compensação';
COMMENT ON COLUMN rh.compensation_requests.quantidade_horas IS 'Quantidade de horas solicitadas para compensação';
COMMENT ON COLUMN rh.compensation_requests.descricao IS 'Descrição/justificativa da solicitação';
COMMENT ON COLUMN rh.compensation_requests.valor_hora IS 'Valor da hora (opcional)';
COMMENT ON COLUMN rh.compensation_requests.valor_total IS 'Valor total calculado (opcional)';
COMMENT ON COLUMN rh.compensation_requests.status IS 'Status: pendente, aprovado, rejeitado, realizado';
COMMENT ON COLUMN rh.compensation_requests.motivo_rejeicao IS 'Motivo da rejeição (quando aplicável)';
COMMENT ON COLUMN rh.compensation_requests.anexos IS 'Array de URLs dos anexos';
