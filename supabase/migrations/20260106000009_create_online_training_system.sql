-- =====================================================
-- SISTEMA DE TREINAMENTOS ONLINE
-- =====================================================
-- Migration: Expande o sistema de treinamentos para incluir
-- funcionalidades completas de treinamento online empresarial
-- =====================================================

-- =====================================================
-- 1. TABELA DE CONTEÚDO DE TREINAMENTO (AULAS/LIÇÕES)
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_conteudo VARCHAR(50) NOT NULL, -- 'video', 'pdf', 'texto', 'link_externo'
    ordem INTEGER NOT NULL DEFAULT 0, -- ordem de exibição
    duracao_minutos INTEGER, -- duração estimada em minutos
    url_conteudo TEXT, -- URL do vídeo, PDF ou link externo
    arquivo_path TEXT, -- caminho do arquivo no storage
    conteudo_texto TEXT, -- conteúdo em texto (para tipo 'texto')
    permite_pular BOOLEAN DEFAULT false, -- se permite pular esta aula
    requer_conclusao BOOLEAN DEFAULT true, -- se requer conclusão para avançar
    tempo_minimo_segundos INTEGER, -- tempo mínimo que deve assistir/ler
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_training_content_training FOREIGN KEY (training_id) REFERENCES rh.trainings(id) ON DELETE CASCADE
);

-- =====================================================
-- 2. TABELA DE PROGRESSO DO USUÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    content_id UUID REFERENCES rh.training_content(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES rh.training_enrollments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'nao_iniciado', -- 'nao_iniciado', 'em_andamento', 'concluido', 'pausado'
    percentual_concluido DECIMAL(5,2) DEFAULT 0, -- percentual de conclusão do conteúdo
    tempo_assistido_segundos INTEGER DEFAULT 0, -- tempo total assistido
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_conclusao TIMESTAMP WITH TIME ZONE,
    ultima_posicao_segundos INTEGER DEFAULT 0, -- última posição no vídeo/conteúdo
    concluido BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id, content_id)
);

-- =====================================================
-- 3. TABELA DE PROVAS/AVALIAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    content_id UUID REFERENCES rh.training_content(id) ON DELETE SET NULL, -- NULL = prova final do treinamento
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_avaliacao VARCHAR(50) NOT NULL DEFAULT 'entre_aulas', -- 'entre_aulas', 'final', 'diagnostica'
    nota_minima_aprovacao DECIMAL(5,2) DEFAULT 70.00, -- nota mínima para aprovação (0-100)
    tempo_limite_minutos INTEGER, -- tempo limite para fazer a prova (NULL = sem limite)
    permite_tentativas INTEGER DEFAULT 3, -- número máximo de tentativas (0 = ilimitado)
    ordem INTEGER DEFAULT 0, -- ordem de exibição
    obrigatorio BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_training_exams_training FOREIGN KEY (training_id) REFERENCES rh.trainings(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_exams_content FOREIGN KEY (content_id) REFERENCES rh.training_content(id) ON DELETE SET NULL
);

-- =====================================================
-- 4. TABELA DE QUESTÕES DAS PROVAS
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES rh.training_exams(id) ON DELETE CASCADE,
    pergunta TEXT NOT NULL,
    tipo_questao VARCHAR(50) NOT NULL DEFAULT 'multipla_escolha', -- 'multipla_escolha', 'verdadeiro_falso', 'texto_livre', 'numerico'
    ordem INTEGER NOT NULL DEFAULT 0,
    pontuacao DECIMAL(5,2) DEFAULT 1.00, -- pontuação da questão
    explicacao TEXT, -- explicação da resposta correta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_exam_questions_exam FOREIGN KEY (exam_id) REFERENCES rh.training_exams(id) ON DELETE CASCADE
);

-- =====================================================
-- 5. TABELA DE ALTERNATIVAS DAS QUESTÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_exam_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES rh.training_exam_questions(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_exam_alternatives_question FOREIGN KEY (question_id) REFERENCES rh.training_exam_questions(id) ON DELETE CASCADE
);

-- =====================================================
-- 6. TABELA DE RESPOSTAS DO USUÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES rh.training_exams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    tentativa_numero INTEGER NOT NULL DEFAULT 1,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    nota_final DECIMAL(5,2),
    percentual_acerto DECIMAL(5,2),
    aprovado BOOLEAN DEFAULT false,
    tempo_gasto_segundos INTEGER,
    status VARCHAR(50) DEFAULT 'em_andamento', -- 'em_andamento', 'finalizado', 'abandonado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_exam_attempts_exam FOREIGN KEY (exam_id) REFERENCES rh.training_exams(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_attempts_employee FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_attempts_training FOREIGN KEY (training_id) REFERENCES rh.trainings(id) ON DELETE CASCADE
);

