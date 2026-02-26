-- =====================================================
-- Correção: Aprovação de transferência - valor e centro de custo
-- Data: 2026-02-22
-- Descrição:
--   A tabela almoxarifado.transferencias não possui valor_total nem centro_custo_id.
--   get_required_approvers quebrava ao buscar aprovadores para transferência.
--   Esta migração obtém valor (soma dos itens) e centro_custo_id (primeiro item)
--   a partir de almoxarifado.transferencia_itens e materiais_equipamentos.
-- =====================================================

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
    processo_centro_custos UUID[] := '{}';
    processo_projeto_id UUID;
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
    cc_id UUID;
    aprovadores_ja_retornados UUID[] := '{}';
BEGIN
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, projeto_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_projeto_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;

            SELECT ARRAY_AGG(DISTINCT centro_custo_id) INTO processo_centro_custos
            FROM financeiro.contas_pagar_rateio
            WHERE conta_pagar_id = p_processo_id AND company_id = p_company_id AND centro_custo_id IS NOT NULL;

            IF processo_centro_custos IS NULL OR array_length(processo_centro_custos, 1) IS NULL THEN
                processo_centro_custos := CASE WHEN processo_centro_custo_id IS NOT NULL THEN ARRAY[processo_centro_custo_id] ELSE '{}'::uuid[] END;
            END IF;

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

            SELECT * INTO config_record
            FROM public.configuracoes_aprovacao_unificada
            WHERE company_id = p_company_id
            AND processo_tipo = 'conta_pagar'
            AND ativo = true
            AND centro_custo_id IS NULL
            AND (valor_limite IS NULL OR valor_limite >= processo_valor)
            AND (
                classe_financeiras IS NOT NULL
                AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL
                AND processo_classe_financeira_id = ANY(classe_financeiras)
            )
            AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
            ORDER BY COALESCE(array_length(classe_financeiras, 1), 999) ASC,
                     nivel_aprovacao, COALESCE(valor_limite, 0) DESC
            LIMIT 1;

            IF FOUND THEN
                FOR aprovador_record IN
                    SELECT
                        (aprovador->>'user_id')::UUID as user_id,
                        COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                        COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                    FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                    ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
                LOOP
                    nivel := config_record.nivel_aprovacao;
                    aprovador_id := aprovador_record.user_id;
                    is_primary := aprovador_record.is_primary;
                    ordem := aprovador_record.ordem;
                    RETURN NEXT;
                END LOOP;
                RETURN;
            END IF;

            IF array_length(processo_centro_custos, 1) IS NULL THEN
                FOR config_record IN
                    SELECT * FROM public.configuracoes_aprovacao_unificada
                    WHERE company_id = p_company_id
                    AND processo_tipo = 'conta_pagar'
                    AND ativo = true
                    AND centro_custo_id IS NULL
                    AND (valor_limite IS NULL OR valor_limite >= processo_valor)
                    AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
                    ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
                    LIMIT 1
                LOOP
                    FOR aprovador_record IN
                        SELECT (aprovador->>'user_id')::UUID as user_id,
                               COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                               COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                        FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                        ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
                    LOOP
                        nivel := config_record.nivel_aprovacao;
                        aprovador_id := aprovador_record.user_id;
                        is_primary := aprovador_record.is_primary;
                        ordem := aprovador_record.ordem;
                        RETURN NEXT;
                    END LOOP;
                    RETURN;
                END LOOP;
                RETURN;
            END IF;

            FOREACH cc_id IN ARRAY processo_centro_custos
            LOOP
                FOR config_record IN
                    SELECT * FROM public.configuracoes_aprovacao_unificada
                    WHERE company_id = p_company_id
                    AND processo_tipo = 'conta_pagar'
                    AND ativo = true
                    AND (valor_limite IS NULL OR valor_limite >= processo_valor)
                    AND (centro_custo_id IS NULL OR centro_custo_id = cc_id)
                    AND (
                        classe_financeiras IS NULL
                        OR array_length(classe_financeiras, 1) IS NULL
                        OR processo_classe_financeira_id IS NULL
                        OR processo_classe_financeira_id = ANY(classe_financeiras)
                    )
                    AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
                    ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
                LOOP
                    FOR aprovador_record IN
                        SELECT
                            (aprovador->>'user_id')::UUID as user_id,
                            COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                            COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                        FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                        ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
                    LOOP
                        IF aprovador_record.user_id IS NOT NULL AND NOT (aprovador_record.user_id = ANY(aprovadores_ja_retornados)) THEN
                            aprovadores_ja_retornados := array_append(aprovadores_ja_retornados, aprovador_record.user_id);
                            nivel := config_record.nivel_aprovacao;
                            aprovador_id := aprovador_record.user_id;
                            is_primary := aprovador_record.is_primary;
                            ordem := aprovador_record.ordem;
                            RETURN NEXT;
                        END IF;
                    END LOOP;
                END LOOP;
            END LOOP;
            RETURN;

        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;

        WHEN 'cotacao_compra' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacoes
            WHERE id = p_processo_id AND company_id = p_company_id;

        WHEN 'solicitacao_saida_material' THEN
            SELECT valor_total, centro_custo_id, funcionario_solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM almoxarifado.solicitacoes_saida_materiais
            WHERE id = p_processo_id AND company_id = p_company_id;

        WHEN 'solicitacao_transferencia_material' THEN
            -- almoxarifado.transferencias não tem valor_total nem centro_custo_id; obter dos itens
            SELECT COALESCE((
                SELECT SUM(ti.quantidade_solicitada * COALESCE(me.valor_unitario, 0))
                FROM almoxarifado.transferencia_itens ti
                JOIN almoxarifado.materiais_equipamentos me ON me.id = ti.material_equipamento_id
                WHERE ti.transferencia_id = p_processo_id
            ), 0) INTO processo_valor;
            SELECT ti.centro_custo_id INTO processo_centro_custo_id
            FROM almoxarifado.transferencia_itens ti
            JOIN almoxarifado.transferencias t ON t.id = ti.transferencia_id AND t.company_id = p_company_id
            WHERE ti.transferencia_id = p_processo_id
            LIMIT 1;
    END CASE;

    IF p_processo_tipo != 'conta_pagar' THEN
        SELECT * INTO config_record
        FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
        AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
        ORDER BY nivel_aprovacao, COALESCE(valor_limite, 0) DESC
        LIMIT 1;

        IF FOUND THEN
            FOR aprovador_record IN
                SELECT
                    (aprovador->>'user_id')::UUID as user_id,
                    COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                    COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
                FROM jsonb_array_elements(config_record.aprovadores) as aprovador
                ORDER BY COALESCE((aprovador->>'ordem')::INTEGER, 0) ASC
            LOOP
                nivel := config_record.nivel_aprovacao;
                aprovador_id := aprovador_record.user_id;
                is_primary := aprovador_record.is_primary;
                ordem := aprovador_record.ordem;
                RETURN NEXT;
            END LOOP;
        END IF;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS
'Determina aprovadores. Transferência: valor e centro_custo obtidos de transferencia_itens e materiais_equipamentos. 2026-02-22.';
