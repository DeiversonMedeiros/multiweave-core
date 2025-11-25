-- =====================================================
-- FUNÇÕES RPC PARA PERMISSÕES GRANULARES
-- =====================================================
-- Funções específicas para listar registros filtrados
-- por ownership e centro de custo
-- =====================================================

-- =====================================================
-- FUNÇÃO 1: Listar Requisições de Compra Filtradas
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_requisicoes_compra_filtered(
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    solicitante_id UUID,
    centro_custo_id UUID,
    projeto_id UUID,
    numero_requisicao VARCHAR,
    data_solicitacao DATE,
    data_necessidade DATE,
    status TEXT,
    prioridade TEXT,
    valor_total_estimado DECIMAL,
    valor_total_aprovado DECIMAL,
    aprovado_por UUID,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    justificativa TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_allowed_ids UUID[];
BEGIN
    -- Obter usuário atual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Usar company_id fornecido ou buscar do usuário
    v_company_id := COALESCE(p_company_id, (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = v_user_id AND ativo = true 
        LIMIT 1
    ));
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não está associado a nenhuma empresa';
    END IF;
    
    -- Admin vê tudo
    IF public.is_admin_simple(v_user_id) THEN
        RETURN QUERY
        SELECT 
            rc.id,
            rc.company_id,
            rc.solicitante_id,
            rc.centro_custo_id,
            rc.projeto_id,
            rc.numero_requisicao,
            rc.data_solicitacao,
            rc.data_necessidade,
            rc.status::TEXT,
            rc.prioridade::TEXT,
            rc.valor_total_estimado,
            rc.valor_total_aprovado,
            rc.aprovado_por,
            rc.data_aprovacao,
            rc.observacoes,
            rc.justificativa,
            rc.created_at,
            rc.updated_at,
            rc.created_by
        FROM compras.requisicoes_compra rc
        WHERE rc.company_id = v_company_id
        ORDER BY rc.created_at DESC;
        RETURN;
    END IF;
    
    -- Obter IDs permitidos baseado em ownership e centro de custo
    SELECT ARRAY_AGG(record_id) INTO v_allowed_ids
    FROM public.filter_records_by_granular_permissions(
        v_user_id,
        v_company_id,
        'requisicoes_compra'
    );
    
    -- Se não tem IDs permitidos, retorna vazio
    IF v_allowed_ids IS NULL OR array_length(v_allowed_ids, 1) = 0 THEN
        RETURN;
    END IF;
    
    -- Retornar apenas registros permitidos
    RETURN QUERY
    SELECT 
        rc.id,
        rc.company_id,
        rc.solicitante_id,
        rc.centro_custo_id,
        rc.projeto_id,
        rc.numero_requisicao,
        rc.data_solicitacao,
        rc.data_necessidade,
        rc.status::TEXT,
        rc.prioridade::TEXT,
        rc.valor_total_estimado,
        rc.valor_total_aprovado,
        rc.aprovado_por,
        rc.data_aprovacao,
        rc.observacoes,
        rc.justificativa,
        rc.created_at,
        rc.updated_at,
        rc.created_by
    FROM compras.requisicoes_compra rc
    WHERE rc.company_id = v_company_id
    AND rc.id = ANY(v_allowed_ids)
    ORDER BY rc.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_requisicoes_compra_filtered IS 'Lista requisições de compra filtradas por ownership e centro de custo';

-- =====================================================
-- FUNÇÃO 2: Listar Contas a Pagar Filtradas
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_contas_pagar_filtered(
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    numero_titulo VARCHAR,
    fornecedor_id UUID,
    fornecedor_nome VARCHAR,
    fornecedor_cnpj VARCHAR,
    descricao TEXT,
    valor_original DECIMAL,
    valor_atual DECIMAL,
    data_emissao DATE,
    data_vencimento DATE,
    data_pagamento DATE,
    centro_custo_id UUID,
    projeto_id UUID,
    departamento VARCHAR,
    classe_financeira VARCHAR,
    categoria VARCHAR,
    status VARCHAR,
    forma_pagamento VARCHAR,
    conta_bancaria_id UUID,
    observacoes TEXT,
    anexos TEXT[],
    valor_desconto DECIMAL,
    valor_juros DECIMAL,
    valor_multa DECIMAL,
    valor_pago DECIMAL,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    aprovado_por UUID,
    created_by UUID,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_allowed_ids UUID[];
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    v_company_id := COALESCE(p_company_id, (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = v_user_id AND ativo = true 
        LIMIT 1
    ));
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não está associado a nenhuma empresa';
    END IF;
    
    -- Admin vê tudo
    IF public.is_admin_simple(v_user_id) THEN
        RETURN QUERY
        SELECT 
            cp.id,
            cp.company_id,
            cp.numero_titulo,
            cp.fornecedor_id,
            cp.fornecedor_nome,
            cp.fornecedor_cnpj,
            cp.descricao,
            cp.valor_original,
            cp.valor_atual,
            cp.data_emissao,
            cp.data_vencimento,
            cp.data_pagamento,
            cp.centro_custo_id,
            cp.projeto_id,
            cp.departamento,
            cp.classe_financeira,
            cp.categoria,
            cp.status,
            cp.forma_pagamento,
            cp.conta_bancaria_id,
            cp.observacoes,
            cp.anexos,
            cp.valor_desconto,
            cp.valor_juros,
            cp.valor_multa,
            cp.valor_pago,
            cp.data_aprovacao,
            cp.aprovado_por,
            cp.created_by,
            cp.is_active,
            cp.created_at,
            cp.updated_at
        FROM financeiro.contas_pagar cp
        WHERE cp.company_id = v_company_id
        AND cp.is_active = true
        ORDER BY cp.data_vencimento ASC, cp.created_at DESC;
        RETURN;
    END IF;
    
    -- Obter IDs permitidos
    SELECT ARRAY_AGG(record_id) INTO v_allowed_ids
    FROM public.filter_records_by_granular_permissions(
        v_user_id,
        v_company_id,
        'contas_pagar'
    );
    
    IF v_allowed_ids IS NULL OR array_length(v_allowed_ids, 1) = 0 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        cp.id,
        cp.company_id,
        cp.numero_titulo,
        cp.fornecedor_id,
        cp.fornecedor_nome,
        cp.fornecedor_cnpj,
        cp.descricao,
        cp.valor_original,
        cp.valor_atual,
        cp.data_emissao,
        cp.data_vencimento,
        cp.data_pagamento,
        cp.centro_custo_id,
        cp.projeto_id,
        cp.departamento,
        cp.classe_financeira,
        cp.categoria,
        cp.status,
        cp.forma_pagamento,
        cp.conta_bancaria_id,
        cp.observacoes,
        cp.anexos,
        cp.valor_desconto,
        cp.valor_juros,
        cp.valor_multa,
        cp.valor_pago,
        cp.data_aprovacao,
        cp.aprovado_por,
        cp.created_by,
        cp.is_active,
        cp.created_at,
        cp.updated_at
    FROM financeiro.contas_pagar cp
    WHERE cp.company_id = v_company_id
    AND cp.is_active = true
    AND cp.id = ANY(v_allowed_ids)
    ORDER BY cp.data_vencimento ASC, cp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_contas_pagar_filtered IS 'Lista contas a pagar filtradas por ownership e centro de custo';

-- =====================================================
-- FUNÇÃO 3: Listar Solicitações de Saída de Materiais Filtradas
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_solicitacoes_saida_materiais_filtered(
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    funcionario_solicitante_id UUID,
    almoxarifado_id UUID,
    centro_custo_id UUID,
    projeto_id UUID,
    data_solicitacao TIMESTAMP WITH TIME ZONE,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_saida TIMESTAMP WITH TIME ZONE,
    status VARCHAR,
    valor_total DECIMAL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_allowed_ids UUID[];
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    v_company_id := COALESCE(p_company_id, (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = v_user_id AND ativo = true 
        LIMIT 1
    ));
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não está associado a nenhuma empresa';
    END IF;
    
    -- Admin vê tudo
    IF public.is_admin_simple(v_user_id) THEN
        RETURN QUERY
        SELECT 
            ssm.id,
            ssm.company_id,
            ssm.funcionario_solicitante_id,
            ssm.almoxarifado_id,
            ssm.centro_custo_id,
            ssm.projeto_id,
            ssm.data_solicitacao,
            ssm.data_aprovacao,
            ssm.data_saida,
            ssm.status,
            ssm.valor_total,
            ssm.observacoes,
            ssm.created_at,
            ssm.updated_at
        FROM public.solicitacoes_saida_materiais ssm
        WHERE ssm.company_id = v_company_id
        ORDER BY ssm.data_solicitacao DESC;
        RETURN;
    END IF;
    
    -- Obter IDs permitidos
    SELECT ARRAY_AGG(record_id) INTO v_allowed_ids
    FROM public.filter_records_by_granular_permissions(
        v_user_id,
        v_company_id,
        'solicitacoes_saida_materiais'
    );
    
    IF v_allowed_ids IS NULL OR array_length(v_allowed_ids, 1) = 0 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        ssm.id,
        ssm.company_id,
        ssm.funcionario_solicitante_id,
        ssm.almoxarifado_id,
        ssm.centro_custo_id,
        ssm.projeto_id,
        ssm.data_solicitacao,
        ssm.data_aprovacao,
        ssm.data_saida,
        ssm.status,
        ssm.valor_total,
        ssm.observacoes,
        ssm.created_at,
        ssm.updated_at
    FROM public.solicitacoes_saida_materiais ssm
    WHERE ssm.company_id = v_company_id
    AND ssm.id = ANY(v_allowed_ids)
    ORDER BY ssm.data_solicitacao DESC;
END;
$$;

COMMENT ON FUNCTION public.list_solicitacoes_saida_materiais_filtered IS 'Lista solicitações de saída de materiais filtradas por ownership e centro de custo';

-- =====================================================
-- FUNÇÃO 4: Listar Entradas de Materiais Filtradas
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_entradas_materiais_filtered(
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    nfe_id UUID,
    fornecedor_id UUID,
    numero_nota VARCHAR,
    data_entrada DATE,
    valor_total DECIMAL,
    status VARCHAR,
    checklist_aprovado BOOLEAN,
    usuario_recebimento_id UUID,
    usuario_aprovacao_id UUID,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_allowed_ids UUID[];
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    v_company_id := COALESCE(p_company_id, (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = v_user_id AND ativo = true 
        LIMIT 1
    ));
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não está associado a nenhuma empresa';
    END IF;
    
    -- Admin vê tudo
    IF public.is_admin_simple(v_user_id) THEN
        RETURN QUERY
        SELECT 
            em.id,
            em.company_id,
            em.nfe_id,
            em.fornecedor_id,
            em.numero_nota,
            em.data_entrada,
            em.valor_total,
            em.status,
            em.checklist_aprovado,
            em.usuario_recebimento_id,
            em.usuario_aprovacao_id,
            em.observacoes,
            em.created_at
        FROM almoxarifado.entradas_materiais em
        WHERE em.company_id = v_company_id
        ORDER BY em.created_at DESC;
        RETURN;
    END IF;
    
    -- Obter IDs permitidos
    SELECT ARRAY_AGG(record_id) INTO v_allowed_ids
    FROM public.filter_records_by_granular_permissions(
        v_user_id,
        v_company_id,
        'entradas_materiais'
    );
    
    IF v_allowed_ids IS NULL OR array_length(v_allowed_ids, 1) = 0 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        em.id,
        em.company_id,
        em.nfe_id,
        em.fornecedor_id,
        em.numero_nota,
        em.data_entrada,
        em.valor_total,
        em.status,
        em.checklist_aprovado,
        em.usuario_recebimento_id,
        em.usuario_aprovacao_id,
        em.observacoes,
        em.created_at
    FROM almoxarifado.entradas_materiais em
    WHERE em.company_id = v_company_id
    AND em.id = ANY(v_allowed_ids)
    ORDER BY em.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_entradas_materiais_filtered IS 'Lista entradas de materiais filtradas por ownership';

-- =====================================================
-- FUNÇÃO 5: Listar Transferências Filtradas
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_transferencias_filtered(
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    almoxarifado_origem_id UUID,
    almoxarifado_destino_id UUID,
    solicitante_id UUID,
    aprovador_id UUID,
    data_solicitacao TIMESTAMP WITH TIME ZONE,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_transferencia TIMESTAMP WITH TIME ZONE,
    status VARCHAR,
    observacoes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_allowed_ids UUID[];
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    v_company_id := COALESCE(p_company_id, (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = v_user_id AND ativo = true 
        LIMIT 1
    ));
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não está associado a nenhuma empresa';
    END IF;
    
    -- Admin vê tudo
    IF public.is_admin_simple(v_user_id) THEN
        RETURN QUERY
        SELECT 
            t.id,
            t.company_id,
            t.almoxarifado_origem_id,
            t.almoxarifado_destino_id,
            t.solicitante_id,
            t.aprovador_id,
            t.data_solicitacao,
            t.data_aprovacao,
            t.data_transferencia,
            t.status,
            t.observacoes
        FROM almoxarifado.transferencias t
        WHERE t.company_id = v_company_id
        ORDER BY t.data_solicitacao DESC;
        RETURN;
    END IF;
    
    -- Obter IDs permitidos
    SELECT ARRAY_AGG(record_id) INTO v_allowed_ids
    FROM public.filter_records_by_granular_permissions(
        v_user_id,
        v_company_id,
        'transferencias'
    );
    
    IF v_allowed_ids IS NULL OR array_length(v_allowed_ids, 1) = 0 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id,
        t.company_id,
        t.almoxarifado_origem_id,
        t.almoxarifado_destino_id,
        t.solicitante_id,
        t.aprovador_id,
        t.data_solicitacao,
        t.data_aprovacao,
        t.data_transferencia,
        t.status,
        t.observacoes
    FROM almoxarifado.transferencias t
    WHERE t.company_id = v_company_id
    AND t.id = ANY(v_allowed_ids)
    ORDER BY t.data_solicitacao DESC;
END;
$$;

COMMENT ON FUNCTION public.list_transferencias_filtered IS 'Lista transferências filtradas por ownership e centro de custo dos itens';

-- =====================================================
-- FUNÇÃO 6: Verificar se pode criar registro
-- =====================================================
-- Verifica se usuário pode criar registro para um centro de custo específico

CREATE OR REPLACE FUNCTION public.can_create_for_cost_center(
    p_cost_center_id UUID,
    p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Admin sempre pode criar
    IF public.is_admin_simple(v_user_id) THEN
        RETURN TRUE;
    END IF;
    
    v_company_id := COALESCE(p_company_id, (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = v_user_id AND ativo = true 
        LIMIT 1
    ));
    
    IF v_company_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se tem permissão de criar para este centro de custo
    RETURN EXISTS (
        SELECT 1
        FROM public.user_cost_center_permissions
        WHERE user_id = v_user_id
        AND company_id = v_company_id
        AND cost_center_id = p_cost_center_id
        AND can_create = true
    );
END;
$$;

COMMENT ON FUNCTION public.can_create_for_cost_center IS 'Verifica se usuário pode criar registros para um centro de custo específico';

