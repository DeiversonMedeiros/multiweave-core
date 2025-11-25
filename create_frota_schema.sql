-- =====================================================
-- MÓDULO FROTA - SCRIPT SQL COMPLETO
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Criar schema frota
CREATE SCHEMA IF NOT EXISTS frota;

-- =====================================================
-- 1. ENUMS E TIPOS
-- =====================================================

-- Enum para tipo de veículo
CREATE TYPE frota.vehicle_type AS ENUM ('proprio', 'locado', 'agregado');

-- Enum para situação do veículo
CREATE TYPE frota.vehicle_status AS ENUM ('ativo', 'inativo', 'manutencao');

-- Enum para tipo de documento
CREATE TYPE frota.document_type AS ENUM ('crlv', 'ipva', 'seguro', 'licenca', 'vistoria');

-- Enum para status de documento
CREATE TYPE frota.document_status AS ENUM ('valido', 'vencido', 'a_vencer');

-- Enum para status de atribuição
CREATE TYPE frota.assignment_status AS ENUM ('em_uso', 'devolvido');

-- Enum para tipo de manutenção
CREATE TYPE frota.maintenance_type AS ENUM ('preventiva', 'corretiva');

-- Enum para status de manutenção
CREATE TYPE frota.maintenance_status AS ENUM ('pendente', 'em_execucao', 'finalizada');

-- Enum para tipo de ocorrência
CREATE TYPE frota.occurrence_type AS ENUM ('multa', 'sinistro');

-- Enum para status de ocorrência
CREATE TYPE frota.occurrence_status AS ENUM ('pendente', 'pago', 'contestacao', 'encerrado');

-- Enum para status de solicitação
CREATE TYPE frota.request_status AS ENUM ('pendente', 'aprovado', 'reprovado', 'devolvido');

-- =====================================================
-- 2. TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de veículos
CREATE TABLE frota.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo frota.vehicle_type NOT NULL,
    placa TEXT UNIQUE NOT NULL,
    renavam TEXT,
    chassi TEXT,
    marca TEXT,
    modelo TEXT,
    ano INTEGER,
    cor TEXT,
    quilometragem NUMERIC DEFAULT 0,
    situacao frota.vehicle_status DEFAULT 'ativo',
    proprietario_id UUID REFERENCES public.partners(id),
    locadora TEXT,
    colaborador_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de documentos dos veículos
CREATE TABLE frota.vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id) ON DELETE CASCADE,
    tipo frota.document_type NOT NULL,
    numero_documento TEXT,
    vencimento DATE,
    arquivo_url TEXT,
    status frota.document_status DEFAULT 'valido',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de condutores
CREATE TABLE frota.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE,
    matricula TEXT,
    cnh_numero TEXT,
    cnh_categoria TEXT,
    cnh_validade DATE,
    ader_validade DATE,
    ativo BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de atribuições de veículos
