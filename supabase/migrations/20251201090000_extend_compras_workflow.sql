-- =====================================================
-- MIGRAÇÃO: Extensão completa do módulo de Compras
-- Data....: 2025-12-01
-- Descrição:
--   - Acrescenta campos e workflows à Requisição de Compra
--   - Estrutura ciclos de cotação, fornecedores e anexos
--   - Introduz controle de NF de entrada, divergências e follow-up
--   - Disponibiliza função de comparação NF × Pedido e eventos/webhooks
-- =====================================================

-- =====================================================
-- 1. TIPOS ENUM E CAMPOS ADICIONAIS
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'tipo_requisicao'
            AND typnamespace = 'compras'::regnamespace
    ) THEN
        CREATE TYPE compras.tipo_requisicao AS ENUM (
            'reposicao',
            'compra_direta',
            'emergencial'
        );
    END IF;
END$$;

ALTER TABLE compras.requisicoes_compra
    ADD COLUMN IF NOT EXISTS tipo_requisicao compras.tipo_requisicao DEFAULT 'reposicao',
    ADD COLUMN IF NOT EXISTS destino_almoxarifado_id UUID REFERENCES almoxarifado.almoxarifados(id),
    ADD COLUMN IF NOT EXISTS local_entrega TEXT,
    ADD COLUMN IF NOT EXISTS is_emergencial BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS workflow_state TEXT DEFAULT 'criada',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'requisicoes_compra_workflow_state_chk'
          AND table_schema = 'compras'
          AND table_name = 'requisicoes_compra'
    ) THEN
        ALTER TABLE compras.requisicoes_compra
            ADD CONSTRAINT requisicoes_compra_workflow_state_chk
            CHECK (
                workflow_state = ANY(ARRAY[
                    'criada',
                    'pendente_aprovacao',
                    'aprovada',
                    'reprovada',
                    'encaminhada',
                    'em_cotacao',
                    'finalizada',
                    'cancelada'
                ])
            );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'requisicoes_compra_tipo_chk'
          AND table_schema = 'compras'
          AND table_name = 'requisicoes_compra'
    ) THEN
        ALTER TABLE compras.requisicoes_compra
            ADD CONSTRAINT requisicoes_compra_tipo_chk
            CHECK (
                status = 'rascunho'
                OR (
                    (tipo_requisicao <> 'reposicao' OR destino_almoxarifado_id IS NOT NULL)
                    AND (tipo_requisicao <> 'compra_direta' OR local_entrega IS NOT NULL)
                    AND (tipo_requisicao <> 'emergencial' OR is_emergencial = true)
                )
            );
    END IF;
END$$;

ALTER TABLE compras.cotacoes
    ADD COLUMN IF NOT EXISTS workflow_state TEXT DEFAULT 'aberta',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cotacoes_workflow_state_chk'
          AND table_schema = 'compras'
          AND table_name = 'cotacoes'
    ) THEN
        ALTER TABLE compras.cotacoes
            ADD CONSTRAINT cotacoes_workflow_state_chk
            CHECK (
                workflow_state = ANY(ARRAY[
                    'aberta',
                    'completa',
                    'em_aprovacao',
                    'aprovada',
                    'reprovada'
                ])
            );
    END IF;
END$$;

ALTER TABLE compras.pedidos_compra
    ADD COLUMN IF NOT EXISTS workflow_state TEXT DEFAULT 'aberto',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'pedidos_compra_workflow_state_chk'
          AND table_schema = 'compras'
          AND table_name = 'pedidos_compra'
    ) THEN
        ALTER TABLE compras.pedidos_compra
            ADD CONSTRAINT pedidos_compra_workflow_state_chk
            CHECK (
                workflow_state = ANY(ARRAY[
                    'aberto',
                    'aprovado',
                    'reprovado',
                    'entregue',
                    'finalizado'
                ])
            );
    END IF;
END$$;

-- =====================================================
-- 2. ESTRUTURA DE COTAÇÕES (CICLO + FORNECEDORES + ANEXOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS compras.cotacao_ciclos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    requisicao_id UUID NOT NULL REFERENCES compras.requisicoes_compra(id) ON DELETE CASCADE,
    numero_cotacao VARCHAR(50) NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta'
        CHECK (status = ANY(ARRAY['aberta','completa','em_aprovacao','aprovada','reprovada'])),
    prazo_resposta DATE,
    observacoes TEXT,
    workflow_state TEXT NOT NULL DEFAULT 'aberta',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, numero_cotacao)
);