-- =====================================================
-- 7. TABELA DE RESPOSTAS INDIVIDUAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES rh.training_exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES rh.training_exam_questions(id) ON DELETE CASCADE,
    alternative_id UUID REFERENCES rh.training_exam_alternatives(id) ON DELETE SET NULL, -- NULL para questões de texto livre
    resposta_texto TEXT, -- para questões de texto livre ou numéricas
    resposta_numerica DECIMAL(10,2), -- para questões numéricas
    pontuacao_obtida DECIMAL(5,2) DEFAULT 0,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_exam_answers_attempt FOREIGN KEY (attempt_id) REFERENCES rh.training_exam_attempts(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_answers_question FOREIGN KEY (question_id) REFERENCES rh.training_exam_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_answers_alternative FOREIGN KEY (alternative_id) REFERENCES rh.training_exam_alternatives(id) ON DELETE SET NULL
);

-- =====================================================
-- 8. TABELA DE AVALIAÇÃO DE REAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_reaction_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES rh.training_enrollments(id) ON DELETE CASCADE,
    -- Avaliação de conteúdo
    nota_conteudo INTEGER CHECK (nota_conteudo >= 1 AND nota_conteudo <= 5), -- 1-5 estrelas
    nota_instrutor INTEGER CHECK (nota_instrutor >= 1 AND nota_instrutor <= 5),
    nota_metodologia INTEGER CHECK (nota_metodologia >= 1 AND nota_metodologia <= 5),
    nota_recursos INTEGER CHECK (nota_recursos >= 1 AND nota_recursos <= 5),
    nota_geral INTEGER CHECK (nota_geral >= 1 AND nota_geral <= 5),
    -- Perguntas abertas
    pontos_positivos TEXT,
    pontos_melhorar TEXT,
    sugestoes TEXT,
    recomendaria BOOLEAN,
    comentarios_gerais TEXT,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, employee_id),
    CONSTRAINT fk_reaction_training FOREIGN KEY (training_id) REFERENCES rh.trainings(id) ON DELETE CASCADE,
    CONSTRAINT fk_reaction_employee FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_reaction_enrollment FOREIGN KEY (enrollment_id) REFERENCES rh.training_enrollments(id) ON DELETE CASCADE
);

-- =====================================================
-- 9. TABELA DE AVALIAÇÃO DE APLICAÇÃO (GESTOR)
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_application_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    gestor_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE, -- gestor que está avaliando
    enrollment_id UUID NOT NULL REFERENCES rh.training_enrollments(id) ON DELETE CASCADE,
    -- Avaliação de aplicação prática
    aplica_conhecimento BOOLEAN, -- se o funcionário aplica o conhecimento
    qualidade_aplicacao INTEGER CHECK (qualidade_aplicacao >= 1 AND qualidade_aplicacao <= 5), -- 1-5
    frequencia_aplicacao VARCHAR(50), -- 'sempre', 'frequentemente', 'as_vezes', 'raramente', 'nunca'
    impacto_trabalho INTEGER CHECK (impacto_trabalho >= 1 AND impacto_trabalho <= 5), -- impacto no trabalho
    -- Observações
    exemplos_aplicacao TEXT, -- exemplos de como o funcionário aplicou
    dificuldades_observadas TEXT,
    sugestoes_melhoria TEXT,
    recomendaria_retreinamento BOOLEAN,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    periodo_avaliacao_inicio DATE, -- período em que foi observada a aplicação
    periodo_avaliacao_fim DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_application_training FOREIGN KEY (training_id) REFERENCES rh.trainings(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_employee FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_gestor FOREIGN KEY (gestor_id) REFERENCES rh.employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_enrollment FOREIGN KEY (enrollment_id) REFERENCES rh.training_enrollments(id) ON DELETE CASCADE
);

