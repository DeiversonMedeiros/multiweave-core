-- =====================================================
-- MIGRAÇÃO: RATEIO DE CONTAS A PAGAR (múltiplos centros/projetos)
-- =====================================================
-- Data: 2026-02-14
-- Descrição: Tabela para rateio de uma conta a pagar entre vários centros de custo
--            e projetos. Suporta rateio por percentual ou por valor monetário.
-- =====================================================

-- Tabela de rateio: uma conta a pagar pode ter N linhas (centro_custo + projeto + % ou valor)
CREATE TABLE IF NOT EXISTS financeiro.contas_pagar_rateio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_pagar_id UUID NOT NULL REFERENCES financeiro.contas_pagar(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    centro_custo_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE RESTRICT,
    projeto_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
    tipo_rateio VARCHAR(20) NOT NULL CHECK (tipo_rateio IN ('percentual', 'valor')),
    valor_percentual DECIMAL(5,2) CHECK (valor_percentual IS NULL OR (valor_percentual >= 0 AND valor_percentual <= 100)),
    valor_monetario DECIMAL(15,2) CHECK (valor_monetario IS NULL OR valor_monetario >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_rateio_tipo_valor CHECK (
        (tipo_rateio = 'percentual' AND valor_percentual IS NOT NULL AND valor_monetario IS NULL)
        OR (tipo_rateio = 'valor' AND valor_monetario IS NOT NULL AND valor_percentual IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_rateio_conta_pagar_id ON financeiro.contas_pagar_rateio(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_rateio_company_id ON financeiro.contas_pagar_rateio(company_id);

COMMENT ON TABLE financeiro.contas_pagar_rateio IS 'Rateio de valor da conta a pagar entre centros de custo e projetos. Percentual (soma 100%) ou valor monetário (soma = valor da conta).';

-- RLS
ALTER TABLE financeiro.contas_pagar_rateio ENABLE ROW LEVEL SECURITY;

-- Política: mesma regra de company que contas_pagar (acesso por company_id)
-- Tornar idempotente: remover policy antiga, se existir, antes de criar
DROP POLICY IF EXISTS contas_pagar_rateio_company_policy ON financeiro.contas_pagar_rateio;
CREATE POLICY contas_pagar_rateio_company_policy ON financeiro.contas_pagar_rateio
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid() AND ativo = true
    ))
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid() AND ativo = true
    ));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION financeiro.contas_pagar_rateio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contas_pagar_rateio_updated_at ON financeiro.contas_pagar_rateio;
CREATE TRIGGER trg_contas_pagar_rateio_updated_at
    BEFORE UPDATE ON financeiro.contas_pagar_rateio
    FOR EACH ROW EXECUTE FUNCTION financeiro.contas_pagar_rateio_updated_at();

-- =====================================================
-- 2. CRIAR_CONTA_PAGAR: CENTRO/PROJETO DA COTAÇÃO + RATEIO
-- =====================================================
-- A conta gerada pela cotação passa a receber centro_custo_id e projeto_id da
-- requisição vinculada à cotação e uma linha em contas_pagar_rateio (100%).
-- Requisição é obtida via compras.get_requisicao_from_pedido(p_pedido_id).
-- =====================================================

CREATE OR REPLACE FUNCTION compras.criar_conta_pagar(
    p_pedido_id UUID,
    p_company_id UUID,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_conta_id UUID;
    v_pedido compras.pedidos_compra%ROWTYPE;
    v_fornecedor compras.fornecedores_dados%ROWTYPE;
    v_partner public.partners%ROWTYPE;
    v_classe_financeira_nome VARCHAR(255);
    v_classe_financeira_id UUID;
    v_forma_pagamento VARCHAR(50);
    v_is_parcelada BOOLEAN;
    v_numero_parcelas INTEGER;
    v_intervalo_parcelas_raw VARCHAR(20);
    v_intervalo_parcelas_enum VARCHAR(20);
    v_intervalo_dias INTEGER;
    v_valor_parcela DECIMAL(15,2);
    v_data_vencimento DATE;
    v_data_emissao DATE;
    v_numero_titulo VARCHAR(50);
    v_parcela_id UUID;
    v_resto DECIMAL(15,2);
    i INTEGER;
    -- Rateio: centro/projeto da requisição (cotação)
    v_requisicao_id UUID;
    v_centro_custo_id UUID;
    v_projeto_id UUID;
    -- Dados do fornecedor para exibição na tela de Contas a Pagar
    v_fornecedor_nome VARCHAR(255);
    v_fornecedor_cnpj VARCHAR(18);
    -- Conta bancária padrão da empresa (de onde sairá o pagamento)
    v_conta_bancaria_id UUID;
BEGIN
    RAISE NOTICE '[criar_conta_pagar] 🔵 INÍCIO - Parâmetros: pedido_id=%, company_id=%, created_by=%', 
        p_pedido_id, p_company_id, p_created_by;
    
    SELECT * INTO v_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '[criar_conta_pagar] ❌ ERRO: Pedido não encontrado. pedido_id=%, company_id=%', p_pedido_id, p_company_id;
    END IF;
    
    -- ✅ Rateio: obter requisição da cotação e centro_custo_id/projeto_id
    v_requisicao_id := compras.get_requisicao_from_pedido(p_pedido_id);
    IF v_requisicao_id IS NOT NULL THEN
        SELECT r.centro_custo_id, r.projeto_id
        INTO v_centro_custo_id, v_projeto_id
        FROM compras.requisicoes_compra r
        WHERE r.id = v_requisicao_id AND r.company_id = p_company_id;
        RAISE NOTICE '[criar_conta_pagar] 📍 Requisição da cotação: requisicao_id=%, centro_custo_id=%, projeto_id=%',
            v_requisicao_id, v_centro_custo_id, v_projeto_id;
    ELSE
        v_centro_custo_id := NULL;
        v_projeto_id := NULL;
    END IF;
    
    RAISE NOTICE '[criar_conta_pagar] ✅ Pedido encontrado: numero_pedido=%, fornecedor_id=%, valor_final=%', 
        v_pedido.numero_pedido, v_pedido.fornecedor_id, v_pedido.valor_final;
    
    v_forma_pagamento := v_pedido.forma_pagamento;
    v_is_parcelada := COALESCE(v_pedido.is_parcelada, false);
    v_numero_parcelas := COALESCE(v_pedido.numero_parcelas, 1);
    v_intervalo_parcelas_raw := COALESCE(v_pedido.intervalo_parcelas, '30');
    
    BEGIN
        v_intervalo_dias := v_intervalo_parcelas_raw::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            v_intervalo_dias := 30;
    END;
    
    v_intervalo_parcelas_enum := CASE
        WHEN v_intervalo_dias <= 1 THEN 'diario'
        WHEN v_intervalo_dias <= 7 THEN 'semanal'
        WHEN v_intervalo_dias <= 15 THEN 'quinzenal'
        WHEN v_intervalo_dias <= 45 THEN 'mensal'
        WHEN v_intervalo_dias <= 75 THEN 'bimestral'
        WHEN v_intervalo_dias <= 105 THEN 'trimestral'
        WHEN v_intervalo_dias <= 195 THEN 'semestral'
        ELSE 'anual'
    END;
    
    SELECT * INTO v_fornecedor
    FROM compras.fornecedores_dados
    WHERE id = v_pedido.fornecedor_id;
    
    IF NOT FOUND THEN
        RAISE WARNING '[criar_conta_pagar] ⚠️ Fornecedor não encontrado: fornecedor_id=%', v_pedido.fornecedor_id;
    END IF;
    
    SELECT * INTO v_partner
    FROM public.partners
    WHERE id = v_fornecedor.partner_id;
    
    IF NOT FOUND THEN
        RAISE WARNING '[criar_conta_pagar] ⚠️ Partner não encontrado: partner_id=%', v_fornecedor.partner_id;
        v_fornecedor_nome := NULL;
        v_fornecedor_cnpj := NULL;
    ELSE
        -- Usar nome fantasia quando existir, senão razão social
        v_fornecedor_nome := COALESCE(v_partner.nome_fantasia, v_partner.razao_social);
        v_fornecedor_cnpj := v_partner.cnpj;
    END IF;
    
    SELECT DISTINCT ON (me.classe_financeira_id)
        cf.nome,
        me.classe_financeira_id
    INTO v_classe_financeira_nome, v_classe_financeira_id
    FROM compras.pedido_itens pi
    JOIN almoxarifado.materiais_equipamentos me ON me.id = pi.material_id
    LEFT JOIN financeiro.classes_financeiras cf ON cf.id = me.classe_financeira_id
    WHERE pi.pedido_id = p_pedido_id
    AND me.classe_financeira_id IS NOT NULL
    AND cf.is_active = true
    ORDER BY me.classe_financeira_id, pi.id
    LIMIT 1;
    
    v_data_emissao := COALESCE(v_pedido.data_pedido, CURRENT_DATE);
    IF NOT v_is_parcelada OR v_numero_parcelas = 1 THEN
        v_data_vencimento := CURRENT_DATE + (v_intervalo_dias || ' days')::INTERVAL;
    ELSE
        v_data_vencimento := CURRENT_DATE + (v_intervalo_dias || ' days')::INTERVAL;
    END IF;
    
    -- Buscar conta bancária padrão da empresa (primeira conta ativa cadastrada)
    SELECT cb.id
    INTO v_conta_bancaria_id
    FROM financeiro.contas_bancarias cb
    WHERE cb.company_id = p_company_id
      AND cb.is_active = true
    ORDER BY cb.created_at ASC
    LIMIT 1;
    
    SELECT financeiro.generate_titulo_number(p_company_id, 'PAGAR') INTO v_numero_titulo;
    
    INSERT INTO financeiro.contas_pagar (
        id, company_id, fornecedor_id, fornecedor_nome, fornecedor_cnpj,
        descricao, valor_original, valor_atual,
        data_emissao, data_vencimento, status, classe_financeira, observacoes, created_by,
        forma_pagamento, is_parcelada, numero_parcelas, intervalo_parcelas, pedido_id, numero_titulo,
        centro_custo_id, projeto_id, conta_bancaria_id
    ) VALUES (
        gen_random_uuid(), p_company_id, v_partner.id, v_fornecedor_nome, v_fornecedor_cnpj,
        'Pedido de Compra ' || v_pedido.numero_pedido,
        v_pedido.valor_final, v_pedido.valor_final,
        v_data_emissao, v_data_vencimento, 'pendente',
        v_classe_financeira_nome,
        'Conta gerada automaticamente do pedido ' || v_pedido.numero_pedido,
        p_created_by,
        v_forma_pagamento, v_is_parcelada, v_numero_parcelas, v_intervalo_parcelas_enum,
        p_pedido_id, v_numero_titulo,
        v_centro_custo_id, v_projeto_id, v_conta_bancaria_id
    ) RETURNING id INTO v_conta_id;
    
    -- ✅ Inserir rateio (100%) quando a cotação tem centro de custo
    IF v_centro_custo_id IS NOT NULL THEN
        INSERT INTO financeiro.contas_pagar_rateio (
            conta_pagar_id, company_id, centro_custo_id, projeto_id,
            tipo_rateio, valor_percentual, valor_monetario
        ) VALUES (
            v_conta_id, p_company_id, v_centro_custo_id, v_projeto_id,
            'percentual', 100, NULL
        );
        RAISE NOTICE '[criar_conta_pagar] ✅ Rateio criado: 100%% centro_custo_id=%, projeto_id=%', v_centro_custo_id, v_projeto_id;
    END IF;
    
    IF v_is_parcelada AND v_numero_parcelas > 1 THEN
        v_valor_parcela := v_pedido.valor_final / v_numero_parcelas;
        v_resto := v_pedido.valor_final - (v_valor_parcela * v_numero_parcelas);
        FOR i IN 1..v_numero_parcelas LOOP
            v_data_vencimento := CURRENT_DATE + (i * v_intervalo_dias || ' days')::INTERVAL;
            IF i = v_numero_parcelas THEN
                v_valor_parcela := v_valor_parcela + v_resto;
            END IF;
            SELECT public.generate_titulo_number_parcela(v_conta_id, i) INTO v_numero_titulo;
            INSERT INTO financeiro.contas_pagar_parcelas (
                id, conta_pagar_id, company_id, numero_parcela, valor_parcela, valor_original, valor_atual,
                data_vencimento, valor_desconto, valor_juros, valor_multa, valor_pago, status, numero_titulo,
                observacoes, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), v_conta_id, p_company_id, i, v_valor_parcela, v_valor_parcela, v_valor_parcela,
                v_data_vencimento, 0, 0, 0, 0, 'pendente', v_numero_titulo,
                'Parcela ' || i || ' de ' || v_numero_parcelas || ' do pedido ' || v_pedido.numero_pedido,
                NOW(), NOW()
            ) RETURNING id INTO v_parcela_id;
        END LOOP;
    END IF;
    
    RAISE NOTICE '[criar_conta_pagar] 🟢 FIM - Retornando conta_id=%', v_conta_id;
    RETURN v_conta_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[criar_conta_pagar] ❌ ERRO: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.criar_conta_pagar IS 
'Cria conta a pagar ao criar pedido (após aprovação da cotação). Preenche centro_custo_id e projeto_id da requisição da cotação e insere uma linha em contas_pagar_rateio (100%). Requisição obtida via get_requisicao_from_pedido.';
