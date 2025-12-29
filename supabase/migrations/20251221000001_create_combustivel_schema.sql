-- =====================================================
-- MÓDULO COMBUSTÍVEL - SCRIPT SQL COMPLETO
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Criar schema combustivel
CREATE SCHEMA IF NOT EXISTS combustivel;

-- =====================================================
-- 1. ENUMS E TIPOS
-- =====================================================

-- Enum para tipo de combustível
DO $$ BEGIN
    CREATE TYPE combustivel.fuel_type AS ENUM ('gasolina', 'etanol', 'diesel', 'diesel_s10', 'gnv', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de pagamento
DO $$ BEGIN
    CREATE TYPE combustivel.payment_type AS ENUM ('cartao_combustivel', 'reembolso', 'fatura', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status da solicitação
DO $$ BEGIN
    CREATE TYPE combustivel.request_status AS ENUM ('pendente', 'aprovada', 'reprovada', 'recarregada', 'cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para finalidade do abastecimento
DO $$ BEGIN
    CREATE TYPE combustivel.purpose_type AS ENUM ('logistica', 'os', 'manutencao', 'implantacao', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status do registro de abastecimento
DO $$ BEGIN
    CREATE TYPE combustivel.refuel_status AS ENUM ('pendente', 'registrado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de tipos de combustível (configuração)
CREATE TABLE combustivel.fuel_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo combustivel.fuel_type NOT NULL,
    consumo_medio_km_l NUMERIC(10,2), -- Consumo médio esperado (km/l)
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, nome)
);

-- Tabela de postos homologados
CREATE TABLE combustivel.approved_gas_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    telefone TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de limites de abastecimento
CREATE TABLE combustivel.refuel_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_limite TEXT NOT NULL CHECK (tipo_limite IN ('veiculo', 'colaborador', 'centro_custo', 'projeto')),
    veiculo_id UUID REFERENCES frota.vehicles(id),
    colaborador_id UUID REFERENCES public.profiles(id),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    limite_mensal_litros NUMERIC(10,2),
    limite_mensal_valor NUMERIC(10,2),
    periodo_inicio DATE,
    periodo_fim DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de orçamento de combustível
CREATE TABLE combustivel.fuel_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    condutor_id UUID REFERENCES public.profiles(id),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    valor_orcado NUMERIC(10,2) NOT NULL,
    valor_consumido NUMERIC(10,2) DEFAULT 0,
    litros_orcados NUMERIC(10,2),
    litros_consumidos NUMERIC(10,2) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Tabela de histórico de revisões de orçamento
CREATE TABLE combustivel.budget_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES combustivel.fuel_budgets(id) ON DELETE CASCADE,
    valor_anterior NUMERIC(10,2),
    valor_novo NUMERIC(10,2),
    motivo TEXT NOT NULL,
    revisado_por UUID REFERENCES public.profiles(id),
    revisado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de solicitações de abastecimento
CREATE TABLE combustivel.refuel_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_solicitacao TEXT NOT NULL,
    
    -- Informações do abastecimento
    condutor_id UUID NOT NULL REFERENCES public.profiles(id),
    veiculo_id UUID NOT NULL REFERENCES frota.vehicles(id),
    tipo_combustivel_id UUID REFERENCES combustivel.fuel_types(id),
    rota TEXT,
    km_estimado NUMERIC(10,2),
    km_veiculo NUMERIC(10,2) NOT NULL,
    valor_solicitado NUMERIC(10,2) NOT NULL,
    litros_estimados NUMERIC(10,2),
    regiao TEXT,
    
    -- Vínculos obrigatórios
    centro_custo_id UUID NOT NULL REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    finalidade combustivel.purpose_type NOT NULL,
    os_number TEXT, -- Número da OS quando aplicável
    
    -- Status e aprovação
    status combustivel.request_status DEFAULT 'pendente',
    solicitado_por UUID REFERENCES public.profiles(id),
    aprovado_por UUID REFERENCES public.profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes_aprovacao TEXT,
    
    -- Informações de recarga (Ticket Log)
    recarga_confirmada BOOLEAN DEFAULT false,
    valor_recarregado NUMERIC(10,2),
    recarga_anexo_url TEXT,
    recarga_observacoes TEXT,
    recarga_confirmada_por UUID REFERENCES public.profiles(id),
    recarga_confirmada_em TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de abastecimentos programados (recorrentes)
CREATE TABLE combustivel.scheduled_refuels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    condutor_id UUID NOT NULL REFERENCES public.profiles(id),
    veiculo_id UUID NOT NULL REFERENCES frota.vehicles(id),
    tipo_combustivel_id UUID REFERENCES combustivel.fuel_types(id),
    centro_custo_id UUID NOT NULL REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    valor_estimado NUMERIC(10,2),
    litros_estimados NUMERIC(10,2),
    frequencia TEXT NOT NULL CHECK (frequencia IN ('diaria', 'semanal', 'quinzenal', 'mensal')),
    dia_semana INTEGER CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0 = domingo, 6 = sábado
    dia_mes INTEGER CHECK (dia_mes >= 1 AND dia_mes <= 31),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Tabela de registros de abastecimento (preenchido pelo condutor)
CREATE TABLE combustivel.refuel_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES combustivel.refuel_requests(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Informações do abastecimento
    data_abastecimento DATE NOT NULL,
    hora_abastecimento TIME,
    posto_id UUID REFERENCES combustivel.approved_gas_stations(id),
    posto_nome TEXT, -- Nome do posto caso não esteja cadastrado
    tipo_combustivel_id UUID REFERENCES combustivel.fuel_types(id),
    litros NUMERIC(10,2) NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL,
    preco_litro NUMERIC(10,2) GENERATED ALWAYS AS (valor_total / NULLIF(litros, 0)) STORED,
    km_anterior NUMERIC(10,2),
    km_atual NUMERIC(10,2) NOT NULL,
    km_rodado NUMERIC(10,2) GENERATED ALWAYS AS (km_atual - km_anterior) STORED,
    consumo_km_l NUMERIC(10,2), -- Calculado se houver km_anterior
    
    -- Tipo de pagamento
    tipo_pagamento combustivel.payment_type,
    
    -- Comprovante
    comprovante_url TEXT,
    observacoes TEXT,
    
    -- Status
    status combustivel.refuel_status DEFAULT 'pendente',
    
    -- Vínculos
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    
    -- Integração com viagem (opcional)
    trip_id UUID REFERENCES logistica.trips(id),
    
    -- Auditoria
    registrado_por UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de consumo por veículo (agregação)
CREATE TABLE combustivel.vehicle_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    veiculo_id UUID NOT NULL REFERENCES frota.vehicles(id),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    total_litros NUMERIC(10,2) DEFAULT 0,
    total_valor NUMERIC(10,2) DEFAULT 0,
    km_rodados NUMERIC(10,2) DEFAULT 0,
    consumo_medio NUMERIC(10,2), -- km/l
    desvio_consumo NUMERIC(10,2), -- Diferença entre esperado e real
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, veiculo_id, mes, ano)
);

-- Tabela de consumo por colaborador (agregação)
CREATE TABLE combustivel.driver_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    condutor_id UUID NOT NULL REFERENCES public.profiles(id),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    total_litros NUMERIC(10,2) DEFAULT 0,
    total_valor NUMERIC(10,2) DEFAULT 0,
    quantidade_abastecimentos INTEGER DEFAULT 0,
    veiculos_utilizados TEXT[], -- Array de IDs de veículos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, condutor_id, mes, ano)
);

