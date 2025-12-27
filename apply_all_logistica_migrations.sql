-- =====================================================
-- APLICAR TODAS AS MIGRAÇÕES DE LOGÍSTICA
-- Sistema ERP MultiWeave Core
-- =====================================================

-- MIGRAÇÃO 1: Schema de logística
-- =====================================================

-- Criar schema logistica
CREATE SCHEMA IF NOT EXISTS logistica;

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

-- Tabela de solicitações de logística
CREATE TABLE IF NOT EXISTS logistica.logistics_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_solicitacao TEXT NOT NULL,
    tipo_transporte logistica.transport_type NOT NULL,
    setor_solicitante logistica.requesting_sector NOT NULL,
    previsao_envio DATE NOT NULL,
    prazo_destino DATE NOT NULL,
    km_estimado NUMERIC(10,2),
    endereco_retirada TEXT NOT NULL,
    endereco_entrega TEXT NOT NULL,
    cep_retirada TEXT,
    cep_entrega TEXT,
    nome_responsavel_remetente TEXT NOT NULL,
    cpf_responsavel_remetente TEXT,
    telefone_responsavel_remetente TEXT NOT NULL,
    nome_responsavel_destinatario TEXT NOT NULL,
    cpf_responsavel_destinatario TEXT,
    telefone_responsavel_destinatario TEXT,
    peso NUMERIC(10,2),
    largura NUMERIC(10,2),
    altura NUMERIC(10,2),
    comprimento NUMERIC(10,2),
    quantidade_volumes INTEGER,
    project_id UUID REFERENCES public.projects(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    os_number TEXT,
    segmento TEXT,
    cliente TEXT,
    observacoes TEXT,
    status logistica.request_status DEFAULT 'pendente',
    solicitado_por UUID REFERENCES public.profiles(id),
    aprovado_por UUID REFERENCES public.profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes_aprovacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de viagens
CREATE TABLE IF NOT EXISTS logistica.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES logistica.logistics_requests(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES frota.vehicles(id),
    driver_id UUID NOT NULL REFERENCES frota.drivers(id),
    data_saida DATE NOT NULL,
    hora_saida TIME,
    data_chegada DATE,
    hora_chegada TIME,
    km_inicial NUMERIC(10,2),
    km_final NUMERIC(10,2),
    km_percorrido NUMERIC(10,2) GENERATED ALWAYS AS (km_final - km_inicial) STORED,
    status logistica.trip_status DEFAULT 'agendada',
    project_id UUID REFERENCES public.projects(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    os_number TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Tabela de itens transportados
CREATE TABLE IF NOT EXISTS logistica.trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES logistica.trips(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    quantidade NUMERIC(10,2) NOT NULL,
    unidade_medida TEXT,
    peso NUMERIC(10,2),
    observacoes TEXT,
    material_id UUID REFERENCES almoxarifado.materials(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de checklist de conferência
CREATE TABLE IF NOT EXISTS logistica.trip_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES logistica.trips(id) ON DELETE CASCADE,
    items_conferidos JSONB NOT NULL DEFAULT '[]'::jsonb,
    observacoes TEXT,
    conferido_por UUID REFERENCES public.profiles(id),
    conferido_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entregas
CREATE TABLE IF NOT EXISTS logistica.trip_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES logistica.trips(id) ON DELETE CASCADE,
    data_entrega DATE NOT NULL,
    hora_entrega TIME,
    recebido_por TEXT NOT NULL,
    cpf_recebedor TEXT,
    telefone_recebedor TEXT,
    items_entregues JSONB NOT NULL DEFAULT '[]'::jsonb,
    todos_itens_entregues BOOLEAN DEFAULT true,
    observacoes TEXT,
    comprovante_url TEXT,
    entregue_por UUID REFERENCES public.profiles(id),
    entregue_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de custos logísticos
CREATE TABLE IF NOT EXISTS logistica.trip_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES logistica.trips(id) ON DELETE CASCADE,
    tipo_custo logistica.cost_type NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_custo DATE NOT NULL,
    vehicle_id UUID REFERENCES frota.vehicles(id),
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id),
    project_id UUID REFERENCES public.projects(id),
    os_number TEXT,
    comprovante_url TEXT,
    observacoes TEXT,
    financial_entry_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_logistics_requests_company ON logistica.logistics_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_status ON logistica.logistics_requests(status);
CREATE INDEX IF NOT EXISTS idx_trips_company ON logistica.trips(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_request ON logistica.trips(request_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON logistica.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_costs_company ON logistica.trip_costs(company_id);

-- Triggers
CREATE OR REPLACE FUNCTION logistica.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_logistics_requests_updated_at ON logistica.logistics_requests;
CREATE TRIGGER trigger_update_logistics_requests_updated_at
    BEFORE UPDATE ON logistica.logistics_requests
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_trips_updated_at ON logistica.trips;
CREATE TRIGGER trigger_update_trips_updated_at
    BEFORE UPDATE ON logistica.trips
    FOR EACH ROW
    EXECUTE FUNCTION logistica.update_updated_at();

-- RLS
ALTER TABLE logistica.logistics_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica.trip_costs ENABLE ROW LEVEL SECURITY;

