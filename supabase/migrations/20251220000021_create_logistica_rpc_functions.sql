-- =====================================================
-- FUNÇÕES RPC PARA MÓDULO LOGÍSTICA
-- Sistema ERP MultiWeave Core
-- =====================================================

-- =====================================================
-- 1. FUNÇÕES PARA SOLICITAÇÕES DE LOGÍSTICA
-- =====================================================

-- Função para listar solicitações
CREATE OR REPLACE FUNCTION logistica.list_logistics_requests(
    p_company_id UUID,
    p_status TEXT DEFAULT NULL,
    p_tipo_transporte TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    numero_solicitacao TEXT,
    tipo_transporte TEXT,
    setor_solicitante TEXT,
    previsao_envio DATE,
    prazo_destino DATE,
    km_estimado NUMERIC,
    endereco_retirada TEXT,
    endereco_entrega TEXT,
    status TEXT,
    solicitado_por UUID,
    solicitado_por_nome TEXT,
    aprovado_por UUID,
    aprovado_por_nome TEXT,
    project_id UUID,
    project_nome TEXT,
    cost_center_id UUID,
    cost_center_nome TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.id,
        lr.company_id,
        lr.numero_solicitacao,
        lr.tipo_transporte::TEXT,
        lr.setor_solicitante::TEXT,
        lr.previsao_envio,
        lr.prazo_destino,
        lr.km_estimado,
        lr.endereco_retirada,
        lr.endereco_entrega,
        lr.status::TEXT,
        lr.solicitado_por,
        sp.nome as solicitado_por_nome,
        lr.aprovado_por,
        ap.nome as aprovado_por_nome,
        lr.project_id,
        p.nome as project_nome,
        lr.cost_center_id,
        cc.nome as cost_center_nome,
        lr.created_at,
        lr.updated_at
    FROM logistica.logistics_requests lr
    LEFT JOIN public.profiles sp ON lr.solicitado_por = sp.id
    LEFT JOIN public.profiles ap ON lr.aprovado_por = ap.id
    LEFT JOIN public.projects p ON lr.project_id = p.id
    LEFT JOIN public.cost_centers cc ON lr.cost_center_id = cc.id
    WHERE lr.company_id = p_company_id
    AND (p_status IS NULL OR lr.status::TEXT = p_status)
    AND (p_tipo_transporte IS NULL OR lr.tipo_transporte::TEXT = p_tipo_transporte)
    AND (p_search IS NULL OR 
         lr.numero_solicitacao ILIKE '%' || p_search || '%' OR
         lr.endereco_retirada ILIKE '%' || p_search || '%' OR
         lr.endereco_entrega ILIKE '%' || p_search || '%')
    ORDER BY lr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter solicitação por ID
CREATE OR REPLACE FUNCTION logistica.get_logistics_request(
    p_request_id UUID,
    p_company_id UUID
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    numero_solicitacao TEXT,
    tipo_transporte TEXT,
    setor_solicitante TEXT,
    previsao_envio DATE,
    prazo_destino DATE,
    km_estimado NUMERIC,
    endereco_retirada TEXT,
    endereco_entrega TEXT,
    cep_retirada TEXT,
    cep_entrega TEXT,
    nome_responsavel_remetente TEXT,
    cpf_responsavel_remetente TEXT,
    telefone_responsavel_remetente TEXT,
    nome_responsavel_destinatario TEXT,
    cpf_responsavel_destinatario TEXT,
    telefone_responsavel_destinatario TEXT,
    peso NUMERIC,
    largura NUMERIC,
    altura NUMERIC,
    comprimento NUMERIC,
    quantidade_volumes INTEGER,
    project_id UUID,
    cost_center_id UUID,
    os_number TEXT,
    segmento TEXT,
    cliente TEXT,
    observacoes TEXT,
    status TEXT,
    solicitado_por UUID,
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    observacoes_aprovacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.id,
        lr.company_id,
        lr.numero_solicitacao,
        lr.tipo_transporte::TEXT,
        lr.setor_solicitante::TEXT,
        lr.previsao_envio,
        lr.prazo_destino,
        lr.km_estimado,
        lr.endereco_retirada,
        lr.endereco_entrega,
        lr.cep_retirada,
        lr.cep_entrega,
        lr.nome_responsavel_remetente,
        lr.cpf_responsavel_remetente,
        lr.telefone_responsavel_remetente,
        lr.nome_responsavel_destinatario,
        lr.cpf_responsavel_destinatario,
        lr.telefone_responsavel_destinatario,
        lr.peso,
        lr.largura,
        lr.altura,
        lr.comprimento,
        lr.quantidade_volumes,
        lr.project_id,
        lr.cost_center_id,
        lr.os_number,
        lr.segmento,
        lr.cliente,
        lr.observacoes,
        lr.status::TEXT,
        lr.solicitado_por,
        lr.aprovado_por,
        lr.aprovado_em,
        lr.observacoes_aprovacao,
        lr.created_at,
        lr.updated_at
    FROM logistica.logistics_requests lr
    WHERE lr.id = p_request_id AND lr.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar solicitação
CREATE OR REPLACE FUNCTION logistica.create_logistics_request(
    p_company_id UUID,
    p_tipo_transporte TEXT,
    p_setor_solicitante TEXT,
    p_previsao_envio DATE,
    p_prazo_destino DATE,
    p_endereco_retirada TEXT,
    p_endereco_entrega TEXT,
    p_nome_responsavel_remetente TEXT,
    p_telefone_responsavel_remetente TEXT,
    p_nome_responsavel_destinatario TEXT,
    p_solicitado_por UUID,
    p_km_estimado NUMERIC DEFAULT NULL,
    p_cep_retirada TEXT DEFAULT NULL,
    p_cep_entrega TEXT DEFAULT NULL,
    p_cpf_responsavel_remetente TEXT DEFAULT NULL,
    p_cpf_responsavel_destinatario TEXT DEFAULT NULL,
    p_telefone_responsavel_destinatario TEXT DEFAULT NULL,
    p_peso NUMERIC DEFAULT NULL,
    p_largura NUMERIC DEFAULT NULL,
    p_altura NUMERIC DEFAULT NULL,
    p_comprimento NUMERIC DEFAULT NULL,
    p_quantidade_volumes INTEGER DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_cost_center_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_segmento TEXT DEFAULT NULL,
    p_cliente TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    RAISE NOTICE '[LOGISTICA] create_logistics_request - Iniciando criação';
    RAISE NOTICE '[LOGISTICA] Parâmetros: company_id=%, tipo_transporte=%, cost_center_id=%, project_id=%', 
        p_company_id, p_tipo_transporte, p_cost_center_id, p_project_id;
    
    INSERT INTO logistica.logistics_requests (
        company_id,
        numero_solicitacao, -- Será gerado pelo trigger se NULL
        tipo_transporte,
        setor_solicitante,
        previsao_envio,
        prazo_destino,
        km_estimado,
        endereco_retirada,
        endereco_entrega,
        cep_retirada,
        cep_entrega,
        nome_responsavel_remetente,
        cpf_responsavel_remetente,
        telefone_responsavel_remetente,
        nome_responsavel_destinatario,
        cpf_responsavel_destinatario,
        telefone_responsavel_destinatario,
        peso,
        largura,
        altura,
        comprimento,
        quantidade_volumes,
        project_id,
        cost_center_id,
        os_number,
        segmento,
        cliente,
        observacoes,
        solicitado_por,
        status
    ) VALUES (
        p_company_id,
        NULL, -- Deixar NULL para o trigger gerar automaticamente
        p_tipo_transporte::logistica.transport_type,
        p_setor_solicitante::logistica.requesting_sector,
        p_previsao_envio,
        p_prazo_destino,
        p_km_estimado,
        p_endereco_retirada,
        p_endereco_entrega,
        p_cep_retirada,
        p_cep_entrega,
        p_nome_responsavel_remetente,
        p_cpf_responsavel_remetente,
        p_telefone_responsavel_remetente,
        p_nome_responsavel_destinatario,
        p_cpf_responsavel_destinatario,
        p_telefone_responsavel_destinatario,
        p_peso,
        p_largura,
        p_altura,
        p_comprimento,
        p_quantidade_volumes,
        p_project_id,
        p_cost_center_id,
        p_os_number,
        p_segmento,
        p_cliente,
        p_observacoes,
        p_solicitado_por,
        'pendente'
    ) RETURNING id INTO v_request_id;
    
    RAISE NOTICE '[LOGISTICA] create_logistics_request - Solicitação criada com sucesso: id=%', v_request_id;
    
    RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[LOGISTICA] create_logistics_request - Erro ao criar solicitação: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar/rejeitar solicitação
CREATE OR REPLACE FUNCTION logistica.approve_logistics_request(
    p_request_id UUID,
    p_company_id UUID,
    p_status TEXT, -- 'aprovado' ou 'rejeitado'
    p_aprovado_por UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE logistica.logistics_requests SET
        status = p_status::logistica.request_status,
        aprovado_por = p_aprovado_por,
        aprovado_em = NOW(),
        observacoes_aprovacao = p_observacoes,
        updated_at = NOW()
    WHERE id = p_request_id AND company_id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNÇÕES PARA VIAGENS
-- =====================================================

-- Função para listar viagens
CREATE OR REPLACE FUNCTION logistica.list_trips(
    p_company_id UUID,
    p_status TEXT DEFAULT NULL,
    p_vehicle_id UUID DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    request_id UUID,
    request_numero TEXT,
    vehicle_id UUID,
    vehicle_placa TEXT,
    driver_id UUID,
    driver_nome TEXT,
    data_saida DATE,
    hora_saida TIME,
    data_chegada DATE,
    hora_chegada TIME,
    km_inicial NUMERIC,
    km_final NUMERIC,
    km_percorrido NUMERIC,
    status TEXT,
    project_id UUID,
    project_nome TEXT,
    cost_center_id UUID,
    cost_center_nome TEXT,
    os_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.company_id,
        t.request_id,
        lr.numero_solicitacao as request_numero,
        t.vehicle_id,
        v.placa as vehicle_placa,
        t.driver_id,
        d.nome as driver_nome,
        t.data_saida,
        t.hora_saida,
        t.data_chegada,
        t.hora_chegada,
        t.km_inicial,
        t.km_final,
        t.km_percorrido,
        t.status::TEXT,
        t.project_id,
        p.nome as project_nome,
        t.cost_center_id,
        cc.nome as cost_center_nome,
        t.os_number,
        t.created_at,
        t.updated_at
    FROM logistica.trips t
    LEFT JOIN logistica.logistics_requests lr ON t.request_id = lr.id
    LEFT JOIN frota.vehicles v ON t.vehicle_id = v.id
    LEFT JOIN frota.drivers d ON t.driver_id = d.id
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.cost_centers cc ON t.cost_center_id = cc.id
    WHERE t.company_id = p_company_id
    AND (p_status IS NULL OR t.status::TEXT = p_status)
    AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
    AND (p_driver_id IS NULL OR t.driver_id = p_driver_id)
    AND (p_data_inicio IS NULL OR t.data_saida >= p_data_inicio)
    AND (p_data_fim IS NULL OR t.data_saida <= p_data_fim)
    AND (p_search IS NULL OR 
         lr.numero_solicitacao ILIKE '%' || p_search || '%' OR
         v.placa ILIKE '%' || p_search || '%' OR
         d.nome ILIKE '%' || p_search || '%')
    ORDER BY t.data_saida DESC, t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar viagem
CREATE OR REPLACE FUNCTION logistica.create_trip(
    p_company_id UUID,
    p_request_id UUID,
    p_vehicle_id UUID,
    p_driver_id UUID,
    p_data_saida DATE,
    p_created_by UUID,
    p_hora_saida TIME DEFAULT NULL,
    p_km_inicial NUMERIC DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_cost_center_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_trip_id UUID;
    v_km_atual NUMERIC;
BEGIN
    -- Buscar KM atual do veículo se não informado
    IF p_km_inicial IS NULL THEN
        SELECT quilometragem INTO v_km_atual
        FROM frota.vehicles
        WHERE id = p_vehicle_id;
        
        IF v_km_atual IS NULL THEN
            v_km_atual := 0;
        END IF;
    ELSE
        v_km_atual := p_km_inicial;
    END IF;
    
    INSERT INTO logistica.trips (
        company_id,
        request_id,
        vehicle_id,
        driver_id,
        data_saida,
        hora_saida,
        km_inicial,
        project_id,
        cost_center_id,
        os_number,
        observacoes,
        status,
        created_by
    ) VALUES (
        p_company_id,
        p_request_id,
        p_vehicle_id,
        p_driver_id,
        p_data_saida,
        p_hora_saida,
        v_km_atual,
        p_project_id,
        p_cost_center_id,
        p_os_number,
        p_observacoes,
        'agendada',
        p_created_by
    ) RETURNING id INTO v_trip_id;
    
    RETURN v_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar status da viagem
CREATE OR REPLACE FUNCTION logistica.update_trip_status(
    p_trip_id UUID,
    p_company_id UUID,
    p_status TEXT,
    p_km_final NUMERIC DEFAULT NULL,
    p_data_chegada DATE DEFAULT NULL,
    p_hora_chegada TIME DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE logistica.trips SET
        status = p_status::logistica.trip_status,
        km_final = COALESCE(p_km_final, km_final),
        data_chegada = COALESCE(p_data_chegada, data_chegada),
        hora_chegada = COALESCE(p_hora_chegada, hora_chegada),
        updated_at = NOW()
    WHERE id = p_trip_id AND company_id = p_company_id;
    
    -- Se status mudou para em_viagem, atualizar KM do veículo
    IF p_status = 'em_viagem' AND p_km_final IS NOT NULL THEN
        UPDATE frota.vehicles
        SET quilometragem = p_km_final,
            updated_at = NOW()
        WHERE id = (SELECT vehicle_id FROM logistica.trips WHERE id = p_trip_id);
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNÇÕES PARA ITENS DE VIAGEM
-- =====================================================

-- Função para listar itens de uma viagem
CREATE OR REPLACE FUNCTION logistica.list_trip_items(
    p_trip_id UUID
)
RETURNS TABLE (
    id UUID,
    trip_id UUID,
    descricao TEXT,
    quantidade NUMERIC,
    unidade_medida TEXT,
    peso NUMERIC,
    observacoes TEXT,
    material_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        ti.trip_id,
        ti.descricao,
        ti.quantidade,
        ti.unidade_medida,
        ti.peso,
        ti.observacoes,
        ti.material_id,
        ti.created_at,
        ti.updated_at
    FROM logistica.trip_items ti
    WHERE ti.trip_id = p_trip_id
    ORDER BY ti.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar item de viagem
CREATE OR REPLACE FUNCTION logistica.create_trip_item(
    p_trip_id UUID,
    p_descricao TEXT,
    p_quantidade NUMERIC,
    p_unidade_medida TEXT DEFAULT NULL,
    p_peso NUMERIC DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL,
    p_material_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_item_id UUID;
BEGIN
    INSERT INTO logistica.trip_items (
        trip_id,
        descricao,
        quantidade,
        unidade_medida,
        peso,
        observacoes,
        material_id
    ) VALUES (
        p_trip_id,
        p_descricao,
        p_quantidade,
        p_unidade_medida,
        p_peso,
        p_observacoes,
        p_material_id
    ) RETURNING id INTO v_item_id;
    
    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNÇÕES PARA CHECKLIST DE CONFERÊNCIA
-- =====================================================

-- Função para criar/atualizar checklist
CREATE OR REPLACE FUNCTION logistica.save_trip_checklist(
    p_trip_id UUID,
    p_items_conferidos JSONB,
    p_conferido_por UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_checklist_id UUID;
BEGIN
    -- Verificar se já existe checklist
    SELECT id INTO v_checklist_id
    FROM logistica.trip_checklists
    WHERE trip_id = p_trip_id;
    
    IF v_checklist_id IS NULL THEN
        -- Criar novo
        INSERT INTO logistica.trip_checklists (
            trip_id,
            items_conferidos,
            observacoes,
            conferido_por
        ) VALUES (
            p_trip_id,
            p_items_conferidos,
            p_observacoes,
            p_conferido_por
        ) RETURNING id INTO v_checklist_id;
    ELSE
        -- Atualizar existente
        UPDATE logistica.trip_checklists SET
            items_conferidos = p_items_conferidos,
            observacoes = p_observacoes,
            conferido_por = p_conferido_por,
            conferido_em = NOW(),
            updated_at = NOW()
        WHERE id = v_checklist_id;
    END IF;
    
    RETURN v_checklist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNÇÕES PARA ENTREGAS
-- =====================================================

-- Função para criar entrega
CREATE OR REPLACE FUNCTION logistica.create_trip_delivery(
    p_trip_id UUID,
    p_data_entrega DATE,
    p_recebido_por TEXT,
    p_items_entregues JSONB,
    p_entregue_por UUID,
    p_hora_entrega TIME DEFAULT NULL,
    p_cpf_recebedor TEXT DEFAULT NULL,
    p_telefone_recebedor TEXT DEFAULT NULL,
    p_todos_itens_entregues BOOLEAN DEFAULT true,
    p_observacoes TEXT DEFAULT NULL,
    p_comprovante_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_delivery_id UUID;
BEGIN
    INSERT INTO logistica.trip_deliveries (
        trip_id,
        data_entrega,
        hora_entrega,
        recebido_por,
        cpf_recebedor,
        telefone_recebedor,
        items_entregues,
        todos_itens_entregues,
        observacoes,
        comprovante_url,
        entregue_por
    ) VALUES (
        p_trip_id,
        p_data_entrega,
        p_hora_entrega,
        p_recebido_por,
        p_cpf_recebedor,
        p_telefone_recebedor,
        p_items_entregues,
        p_todos_itens_entregues,
        p_observacoes,
        p_comprovante_url,
        p_entregue_por
    ) RETURNING id INTO v_delivery_id;
    
    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÕES PARA CUSTOS LOGÍSTICOS
-- =====================================================

-- Função para listar custos
CREATE OR REPLACE FUNCTION logistica.list_trip_costs(
    p_company_id UUID,
    p_trip_id UUID DEFAULT NULL,
    p_cost_center_id UUID DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    trip_id UUID,
    trip_numero TEXT,
    tipo_custo TEXT,
    descricao TEXT,
    valor NUMERIC,
    data_custo DATE,
    vehicle_id UUID,
    vehicle_placa TEXT,
    cost_center_id UUID,
    cost_center_nome TEXT,
    project_id UUID,
    project_nome TEXT,
    os_number TEXT,
    comprovante_url TEXT,
    observacoes TEXT,
    financial_entry_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id,
        tc.company_id,
        tc.trip_id,
        lr.numero_solicitacao as trip_numero,
        tc.tipo_custo::TEXT,
        tc.descricao,
        tc.valor,
        tc.data_custo,
        tc.vehicle_id,
        v.placa as vehicle_placa,
        tc.cost_center_id,
        cc.nome as cost_center_nome,
        tc.project_id,
        p.nome as project_nome,
        tc.os_number,
        tc.comprovante_url,
        tc.observacoes,
        tc.financial_entry_id,
        tc.created_at,
        tc.updated_at
    FROM logistica.trip_costs tc
    LEFT JOIN logistica.trips t ON tc.trip_id = t.id
    LEFT JOIN logistica.logistics_requests lr ON t.request_id = lr.id
    LEFT JOIN frota.vehicles v ON tc.vehicle_id = v.id
    LEFT JOIN public.cost_centers cc ON tc.cost_center_id = cc.id
    LEFT JOIN public.projects p ON tc.project_id = p.id
    WHERE tc.company_id = p_company_id
    AND (p_trip_id IS NULL OR tc.trip_id = p_trip_id)
    AND (p_cost_center_id IS NULL OR tc.cost_center_id = p_cost_center_id)
    AND (p_project_id IS NULL OR tc.project_id = p_project_id)
    AND (p_data_inicio IS NULL OR tc.data_custo >= p_data_inicio)
    AND (p_data_fim IS NULL OR tc.data_custo <= p_data_fim)
    ORDER BY tc.data_custo DESC, tc.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar custo
CREATE OR REPLACE FUNCTION logistica.create_trip_cost(
    p_company_id UUID,
    p_tipo_custo TEXT,
    p_descricao TEXT,
    p_valor NUMERIC,
    p_data_custo DATE,
    p_cost_center_id UUID,
    p_created_by UUID,
    p_trip_id UUID DEFAULT NULL,
    p_vehicle_id UUID DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_comprovante_url TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_cost_id UUID;
BEGIN
    INSERT INTO logistica.trip_costs (
        company_id,
        trip_id,
        tipo_custo,
        descricao,
        valor,
        data_custo,
        vehicle_id,
        cost_center_id,
        project_id,
        os_number,
        comprovante_url,
        observacoes,
        created_by
    ) VALUES (
        p_company_id,
        p_trip_id,
        p_tipo_custo::logistica.cost_type,
        p_descricao,
        p_valor,
        p_data_custo,
        p_vehicle_id,
        p_cost_center_id,
        p_project_id,
        p_os_number,
        p_comprovante_url,
        p_observacoes,
        p_created_by
    ) RETURNING id INTO v_cost_id;
    
    RETURN v_cost_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNÇÕES PARA DISPONIBILIDADE DE VEÍCULOS (CALENDÁRIO)
-- =====================================================

-- Função para verificar disponibilidade de veículos em um período
CREATE OR REPLACE FUNCTION logistica.get_vehicle_availability(
    p_company_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE,
    p_vehicle_id UUID DEFAULT NULL
)
RETURNS TABLE (
    vehicle_id UUID,
    vehicle_placa TEXT,
    vehicle_modelo TEXT,
    data DATE,
    disponivel BOOLEAN,
    trip_id UUID,
    trip_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH dates AS (
        SELECT generate_series(p_data_inicio, p_data_fim, '1 day'::interval)::DATE as data
    ),
    vehicles AS (
        SELECT v.id, v.placa, v.modelo
        FROM frota.vehicles v
        WHERE v.company_id = p_company_id
        AND v.situacao = 'ativo'
        AND (p_vehicle_id IS NULL OR v.id = p_vehicle_id)
    ),
    trips_in_period AS (
        SELECT 
            t.vehicle_id,
            t.data_saida,
            COALESCE(t.data_chegada, CURRENT_DATE + INTERVAL '30 days') as data_fim_estimada,
            t.id as trip_id,
            t.status::TEXT as trip_status
        FROM logistica.trips t
        WHERE t.company_id = p_company_id
        AND t.status != 'cancelada'
        AND (
            (t.data_saida BETWEEN p_data_inicio AND p_data_fim)
            OR (t.data_chegada BETWEEN p_data_inicio AND p_data_fim)
            OR (t.data_saida <= p_data_inicio AND COALESCE(t.data_chegada, CURRENT_DATE + INTERVAL '30 days') >= p_data_fim)
        )
    )
    SELECT 
        v.id as vehicle_id,
        v.placa as vehicle_placa,
        v.modelo as vehicle_modelo,
        d.data,
        CASE 
            WHEN EXISTS (
                SELECT 1 
                FROM trips_in_period tip 
                WHERE tip.vehicle_id = v.id 
                AND d.data BETWEEN tip.data_saida AND tip.data_fim_estimada
            ) THEN false
            ELSE true
        END as disponivel,
        tip.trip_id,
        tip.trip_status
    FROM vehicles v
    CROSS JOIN dates d
    LEFT JOIN trips_in_period tip ON tip.vehicle_id = v.id 
        AND d.data BETWEEN tip.data_saida AND tip.data_fim_estimada
    ORDER BY v.placa, d.data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