-- Tabela de alertas de consumo
CREATE TABLE combustivel.consumption_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('consumo_acima_esperado', 'orcamento_estourado', 'km_incompativel', 'abastecimento_duplicado')),
    veiculo_id UUID REFERENCES frota.vehicles(id),
    condutor_id UUID REFERENCES public.profiles(id),
    request_id UUID REFERENCES combustivel.refuel_requests(id),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    mensagem TEXT NOT NULL,
    severidade TEXT NOT NULL CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
    resolvido BOOLEAN DEFAULT false,
    resolvido_por UUID REFERENCES public.profiles(id),
    resolvido_em TIMESTAMP WITH TIME ZONE,
    observacoes_resolucao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de auditoria de alterações
CREATE TABLE combustivel.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tabela TEXT NOT NULL,
    registro_id UUID NOT NULL,
    acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
    campos_alterados JSONB, -- {campo: {antigo: valor, novo: valor}}
    usuario_id UUID REFERENCES public.profiles(id),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. ÍNDICES
-- =====================================================

CREATE INDEX idx_fuel_types_company ON combustivel.fuel_types(company_id);
CREATE INDEX idx_approved_gas_stations_company ON combustivel.approved_gas_stations(company_id);
CREATE INDEX idx_refuel_limits_company ON combustivel.refuel_limits(company_id);
CREATE INDEX idx_refuel_limits_vehicle ON combustivel.refuel_limits(veiculo_id);
CREATE INDEX idx_refuel_limits_colaborador ON combustivel.refuel_limits(colaborador_id);
CREATE INDEX idx_refuel_limits_cost_center ON combustivel.refuel_limits(centro_custo_id);
CREATE INDEX idx_refuel_limits_project ON combustivel.refuel_limits(projeto_id);

