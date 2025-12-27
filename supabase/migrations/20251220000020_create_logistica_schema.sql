-- =====================================================
-- MÓDULO LOGÍSTICA - SCRIPT SQL COMPLETO
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Criar schema logistica
CREATE SCHEMA IF NOT EXISTS logistica;

-- =====================================================
-- 1. ENUMS E TIPOS
-- =====================================================

-- Enum para tipo de transporte
DO $$ BEGIN
    CREATE TYPE logistica.transport_type AS ENUM ('terrestre', 'fluvial', 'aereo', 'logistica_reversa_claro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para setor solicitante
DO $$ BEGIN
    CREATE TYPE logistica.requesting_sector AS ENUM ('manutencao', 'implantacao', 'empresarial', 'infraestrutura', 'acesso', 'na');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status da solicitação
DO $$ BEGIN
    CREATE TYPE logistica.request_status AS ENUM ('pendente', 'aprovado', 'rejeitado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status da viagem
DO $$ BEGIN
    CREATE TYPE logistica.trip_status AS ENUM ('agendada', 'em_viagem', 'concluida', 'cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de custo
DO $$ BEGIN
    CREATE TYPE logistica.cost_type AS ENUM ('combustivel', 'pedagio', 'diarias', 'servicos_externos', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de solicitações de logística
CREATE TABLE logistica.logistics_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Informações da solicitação
    numero_solicitacao TEXT NOT NULL,
    tipo_transporte logistica.transport_type NOT NULL,
    setor_solicitante logistica.requesting_sector NOT NULL,
    
    -- Datas
    previsao_envio DATE NOT NULL,
    prazo_destino DATE NOT NULL,
    km_estimado NUMERIC(10,2),
    
    -- Endereços
    endereco_retirada TEXT NOT NULL,
    endereco_entrega TEXT NOT NULL,
    cep_retirada TEXT,
    cep_entrega TEXT,
    
    -- Responsáveis
    nome_responsavel_remetente TEXT NOT NULL,
    cpf_responsavel_remetente TEXT,
    telefone_responsavel_remetente TEXT NOT NULL,
    nome_responsavel_destinatario TEXT NOT NULL,
    cpf_responsavel_destinatario TEXT,
    telefone_responsavel_destinatario TEXT,
    
    -- Dimensões e peso
    peso NUMERIC(10,2),
    largura NUMERIC(10,2),
    altura NUMERIC(10,2),
    comprimento NUMERIC(10,2),
    quantidade_volumes INTEGER,
    
    -- Vínculos obrigatórios
    project_id UUID REFERENCES public.projects(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    os_number TEXT, -- Número da OS (ordem de serviço)
    
    -- Informações adicionais
    segmento TEXT,
    cliente TEXT,
    observacoes TEXT,
    
    -- Status e aprovação
    status logistica.request_status DEFAULT 'pendente',
    solicitado_por UUID REFERENCES public.profiles(id),
    aprovado_por UUID REFERENCES public.profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes_aprovacao TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de viagens
CREATE TABLE logistica.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES logistica.logistics_requests(id) ON DELETE CASCADE,
    
    -- Veículo e condutor
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id),
    driver_id UUID NOT NULL REFERENCES frota.drivers(id),
    
    -- Datas e horários
    data_saida DATE NOT NULL,
    hora_saida TIME,
    data_chegada DATE,
    hora_chegada TIME,
    km_inicial NUMERIC(10,2),
    km_final NUMERIC(10,2),
    km_percorrido NUMERIC(10,2) GENERATED ALWAYS AS (km_final - km_inicial) STORED,
    
    -- Status
    status logistica.trip_status DEFAULT 'agendada',
    
    -- Vínculos obrigatórios
    project_id UUID REFERENCES public.projects(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    os_number TEXT,
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Tabela de itens transportados
CREATE TABLE logistica.trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES logistica.trips(id) ON DELETE CASCADE,
    
    -- Descrição do item
    descricao TEXT NOT NULL,
    quantidade NUMERIC(10,2) NOT NULL,
    unidade_medida TEXT,
    peso NUMERIC(10,2),
    observacoes TEXT,
    
    -- Vínculo com material (opcional)
    material_id UUID REFERENCES public.materials(id),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de checklist de conferência (preenchido pelo condutor na saída)
CREATE TABLE logistica.trip_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES logistica.trips(id) ON DELETE CASCADE,
    
    -- Itens conferidos
    items_conferidos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de {item_id, conferido, observacoes}
    
    -- Observações gerais
    observacoes TEXT,
    
    -- Responsável pela conferência
    conferido_por UUID REFERENCES public.profiles(id),
    conferido_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entregas (preenchido pelo condutor na entrega)
CREATE TABLE logistica.trip_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES logistica.trips(id) ON DELETE CASCADE,
    
    -- Informações da entrega
    data_entrega DATE NOT NULL,
    hora_entrega TIME,
    recebido_por TEXT NOT NULL,
    cpf_recebedor TEXT,
    telefone_recebedor TEXT,
    
    -- Itens entregues
    items_entregues JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de {item_id, quantidade_entregue, observacoes}
    
    -- Status da entrega
    todos_itens_entregues BOOLEAN DEFAULT true,
    observacoes TEXT,
    
    -- Assinatura/Comprovante
    comprovante_url TEXT,
    
    -- Responsável pela entrega
    entregue_por UUID REFERENCES public.profiles(id),
    entregue_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de custos logísticos
CREATE TABLE logistica.trip_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES logistica.trips(id) ON DELETE CASCADE,
    
    -- Tipo e valor
    tipo_custo logistica.cost_type NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_custo DATE NOT NULL,
    
    -- Vínculos obrigatórios
    vehicle_id UUID REFERENCES frota.vehicles(id),
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id),
    project_id UUID REFERENCES public.projects(id),
    os_number TEXT,
    
    -- Comprovante
    comprovante_url TEXT,
    observacoes TEXT,
    
    -- Integração financeira
    financial_entry_id UUID, -- FK para contas a pagar quando integrado
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- =====================================================
-- 3. ÍNDICES
-- =====================================================

CREATE INDEX idx_logistics_requests_company ON logistica.logistics_requests(company_id);
CREATE INDEX idx_logistics_requests_status ON logistica.logistics_requests(status);
CREATE INDEX idx_logistics_requests_solicitado_por ON logistica.logistics_requests(solicitado_por);
CREATE INDEX idx_logistics_requests_project ON logistica.logistics_requests(project_id);
CREATE INDEX idx_logistics_requests_cost_center ON logistica.logistics_requests(cost_center_id);

CREATE INDEX idx_trips_company ON logistica.trips(company_id);
CREATE INDEX idx_trips_request ON logistica.trips(request_id);
CREATE INDEX idx_trips_vehicle ON logistica.trips(vehicle_id);
CREATE INDEX idx_trips_driver ON logistica.trips(driver_id);
CREATE INDEX idx_trips_status ON logistica.trips(status);
CREATE INDEX idx_trips_data_saida ON logistica.trips(data_saida);

CREATE INDEX idx_trip_items_trip ON logistica.trip_items(trip_id);
CREATE INDEX idx_trip_checklists_trip ON logistica.trip_checklists(trip_id);
CREATE INDEX idx_trip_deliveries_trip ON logistica.trip_deliveries(trip_id);

CREATE INDEX idx_trip_costs_company ON logistica.trip_costs(company_id);
CREATE INDEX idx_trip_costs_trip ON logistica.trip_costs(trip_id);
CREATE INDEX idx_trip_costs_cost_center ON logistica.trip_costs(cost_center_id);
CREATE INDEX idx_trip_costs_project ON logistica.trip_costs(project_id);

-- =====================================================
-- 4. TRIGGERS E AUTOMAÇÕES
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION logistica.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_logistics_requests_updated_at
    BEFORE UPDATE ON logistica.logistics_requests
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

CREATE TRIGGER trigger_update_trips_updated_at
    BEFORE UPDATE ON logistica.trips
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

CREATE TRIGGER trigger_update_trip_items_updated_at
    BEFORE UPDATE ON logistica.trip_items
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

CREATE TRIGGER trigger_update_trip_checklists_updated_at
    BEFORE UPDATE ON logistica.trip_checklists
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

CREATE TRIGGER trigger_update_trip_deliveries_updated_at
    BEFORE UPDATE ON logistica.trip_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

CREATE TRIGGER trigger_update_trip_costs_updated_at
    BEFORE UPDATE ON logistica.trip_costs
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

-- Trigger para gerar número de solicitação automático
CREATE OR REPLACE FUNCTION logistica.generate_request_number()
RETURNS TRIGGER AS $$
DECLARE
    v_company_code TEXT;
    v_year TEXT;
    v_sequence INTEGER;
    v_number TEXT;
BEGIN
    -- Se já tem número, não gera
    IF NEW.numero_solicitacao IS NOT NULL AND NEW.numero_solicitacao != '' THEN
        RETURN NEW;
    END IF;
    
    -- Buscar número da empresa ou gerar código baseado no nome
    SELECT COALESCE(numero_empresa, UPPER(SUBSTRING(REPLACE(nome_fantasia, ' ', ''), 1, 4))) INTO v_company_code
    FROM public.companies
    WHERE id = NEW.company_id;
    
    -- Se ainda não tem código, usar primeiros 4 caracteres do UUID
    IF v_company_code IS NULL OR v_company_code = '' THEN
        v_company_code := UPPER(SUBSTRING(REPLACE(NEW.company_id::TEXT, '-', ''), 1, 4));
    END IF;
    
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Buscar próximo número da sequência
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_solicitacao FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM logistica.logistics_requests
    WHERE company_id = NEW.company_id
    AND numero_solicitacao LIKE v_company_code || '/' || v_year || '/%';
    
    v_number := v_company_code || '/' || v_year || '/' || LPAD(v_sequence::TEXT, 6, '0');
    NEW.numero_solicitacao := v_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_request_number
    BEFORE INSERT ON logistica.logistics_requests
    FOR EACH ROW
    WHEN (NEW.numero_solicitacao IS NULL OR NEW.numero_solicitacao = '')
    EXECUTE FUNCTION logistica.generate_request_number();

-- Trigger para atualizar status da viagem quando entrega é preenchida
CREATE OR REPLACE FUNCTION logistica.update_trip_status_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando uma entrega é criada, atualiza o status da viagem para concluída
    IF TG_OP = 'INSERT' THEN
        UPDATE logistica.trips
        SET status = 'concluida',
            updated_at = NOW()
        WHERE id = NEW.trip_id;
        
        -- Atualiza KM do veículo
        UPDATE frota.vehicles
        SET quilometragem = (
            SELECT km_final
            FROM logistica.trips
            WHERE id = NEW.trip_id
        ),
        updated_at = NOW()
        WHERE id = (
            SELECT vehicle_id
            FROM logistica.trips
            WHERE id = NEW.trip_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_status_on_delivery
    AFTER INSERT ON logistica.trip_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_trip_status_on_delivery();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE logistica.logistics_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_costs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS serão criadas via funções RPC (seguindo padrão do sistema)

-- =====================================================
-- 6. COMENTÁRIOS
-- =====================================================

COMMENT ON SCHEMA logistica IS 'Módulo de gestão logística - solicitações, viagens e custos';
COMMENT ON TABLE logistica.logistics_requests IS 'Solicitações de logística que precisam de aprovação';
COMMENT ON TABLE logistica.trips IS 'Viagens agendadas e em execução';
COMMENT ON TABLE logistica.trip_items IS 'Itens transportados em cada viagem';
COMMENT ON TABLE logistica.trip_checklists IS 'Checklist de conferência preenchido pelo condutor na saída';
COMMENT ON TABLE logistica.trip_deliveries IS 'Formulário de entrega preenchido pelo condutor no destino';
COMMENT ON TABLE logistica.trip_costs IS 'Custos logísticos (combustível, pedágio, diárias, etc.)';