CREATE TABLE frota.vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES frota.drivers(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    km_inicial NUMERIC DEFAULT 0,
    km_final NUMERIC,
    status frota.assignment_status DEFAULT 'em_uso',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vistorias
CREATE TABLE frota.vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES frota.drivers(id) ON DELETE CASCADE,
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    base TEXT,
    km_inicial NUMERIC,
    km_final NUMERIC,
    avarias TEXT,
    observacoes TEXT,
    assinatura_condutor BOOLEAN DEFAULT false,
    assinatura_gestor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens de vistoria
CREATE TABLE frota.inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES frota.vehicle_inspections(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL, -- 'iluminacao', 'seguranca', 'interior', 'mecanica', 'vidros', 'outros'
    item TEXT NOT NULL,
    conforme BOOLEAN DEFAULT false,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de manutenções
CREATE TABLE frota.vehicle_maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id) ON DELETE CASCADE,
    tipo frota.maintenance_type NOT NULL,
    descricao TEXT NOT NULL,
    oficina TEXT,
    km_proxima NUMERIC,
    data_agendada DATE,
    data_realizada DATE,
    valor NUMERIC DEFAULT 0,
    status frota.maintenance_status DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de ocorrências (multas e sinistros)
CREATE TABLE frota.vehicle_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES frota.drivers(id),
    tipo frota.occurrence_type NOT NULL,
    data DATE NOT NULL,
    local TEXT,
    descricao TEXT NOT NULL,
    valor NUMERIC DEFAULT 0,
    status frota.occurrence_status DEFAULT 'pendente',
    arquivo_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de solicitações de veículos
CREATE TABLE frota.vehicle_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    solicitante_id UUID NOT NULL REFERENCES auth.users(id),
    vehicle_id UUID REFERENCES frota.vehicles(id),
    finalidade TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status frota.request_status DEFAULT 'pendente',
    observacoes TEXT,
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de imagens dos veículos
CREATE TABLE frota.vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'externa', 'interna', 'documento', 'avaria'
    url TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para veículos
CREATE INDEX idx_vehicles_company_id ON frota.vehicles(company_id);
CREATE INDEX idx_vehicles_placa ON frota.vehicles(placa);
CREATE INDEX idx_vehicles_situacao ON frota.vehicles(situacao);
CREATE INDEX idx_vehicles_tipo ON frota.vehicles(tipo);

-- Índices para documentos
CREATE INDEX idx_vehicle_documents_vehicle_id ON frota.vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_vencimento ON frota.vehicle_documents(vencimento);
CREATE INDEX idx_vehicle_documents_status ON frota.vehicle_documents(status);

-- Índices para condutores
CREATE INDEX idx_drivers_company_id ON frota.drivers(company_id);
CREATE INDEX idx_drivers_cpf ON frota.drivers(cpf);
CREATE INDEX idx_drivers_ativo ON frota.drivers(ativo);

-- Índices para atribuições
CREATE INDEX idx_assignments_vehicle_id ON frota.vehicle_assignments(vehicle_id);
CREATE INDEX idx_assignments_driver_id ON frota.vehicle_assignments(driver_id);
CREATE INDEX idx_assignments_status ON frota.vehicle_assignments(status);

-- Índices para vistorias
CREATE INDEX idx_inspections_vehicle_id ON frota.vehicle_inspections(vehicle_id);
CREATE INDEX idx_inspections_driver_id ON frota.vehicle_inspections(driver_id);
CREATE INDEX idx_inspections_data ON frota.vehicle_inspections(data);

-- Índices para manutenções
CREATE INDEX idx_maintenances_vehicle_id ON frota.vehicle_maintenances(vehicle_id);
CREATE INDEX idx_maintenances_status ON frota.vehicle_maintenances(status);
CREATE INDEX idx_maintenances_data_agendada ON frota.vehicle_maintenances(data_agendada);

-- Índices para ocorrências
CREATE INDEX idx_occurrences_vehicle_id ON frota.vehicle_occurrences(vehicle_id);
CREATE INDEX idx_occurrences_driver_id ON frota.vehicle_occurrences(driver_id);
CREATE INDEX idx_occurrences_tipo ON frota.vehicle_occurrences(tipo);
CREATE INDEX idx_occurrences_status ON frota.vehicle_occurrences(status);

-- Índices para solicitações
CREATE INDEX idx_requests_company_id ON frota.vehicle_requests(company_id);
CREATE INDEX idx_requests_solicitante_id ON frota.vehicle_requests(solicitante_id);
CREATE INDEX idx_requests_status ON frota.vehicle_requests(status);

-- =====================================================
-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION frota.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON frota.vehicles
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_vehicle_documents_updated_at BEFORE UPDATE ON frota.vehicle_documents
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON frota.drivers
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON frota.vehicle_assignments
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON frota.vehicle_inspections
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON frota.vehicle_maintenances
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_occurrences_updated_at BEFORE UPDATE ON frota.vehicle_occurrences
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON frota.vehicle_requests
    FOR EACH ROW EXECUTE FUNCTION frota.update_updated_at_column();

-- =====================================================
-- 5. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar status de documentos baseado na data de vencimento
CREATE OR REPLACE FUNCTION frota.update_document_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar status baseado na data de vencimento
    IF NEW.vencimento < CURRENT_DATE THEN
        NEW.status = 'vencido';
    ELSIF NEW.vencimento <= CURRENT_DATE + INTERVAL '30 days' THEN
        NEW.status = 'a_vencer';
    ELSE
        NEW.status = 'valido';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar status de documentos
CREATE TRIGGER update_document_status_trigger
    BEFORE INSERT OR UPDATE ON frota.vehicle_documents
    FOR EACH ROW EXECUTE FUNCTION frota.update_document_status();

-- Função para criar vistoria automática na devolução
CREATE OR REPLACE FUNCTION frota.create_inspection_on_return()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'devolvido', criar vistoria automática
    IF OLD.status = 'em_uso' AND NEW.status = 'devolvido' THEN
        INSERT INTO frota.vehicle_inspections (
            vehicle_id,
            driver_id,
            km_inicial,
            km_final,
            observacoes
        ) VALUES (
            NEW.vehicle_id,
            NEW.driver_id,
            NEW.km_inicial,
            NEW.km_final,
            'Vistoria automática na devolução do veículo'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para criar vistoria na devolução
CREATE TRIGGER create_inspection_on_return_trigger
    AFTER UPDATE ON frota.vehicle_assignments
    FOR EACH ROW EXECUTE FUNCTION frota.create_inspection_on_return();

-- =====================================================
-- 6. VIEWS PARA DASHBOARD E RELATÓRIOS
-- =====================================================

-- View para dashboard de frota
CREATE VIEW frota.dashboard_stats AS
SELECT 
    v.company_id,
    COUNT(*) as total_veiculos,
    COUNT(*) FILTER (WHERE v.situacao = 'ativo') as veiculos_ativos,
    COUNT(*) FILTER (WHERE v.tipo = 'proprio') as veiculos_proprios,
    COUNT(*) FILTER (WHERE v.tipo = 'locado') as veiculos_locados,
    COUNT(*) FILTER (WHERE v.tipo = 'agregado') as veiculos_agregados,
    COUNT(*) FILTER (WHERE v.situacao = 'manutencao') as veiculos_manutencao,
    COUNT(d.*) FILTER (WHERE d.status = 'a_vencer') as documentos_vencer,
    COUNT(m.*) FILTER (WHERE m.status = 'pendente' AND m.data_agendada <= CURRENT_DATE + INTERVAL '7 days') as manutencoes_proximas,
    COUNT(o.*) FILTER (WHERE o.status = 'pendente') as ocorrencias_pendentes
FROM frota.vehicles v
LEFT JOIN frota.vehicle_documents d ON v.id = d.vehicle_id
LEFT JOIN frota.vehicle_maintenances m ON v.id = m.vehicle_id
LEFT JOIN frota.vehicle_occurrences o ON v.id = o.vehicle_id
GROUP BY v.company_id;

-- View para veículos com informações completas
CREATE VIEW frota.vehicles_complete AS
SELECT 
    v.*,
    c.name as empresa_nome,
    p.name as proprietario_nome,
    d.nome as condutor_atual,
    d.cnh_categoria,
    d.cnh_validade,
    va.status as status_atribuicao,
    va.km_inicial as km_atribuicao,
    va.km_final as km_devolucao
FROM frota.vehicles v
LEFT JOIN public.companies c ON v.company_id = c.id
LEFT JOIN public.partners p ON v.proprietario_id = p.id
LEFT JOIN frota.vehicle_assignments va ON v.id = va.vehicle_id AND va.status = 'em_uso'
LEFT JOIN frota.drivers d ON va.driver_id = d.id;

-- View para próximas manutenções
CREATE VIEW frota.upcoming_maintenances AS
SELECT 
    m.*,
    v.placa,
    v.marca,
    v.modelo,
    v.quilometragem,
    CASE 
        WHEN m.data_agendada IS NOT NULL THEN m.data_agendada
        WHEN m.km_proxima IS NOT NULL THEN NULL -- Será calculado quando atingir a quilometragem
        ELSE NULL
    END as proxima_data
FROM frota.vehicle_maintenances m
JOIN frota.vehicles v ON m.vehicle_id = v.id
WHERE m.status = 'pendente'
AND (m.data_agendada <= CURRENT_DATE + INTERVAL '30 days' OR m.km_proxima <= v.quilometragem + 1000);

-- =====================================================
-- 7. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE frota.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota.vehicle_images ENABLE ROW LEVEL SECURITY;

-- Políticas para veículos
CREATE POLICY "Users can view vehicles from their company" ON frota.vehicles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert vehicles in their company" ON frota.vehicles
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update vehicles from their company" ON frota.vehicles
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete vehicles from their company" ON frota.vehicles
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para documentos
CREATE POLICY "Users can manage vehicle documents" ON frota.vehicle_documents
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM frota.vehicles 
            WHERE company_id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Políticas para condutores
CREATE POLICY "Users can manage drivers from their company" ON frota.drivers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para atribuições
CREATE POLICY "Users can manage vehicle assignments" ON frota.vehicle_assignments
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM frota.vehicles 
            WHERE company_id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Políticas para vistorias
CREATE POLICY "Users can manage vehicle inspections" ON frota.vehicle_inspections
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM frota.vehicles 
            WHERE company_id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Políticas para itens de vistoria
CREATE POLICY "Users can manage inspection items" ON frota.inspection_items
    FOR ALL USING (
        inspection_id IN (
            SELECT id FROM frota.vehicle_inspections 
            WHERE vehicle_id IN (
                SELECT id FROM frota.vehicles 
                WHERE company_id IN (
                    SELECT company_id FROM public.user_companies 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Políticas para manutenções
CREATE POLICY "Users can manage vehicle maintenances" ON frota.vehicle_maintenances
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM frota.vehicles 
            WHERE company_id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Políticas para ocorrências
CREATE POLICY "Users can manage vehicle occurrences" ON frota.vehicle_occurrences
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM frota.vehicles 
            WHERE company_id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Políticas para solicitações
CREATE POLICY "Users can manage vehicle requests from their company" ON frota.vehicle_requests
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Políticas para imagens
CREATE POLICY "Users can manage vehicle images" ON frota.vehicle_images
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM frota.vehicles 
            WHERE company_id IN (
                SELECT company_id FROM public.user_companies 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- 8. DADOS INICIAIS (SEEDS)
-- =====================================================

-- Inserir itens padrão de vistoria
INSERT INTO frota.inspection_items (inspection_id, categoria, item, conforme, observacao) VALUES
-- Esta tabela será populada dinamicamente quando uma vistoria for criada
-- Os itens serão inseridos via trigger ou aplicação

-- Dados de exemplo para teste (opcional)
-- INSERT INTO frota.vehicles (company_id, tipo, placa, marca, modelo, ano, cor) VALUES
-- ('uuid-da-empresa', 'proprio', 'ABC-1234', 'Toyota', 'Corolla', 2023, 'Branco');

-- =====================================================
-- 9. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON SCHEMA frota IS 'Módulo de gestão de frota de veículos';
COMMENT ON TABLE frota.vehicles IS 'Cadastro de veículos da frota';
COMMENT ON TABLE frota.vehicle_documents IS 'Documentos e vencimentos dos veículos';
COMMENT ON TABLE frota.drivers IS 'Cadastro de condutores autorizados';
COMMENT ON TABLE frota.vehicle_assignments IS 'Atribuições de veículos aos condutores';
COMMENT ON TABLE frota.vehicle_inspections IS 'Vistorias realizadas nos veículos';
COMMENT ON TABLE frota.inspection_items IS 'Itens verificados nas vistorias';
COMMENT ON TABLE frota.vehicle_maintenances IS 'Manutenções preventivas e corretivas';
COMMENT ON TABLE frota.vehicle_occurrences IS 'Multas e sinistros dos veículos';
COMMENT ON TABLE frota.vehicle_requests IS 'Solicitações de uso de veículos';
COMMENT ON TABLE frota.vehicle_images IS 'Imagens e fotos dos veículos';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
