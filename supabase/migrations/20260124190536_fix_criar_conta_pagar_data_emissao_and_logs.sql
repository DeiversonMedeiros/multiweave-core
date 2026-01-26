-- =====================================================
-- FIX: Adicionar data_emissao e logs detalhados
-- Data: 2026-01-24
-- Descrição: A função criar_conta_pagar não estava definindo data_emissao,
--            que é um campo NOT NULL na tabela contas_pagar.
--            Também adiciona logs detalhados para diagnóstico.
-- Erro: null value in column "data_emissao" of relation "contas_pagar" violates not-null constraint
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
    -- ✅ NOVAS VARIÁVEIS: Condições de pagamento
    v_forma_pagamento VARCHAR(50);
    v_is_parcelada BOOLEAN;
    v_numero_parcelas INTEGER;
    v_intervalo_parcelas VARCHAR(20);
    v_valor_parcela DECIMAL(15,2);
    v_data_vencimento DATE;
    v_data_emissao DATE; -- ✅ NOVO: Data de emissão
    v_numero_titulo VARCHAR(50);
    v_parcela_id UUID;
    v_resto DECIMAL(15,2); -- Para ajustar diferença de centavos na última parcela
    i INTEGER;
BEGIN
    RAISE NOTICE '[criar_conta_pagar] 🔵 INÍCIO - Parâmetros: pedido_id=%, company_id=%, created_by=%', 
        p_pedido_id, p_company_id, p_created_by;
    
    -- Buscar dados do pedido
    SELECT * INTO v_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '[criar_conta_pagar] ❌ ERRO: Pedido não encontrado. pedido_id=%, company_id=%', p_pedido_id, p_company_id;
    END IF;
    
    RAISE NOTICE '[criar_conta_pagar] ✅ Pedido encontrado: numero_pedido=%, fornecedor_id=%, valor_final=%, data_pedido=%', 
        v_pedido.numero_pedido, v_pedido.fornecedor_id, v_pedido.valor_final, v_pedido.data_pedido;
    
    -- ✅ NOVO: Buscar condições de pagamento do pedido
    v_forma_pagamento := v_pedido.forma_pagamento;
    v_is_parcelada := COALESCE(v_pedido.is_parcelada, false);
    v_numero_parcelas := COALESCE(v_pedido.numero_parcelas, 1);
    v_intervalo_parcelas := COALESCE(v_pedido.intervalo_parcelas, '30');
    
    RAISE NOTICE '[criar_conta_pagar] 💳 Condições de pagamento: forma_pagamento=%, is_parcelada=%, numero_parcelas=%, intervalo_parcelas=%', 
        v_forma_pagamento, v_is_parcelada, v_numero_parcelas, v_intervalo_parcelas;
    
    -- Buscar dados do fornecedor
    SELECT * INTO v_fornecedor
    FROM compras.fornecedores_dados
    WHERE id = v_pedido.fornecedor_id;
    
    IF NOT FOUND THEN
        RAISE WARNING '[criar_conta_pagar] ⚠️ Fornecedor não encontrado: fornecedor_id=%', v_pedido.fornecedor_id;
    END IF;
    
    -- Buscar dados do partner
    SELECT * INTO v_partner
    FROM public.partners
    WHERE id = v_fornecedor.partner_id;
    
    IF NOT FOUND THEN
        RAISE WARNING '[criar_conta_pagar] ⚠️ Partner não encontrado: partner_id=%', v_fornecedor.partner_id;
    ELSE
        RAISE NOTICE '[criar_conta_pagar] ✅ Partner encontrado: partner_id=%, razao_social=%', 
            v_partner.id, v_partner.razao_social;
    END IF;
    
    -- Buscar classe financeira dos materiais do pedido
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
    
    RAISE NOTICE '[criar_conta_pagar] 💰 Classe financeira: nome=%, id=%', 
        v_classe_financeira_nome, v_classe_financeira_id;
    
    -- ✅ FIX: Definir data_emissao (usar data_pedido ou CURRENT_DATE)
    v_data_emissao := COALESCE(v_pedido.data_pedido, CURRENT_DATE);
    
    -- ✅ NOVO: Calcular data de vencimento baseada no intervalo de parcelas
    -- Se não for parcelado, usar intervalo padrão de 30 dias
    IF NOT v_is_parcelada OR v_numero_parcelas = 1 THEN
        v_data_vencimento := CURRENT_DATE + (v_intervalo_parcelas::INTEGER || ' days')::INTERVAL;
    ELSE
        -- Para parcelado, a primeira parcela vence no intervalo
        v_data_vencimento := CURRENT_DATE + (v_intervalo_parcelas::INTEGER || ' days')::INTERVAL;
    END IF;
    
    RAISE NOTICE '[criar_conta_pagar] 📅 Datas: data_emissao=%, data_vencimento=%', 
        v_data_emissao, v_data_vencimento;
    
    -- ✅ FIX: Gerar número do título para a conta principal
    SELECT financeiro.generate_titulo_number(p_company_id, 'PAGAR') INTO v_numero_titulo;
    
    RAISE NOTICE '[criar_conta_pagar] 🏷️ Número do título gerado: %', v_numero_titulo;
    
    -- ✅ FIX: Criar conta a pagar com data_emissao e todas as condições de pagamento
    RAISE NOTICE '[criar_conta_pagar] 📝 Inserindo conta a pagar...';
    
    INSERT INTO financeiro.contas_pagar (
        id, 
        company_id, 
        fornecedor_id, 
        descricao, 
        valor_original,
        valor_atual, 
        data_emissao, -- ✅ FIX: Adicionado campo obrigatório
        data_vencimento, 
        status, 
        classe_financeira, 
        observacoes, 
        created_by,
        -- ✅ NOVOS CAMPOS: Condições de pagamento
        forma_pagamento,
        is_parcelada,
        numero_parcelas,
        intervalo_parcelas,
        pedido_id,
        numero_titulo
    ) VALUES (
        gen_random_uuid(), 
        p_company_id, 
        v_partner.id,
        'Pedido de Compra ' || v_pedido.numero_pedido,
        v_pedido.valor_final, 
        v_pedido.valor_final,
        v_data_emissao, -- ✅ FIX: Valor definido
        v_data_vencimento, 
        'pendente',
        v_classe_financeira_nome,
        'Conta gerada automaticamente do pedido ' || v_pedido.numero_pedido,
        p_created_by,
        -- ✅ NOVOS VALORES: Condições de pagamento
        v_forma_pagamento,
        v_is_parcelada,
        v_numero_parcelas,
        v_intervalo_parcelas,
        p_pedido_id,
        v_numero_titulo
    ) RETURNING id INTO v_conta_id;
    
    RAISE NOTICE '[criar_conta_pagar] ✅ Conta criada com sucesso: conta_id=%, pedido_id=%, forma_pagamento=%, is_parcelada=%, numero_parcelas=%, numero_titulo=%, data_emissao=%', 
        v_conta_id, p_pedido_id, v_forma_pagamento, v_is_parcelada, v_numero_parcelas, v_numero_titulo, v_data_emissao;
    
    -- ✅ NOVO: Criar parcelas automaticamente se is_parcelada = true e numero_parcelas > 1
    IF v_is_parcelada AND v_numero_parcelas > 1 THEN
        RAISE NOTICE '[criar_conta_pagar] 💳 Criando % parcelas...', v_numero_parcelas;
        
        -- Calcular valor base da parcela
        v_valor_parcela := v_pedido.valor_final / v_numero_parcelas;
        
        -- Calcular resto para ajustar na última parcela
        v_resto := v_pedido.valor_final - (v_valor_parcela * v_numero_parcelas);
        
        -- Criar cada parcela
        FOR i IN 1..v_numero_parcelas LOOP
            -- Calcular data de vencimento da parcela
            v_data_vencimento := CURRENT_DATE + (i * v_intervalo_parcelas::INTEGER || ' days')::INTERVAL;
            
            -- Ajustar valor da última parcela para incluir diferença de centavos
            IF i = v_numero_parcelas THEN
                v_valor_parcela := v_valor_parcela + v_resto;
            END IF;
            
            -- Gerar número do título da parcela
            SELECT public.generate_titulo_number_parcela(v_conta_id, i) INTO v_numero_titulo;
            
            -- Criar parcela
            INSERT INTO financeiro.contas_pagar_parcelas (
                id,
                conta_pagar_id,
                company_id,
                numero_parcela,
                valor_parcela,
                valor_original,
                valor_atual,
                data_vencimento,
                valor_desconto,
                valor_juros,
                valor_multa,
                valor_pago,
                status,
                numero_titulo,
                observacoes,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_conta_id,
                p_company_id,
                i,
                v_valor_parcela,
                v_valor_parcela,
                v_valor_parcela,
                v_data_vencimento,
                0,
                0,
                0,
                0,
                'pendente',
                v_numero_titulo,
                'Parcela ' || i || ' de ' || v_numero_parcelas || ' do pedido ' || v_pedido.numero_pedido,
                NOW(),
                NOW()
            ) RETURNING id INTO v_parcela_id;
            
            RAISE NOTICE '[criar_conta_pagar] ✅ Parcela criada: parcela_id=%, numero_parcela=%, valor=%, vencimento=%, numero_titulo=%', 
                v_parcela_id, i, v_valor_parcela, v_data_vencimento, v_numero_titulo;
        END LOOP;
        
        RAISE NOTICE '[criar_conta_pagar] ✅ Total de % parcelas criadas para conta_id=%', v_numero_parcelas, v_conta_id;
    END IF;
    
    RAISE NOTICE '[criar_conta_pagar] 🟢 FIM - Retornando conta_id=%', v_conta_id;
    RETURN v_conta_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[criar_conta_pagar] ❌ ERRO: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql;

-- Atualizar comentário da função
COMMENT ON FUNCTION compras.criar_conta_pagar IS 
'Cria conta a pagar automaticamente quando pedido é criado. Inclui condições de pagamento, vinculação com pedido_id e criação automática de parcelas se is_parcelada = true. Corrigido em 2026-01-24 para incluir data_emissao obrigatória e logs detalhados.';
