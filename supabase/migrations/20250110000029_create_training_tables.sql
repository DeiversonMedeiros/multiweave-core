-- Migration: Create Training Module Tables
-- Description: Creates tables for training management system

-- Create trainings table
CREATE TABLE IF NOT EXISTS rh.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_treinamento VARCHAR(100) NOT NULL, -- 'obrigatorio', 'opcional', 'compliance', 'desenvolvimento'
    categoria VARCHAR(100), -- 'seguranca', 'qualidade', 'tecnico', 'comportamental'
    carga_horaria INTEGER NOT NULL, -- em horas
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    data_limite_inscricao DATE,
    vagas_totais INTEGER,
    vagas_disponiveis INTEGER,
    local VARCHAR(255),
    modalidade VARCHAR(50) NOT NULL DEFAULT 'presencial', -- 'presencial', 'online', 'hibrido'
    instrutor VARCHAR(255),
    instrutor_email VARCHAR(255),
    instrutor_telefone VARCHAR(20),
    custo_por_participante DECIMAL(10,2) DEFAULT 0,
    requisitos TEXT,
    objetivos TEXT,
    conteudo_programatico TEXT,
    metodologia TEXT,
    recursos_necessarios TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planejado', -- 'planejado', 'inscricoes_abertas', 'em_andamento', 'concluido', 'cancelado'
    aprovado_por UUID ,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    anexos TEXT[], -- URLs dos anexos
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training_enrollments table
CREATE TABLE IF NOT EXISTS rh.training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'inscrito', -- 'inscrito', 'confirmado', 'presente', 'ausente', 'cancelado'
    justificativa_cancelamento TEXT,
    observacoes TEXT,
    inscrito_por UUID ,
    aprovado_por UUID ,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id)
);

-- Create training_attendance table
CREATE TABLE IF NOT EXISTS rh.training_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    data_treinamento DATE NOT NULL,
    hora_entrada TIME,
    hora_saida TIME,
    presenca VARCHAR(50) NOT NULL DEFAULT 'ausente', -- 'presente', 'ausente', 'atrasado', 'saida_antecipada'
    percentual_presenca DECIMAL(5,2) DEFAULT 0, -- percentual de presença no dia
    observacoes TEXT,
    registrado_por UUID ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id, data_treinamento)
);

-- Create training_certificates table
CREATE TABLE IF NOT EXISTS rh.training_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    numero_certificado VARCHAR(100) UNIQUE NOT NULL,
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'valido', -- 'valido', 'vencido', 'cancelado'
    nota_final DECIMAL(5,2),
    percentual_presenca_final DECIMAL(5,2),
    aprovado BOOLEAN NOT NULL DEFAULT false,
    observacoes TEXT,
    template_certificado TEXT, -- template usado para gerar o certificado
    arquivo_certificado TEXT, -- URL do arquivo PDF do certificado
    emitido_por UUID ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id)
);

-- Create training_evaluations table (optional - for training feedback)
CREATE TABLE IF NOT EXISTS rh.training_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    nota_instrutor DECIMAL(3,1) CHECK (nota_instrutor >= 0 AND nota_instrutor <= 10),
    nota_conteudo DECIMAL(3,1) CHECK (nota_conteudo >= 0 AND nota_conteudo <= 10),
    nota_metodologia DECIMAL(3,1) CHECK (nota_metodologia >= 0 AND nota_metodologia <= 10),
    nota_recursos DECIMAL(3,1) CHECK (nota_recursos >= 0 AND nota_recursos <= 10),
    nota_geral DECIMAL(3,1) CHECK (nota_geral >= 0 AND nota_geral <= 10),
    comentarios TEXT,
    sugestoes TEXT,
    recomendaria BOOLEAN,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id)
);

-- Create indexes for better performance
CREATE INDEX idx_trainings_company_id ON rh.trainings(company_id);
CREATE INDEX idx_trainings_tipo ON rh.trainings(tipo_treinamento);
CREATE INDEX idx_trainings_status ON rh.trainings(status);
CREATE INDEX idx_trainings_data_inicio ON rh.trainings(data_inicio);
CREATE INDEX idx_trainings_data_fim ON rh.trainings(data_fim);

