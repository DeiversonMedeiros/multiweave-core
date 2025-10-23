-- =====================================================
-- MIGRAÇÃO: CRIAR TABELAS DE RECRUTAMENTO
-- =====================================================
-- Data: 2025-01-10
-- Descrição: Cria todas as tabelas necessárias para o sistema de recrutamento

-- =====================================================
-- 1. SOLICITAÇÕES DE VAGAS (JOB REQUESTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.job_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    position_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(255),
    job_description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    salary_range VARCHAR(100),
    urgency_level VARCHAR(20) DEFAULT 'media' CHECK (urgency_level IN ('baixa', 'media', 'alta', 'critica')),
    status VARCHAR(20) DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'em_analise', 'aprovado', 'reprovado')),
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    expected_start_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.job_requests IS 'Solicitações de vagas pelos gestores';
COMMENT ON COLUMN rh.job_requests.position_name IS 'Nome do cargo solicitado';
COMMENT ON COLUMN rh.job_requests.department_name IS 'Departamento da vaga';
COMMENT ON COLUMN rh.job_requests.job_description IS 'Descrição detalhada do cargo';
COMMENT ON COLUMN rh.job_requests.requirements IS 'Requisitos para o cargo';
COMMENT ON COLUMN rh.job_requests.benefits IS 'Benefícios oferecidos';
COMMENT ON COLUMN rh.job_requests.salary_range IS 'Faixa salarial';
COMMENT ON COLUMN rh.job_requests.urgency_level IS 'Nível de urgência: baixa, media, alta, critica';
COMMENT ON COLUMN rh.job_requests.status IS 'Status da solicitação: solicitado, em_analise, aprovado, reprovado';
COMMENT ON COLUMN rh.job_requests.requested_by IS 'Usuário que solicitou a vaga';
COMMENT ON COLUMN rh.job_requests.approved_by IS 'Usuário que aprovou/rejeitou';
COMMENT ON COLUMN rh.job_requests.expected_start_date IS 'Data esperada para início';
COMMENT ON COLUMN rh.job_requests.rejection_reason IS 'Motivo da rejeição (se aplicável)';

-- =====================================================
-- 2. CANDIDATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    cpf VARCHAR(14),
    birth_date DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    source VARCHAR(20) DEFAULT 'site' CHECK (source IN ('site', 'linkedin', 'indicacao', 'agencia', 'outro')),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'contratado', 'descartado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.candidates IS 'Cadastro de candidatos';
COMMENT ON COLUMN rh.candidates.name IS 'Nome completo do candidato';
COMMENT ON COLUMN rh.candidates.email IS 'Email de contato';
COMMENT ON COLUMN rh.candidates.phone IS 'Telefone de contato';
COMMENT ON COLUMN rh.candidates.cpf IS 'CPF do candidato';
COMMENT ON COLUMN rh.candidates.birth_date IS 'Data de nascimento';
COMMENT ON COLUMN rh.candidates.address IS 'Endereço completo';
COMMENT ON COLUMN rh.candidates.city IS 'Cidade';
COMMENT ON COLUMN rh.candidates.state IS 'Estado (UF)';
COMMENT ON COLUMN rh.candidates.zip_code IS 'CEP';
COMMENT ON COLUMN rh.candidates.linkedin_url IS 'URL do LinkedIn';
COMMENT ON COLUMN rh.candidates.portfolio_url IS 'URL do portfólio';
COMMENT ON COLUMN rh.candidates.source IS 'Origem do candidato: site, linkedin, indicacao, agencia, outro';
COMMENT ON COLUMN rh.candidates.status IS 'Status do candidato: ativo, inativo, contratado, descartado';
COMMENT ON COLUMN rh.candidates.notes IS 'Observações sobre o candidato';

-- =====================================================
-- 3. VAGAS ABERTAS (JOB OPENINGS)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    job_request_id UUID REFERENCES rh.job_requests(id),
    position_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(255),
    job_description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    salary_range VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'pausada', 'fechada', 'preenchida')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.job_openings IS 'Vagas abertas para candidaturas';