-- =====================================================
-- 10. TABELA DE USUÁRIOS OBRIGATÓRIOS E OPCIONAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.training_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES rh.trainings(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES rh.employees(id) ON DELETE CASCADE, -- NULL = atribuição por grupo
    position_id UUID REFERENCES rh.positions(id) ON DELETE CASCADE, -- atribuição por cargo
    unit_id UUID REFERENCES rh.units(id) ON DELETE CASCADE, -- atribuição por departamento
    tipo_atribuicao VARCHAR(50) NOT NULL DEFAULT 'obrigatorio', -- 'obrigatorio', 'opcional'
    data_limite DATE, -- data limite para conclusão
    notificar BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_assignments_training FOREIGN KEY (training_id) REFERENCES rh.trainings(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_employee FOREIGN KEY (employee_id) REFERENCES rh.employees(id) ON DELETE SET NULL,
    CONSTRAINT fk_assignments_position FOREIGN KEY (position_id) REFERENCES rh.positions(id) ON DELETE SET NULL,
    CONSTRAINT fk_assignments_unit FOREIGN KEY (unit_id) REFERENCES rh.units(id) ON DELETE SET NULL,
    -- Garantir que pelo menos um dos campos de atribuição esteja preenchido
    CONSTRAINT chk_assignment_target CHECK (
        (employee_id IS NOT NULL) OR 
        (position_id IS NOT NULL) OR 
        (unit_id IS NOT NULL)
    )
);

-- =====================================================
-- 11. ATUALIZAR TABELA DE TREINAMENTOS
-- =====================================================
-- Adicionar campos específicos para treinamentos online
ALTER TABLE rh.trainings 
ADD COLUMN IF NOT EXISTS permite_avaliacao_reacao BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permite_avaliacao_aplicacao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tempo_limite_dias INTEGER, -- tempo limite para conclusão (NULL = sem limite)
ADD COLUMN IF NOT EXISTS permite_pausar BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS exige_prova_final BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nota_minima_certificado DECIMAL(5,2) DEFAULT 70.00;

-- =====================================================
-- 12. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_training_content_training_id ON rh.training_content(training_id);
CREATE INDEX IF NOT EXISTS idx_training_content_ordem ON rh.training_content(training_id, ordem);
CREATE INDEX IF NOT EXISTS idx_training_progress_training_employee ON rh.training_progress(training_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_content ON rh.training_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_enrollment ON rh.training_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_training_exams_training_id ON rh.training_exams(training_id);
CREATE INDEX IF NOT EXISTS idx_training_exams_content_id ON rh.training_exams(content_id);
CREATE INDEX IF NOT EXISTS idx_training_exam_questions_exam_id ON rh.training_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_training_exam_alternatives_question_id ON rh.training_exam_alternatives(question_id);
CREATE INDEX IF NOT EXISTS idx_training_exam_attempts_exam_employee ON rh.training_exam_attempts(exam_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_training_exam_attempts_training ON rh.training_exam_attempts(training_id);
CREATE INDEX IF NOT EXISTS idx_training_exam_answers_attempt_id ON rh.training_exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_training_reaction_training_employee ON rh.training_reaction_evaluations(training_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_training_application_training_employee ON rh.training_application_evaluations(training_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_training_application_gestor ON rh.training_application_evaluations(gestor_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_training_id ON rh.training_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_employee_id ON rh.training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_position_id ON rh.training_assignments(position_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_unit_id ON rh.training_assignments(unit_id);

-- =====================================================
-- 13. TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_training_content_updated_at
    BEFORE UPDATE ON rh.training_content
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at
    BEFORE UPDATE ON rh.training_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_exams_updated_at
    BEFORE UPDATE ON rh.training_exams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_exam_questions_updated_at
    BEFORE UPDATE ON rh.training_exam_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_exam_attempts_updated_at
    BEFORE UPDATE ON rh.training_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_reaction_evaluations_updated_at
    BEFORE UPDATE ON rh.training_reaction_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_application_evaluations_updated_at
    BEFORE UPDATE ON rh.training_application_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_assignments_updated_at
    BEFORE UPDATE ON rh.training_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 14. RLS POLICIES
-- =====================================================
ALTER TABLE rh.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_exam_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_reaction_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_application_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.training_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para training_content
CREATE POLICY "Users can view training content from their company" ON rh.training_content
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can insert training content in their company" ON rh.training_content
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can update training content from their company" ON rh.training_content
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can delete training content from their company" ON rh.training_content
    FOR DELETE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies para training_progress
CREATE POLICY "Users can view their own training progress" ON rh.training_progress
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND (
            -- Usuário pode ver seu próprio progresso
            employee_id IN (
                SELECT id FROM rh.employees 
                WHERE user_id = auth.uid()
            )
            OR
            -- Gestores podem ver progresso de seus subordinados
            EXISTS (
                SELECT 1 FROM rh.employees e
                WHERE e.id = training_progress.employee_id
                AND e.company_id = training_progress.company_id
            )
        )
    );

CREATE POLICY "Users can insert their own training progress" ON rh.training_progress
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND employee_id IN (
            SELECT id FROM rh.employees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own training progress" ON rh.training_progress
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND employee_id IN (
            SELECT id FROM rh.employees 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies para training_exams (similar pattern)
CREATE POLICY "Users can view training exams from their company" ON rh.training_exams
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can manage training exams in their company" ON rh.training_exams
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies para training_exam_questions
CREATE POLICY "Users can view exam questions from their company" ON rh.training_exam_questions
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can manage exam questions in their company" ON rh.training_exam_questions
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies para training_exam_alternatives
CREATE POLICY "Users can view exam alternatives from their company" ON rh.training_exam_alternatives
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can manage exam alternatives in their company" ON rh.training_exam_alternatives
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- RLS Policies para training_exam_attempts
CREATE POLICY "Users can view their own exam attempts" ON rh.training_exam_attempts
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND (
            employee_id IN (
                SELECT id FROM rh.employees 
                WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM rh.employees e
                WHERE e.id = training_exam_attempts.employee_id
                AND e.company_id = training_exam_attempts.company_id
            )
        )
    );

CREATE POLICY "Users can insert their own exam attempts" ON rh.training_exam_attempts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND employee_id IN (
            SELECT id FROM rh.employees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own exam attempts" ON rh.training_exam_attempts
    FOR UPDATE USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND employee_id IN (
            SELECT id FROM rh.employees 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies para training_exam_answers
CREATE POLICY "Users can view their own exam answers" ON rh.training_exam_answers
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND EXISTS (
            SELECT 1 FROM rh.training_exam_attempts tea
            WHERE tea.id = training_exam_answers.attempt_id
            AND tea.employee_id IN (
                SELECT id FROM rh.employees 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage their own exam answers" ON rh.training_exam_answers
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND EXISTS (
            SELECT 1 FROM rh.training_exam_attempts tea
            WHERE tea.id = training_exam_answers.attempt_id
            AND tea.employee_id IN (
                SELECT id FROM rh.employees 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies para training_reaction_evaluations
CREATE POLICY "Users can view reaction evaluations from their company" ON rh.training_reaction_evaluations
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can manage their own reaction evaluations" ON rh.training_reaction_evaluations
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND (
            employee_id IN (
                SELECT id FROM rh.employees 
                WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM rh.employees e
                WHERE e.id = training_reaction_evaluations.employee_id
                AND e.company_id = training_reaction_evaluations.company_id
            )
        )
    );

-- RLS Policies para training_application_evaluations
CREATE POLICY "Users can view application evaluations from their company" ON rh.training_application_evaluations
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can manage application evaluations" ON rh.training_application_evaluations
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
        AND (
            gestor_id IN (
                SELECT id FROM rh.employees 
                WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM rh.employees e
                WHERE e.id = training_application_evaluations.gestor_id
                AND e.company_id = training_application_evaluations.company_id
            )
        )
    );

-- RLS Policies para training_assignments
CREATE POLICY "Users can view training assignments from their company" ON rh.training_assignments
    FOR SELECT USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

CREATE POLICY "Users can manage training assignments in their company" ON rh.training_assignments
    FOR ALL USING (
        company_id IN (
            SELECT user_companies.company_id 
            FROM public.user_companies 
            WHERE user_companies.user_id = auth.uid() 
            AND user_companies.ativo = true
        )
    );

-- =====================================================
-- 15. COMENTÁRIOS NAS TABELAS
-- =====================================================
COMMENT ON TABLE rh.training_content IS 'Conteúdo das aulas/lições dos treinamentos online (vídeos, PDFs, textos)';
COMMENT ON TABLE rh.training_progress IS 'Progresso do usuário em cada conteúdo do treinamento';
COMMENT ON TABLE rh.training_exams IS 'Provas e avaliações dos treinamentos';
COMMENT ON TABLE rh.training_exam_questions IS 'Questões das provas';
COMMENT ON TABLE rh.training_exam_alternatives IS 'Alternativas das questões de múltipla escolha';
COMMENT ON TABLE rh.training_exam_attempts IS 'Tentativas dos usuários em fazer as provas';
COMMENT ON TABLE rh.training_exam_answers IS 'Respostas individuais de cada tentativa';
COMMENT ON TABLE rh.training_reaction_evaluations IS 'Avaliação de reação dos participantes sobre o treinamento';
COMMENT ON TABLE rh.training_application_evaluations IS 'Avaliação de aplicação prática feita pelos gestores';
COMMENT ON TABLE rh.training_assignments IS 'Atribuições de treinamentos (obrigatórios e opcionais) para funcionários, cargos ou departamentos';



