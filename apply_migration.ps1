$env:PGPASSWORD="81hbcoNDXaGiPIpp!"
$sql = @"
CREATE OR REPLACE FUNCTION compras.criar_conta_pagar(
    p_pedido_id UUID,
    p_company_id UUID,
    p_created_by UUID
) RETURNS UUID AS `$`$
DECLARE
    v_conta_id UUID;
    v_pedido compras.pedidos_compra%ROWTYPE;
    v_fornecedor compras.fornecedores_dados%ROWTYPE;
    v_partner public.partners%ROWTYPE;
    v_classe_financeira_nome VARCHAR(255);
    v_classe_financeira_id UUID;
BEGIN
    SELECT * INTO v_pedido
    FROM compras.pedidos_compra
    WHERE id = p_pedido_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado';
    END IF;
    
    SELECT * INTO v_fornecedor
    FROM compras.fornecedores_dados
    WHERE id = v_pedido.fornecedor_id;
    
    SELECT * INTO v_partner
    FROM public.partners
    WHERE id = v_fornecedor.partner_id;
    
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
    
    INSERT INTO financeiro.contas_pagar (
        id, company_id, fornecedor_id, descricao, valor_original,
        valor_atual, data_vencimento, status, classe_financeira, observacoes, created_by
    ) VALUES (
        gen_random_uuid(), p_company_id, v_partner.id,
        'Pedido de Compra ' || v_pedido.numero_pedido,
        v_pedido.valor_final, v_pedido.valor_final,
        CURRENT_DATE + INTERVAL '30 days', 'pendente',
        v_classe_financeira_nome,
        'Conta gerada automaticamente do pedido ' || v_pedido.numero_pedido,
        p_created_by
    ) RETURNING id INTO v_conta_id;
    
    RETURN v_conta_id;
END;
`$`$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compras.criar_conta_pagar IS 'Cria conta a pagar automaticamente quando pedido é aprovado. Inclui a classe financeira do material na conta a pagar gerada.';
"@
echo $sql | psql -h db.wmtftyaqucwfsnnjepiy.supabase.co -p 5432 -U postgres -d postgres

