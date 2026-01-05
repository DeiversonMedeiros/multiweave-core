-- =====================================================
-- MIGRATION: Corrigir cálculo de valor para aprovação de cotação
-- Data: 2025-01-31
-- Descrição: Ajusta o cálculo para somar frete/imposto UMA VEZ por fornecedor
--            ao invés de por item (são valores globais por fornecedor)
-- =====================================================

-- Atualizar get_required_approvers para calcular valor corretamente
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
    processo_departamento VARCHAR(100);
    processo_classe_financeira VARCHAR(100);
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, departamento, classe_financeira, usuario_id
            INTO processo_valor, processo_centro_custo_id, processo_departamento, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            -- Buscar de cotacao_ciclos e calcular valor total dos itens vencedores
            -- IMPORTANTE: Frete e imposto são por fornecedor, não por item
            -- Buscar centro_custo_id da cotação
            SELECT centro_custo_id INTO processo_centro_custo_id
            FROM compras.cotacao_ciclos
            WHERE id = p_processo_id AND company_id = p_company_id;
            
            -- Calcular valor total dos itens vencedores
            SELECT COALESCE(
                (
                    -- Subtotal dos itens vencedores (sem frete/imposto)
                    SELECT COALESCE(SUM(
                        (cif.quantidade_ofertada * cif.valor_unitario) 
                        - COALESCE(cif.desconto_valor, 0) 
                        - ((cif.quantidade_ofertada * cif.valor_unitario) * COALESCE(cif.desconto_percentual, 0) / 100)
                    ), 0)
                    FROM compras.cotacao_item_fornecedor cif
                    INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
                    WHERE cf.cotacao_ciclo_id = p_processo_id
                    AND cif.is_vencedor = true
                    AND cif.company_id = p_company_id
                ) +
                -- Frete e imposto UMA VEZ por fornecedor vencedor
                COALESCE(
                    (
                        SELECT COALESCE(SUM(
                            COALESCE(cf.valor_frete, 0) + COALESCE(cf.valor_imposto, 0)
                        ), 0)
                        FROM compras.cotacao_fornecedores cf
                        WHERE cf.cotacao_ciclo_id = p_processo_id
                        AND cf.company_id = p_company_id
                        AND EXISTS (
                            SELECT 1 
                            FROM compras.cotacao_item_fornecedor cif
                            WHERE cif.cotacao_fornecedor_id = cf.id
                            AND cif.is_vencedor = true
                            AND cif.company_id = p_company_id
                        )
                    ),
                    0
                ),
                0
            ) INTO processo_valor;
            
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

    -- Buscar configurações de aprovação que se aplicam
    FOR config_record IN
        SELECT * FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
        AND (departamento IS NULL OR departamento = processo_departamento)
        AND (classe_financeira IS NULL OR classe_financeira = processo_classe_financeira)
        AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
        ORDER BY nivel_aprovacao, valor_limite DESC
    LOOP
        -- Processar aprovadores do JSONB
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
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers IS 'Ajustado cálculo de valor de cotação: frete/imposto somados UMA VEZ por fornecedor';