COMMENT ON COLUMN rh.job_openings.job_request_id IS 'Referência à solicitação de vaga (se aplicável)';
COMMENT ON COLUMN rh.job_openings.position_name IS 'Nome do cargo';
COMMENT ON COLUMN rh.job_openings.department_name IS 'Departamento';
COMMENT ON COLUMN rh.job_openings.job_description IS 'Descrição da vaga';
COMMENT ON COLUMN rh.job_openings.requirements IS 'Requisitos para a vaga';
COMMENT ON COLUMN rh.job_openings.benefits IS 'Benefícios oferecidos';
COMMENT ON COLUMN rh.job_openings.salary_range IS 'Faixa salarial';
COMMENT ON COLUMN rh.job_openings.status IS 'Status da vaga: aberta, pausada, fechada, preenchida';
COMMENT ON COLUMN rh.job_openings.created_by IS 'Usuário que criou a vaga';
COMMENT ON COLUMN rh.job_openings.published_at IS 'Data de publicação da vaga';
COMMENT ON COLUMN rh.job_openings.closed_at IS 'Data de fechamento da vaga';

-- =====================================================
-- 4. PROCESSOS SELETIVOS
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.selection_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    job_opening_id UUID NOT NULL REFERENCES rh.job_openings(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES rh.candidates(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'finalizado', 'cancelado')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.selection_processes IS 'Processos seletivos de candidatos';
COMMENT ON COLUMN rh.selection_processes.job_opening_id IS 'Vaga para a qual o candidato está concorrendo';
COMMENT ON COLUMN rh.selection_processes.candidate_id IS 'Candidato no processo';
COMMENT ON COLUMN rh.selection_processes.current_stage IS 'Etapa atual do processo';
COMMENT ON COLUMN rh.selection_processes.status IS 'Status do processo: ativo, pausado, finalizado, cancelado';
COMMENT ON COLUMN rh.selection_processes.started_at IS 'Data de início do processo';
COMMENT ON COLUMN rh.selection_processes.completed_at IS 'Data de conclusão do processo';
COMMENT ON COLUMN rh.selection_processes.created_by IS 'Usuário que iniciou o processo';
COMMENT ON COLUMN rh.selection_processes.notes IS 'Observações sobre o processo';

-- =====================================================
-- 5. ETAPAS DO PROCESSO SELETIVO
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.selection_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    selection_process_id UUID NOT NULL REFERENCES rh.selection_processes(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_type VARCHAR(50) NOT NULL CHECK (stage_type IN ('triagem', 'entrevista_telefonica', 'entrevista_presencial', 'teste_tecnico', 'entrevista_final', 'aprovacao')),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'aprovado', 'reprovado', 'desistiu')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    interviewer_id UUID REFERENCES auth.users(id),
    score DECIMAL(3,1),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.selection_stages IS 'Etapas individuais do processo seletivo';
COMMENT ON COLUMN rh.selection_stages.selection_process_id IS 'Processo seletivo ao qual pertence';
COMMENT ON COLUMN rh.selection_stages.stage_name IS 'Nome da etapa';
COMMENT ON COLUMN rh.selection_stages.stage_type IS 'Tipo da etapa: triagem, entrevista_telefonica, entrevista_presencial, teste_tecnico, entrevista_final, aprovacao';
COMMENT ON COLUMN rh.selection_stages.status IS 'Status da etapa: pendente, em_andamento, aprovado, reprovado, desistiu';
COMMENT ON COLUMN rh.selection_stages.scheduled_at IS 'Data/hora agendada';
COMMENT ON COLUMN rh.selection_stages.completed_at IS 'Data/hora de conclusão';
COMMENT ON COLUMN rh.selection_stages.interviewer_id IS 'Entrevistador responsável';
COMMENT ON COLUMN rh.selection_stages.score IS 'Nota da etapa (0-10)';

-- =====================================================
-- 6. BANCO DE TALENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.talent_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES rh.candidates(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    skills TEXT[],
    experience_level VARCHAR(20) CHECK (experience_level IN ('junior', 'pleno', 'senior', 'especialista')),
    availability VARCHAR(20) DEFAULT 'disponivel' CHECK (availability IN ('disponivel', 'interessado', 'indisponivel')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.talent_pool IS 'Banco de talentos da empresa';
COMMENT ON COLUMN rh.talent_pool.candidate_id IS 'Candidato no banco de talentos';
COMMENT ON COLUMN rh.talent_pool.category IS 'Categoria do talento (ex: tecnologia, vendas, administrativo)';
COMMENT ON COLUMN rh.talent_pool.skills IS 'Array de habilidades do candidato';
COMMENT ON COLUMN rh.talent_pool.experience_level IS 'Nível de experiência: junior, pleno, senior, especialista';
COMMENT ON COLUMN rh.talent_pool.availability IS 'Disponibilidade: disponivel, interessado, indisponivel';
COMMENT ON COLUMN rh.talent_pool.notes IS 'Observações sobre o talento';

-- =====================================================
-- 7. DOCUMENTOS DOS CANDIDATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS rh.candidate_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES rh.candidates(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('curriculo', 'carteira_identidade', 'cpf', 'comprovante_residencia', 'certificado', 'outro')),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE rh.candidate_documents IS 'Documentos anexados pelos candidatos';
COMMENT ON COLUMN rh.candidate_documents.candidate_id IS 'Candidato proprietário do documento';
COMMENT ON COLUMN rh.candidate_documents.document_type IS 'Tipo do documento: curriculo, carteira_identidade, cpf, comprovante_residencia, certificado, outro';
COMMENT ON COLUMN rh.candidate_documents.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN rh.candidate_documents.file_path IS 'Caminho do arquivo no storage';
COMMENT ON COLUMN rh.candidate_documents.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN rh.candidate_documents.mime_type IS 'Tipo MIME do arquivo';
COMMENT ON COLUMN rh.candidate_documents.uploaded_by IS 'Usuário que fez o upload';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para job_requests
CREATE INDEX IF NOT EXISTS idx_job_requests_company_id ON rh.job_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON rh.job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_urgency_level ON rh.job_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_job_requests_requested_by ON rh.job_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_job_requests_created_at ON rh.job_requests(created_at);

-- Índices para candidates
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON rh.candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON rh.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON rh.candidates(source);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON rh.candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_cpf ON rh.candidates(cpf);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON rh.candidates(created_at);

-- Índices para job_openings
CREATE INDEX IF NOT EXISTS idx_job_openings_company_id ON rh.job_openings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_status ON rh.job_openings(status);
CREATE INDEX IF NOT EXISTS idx_job_openings_job_request_id ON rh.job_openings(job_request_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_created_by ON rh.job_openings(created_by);
CREATE INDEX IF NOT EXISTS idx_job_openings_published_at ON rh.job_openings(published_at);

-- Índices para selection_processes
CREATE INDEX IF NOT EXISTS idx_selection_processes_company_id ON rh.selection_processes(company_id);
CREATE INDEX IF NOT EXISTS idx_selection_processes_job_opening_id ON rh.selection_processes(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_selection_processes_candidate_id ON rh.selection_processes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_selection_processes_status ON rh.selection_processes(status);
CREATE INDEX IF NOT EXISTS idx_selection_processes_current_stage ON rh.selection_processes(current_stage);

-- Índices para selection_stages
CREATE INDEX IF NOT EXISTS idx_selection_stages_company_id ON rh.selection_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_selection_stages_selection_process_id ON rh.selection_stages(selection_process_id);
CREATE INDEX IF NOT EXISTS idx_selection_stages_status ON rh.selection_stages(status);
CREATE INDEX IF NOT EXISTS idx_selection_stages_stage_type ON rh.selection_stages(stage_type);
CREATE INDEX IF NOT EXISTS idx_selection_stages_scheduled_at ON rh.selection_stages(scheduled_at);

-- Índices para talent_pool
CREATE INDEX IF NOT EXISTS idx_talent_pool_company_id ON rh.talent_pool(company_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_candidate_id ON rh.talent_pool(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_category ON rh.talent_pool(category);
CREATE INDEX IF NOT EXISTS idx_talent_pool_availability ON rh.talent_pool(availability);
CREATE INDEX IF NOT EXISTS idx_talent_pool_experience_level ON rh.talent_pool(experience_level);

-- Índices para candidate_documents
CREATE INDEX IF NOT EXISTS idx_candidate_documents_company_id ON rh.candidate_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate_id ON rh.candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_document_type ON rh.candidate_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_uploaded_by ON rh.candidate_documents(uploaded_by);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para job_requests
CREATE OR REPLACE FUNCTION update_job_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_requests_updated_at
    BEFORE UPDATE ON rh.job_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_job_requests_updated_at();

-- Trigger para candidates
CREATE OR REPLACE FUNCTION update_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_candidates_updated_at
    BEFORE UPDATE ON rh.candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_candidates_updated_at();

-- Trigger para job_openings
CREATE OR REPLACE FUNCTION update_job_openings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_openings_updated_at
    BEFORE UPDATE ON rh.job_openings
    FOR EACH ROW
    EXECUTE FUNCTION update_job_openings_updated_at();

-- Trigger para selection_processes
CREATE OR REPLACE FUNCTION update_selection_processes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_selection_processes_updated_at
    BEFORE UPDATE ON rh.selection_processes
    FOR EACH ROW
    EXECUTE FUNCTION update_selection_processes_updated_at();

-- Trigger para selection_stages
CREATE OR REPLACE FUNCTION update_selection_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_selection_stages_updated_at
    BEFORE UPDATE ON rh.selection_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_selection_stages_updated_at();

-- Trigger para talent_pool
CREATE OR REPLACE FUNCTION update_talent_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_talent_pool_updated_at
    BEFORE UPDATE ON rh.talent_pool
    FOR EACH ROW
    EXECUTE FUNCTION update_talent_pool_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE rh.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.selection_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.selection_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.talent_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.candidate_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para job_requests
CREATE POLICY "Users can view job_requests from their company" ON rh.job_requests
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert job_requests in their company" ON rh.job_requests
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update job_requests from their company" ON rh.job_requests
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete job_requests from their company" ON rh.job_requests
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- Políticas RLS para candidates
CREATE POLICY "Users can view candidates from their company" ON rh.candidates
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert candidates in their company" ON rh.candidates
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update candidates from their company" ON rh.candidates
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete candidates from their company" ON rh.candidates
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- Políticas RLS para job_openings
CREATE POLICY "Users can view job_openings from their company" ON rh.job_openings
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert job_openings in their company" ON rh.job_openings
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update job_openings from their company" ON rh.job_openings
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete job_openings from their company" ON rh.job_openings
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- Políticas RLS para selection_processes
CREATE POLICY "Users can view selection_processes from their company" ON rh.selection_processes
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert selection_processes in their company" ON rh.selection_processes
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update selection_processes from their company" ON rh.selection_processes
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete selection_processes from their company" ON rh.selection_processes
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- Políticas RLS para selection_stages
CREATE POLICY "Users can view selection_stages from their company" ON rh.selection_stages
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert selection_stages in their company" ON rh.selection_stages
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update selection_stages from their company" ON rh.selection_stages
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete selection_stages from their company" ON rh.selection_stages
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- Políticas RLS para talent_pool
CREATE POLICY "Users can view talent_pool from their company" ON rh.talent_pool
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert talent_pool in their company" ON rh.talent_pool
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update talent_pool from their company" ON rh.talent_pool
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete talent_pool from their company" ON rh.talent_pool
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- Políticas RLS para candidate_documents
CREATE POLICY "Users can view candidate_documents from their company" ON rh.candidate_documents
    FOR SELECT USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can insert candidate_documents in their company" ON rh.candidate_documents
    FOR INSERT WITH CHECK (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can update candidate_documents from their company" ON rh.candidate_documents
    FOR UPDATE USING (company_id = ANY(public.get_user_companies()));

CREATE POLICY "Users can delete candidate_documents from their company" ON rh.candidate_documents
    FOR DELETE USING (company_id = ANY(public.get_user_companies()));

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA rh IS 'Esquema de Recursos Humanos - Inclui sistema de recrutamento completo';