CREATE INDEX idx_fuel_budgets_company ON combustivel.fuel_budgets(company_id);
CREATE INDEX idx_fuel_budgets_cost_center ON combustivel.fuel_budgets(centro_custo_id);
CREATE INDEX idx_fuel_budgets_project ON combustivel.fuel_budgets(projeto_id);
CREATE INDEX idx_fuel_budgets_condutor ON combustivel.fuel_budgets(condutor_id);
CREATE INDEX idx_fuel_budgets_periodo ON combustivel.fuel_budgets(ano, mes);

CREATE INDEX idx_refuel_requests_company ON combustivel.refuel_requests(company_id);
CREATE INDEX idx_refuel_requests_status ON combustivel.refuel_requests(status);
CREATE INDEX idx_refuel_requests_condutor ON combustivel.refuel_requests(condutor_id);
CREATE INDEX idx_refuel_requests_vehicle ON combustivel.refuel_requests(veiculo_id);
CREATE INDEX idx_refuel_requests_cost_center ON combustivel.refuel_requests(centro_custo_id);
CREATE INDEX idx_refuel_requests_project ON combustivel.refuel_requests(projeto_id);
CREATE INDEX idx_refuel_requests_solicitado_por ON combustivel.refuel_requests(solicitado_por);
CREATE INDEX idx_refuel_requests_numero ON combustivel.refuel_requests(numero_solicitacao);

CREATE INDEX idx_scheduled_refuels_company ON combustivel.scheduled_refuels(company_id);
CREATE INDEX idx_scheduled_refuels_condutor ON combustivel.scheduled_refuels(condutor_id);
CREATE INDEX idx_scheduled_refuels_vehicle ON combustivel.scheduled_refuels(veiculo_id);

CREATE INDEX idx_refuel_records_company ON combustivel.refuel_records(company_id);
CREATE INDEX idx_refuel_records_request ON combustivel.refuel_records(request_id);
CREATE INDEX idx_refuel_records_data ON combustivel.refuel_records(data_abastecimento);
CREATE INDEX idx_refuel_records_status ON combustivel.refuel_records(status);
CREATE INDEX idx_refuel_records_trip ON combustivel.refuel_records(trip_id);

CREATE INDEX idx_vehicle_consumption_company ON combustivel.vehicle_consumption(company_id);
CREATE INDEX idx_vehicle_consumption_vehicle ON combustivel.vehicle_consumption(veiculo_id);
CREATE INDEX idx_vehicle_consumption_periodo ON combustivel.vehicle_consumption(ano, mes);

