-- =====================================================
-- TABELA: PROCESSING JOBS (Jobs de Processamento)
-- =====================================================
-- Armazena jobs de processamento assíncrono da folha de pagamento

CREATE TABLE IF NOT EXISTS rh.processing_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Status do job
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Progresso
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    total_employees INTEGER DEFAULT 0,
    processed_employees INTEGER DEFAULT 0,
    successful_employees INTEGER DEFAULT 0,
    failed_employees INTEGER DEFAULT 0,
    
    -- Informações atuais
    current_employee VARCHAR(255),
    current_step VARCHAR(255),
    estimated_time_remaining INTEGER DEFAULT 0, -- em segundos
    processing_time INTEGER DEFAULT 0, -- em milissegundos
    
    -- Erros e resultados
    errors JSONB DEFAULT '[]'::jsonb,
    results JSONB,
    
    -- Configuração do job
    config JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Usuário responsável
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT processing_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT processing_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_company_id ON rh.processing_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON rh.processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_by ON rh.processing_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON rh.processing_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status_created_at ON rh.processing_jobs(status, created_at);

-- Comentários
COMMENT ON TABLE rh.processing_jobs IS 'Jobs de processamento assíncrono da folha de pagamento';
COMMENT ON COLUMN rh.processing_jobs.status IS 'Status do job: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN rh.processing_jobs.progress IS 'Progresso do job (0-100)';
COMMENT ON COLUMN rh.processing_jobs.total_employees IS 'Total de funcionários a processar';
COMMENT ON COLUMN rh.processing_jobs.processed_employees IS 'Funcionários já processados';
COMMENT ON COLUMN rh.processing_jobs.successful_employees IS 'Funcionários processados com sucesso';
COMMENT ON COLUMN rh.processing_jobs.failed_employees IS 'Funcionários com falha no processamento';
COMMENT ON COLUMN rh.processing_jobs.current_employee IS 'Nome do funcionário sendo processado atualmente';
COMMENT ON COLUMN rh.processing_jobs.current_step IS 'Etapa atual do processamento';
COMMENT ON COLUMN rh.processing_jobs.estimated_time_remaining IS 'Tempo estimado restante em segundos';
COMMENT ON COLUMN rh.processing_jobs.processing_time IS 'Tempo total de processamento em milissegundos';
COMMENT ON COLUMN rh.processing_jobs.errors IS 'Lista de erros encontrados durante o processamento';
COMMENT ON COLUMN rh.processing_jobs.results IS 'Resultados detalhados do processamento';
COMMENT ON COLUMN rh.processing_jobs.config IS 'Configuração completa do job de processamento';

-- =====================================================
-- FUNÇÕES PARA JOBS DE PROCESSAMENTO
-- =====================================================

-- Função para atualizar progresso do job
CREATE OR REPLACE FUNCTION rh.update_job_progress(
    p_job_id UUID,
    p_progress INTEGER,
    p_processed_employees INTEGER,
    p_successful_employees INTEGER,
    p_failed_employees INTEGER,
    p_current_employee VARCHAR(255),
    p_current_step VARCHAR(255),
    p_estimated_time_remaining INTEGER,
    p_errors JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.processing_jobs SET
        progress = p_progress,
        processed_employees = p_processed_employees,
        successful_employees = p_successful_employees,
        failed_employees = p_failed_employees,
        current_employee = p_current_employee,
        current_step = p_current_step,
        estimated_time_remaining = p_estimated_time_remaining,
        errors = COALESCE(p_errors, errors),
        updated_at = now()
    WHERE id = p_job_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para finalizar job
CREATE OR REPLACE FUNCTION rh.complete_job(
    p_job_id UUID,
    p_status VARCHAR(20),
    p_results JSONB DEFAULT NULL,
    p_errors JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE rh.processing_jobs SET
        status = p_status,
        results = COALESCE(p_results, results),
        errors = COALESCE(p_errors, errors),
        completed_at = now(),
        updated_at = now()
    WHERE id = p_job_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar jobs por status
CREATE OR REPLACE FUNCTION rh.get_jobs_by_status(
    p_company_id UUID,
    p_status VARCHAR(20)
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    status VARCHAR(20),
    progress INTEGER,
    total_employees INTEGER,
    processed_employees INTEGER,
    successful_employees INTEGER,
    failed_employees INTEGER,
    current_employee VARCHAR(255),
    current_step VARCHAR(255),
    estimated_time_remaining INTEGER,
    processing_time INTEGER,
    errors JSONB,
    results JSONB,
    config JSONB,
    created_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pj.id, pj.company_id, pj.status, pj.progress,
        pj.total_employees, pj.processed_employees, pj.successful_employees, pj.failed_employees,
        pj.current_employee, pj.current_step, pj.estimated_time_remaining, pj.processing_time,
        pj.errors, pj.results, pj.config,
        pj.created_at, pj.started_at, pj.completed_at, pj.updated_at, pj.created_by
    FROM rh.processing_jobs pj
    WHERE pj.company_id = p_company_id
        AND pj.status = p_status
    ORDER BY pj.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas de jobs
CREATE OR REPLACE FUNCTION rh.get_job_stats(p_company_id UUID)
RETURNS TABLE(
    total_jobs BIGINT,
    pending_jobs BIGINT,
    running_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    cancelled_jobs BIGINT,
    average_processing_time NUMERIC,
    total_employees_processed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_jobs,
        COALESCE(AVG(processing_time) FILTER (WHERE status = 'completed'), 0) as average_processing_time,
        COALESCE(SUM(processed_employees) FILTER (WHERE status = 'completed'), 0) as total_employees_processed
    FROM rh.processing_jobs
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar jobs antigos
CREATE OR REPLACE FUNCTION rh.cleanup_old_jobs(
    p_company_id UUID,
    p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rh.processing_jobs
    WHERE company_id = p_company_id
        AND status IN ('completed', 'failed', 'cancelled')
        AND created_at < (now() - INTERVAL '1 day' * p_days_old);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION rh.update_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_processing_jobs_updated_at
    BEFORE UPDATE ON rh.processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_processing_jobs_updated_at();

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE rh.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso apenas aos jobs da empresa do usuário
CREATE POLICY "Users can access their company's processing jobs" ON rh.processing_jobs
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Política para permitir criação de jobs
CREATE POLICY "Users can create processing jobs for their company" ON rh.processing_jobs
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );
