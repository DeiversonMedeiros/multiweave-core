-- =====================================================
-- MIGRAÇÃO: Frete e desconto geral na cotação + frete por item
-- Data....: 2026-01-20
-- Objetivo:
--   1. cotacao_ciclos: valor_frete, desconto_percentual, desconto_valor (geral)
--   2. cotacao_item_fornecedor: valor_frete (próprio do item, para vencedor e totais)
--   3. get_required_approvers: cotacao_compra usa cotacao_ciclos.id e calcula valor
--      incluindo fretes (item+forn+ciclo) e descontos (forn+ciclo)
-- =====================================================

-- 1) cotacao_ciclos: frete e desconto geral
ALTER TABLE compras.cotacao_ciclos
  ADD COLUMN IF NOT EXISTS valor_frete NUMERIC(15,2) DEFAULT 0 CHECK (valor_frete >= 0),
  ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(7,4) DEFAULT 0 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
  ADD COLUMN IF NOT EXISTS desconto_valor NUMERIC(15,2) DEFAULT 0 CHECK (desconto_valor >= 0);

COMMENT ON COLUMN compras.cotacao_ciclos.valor_frete IS 'Frete aplicado à cotação inteira (geral)';
COMMENT ON COLUMN compras.cotacao_ciclos.desconto_percentual IS 'Desconto percentual aplicado ao total da cotação (geral)';
COMMENT ON COLUMN compras.cotacao_ciclos.desconto_valor IS 'Desconto em R$ aplicado ao total da cotação (geral)';

-- 2) cotacao_item_fornecedor: frete por item (não altera valor_total_calculado)
ALTER TABLE compras.cotacao_item_fornecedor
  ADD COLUMN IF NOT EXISTS valor_frete NUMERIC(14,2) DEFAULT 0 CHECK (valor_frete >= 0);

COMMENT ON COLUMN compras.cotacao_item_fornecedor.valor_frete IS 'Frete próprio do item neste fornecedor. Usado para comparar vencedor e totais; não altera valor do item.';