CREATE INDEX idx_driver_consumption_company ON combustivel.driver_consumption(company_id);
CREATE INDEX idx_driver_consumption_condutor ON combustivel.driver_consumption(condutor_id);
CREATE INDEX idx_driver_consumption_periodo ON combustivel.driver_consumption(ano, mes);

CREATE INDEX idx_consumption_alerts_company ON combustivel.consumption_alerts(company_id);
CREATE INDEX idx_consumption_alerts_resolvido ON combustivel.consumption_alerts(resolvido);
CREATE INDEX idx_consumption_alerts_severidade ON combustivel.consumption_alerts(severidade);

CREATE INDEX idx_audit_log_company ON combustivel.audit_log(company_id);
CREATE INDEX idx_audit_log_tabela ON combustivel.audit_log(tabela, registro_id);
CREATE INDEX idx_audit_log_usuario ON combustivel.audit_log(usuario_id);
CREATE INDEX idx_audit_log_created_at ON combustivel.audit_log(created_at);

-- =====================================================
-- 4. TRIGGERS E AUTOMAÇÕES
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION combustivel.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fuel_types_updated_at
    BEFORE UPDATE ON combustivel.fuel_types
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_approved_gas_stations_updated_at
    BEFORE UPDATE ON combustivel.approved_gas_stations
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_refuel_limits_updated_at
    BEFORE UPDATE ON combustivel.refuel_limits
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_fuel_budgets_updated_at
    BEFORE UPDATE ON combustivel.fuel_budgets
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_refuel_requests_updated_at
    BEFORE UPDATE ON combustivel.refuel_requests
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_scheduled_refuels_updated_at
    BEFORE UPDATE ON combustivel.scheduled_refuels
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_refuel_records_updated_at
    BEFORE UPDATE ON combustivel.refuel_records
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_vehicle_consumption_updated_at
    BEFORE UPDATE ON combustivel.vehicle_consumption
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_driver_consumption_updated_at
    BEFORE UPDATE ON combustivel.driver_consumption
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

CREATE TRIGGER trigger_update_consumption_alerts_updated_at
    BEFORE UPDATE ON combustivel.consumption_alerts
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_updated_at();

-- Trigger para gerar número de solicitação automático
CREATE OR REPLACE FUNCTION combustivel.generate_request_number()
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
    FROM combustivel.refuel_requests
    WHERE company_id = NEW.company_id
    AND numero_solicitacao LIKE v_company_code || '/COMB/' || v_year || '/%';
    
    v_number := v_company_code || '/COMB/' || v_year || '/' || LPAD(v_sequence::TEXT, 6, '0');
    NEW.numero_solicitacao := v_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_refuel_request_number
    BEFORE INSERT ON combustivel.refuel_requests
    FOR EACH ROW
    WHEN (NEW.numero_solicitacao IS NULL OR NEW.numero_solicitacao = '')
    EXECUTE FUNCTION combustivel.generate_request_number();