CREATE TABLE IF NOT EXISTS compras.cotacao_fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID NOT NULL REFERENCES compras.cotacao_ciclos(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id),
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status = ANY(ARRAY['pendente','completa','aprovada','reprovada'])),
    preco_total NUMERIC(15,2),
    prazo_entrega INTEGER,
    condicoes_comerciais TEXT,
    observacoes TEXT,
    anexos_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cotacao_id, fornecedor_id)
);

CREATE TABLE IF NOT EXISTS compras.cotacao_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_fornecedor_id UUID NOT NULL REFERENCES compras.cotacao_fornecedores(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    checksum TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

ALTER TABLE compras.cotacoes
    ADD COLUMN IF NOT EXISTS cotacao_ciclo_id UUID REFERENCES compras.cotacao_ciclos(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fornecedor_slot_id UUID REFERENCES compras.cotacao_fornecedores(id) ON DELETE SET NULL;

-- =====================================================
-- 3. NF DE ENTRADA, DIVERGÊNCIAS E MOVIMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS compras.nf_entradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    pedido_id UUID NOT NULL REFERENCES compras.pedidos_compra(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id),
    almoxarifado_entrada_id UUID REFERENCES almoxarifado.entradas_materiais(id) ON DELETE SET NULL,
    numero_nota VARCHAR(50),
    serie VARCHAR(10),
    chave_acesso VARCHAR(44),
    data_emissao DATE,
    data_recebimento DATE DEFAULT CURRENT_DATE,
    valor_total NUMERIC(15,2),
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status = ANY(ARRAY['pendente','divergente','confirmada'])),
    comparacao_status TEXT DEFAULT 'nao_processada'
        CHECK (comparacao_status = ANY(ARRAY['nao_processada','divergente','conferida'])),
    xml_payload TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS compras.nf_entrada_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nf_entrada_id UUID NOT NULL REFERENCES compras.nf_entradas(id) ON DELETE CASCADE,
    pedido_item_id UUID REFERENCES compras.pedido_itens(id),
    material_id UUID,
    descricao TEXT,
    quantidade NUMERIC(15,4) NOT NULL,
    unidade_medida VARCHAR(20),
    valor_unitario NUMERIC(15,6),
    valor_total NUMERIC(15,2),
    ncm VARCHAR(10),
    cfop VARCHAR(10),
    cst VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras.divergencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nf_entrada_id UUID NOT NULL REFERENCES compras.nf_entradas(id) ON DELETE CASCADE,
    pedido_id UUID NOT NULL REFERENCES compras.pedidos_compra(id) ON DELETE CASCADE,
    pedido_item_id UUID REFERENCES compras.pedido_itens(id),
    tipo TEXT NOT NULL
        CHECK (tipo = ANY(ARRAY['PRICE','QUANTITY','TAX','ITEM','FISCAL'])),
    status TEXT NOT NULL DEFAULT 'aberta'
        CHECK (status = ANY(ARRAY['aberta','em_analise','resolvida'])),
    detalhe JSONB NOT NULL,
    resolvido_por UUID REFERENCES public.users(id),
    resolvido_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    destination_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status = ANY(ARRAY['pending','sent','error'])),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS compras.workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    from_state TEXT,
    to_state TEXT NOT NULL,
    actor_id UUID REFERENCES public.users(id),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW compras.follow_up_view AS
SELECT
    rc.company_id,
    rc.id                  AS requisicao_id,
    rc.numero_requisicao,
    rc.workflow_state      AS requisicao_status,
    (array_agg(cc.id ORDER BY cc.created_at))[1]             AS cotacao_ciclo_id,
    MIN(cc.status)         AS cotacao_status,
    (array_agg(ct.id ORDER BY ct.created_at))[1]             AS cotacao_id,
    MIN(ct.workflow_state) AS cotacao_fornecedor_status,
    (array_agg(pc.id ORDER BY pc.created_at))[1]             AS pedido_id,
    MIN(pc.workflow_state) AS pedido_status,
    (array_agg(nf.id ORDER BY nf.created_at))[1]             AS nf_id,
    MIN(nf.status)         AS nf_status
FROM compras.requisicoes_compra rc
LEFT JOIN compras.cotacao_ciclos cc ON cc.requisicao_id = rc.id
LEFT JOIN compras.cotacoes ct ON ct.cotacao_ciclo_id = cc.id
LEFT JOIN compras.pedidos_compra pc ON pc.cotacao_id = ct.id
LEFT JOIN compras.nf_entradas nf ON nf.pedido_id = pc.id
GROUP BY rc.company_id, rc.id, rc.numero_requisicao, rc.workflow_state;

-- =====================================================
-- 4. FUNÇÃO DE COMPARAÇÃO NF × PEDIDO
-- =====================================================