CREATE INDEX idx_training_enrollments_company_id ON rh.training_enrollments(company_id);
CREATE INDEX idx_training_enrollments_training_id ON rh.training_enrollments(training_id);
CREATE INDEX idx_training_enrollments_employee_id ON rh.training_enrollments(employee_id);
CREATE INDEX idx_training_enrollments_status ON rh.training_enrollments(status);

CREATE INDEX idx_training_attendance_company_id ON rh.training_attendance(company_id);
CREATE INDEX idx_training_attendance_training_id ON rh.training_attendance(training_id);
CREATE INDEX idx_training_attendance_employee_id ON rh.training_attendance(employee_id);
CREATE INDEX idx_training_attendance_data ON rh.training_attendance(data_treinamento);

CREATE INDEX idx_training_certificates_company_id ON rh.training_certificates(company_id);
CREATE INDEX idx_training_certificates_training_id ON rh.training_certificates(training_id);
CREATE INDEX idx_training_certificates_employee_id ON rh.training_certificates(employee_id);
CREATE INDEX idx_training_certificates_numero ON rh.training_certificates(numero_certificado);
CREATE INDEX idx_training_certificates_status ON rh.training_certificates(status);

CREATE INDEX idx_training_evaluations_company_id ON rh.training_evaluations(company_id);
CREATE INDEX idx_training_evaluations_training_id ON rh.training_evaluations(training_id);
CREATE INDEX idx_training_evaluations_employee_id ON rh.training_evaluations(employee_id);

-- Add triggers for updated_at
CREATE TRIGGER update_trainings_updated_at
    BEFORE UPDATE ON rh.trainings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_enrollments_updated_at
    BEFORE UPDATE ON rh.training_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_attendance_updated_at
    BEFORE UPDATE ON rh.training_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_certificates_updated_at
    BEFORE UPDATE ON rh.training_certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_evaluations_updated_at
    BEFORE UPDATE ON rh.training_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies
ALTER TABLE rh.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trainings
CREATE POLICY "Users can view trainings from their company" ON rh.trainings
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can insert trainings in their company" ON rh.trainings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can update trainings from their company" ON rh.trainings
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can delete trainings from their company" ON rh.trainings
    FOR DELETE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies for training_enrollments
CREATE POLICY "Users can view training enrollments from their company" ON rh.training_enrollments
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can insert training enrollments in their company" ON rh.training_enrollments
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can update training enrollments from their company" ON rh.training_enrollments
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can delete training enrollments from their company" ON rh.training_enrollments
    FOR DELETE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies for training_attendance
CREATE POLICY "Users can view training attendance from their company" ON rh.training_attendance
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can insert training attendance in their company" ON rh.training_attendance
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can update training attendance from their company" ON rh.training_attendance
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can delete training attendance from their company" ON rh.training_attendance
    FOR DELETE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies for training_certificates
CREATE POLICY "Users can view training certificates from their company" ON rh.training_certificates
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can insert training certificates in their company" ON rh.training_certificates
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can update training certificates from their company" ON rh.training_certificates
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can delete training certificates from their company" ON rh.training_certificates
    FOR DELETE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies for training_evaluations
CREATE POLICY "Users can view training evaluations from their company" ON rh.training_evaluations
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can insert training evaluations in their company" ON rh.training_evaluations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can update training evaluations from their company" ON rh.training_evaluations
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can delete training evaluations from their company" ON rh.training_evaluations
    FOR DELETE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- Add comments
COMMENT ON TABLE rh.trainings IS 'Tabela de treinamentos oferecidos pela empresa';
COMMENT ON TABLE rh.training_enrollments IS 'Tabela de inscrições de funcionários em treinamentos';
COMMENT ON TABLE rh.training_attendance IS 'Tabela de controle de presença em treinamentos';
COMMENT ON TABLE rh.training_certificates IS 'Tabela de certificados emitidos para treinamentos';
COMMENT ON TABLE rh.training_evaluations IS 'Tabela de avaliações dos treinamentos pelos participantes';