-- Trigger para atualizar KM do veículo quando abastecimento é registrado
CREATE OR REPLACE FUNCTION combustivel.update_vehicle_km()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um registro de abastecimento é criado/atualizado, atualiza o KM do veículo
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.km_atual IS DISTINCT FROM OLD.km_atual) THEN
        IF NEW.km_atual IS NOT NULL THEN
            UPDATE frota.vehicles
            SET quilometragem = NEW.km_atual,
                updated_at = NOW()
            WHERE id = (
                SELECT veiculo_id
                FROM combustivel.refuel_requests
                WHERE id = NEW.request_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_km_on_refuel
    AFTER INSERT OR UPDATE OF km_atual ON combustivel.refuel_records
    FOR EACH ROW
    EXECUTE FUNCTION combustivel.update_vehicle_km();

-- Trigger para atualizar consumo agregado por veículo
CREATE OR REPLACE FUNCTION combustivel.update_vehicle_consumption()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicle_id UUID;
    v_mes INTEGER;
    v_ano INTEGER;
BEGIN
    -- Buscar informações do veículo e data
    SELECT 
        rr.veiculo_id,
        EXTRACT(MONTH FROM rr.data_abastecimento)::INTEGER,
        EXTRACT(YEAR FROM rr.data_abastecimento)::INTEGER
    INTO v_vehicle_id, v_mes, v_ano
    FROM combustivel.refuel_records rr
    WHERE rr.id = NEW.id;
    
    IF v_vehicle_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Atualizar ou inserir consumo agregado
    INSERT INTO combustivel.vehicle_consumption (
        company_id,
        veiculo_id,
        mes,
        ano,
        total_litros,
        total_valor,
        km_rodados
    )
    SELECT 
        rr.company_id,
        rr.request_id,
        v_mes,
        v_ano,
        COALESCE(SUM(rr.litros), 0),
        COALESCE(SUM(rr.valor_total), 0),
        COALESCE(SUM(rr.km_rodado), 0)
    FROM combustivel.refuel_records rr
    INNER JOIN combustivel.refuel_requests req ON rr.request_id = req.id
    WHERE req.veiculo_id = v_vehicle_id
    AND EXTRACT(MONTH FROM rr.data_abastecimento) = v_mes
    AND EXTRACT(YEAR FROM rr.data_abastecimento) = v_ano
    AND rr.status = 'registrado'
    ON CONFLICT (company_id, veiculo_id, mes, ano)
    DO UPDATE SET
        total_litros = EXCLUDED.total_litros,
        total_valor = EXCLUDED.total_valor,
        km_rodados = EXCLUDED.km_rodados,
        consumo_medio = CASE 
            WHEN EXCLUDED.km_rodados > 0 THEN EXCLUDED.km_rodados / NULLIF(EXCLUDED.total_litros, 0)
            ELSE NULL
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_consumption_on_refuel
    AFTER INSERT OR UPDATE OF status, litros, valor_total, km_rodado ON combustivel.refuel_records
    FOR EACH ROW
    WHEN (NEW.status = 'registrado')
    EXECUTE FUNCTION combustivel.update_vehicle_consumption();

-- Trigger para atualizar consumo agregado por colaborador
CREATE OR REPLACE FUNCTION combustivel.update_driver_consumption()
RETURNS TRIGGER AS $$
DECLARE
    v_condutor_id UUID;
    v_mes INTEGER;
    v_ano INTEGER;
    v_company_id UUID;
BEGIN
    -- Buscar informações do condutor e data
    SELECT 
        req.condutor_id,
        req.company_id,
        EXTRACT(MONTH FROM rr.data_abastecimento)::INTEGER,
        EXTRACT(YEAR FROM rr.data_abastecimento)::INTEGER
    INTO v_condutor_id, v_company_id, v_mes, v_ano
    FROM combustivel.refuel_records rr
    INNER JOIN combustivel.refuel_requests req ON rr.request_id = req.id
    WHERE rr.id = NEW.id;
    
    IF v_condutor_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Atualizar ou inserir consumo agregado
    INSERT INTO combustivel.driver_consumption (
        company_id,
        condutor_id,
        mes,
        ano,
        total_litros,
        total_valor,
        quantidade_abastecimentos,
        veiculos_utilizados
    )
    SELECT 
        v_company_id,
        v_condutor_id,
        v_mes,
        v_ano,
        COALESCE(SUM(rr.litros), 0),
        COALESCE(SUM(rr.valor_total), 0),
        COUNT(rr.id),
        ARRAY_AGG(DISTINCT req.veiculo_id::TEXT)
    FROM combustivel.refuel_records rr
    INNER JOIN combustivel.refuel_requests req ON rr.request_id = req.id
    WHERE req.condutor_id = v_condutor_id
    AND EXTRACT(MONTH FROM rr.data_abastecimento) = v_mes
    AND EXTRACT(YEAR FROM rr.data_abastecimento) = v_ano
    AND rr.status = 'registrado'
    ON CONFLICT (company_id, condutor_id, mes, ano)
    DO UPDATE SET
        total_litros = EXCLUDED.total_litros,
        total_valor = EXCLUDED.total_valor,
        quantidade_abastecimentos = EXCLUDED.quantidade_abastecimentos,
        veiculos_utilizados = EXCLUDED.veiculos_utilizados,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_consumption_on_refuel
    AFTER INSERT OR UPDATE OF status, litros, valor_total ON combustivel.refuel_records
    FOR EACH ROW
    WHEN (NEW.status = 'registrado')
    EXECUTE FUNCTION combustivel.update_driver_consumption();

-- Trigger para atualizar orçamento quando abastecimento é registrado
CREATE OR REPLACE FUNCTION combustivel.update_budget_on_refuel()
RETURNS TRIGGER AS $$
DECLARE
    v_condutor_id UUID;
    v_centro_custo_id UUID;
    v_projeto_id UUID;
    v_mes INTEGER;
    v_ano INTEGER;
    v_company_id UUID;
BEGIN
    -- Buscar informações do abastecimento
    SELECT 
        req.condutor_id,
        req.centro_custo_id,
        req.projeto_id,
        req.company_id,
        EXTRACT(MONTH FROM rr.data_abastecimento)::INTEGER,
        EXTRACT(YEAR FROM rr.data_abastecimento)::INTEGER
    INTO v_condutor_id, v_centro_custo_id, v_projeto_id, v_company_id, v_mes, v_ano
    FROM combustivel.refuel_records rr
    INNER JOIN combustivel.refuel_requests req ON rr.request_id = req.id
    WHERE rr.id = NEW.id;
    
    IF v_condutor_id IS NULL OR v_centro_custo_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Atualizar orçamento
    UPDATE combustivel.fuel_budgets
    SET 
        valor_consumido = COALESCE(valor_consumido, 0) + COALESCE(NEW.valor_total, 0),
        litros_consumidos = COALESCE(litros_consumidos, 0) + COALESCE(NEW.litros, 0),
        updated_at = NOW()
    WHERE company_id = v_company_id
    AND mes = v_mes
    AND ano = v_ano
    AND (condutor_id IS NULL OR condutor_id = v_condutor_id)
    AND (centro_custo_id IS NULL OR centro_custo_id = v_centro_custo_id)
    AND (projeto_id IS NULL OR projeto_id = v_projeto_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budget_on_refuel
    AFTER INSERT OR UPDATE OF status, valor_total, litros ON combustivel.refuel_records
    FOR EACH ROW
    WHEN (NEW.status = 'registrado')
    EXECUTE FUNCTION combustivel.update_budget_on_refuel();

-- Trigger para criar alertas automáticos
CREATE OR REPLACE FUNCTION combustivel.create_consumption_alerts()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicle_id UUID;
    v_condutor_id UUID;
    v_centro_custo_id UUID;
    v_projeto_id UUID;
    v_company_id UUID;
    v_consumo_esperado NUMERIC;
    v_consumo_real NUMERIC;
    v_orcamento_disponivel NUMERIC;
BEGIN
    -- Buscar informações
    SELECT 
        req.veiculo_id,
        req.condutor_id,
        req.centro_custo_id,
        req.projeto_id,
        req.company_id
    INTO v_vehicle_id, v_condutor_id, v_centro_custo_id, v_projeto_id, v_company_id
    FROM combustivel.refuel_requests req
    WHERE req.id = NEW.request_id;
    
    -- Verificar consumo acima do esperado
    IF NEW.km_rodado IS NOT NULL AND NEW.litros > 0 THEN
        v_consumo_real := NEW.km_rodado / NEW.litros;
        
        -- Buscar consumo esperado do tipo de veículo
        SELECT ft.consumo_medio_km_l INTO v_consumo_esperado
        FROM combustivel.refuel_requests req
        INNER JOIN combustivel.fuel_types ft ON req.tipo_combustivel_id = ft.id
        WHERE req.id = NEW.request_id;
        
        -- Se consumo real é significativamente menor que esperado (mais de 20% de diferença)
        IF v_consumo_esperado IS NOT NULL AND v_consumo_real < (v_consumo_esperado * 0.8) THEN
            INSERT INTO combustivel.consumption_alerts (
                company_id,
                veiculo_id,
                condutor_id,
                request_id,
                tipo_alerta,
                mensagem,
                severidade
            ) VALUES (
                v_company_id,
                v_vehicle_id,
                v_condutor_id,
                NEW.request_id,
                'consumo_acima_esperado',
                'Consumo de ' || ROUND(v_consumo_real, 2) || ' km/l está abaixo do esperado (' || ROUND(v_consumo_esperado, 2) || ' km/l)',
                'media'
            );
        END IF;
    END IF;
    
    -- Verificar orçamento estourado
    SELECT (valor_orcado - valor_consumido) INTO v_orcamento_disponivel
    FROM combustivel.fuel_budgets
    WHERE company_id = v_company_id
    AND mes = EXTRACT(MONTH FROM NEW.data_abastecimento)
    AND ano = EXTRACT(YEAR FROM NEW.data_abastecimento)
    AND (centro_custo_id IS NULL OR centro_custo_id = v_centro_custo_id)
    AND (projeto_id IS NULL OR projeto_id = v_projeto_id)
    LIMIT 1;
    
    IF v_orcamento_disponivel IS NOT NULL AND v_orcamento_disponivel < 0 THEN
        INSERT INTO combustivel.consumption_alerts (
            company_id,
            centro_custo_id,
            projeto_id,
            tipo_alerta,
            mensagem,
            severidade
        ) VALUES (
            v_company_id,
            v_centro_custo_id,
            v_projeto_id,
            'orcamento_estourado',
            'Orçamento de combustível estourado em R$ ' || ABS(v_orcamento_disponivel),
            'alta'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_consumption_alerts
    AFTER INSERT ON combustivel.refuel_records
    FOR EACH ROW
    WHEN (NEW.status = 'registrado')
    EXECUTE FUNCTION combustivel.create_consumption_alerts();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE combustivel.fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.approved_gas_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.refuel_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.fuel_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.refuel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.scheduled_refuels ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.refuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.vehicle_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.driver_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.consumption_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustivel.audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS serão criadas via funções RPC (seguindo padrão do sistema)

-- =====================================================
-- 6. COMENTÁRIOS
-- =====================================================

COMMENT ON SCHEMA combustivel IS 'Módulo de gestão de combustível - solicitações, abastecimentos e consumo';
COMMENT ON TABLE combustivel.fuel_types IS 'Tipos de combustível configuráveis por empresa';
COMMENT ON TABLE combustivel.approved_gas_stations IS 'Postos de combustível homologados';
COMMENT ON TABLE combustivel.refuel_limits IS 'Limites de abastecimento por veículo, colaborador, centro de custo ou projeto';
COMMENT ON TABLE combustivel.fuel_budgets IS 'Orçamento de combustível por período';
COMMENT ON TABLE combustivel.budget_revisions IS 'Histórico de revisões de orçamento';
COMMENT ON TABLE combustivel.refuel_requests IS 'Solicitações de abastecimento que precisam de aprovação';
COMMENT ON TABLE combustivel.scheduled_refuels IS 'Abastecimentos programados (recorrentes)';
COMMENT ON TABLE combustivel.refuel_records IS 'Registros de abastecimento preenchidos pelo condutor';
COMMENT ON TABLE combustivel.vehicle_consumption IS 'Consumo agregado por veículo (mensal)';
COMMENT ON TABLE combustivel.driver_consumption IS 'Consumo agregado por colaborador (mensal)';
COMMENT ON TABLE combustivel.consumption_alerts IS 'Alertas automáticos de consumo';
COMMENT ON TABLE combustivel.audit_log IS 'Auditoria completa de alterações no módulo';

