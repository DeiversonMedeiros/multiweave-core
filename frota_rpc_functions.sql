-- =====================================================
-- FUNÇÕES RPC PARA MÓDULO FROTA
-- Sistema ERP MultiWeave Core
-- =====================================================

-- =====================================================
-- 1. FUNÇÕES PARA VEÍCULOS
-- =====================================================

-- Função para listar veículos com filtros
CREATE OR REPLACE FUNCTION frota.list_vehicles(
    p_company_id UUID,
    p_tipo TEXT DEFAULT NULL,
    p_situacao TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    tipo TEXT,
    placa TEXT,
    renavam TEXT,
    chassi TEXT,
    marca TEXT,
    modelo TEXT,
    ano INTEGER,
    cor TEXT,
    quilometragem NUMERIC,
    situacao TEXT,
    proprietario_nome TEXT,
    locadora TEXT,
    colaborador_nome TEXT,
    condutor_atual TEXT,
    status_atribuicao TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.company_id,
        v.tipo::TEXT,
        v.placa,
        v.renavam,
        v.chassi,
        v.marca,
        v.modelo,
        v.ano,
        v.cor,
        v.quilometragem,
        v.situacao::TEXT,
        p.nome_fantasia as proprietario_nome,
        v.locadora,
        u.raw_user_meta_data->>'full_name' as colaborador_nome,
        d.nome as condutor_atual,
        va.status::TEXT as status_atribuicao,
        v.created_at,
        v.updated_at
    FROM frota.vehicles v
    LEFT JOIN public.partners p ON v.proprietario_id = p.id
    LEFT JOIN auth.users u ON v.colaborador_id = u.id
    LEFT JOIN frota.vehicle_assignments va ON v.id = va.vehicle_id AND va.status = 'em_uso'
    LEFT JOIN frota.drivers d ON va.driver_id = d.id
    WHERE v.company_id = p_company_id
    AND (p_tipo IS NULL OR v.tipo::TEXT = p_tipo)
    AND (p_situacao IS NULL OR v.situacao::TEXT = p_situacao)
    AND (p_search IS NULL OR 
         v.placa ILIKE '%' || p_search || '%' OR
         v.marca ILIKE '%' || p_search || '%' OR
         v.modelo ILIKE '%' || p_search || '%')
    ORDER BY v.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter veículo por ID
CREATE OR REPLACE FUNCTION frota.get_vehicle(
    p_vehicle_id UUID,
    p_company_id UUID
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    tipo TEXT,
    placa TEXT,
    renavam TEXT,
    chassi TEXT,
    marca TEXT,
    modelo TEXT,
    ano INTEGER,
    cor TEXT,
    quilometragem NUMERIC,
    situacao TEXT,
    proprietario_nome TEXT,
    locadora TEXT,
    colaborador_nome TEXT,
    condutor_atual TEXT,
    status_atribuicao TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.company_id,
        v.tipo::TEXT,
        v.placa,
        v.renavam,
        v.chassi,
        v.marca,
        v.modelo,
        v.ano,
        v.cor,
        v.quilometragem,
        v.situacao::TEXT,
        p.nome_fantasia as proprietario_nome,
        v.locadora,
        u.raw_user_meta_data->>'full_name' as colaborador_nome,
        d.nome as condutor_atual,
        va.status::TEXT as status_atribuicao,
        v.created_at,
        v.updated_at
    FROM frota.vehicles v
    LEFT JOIN public.partners p ON v.proprietario_id = p.id
    LEFT JOIN auth.users u ON v.colaborador_id = u.id
    LEFT JOIN frota.vehicle_assignments va ON v.id = va.vehicle_id AND va.status = 'em_uso'
    LEFT JOIN frota.drivers d ON va.driver_id = d.id
    WHERE v.id = p_vehicle_id AND v.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar veículo
CREATE OR REPLACE FUNCTION frota.create_vehicle(
    p_company_id UUID,
    p_tipo TEXT,
    p_placa TEXT,
    p_renavam TEXT DEFAULT NULL,
    p_chassi TEXT DEFAULT NULL,
    p_marca TEXT DEFAULT NULL,
    p_modelo TEXT DEFAULT NULL,
    p_ano INTEGER DEFAULT NULL,
    p_cor TEXT DEFAULT NULL,
    p_quilometragem NUMERIC DEFAULT 0,
    p_situacao TEXT DEFAULT 'ativo',
    p_proprietario_id UUID DEFAULT NULL,
    p_locadora TEXT DEFAULT NULL,
    p_colaborador_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_vehicle_id UUID;
BEGIN
    INSERT INTO frota.vehicles (
        company_id, tipo, placa, renavam, chassi, marca, modelo, 
        ano, cor, quilometragem, situacao, proprietario_id, 
        locadora, colaborador_id
    ) VALUES (
        p_company_id, p_tipo::frota.vehicle_type, p_placa, p_renavam, 
        p_chassi, p_marca, p_modelo, p_ano, p_cor, p_quilometragem, 
        p_situacao::frota.vehicle_status, p_proprietario_id, 
        p_locadora, p_colaborador_id
    ) RETURNING id INTO v_vehicle_id;
    
    RETURN v_vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar veículo
CREATE OR REPLACE FUNCTION frota.update_vehicle(
    p_vehicle_id UUID,
    p_company_id UUID,
    p_tipo TEXT DEFAULT NULL,
    p_placa TEXT DEFAULT NULL,
    p_renavam TEXT DEFAULT NULL,
    p_chassi TEXT DEFAULT NULL,
    p_marca TEXT DEFAULT NULL,
    p_modelo TEXT DEFAULT NULL,
    p_ano INTEGER DEFAULT NULL,
    p_cor TEXT DEFAULT NULL,
    p_quilometragem NUMERIC DEFAULT NULL,
    p_situacao TEXT DEFAULT NULL,
    p_proprietario_id UUID DEFAULT NULL,
    p_locadora TEXT DEFAULT NULL,
    p_colaborador_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE frota.vehicles SET
        tipo = COALESCE(p_tipo::frota.vehicle_type, tipo),
        placa = COALESCE(p_placa, placa),
        renavam = COALESCE(p_renavam, renavam),
        chassi = COALESCE(p_chassi, chassi),
        marca = COALESCE(p_marca, marca),
        modelo = COALESCE(p_modelo, modelo),
        ano = COALESCE(p_ano, ano),
        cor = COALESCE(p_cor, cor),
        quilometragem = COALESCE(p_quilometragem, quilometragem),
        situacao = COALESCE(p_situacao::frota.vehicle_status, situacao),
        proprietario_id = COALESCE(p_proprietario_id, proprietario_id),
        locadora = COALESCE(p_locadora, locadora),
        colaborador_id = COALESCE(p_colaborador_id, colaborador_id),
        updated_at = NOW()
    WHERE id = p_vehicle_id AND company_id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para deletar veículo
CREATE OR REPLACE FUNCTION frota.delete_vehicle(
    p_vehicle_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM frota.vehicles 
    WHERE id = p_vehicle_id AND company_id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNÇÕES PARA CONDUTORES
-- =====================================================

-- Função para listar condutores
CREATE OR REPLACE FUNCTION frota.list_drivers(
    p_company_id UUID,
    p_ativo BOOLEAN DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    nome TEXT,
    cpf TEXT,
    matricula TEXT,
    cnh_numero TEXT,
    cnh_categoria TEXT,
    cnh_validade DATE,
    ader_validade DATE,
    ativo BOOLEAN,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.company_id,
        d.nome,
        d.cpf,
        d.matricula,
        d.cnh_numero,
        d.cnh_categoria,
        d.cnh_validade,
        d.ader_validade,
        d.ativo,
        d.user_id,
        d.created_at,
        d.updated_at
    FROM frota.drivers d
    WHERE d.company_id = p_company_id
    AND (p_ativo IS NULL OR d.ativo = p_ativo)
    AND (p_search IS NULL OR 
         d.nome ILIKE '%' || p_search || '%' OR
         d.cpf ILIKE '%' || p_search || '%' OR
         d.matricula ILIKE '%' || p_search || '%')
    ORDER BY d.nome
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar condutor
CREATE OR REPLACE FUNCTION frota.create_driver(
    p_company_id UUID,
    p_nome TEXT,
    p_cpf TEXT DEFAULT NULL,
    p_matricula TEXT DEFAULT NULL,
    p_cnh_numero TEXT DEFAULT NULL,
    p_cnh_categoria TEXT DEFAULT NULL,
    p_cnh_validade DATE DEFAULT NULL,
    p_ader_validade DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_driver_id UUID;
BEGIN
    INSERT INTO frota.drivers (
        company_id, nome, cpf, matricula, cnh_numero, 
        cnh_categoria, cnh_validade, ader_validade, user_id
    ) VALUES (
        p_company_id, p_nome, p_cpf, p_matricula, p_cnh_numero,
        p_cnh_categoria, p_cnh_validade, p_ader_validade, p_user_id
    ) RETURNING id INTO v_driver_id;
    
    RETURN v_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNÇÕES PARA VISTORIAS
-- =====================================================

-- Função para criar vistoria com itens
CREATE OR REPLACE FUNCTION frota.create_inspection(
    p_vehicle_id UUID,
    p_driver_id UUID,
    p_base TEXT DEFAULT NULL,
    p_km_inicial NUMERIC DEFAULT NULL,
    p_km_final NUMERIC DEFAULT NULL,
    p_avarias TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL,
    p_itens JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_inspection_id UUID;
    item JSONB;
BEGIN
    -- Criar vistoria
    INSERT INTO frota.vehicle_inspections (
        vehicle_id, driver_id, base, km_inicial, km_final, 
        avarias, observacoes
    ) VALUES (
        p_vehicle_id, p_driver_id, p_base, p_km_inicial, p_km_final,
        p_avarias, p_observacoes
    ) RETURNING id INTO v_inspection_id;
    
    -- Inserir itens da vistoria
    FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
    LOOP
        INSERT INTO frota.inspection_items (
            inspection_id, categoria, item, conforme, observacao
        ) VALUES (
            v_inspection_id,
            item->>'categoria',
            item->>'item',
            COALESCE((item->>'conforme')::BOOLEAN, false),
            item->>'observacao'
        );
    END LOOP;
    
    RETURN v_inspection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar vistorias
CREATE OR REPLACE FUNCTION frota.list_inspections(
    p_vehicle_id UUID DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    vehicle_id UUID,
    driver_id UUID,
    placa TEXT,
    condutor_nome TEXT,
    data TIMESTAMP WITH TIME ZONE,
    base TEXT,
    km_inicial NUMERIC,
    km_final NUMERIC,
    avarias TEXT,
    observacoes TEXT,
    assinatura_condutor BOOLEAN,
    assinatura_gestor BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vi.id,
        vi.vehicle_id,
        vi.driver_id,
        v.placa,
        d.nome as condutor_nome,
        vi.data,
        vi.base,
        vi.km_inicial,
        vi.km_final,
        vi.avarias,
        vi.observacoes,
        vi.assinatura_condutor,
        vi.assinatura_gestor,
        vi.created_at
    FROM frota.vehicle_inspections vi
    JOIN frota.vehicles v ON vi.vehicle_id = v.id
    JOIN frota.drivers d ON vi.driver_id = d.id
    WHERE (p_vehicle_id IS NULL OR vi.vehicle_id = p_vehicle_id)
    AND (p_driver_id IS NULL OR vi.driver_id = p_driver_id)
    AND (p_company_id IS NULL OR v.company_id = p_company_id)
    ORDER BY vi.data DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNÇÕES PARA MANUTENÇÕES
-- =====================================================

-- Função para listar manutenções
CREATE OR REPLACE FUNCTION frota.list_maintenances(
    p_vehicle_id UUID DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_tipo TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    vehicle_id UUID,
    placa TEXT,
    marca TEXT,
    modelo TEXT,
    tipo TEXT,
    descricao TEXT,
    oficina TEXT,
    km_proxima NUMERIC,
    data_agendada DATE,
    data_realizada DATE,
    valor NUMERIC,
    status TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vm.id,
        vm.vehicle_id,
        v.placa,
        v.marca,
        v.modelo,
        vm.tipo::TEXT,
        vm.descricao,
        vm.oficina,
        vm.km_proxima,
        vm.data_agendada,
        vm.data_realizada,
        vm.valor,
        vm.status::TEXT,
        vm.observacoes,
        vm.created_at
    FROM frota.vehicle_maintenances vm
    JOIN frota.vehicles v ON vm.vehicle_id = v.id
    WHERE (p_vehicle_id IS NULL OR vm.vehicle_id = p_vehicle_id)
    AND (p_company_id IS NULL OR v.company_id = p_company_id)
    AND (p_tipo IS NULL OR vm.tipo::TEXT = p_tipo)
    AND (p_status IS NULL OR vm.status::TEXT = p_status)
    ORDER BY vm.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNÇÕES PARA DASHBOARD
-- =====================================================

-- Função para obter estatísticas do dashboard
CREATE OR REPLACE FUNCTION frota.get_dashboard_stats(p_company_id UUID)
RETURNS TABLE (
    total_veiculos BIGINT,
    veiculos_ativos BIGINT,
    veiculos_proprios BIGINT,
    veiculos_locados BIGINT,
    veiculos_agregados BIGINT,
    veiculos_manutencao BIGINT,
    documentos_vencer BIGINT,
    manutencoes_proximas BIGINT,
    ocorrencias_pendentes BIGINT,
    vistorias_mes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(v.*) as total_veiculos,
        COUNT(v.*) FILTER (WHERE v.situacao = 'ativo') as veiculos_ativos,
        COUNT(v.*) FILTER (WHERE v.tipo = 'proprio') as veiculos_proprios,
        COUNT(v.*) FILTER (WHERE v.tipo = 'locado') as veiculos_locados,
        COUNT(v.*) FILTER (WHERE v.tipo = 'agregado') as veiculos_agregados,
        COUNT(v.*) FILTER (WHERE v.situacao = 'manutencao') as veiculos_manutencao,
        COUNT(d.*) FILTER (WHERE d.status = 'a_vencer') as documentos_vencer,
        COUNT(m.*) FILTER (WHERE m.status = 'pendente' AND m.data_agendada <= CURRENT_DATE + INTERVAL '7 days') as manutencoes_proximas,
        COUNT(o.*) FILTER (WHERE o.status = 'pendente') as ocorrencias_pendentes,
        COUNT(vi.*) FILTER (WHERE vi.data >= DATE_TRUNC('month', CURRENT_DATE)) as vistorias_mes
    FROM frota.vehicles v
    LEFT JOIN frota.vehicle_documents d ON v.id = d.vehicle_id
    LEFT JOIN frota.vehicle_maintenances m ON v.id = m.vehicle_id
    LEFT JOIN frota.vehicle_occurrences o ON v.id = o.vehicle_id
    LEFT JOIN frota.vehicle_inspections vi ON v.id = vi.vehicle_id
    WHERE v.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter próximas manutenções
CREATE OR REPLACE FUNCTION frota.get_upcoming_maintenances(p_company_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    id UUID,
    vehicle_id UUID,
    placa TEXT,
    marca TEXT,
    modelo TEXT,
    tipo TEXT,
    descricao TEXT,
    data_agendada DATE,
    km_proxima NUMERIC,
    quilometragem_atual NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vm.id,
        vm.vehicle_id,
        v.placa,
        v.marca,
        v.modelo,
        vm.tipo::TEXT,
        vm.descricao,
        vm.data_agendada,
        vm.km_proxima,
        v.quilometragem as quilometragem_atual,
        vm.status::TEXT
    FROM frota.vehicle_maintenances vm
    JOIN frota.vehicles v ON vm.vehicle_id = v.id
    WHERE v.company_id = p_company_id
    AND vm.status = 'pendente'
    AND (
        (vm.data_agendada IS NOT NULL AND vm.data_agendada <= CURRENT_DATE + INTERVAL '1 day' * p_days)
        OR (vm.km_proxima IS NOT NULL AND vm.km_proxima <= v.quilometragem + 1000)
    )
    ORDER BY 
        CASE 
            WHEN vm.data_agendada IS NOT NULL THEN vm.data_agendada
            ELSE CURRENT_DATE + INTERVAL '1 day' * 365 -- Manutenções por KM ficam no final
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÕES PARA SOLICITAÇÕES
-- =====================================================

-- Função para criar solicitação de veículo
CREATE OR REPLACE FUNCTION frota.create_vehicle_request(
    p_company_id UUID,
    p_solicitante_id UUID,
    p_finalidade TEXT,
    p_data_inicio DATE,
    p_vehicle_id UUID DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    INSERT INTO frota.vehicle_requests (
        company_id, solicitante_id, vehicle_id, finalidade, 
        data_inicio, data_fim, observacoes
    ) VALUES (
        p_company_id, p_solicitante_id, p_vehicle_id, p_finalidade,
        p_data_inicio, p_data_fim, p_observacoes
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar solicitações
CREATE OR REPLACE FUNCTION frota.list_vehicle_requests(
    p_company_id UUID,
    p_solicitante_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    solicitante_id UUID,
    solicitante_nome TEXT,
    vehicle_id UUID,
    placa TEXT,
    finalidade TEXT,
    data_inicio DATE,
    data_fim DATE,
    status TEXT,
    observacoes TEXT,
    aprovado_por UUID,
    aprovador_nome TEXT,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vr.id,
        vr.solicitante_id,
        u.raw_user_meta_data->>'full_name' as solicitante_nome,
        vr.vehicle_id,
        v.placa,
        vr.finalidade,
        vr.data_inicio,
        vr.data_fim,
        vr.status::TEXT,
        vr.observacoes,
        vr.aprovado_por,
        u2.raw_user_meta_data->>'full_name' as aprovador_nome,
        vr.data_aprovacao,
        vr.created_at
    FROM frota.vehicle_requests vr
    LEFT JOIN auth.users u ON vr.solicitante_id = u.id
    LEFT JOIN frota.vehicles v ON vr.vehicle_id = v.id
    LEFT JOIN auth.users u2 ON vr.aprovado_por = u2.id
    WHERE vr.company_id = p_company_id
    AND (p_solicitante_id IS NULL OR vr.solicitante_id = p_solicitante_id)
    AND (p_status IS NULL OR vr.status::TEXT = p_status)
    ORDER BY vr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNÇÕES PARA DOCUMENTOS
-- =====================================================

-- Função para listar documentos próximos do vencimento
CREATE OR REPLACE FUNCTION frota.get_documents_expiring(
    p_company_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    vehicle_id UUID,
    placa TEXT,
    tipo TEXT,
    numero_documento TEXT,
    vencimento DATE,
    status TEXT,
    dias_para_vencer INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vd.id,
        vd.vehicle_id,
        v.placa,
        vd.tipo::TEXT,
        vd.numero_documento,
        vd.vencimento,
        vd.status::TEXT,
        (vd.vencimento - CURRENT_DATE)::INTEGER as dias_para_vencer
    FROM frota.vehicle_documents vd
    JOIN frota.vehicles v ON vd.vehicle_id = v.id
    WHERE v.company_id = p_company_id
    AND vd.vencimento <= CURRENT_DATE + INTERVAL '1 day' * p_days
    AND vd.status != 'vencido'
    ORDER BY vd.vencimento;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNÇÕES DE UTILIDADE
-- =====================================================

-- Função para atualizar quilometragem do veículo
CREATE OR REPLACE FUNCTION frota.update_vehicle_mileage(
    p_vehicle_id UUID,
    p_company_id UUID,
    p_quilometragem NUMERIC
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE frota.vehicles 
    SET quilometragem = p_quilometragem, updated_at = NOW()
    WHERE id = p_vehicle_id AND company_id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atribuir veículo a condutor
CREATE OR REPLACE FUNCTION frota.assign_vehicle(
    p_vehicle_id UUID,
    p_driver_id UUID,
    p_km_inicial NUMERIC DEFAULT 0,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    -- Finalizar atribuições ativas do veículo
    UPDATE frota.vehicle_assignments 
    SET status = 'devolvido', data_fim = CURRENT_DATE, updated_at = NOW()
    WHERE vehicle_id = p_vehicle_id AND status = 'em_uso';
    
    -- Criar nova atribuição
    INSERT INTO frota.vehicle_assignments (
        vehicle_id, driver_id, data_inicio, km_inicial, observacoes
    ) VALUES (
        p_vehicle_id, p_driver_id, CURRENT_DATE, p_km_inicial, p_observacoes
    ) RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para devolver veículo
CREATE OR REPLACE FUNCTION frota.return_vehicle(
    p_vehicle_id UUID,
    p_km_final NUMERIC,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE frota.vehicle_assignments 
    SET 
        status = 'devolvido', 
        data_fim = CURRENT_DATE, 
        km_final = p_km_final,
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE vehicle_id = p_vehicle_id AND status = 'em_uso';
    
    -- Atualizar quilometragem do veículo
    UPDATE frota.vehicles 
    SET quilometragem = p_km_final, updated_at = NOW()
    WHERE id = p_vehicle_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIM DAS FUNÇÕES RPC
-- =====================================================