CREATE OR REPLACE FUNCTION compras.compare_nf_pedido(
    p_nf_entrada_id UUID,
    p_price_tolerance NUMERIC DEFAULT 0.02,
    p_qty_tolerance NUMERIC DEFAULT 0.0
)
RETURNS TABLE (
    pedido_item_id UUID,
    nf_item_id UUID,
    status TEXT,
    diff_payload JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_item RECORD;
    v_status TEXT;
    v_diff JSONB;
BEGIN
    FOR v_item IN
        SELECT
            ni.id AS nf_item_id,
            ni.pedido_item_id,
            ni.quantidade AS nf_quantidade,
            ni.valor_unitario AS nf_valor_unit,
            pi.quantidade AS pedido_quantidade,
            pi.valor_unitario AS pedido_valor_unit
        FROM compras.nf_entrada_itens ni
        LEFT JOIN compras.pedido_itens pi ON pi.id = ni.pedido_item_id
        WHERE ni.nf_entrada_id = p_nf_entrada_id
    LOOP
        v_status := 'OK';
        v_diff := '{}'::jsonb;

        IF v_item.pedido_item_id IS NULL THEN
            v_status := 'ITEM_NAO_ENCONTRADO';
            v_diff := jsonb_build_object('motivo', 'Item da NF não vinculado ao pedido');
        ELSE
            IF v_item.pedido_valor_unit IS NULL THEN
                v_status := 'PRICE_DIFF';
                v_diff := jsonb_build_object('motivo', 'Item do pedido sem valor unitário registrado');
            ELSE
                IF v_item.pedido_valor_unit > 0 THEN
                    IF ABS(v_item.nf_valor_unit - v_item.pedido_valor_unit) / v_item.pedido_valor_unit > p_price_tolerance THEN
                        v_status := 'PRICE_DIFF';
                        v_diff := v_diff || jsonb_build_object(
                            'pedido_valor', v_item.pedido_valor_unit,
                            'nf_valor', v_item.nf_valor_unit
                        );
                    END IF;
                END IF;
            END IF;

            IF v_status = 'OK' THEN
                IF ABS(COALESCE(v_item.nf_quantidade, 0) - COALESCE(v_item.pedido_quantidade, 0)) > p_qty_tolerance THEN
                    v_status := 'QTY_DIFF';
                    v_diff := jsonb_build_object(
                        'pedido_quantidade', v_item.pedido_quantidade,
                        'nf_quantidade', v_item.nf_quantidade
                    );
                END IF;
            END IF;
        END IF;

        IF v_status <> 'OK' THEN
            INSERT INTO compras.divergencias (
                company_id,
                nf_entrada_id,
                pedido_id,
                pedido_item_id,
                tipo,
                detalhe
            )
            SELECT
                nf.company_id,
                nf.id,
                nf.pedido_id,
                v_item.pedido_item_id,
                CASE WHEN v_status = 'PRICE_DIFF' THEN 'PRICE' ELSE 'QUANTITY' END,
                v_diff
            FROM compras.nf_entradas nf
            WHERE nf.id = p_nf_entrada_id
            ON CONFLICT DO NOTHING;
        END IF;

        pedido_item_id := v_item.pedido_item_id;
        nf_item_id := v_item.nf_item_id;
        status := v_status;
        diff_payload := v_diff;
        RETURN NEXT;
    END LOOP;

    UPDATE compras.nf_entradas
    SET comparacao_status = CASE
        WHEN EXISTS (
            SELECT 1 FROM compras.divergencias d
            WHERE d.nf_entrada_id = p_nf_entrada_id AND d.status = 'aberta'
        )
        THEN 'divergente'
        ELSE 'conferida'
    END,
    updated_at = NOW()
    WHERE id = p_nf_entrada_id;
END;
$$;

-- =====================================================
-- 5. TRIGGERS DE AUDITORIA
-- =====================================================

CREATE OR REPLACE FUNCTION compras.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cotacao_ciclos_updated
    BEFORE UPDATE ON compras.cotacao_ciclos
    FOR EACH ROW EXECUTE FUNCTION compras.touch_updated_at();

CREATE TRIGGER trg_cotacao_fornecedores_updated
    BEFORE UPDATE ON compras.cotacao_fornecedores
    FOR EACH ROW EXECUTE FUNCTION compras.touch_updated_at();

CREATE TRIGGER trg_nf_entradas_updated
    BEFORE UPDATE ON compras.nf_entradas
    FOR EACH ROW EXECUTE FUNCTION compras.touch_updated_at();

CREATE TRIGGER trg_divergencias_updated
    BEFORE UPDATE ON compras.divergencias
    FOR EACH ROW EXECUTE FUNCTION compras.touch_updated_at();