-- 3) get_required_approvers: para cotacao_compra, p_processo_id = cotacao_ciclos.id
--    Calcular processo_valor = itens vencedores + frete itens + (por forn: frete+imposto-desconto) + frete geral - desconto geral
--    centro_custo_id via requisicoes_compra (cc.requisicao_id)
CREATE OR REPLACE FUNCTION public.get_required_approvers(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    nivel INTEGER,
    aprovador_id UUID,
    is_primary BOOLEAN,
    ordem INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_valor DECIMAL(15,2) := 0;
    processo_centro_custo_id UUID;
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
    v_subtotal_itens DECIMAL(15,2) := 0;
    v_frete_itens DECIMAL(15,2) := 0;
    v_frete_imposto_forn DECIMAL(15,2) := 0;
    v_desconto_forn DECIMAL(15,2) := 0;
    v_base_geral DECIMAL(15,2) := 0;
    v_desconto_geral DECIMAL(15,2) := 0;
BEGIN
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
            IF processo_classe_financeira IS NOT NULL AND trim(processo_classe_financeira) != '' THEN
                SELECT id INTO processo_classe_financeira_id
                FROM financeiro.classes_financeiras
                WHERE company_id = p_company_id
                AND (
                    (codigo || ' - ' || nome) = processo_classe_financeira
                    OR (processo_classe_financeira LIKE '%-%' AND codigo = trim(split_part(processo_classe_financeira, '-', 1)))
                    OR (processo_classe_financeira LIKE '%-%' AND nome = trim(split_part(processo_classe_financeira, '-', 2)))
                    OR (processo_classe_financeira NOT LIKE '%-%' AND (nome = processo_classe_financeira OR codigo = processo_classe_financeira))
                )
                AND is_active = true
                LIMIT 1;
            ELSE
                processo_classe_financeira_id := NULL;
            END IF;
            
        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            SELECT r.centro_custo_id INTO processo_centro_custo_id
            FROM compras.cotacao_ciclos cc
            INNER JOIN compras.requisicoes_compra r ON r.id = cc.requisicao_id
            WHERE cc.id = p_processo_id AND cc.company_id = p_company_id;

            SELECT 
              COALESCE(SUM(cif.valor_total_calculado), 0),
              COALESCE(SUM(COALESCE(cif.valor_frete, 0)), 0)
            INTO v_subtotal_itens, v_frete_itens
            FROM compras.cotacao_item_fornecedor cif
            INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
            WHERE cf.cotacao_id = p_processo_id
              AND cif.is_vencedor = true;

            SELECT 
              COALESCE(SUM(COALESCE(cf.valor_frete, 0) + COALESCE(cf.valor_imposto, 0)), 0),
              COALESCE(SUM(
                (SELECT COALESCE(SUM(c2.valor_total_calculado), 0) FROM compras.cotacao_item_fornecedor c2 WHERE c2.cotacao_fornecedor_id = cf.id AND c2.is_vencedor = true)
                * COALESCE(cf.desconto_percentual, 0) / 100 + COALESCE(cf.desconto_valor, 0)
              ), 0)
            INTO v_frete_imposto_forn, v_desconto_forn
            FROM compras.cotacao_fornecedores cf
            WHERE cf.cotacao_id = p_processo_id
              AND EXISTS (SELECT 1 FROM compras.cotacao_item_fornecedor c WHERE c.cotacao_fornecedor_id = cf.id AND c.is_vencedor = true);

            v_base_geral := v_subtotal_itens + v_frete_itens + v_frete_imposto_forn - v_desconto_forn;
            v_desconto_geral := v_base_geral * COALESCE((SELECT desconto_percentual FROM compras.cotacao_ciclos WHERE id = p_processo_id), 0) / 100
                             + COALESCE((SELECT desconto_valor FROM compras.cotacao_ciclos WHERE id = p_processo_id), 0);

            processo_valor := v_base_geral
              + COALESCE((SELECT valor_frete FROM compras.cotacao_ciclos WHERE id = p_processo_id), 0)
              - v_desconto_geral;
            processo_valor := GREATEST(COALESCE(processo_valor, 0), 0);
            
        WHEN 'solicitacao_saida_material' THEN
            SELECT valor_total, centro_custo_id, funcionario_solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM public.solicitacoes_saida_materiais
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_transferencia_material' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id AND company_id = p_company_id;
    END CASE;

    SELECT * INTO config_record
    FROM public.configuracoes_aprovacao_unificada
    WHERE company_id = p_company_id
    AND processo_tipo = p_processo_tipo
    AND ativo = true
    AND (valor_limite IS NULL OR valor_limite >= processo_valor)
    AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
    AND (
        classe_financeiras IS NULL 
        OR array_length(classe_financeiras, 1) IS NULL 
        OR processo_classe_financeira_id IS NULL
        OR processo_classe_financeira_id = ANY(classe_financeiras)
    )
    AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
    ORDER BY 
        CASE 
            WHEN centro_custo_id IS NOT NULL AND classe_financeiras IS NOT NULL AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_centro_custo_id IS NOT NULL AND processo_classe_financeira_id IS NOT NULL
                AND centro_custo_id = processo_centro_custo_id AND processo_classe_financeira_id = ANY(classe_financeiras)
            THEN 1 ELSE 2 
        END,
        CASE 
            WHEN centro_custo_id IS NOT NULL AND processo_centro_custo_id IS NOT NULL AND centro_custo_id = processo_centro_custo_id
            THEN 1 ELSE 2 
        END,
        CASE 
            WHEN classe_financeiras IS NOT NULL AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL AND processo_classe_financeira_id = ANY(classe_financeiras)
            THEN 1 ELSE 2 
        END,
        COALESCE(array_length(classe_financeiras, 1), 999) ASC,
        nivel_aprovacao, 
        COALESCE(valor_limite, 0) DESC
    LIMIT 1;
    
    IF FOUND THEN
        FOR aprovador_record IN
            SELECT 
                (aprovador->>'user_id')::UUID as user_id,
                COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
            FROM jsonb_array_elements(config_record.aprovadores) as aprovador
        LOOP
            nivel := config_record.nivel_aprovacao;
            aprovador_id := aprovador_record.user_id;
            is_primary := aprovador_record.is_primary;
            ordem := aprovador_record.ordem;
            RETURN NEXT;
        END LOOP;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 
'Determina aprovadores. cotacao_compra: processo_id=cotacao_ciclos.id; valor=itens+frete itens+frete/imp forn-desconto forn+frete geral-desconto geral. 2026-01-20.';
