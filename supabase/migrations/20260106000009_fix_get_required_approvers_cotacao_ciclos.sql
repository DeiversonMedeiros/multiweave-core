-- =====================================================
-- CORREÇÃO: get_required_approvers - Buscar dados de cotacao_ciclos
-- Data: 2026-01-06
-- Descrição: A função estava tentando buscar centro_custo_id diretamente de compras.cotacoes,
--            mas o processo_id passado é de compras.cotacao_ciclos.
--            Esta correção busca dados através de cotacao_ciclos fazendo JOIN com requisicoes_compra
--            para obter centro_custo_id e calcula o valor_total somando todas as cotações do ciclo.
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
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    RAISE NOTICE '=== get_required_approvers INÍCIO ===';
    RAISE NOTICE 'p_processo_tipo: %, p_processo_id: %, p_company_id: %',
        p_processo_tipo, p_processo_id, p_company_id;

    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;

            RAISE NOTICE 'Conta a pagar: valor=%, centro_custo_id=%, classe_financeira=%, usuario_id=%',
                processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id;

            IF processo_classe_financeira IS NOT NULL AND trim(processo_classe_financeira) != '' THEN
                SELECT id INTO processo_classe_financeira_id
                FROM financeiro.classes_financeiras
                WHERE company_id = p_company_id
                AND (nome = processo_classe_financeira OR codigo = processo_classe_financeira)
                AND is_active = true
                LIMIT 1;

                RAISE NOTICE 'Classe financeira "%" -> ID: %',
                    processo_classe_financeira, processo_classe_financeira_id;
            ELSE
                processo_classe_financeira_id := NULL;
                RAISE NOTICE 'Classe financeira não informada';
            END IF;
            
        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            -- CORREÇÃO: O processo_id é de cotacao_ciclos, não de cotacoes
            -- Buscar dados através de cotacao_ciclos fazendo JOIN com requisicoes_compra
            -- e calcular valor_total somando todas as cotações do ciclo
            SELECT 
                COALESCE(SUM(c.valor_total), 0),
                r.centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacao_ciclos cc
            INNER JOIN compras.requisicoes_compra r ON cc.requisicao_id = r.id
            LEFT JOIN compras.cotacoes c ON c.cotacao_ciclo_id = cc.id
            WHERE cc.id = p_processo_id AND cc.company_id = p_company_id
            GROUP BY cc.id, r.centro_custo_id;
            
            RAISE NOTICE 'Cotação (ciclo): valor_total=%, centro_custo_id=%',
                processo_valor, processo_centro_custo_id;
            
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

    RAISE NOTICE 'Valores: valor=%, centro_custo_id=%, classe_financeira_id=%, usuario_id=%',
        processo_valor, processo_centro_custo_id, processo_classe_financeira_id, processo_usuario_id;

    -- Buscar configurações de aprovação que se aplicam
    FOR config_record IN
        SELECT * FROM public.configuracoes_aprovacao_unificada
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
        ORDER BY nivel_aprovacao, valor_limite DESC
    LOOP
        RAISE NOTICE 'Config encontrada: nivel=%, classe_financeiras=%',
            config_record.nivel_aprovacao, config_record.classe_financeiras;

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

    RAISE NOTICE '=== get_required_approvers FIM ===';
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 
'Determina os aprovadores necessários para um processo. Para cotações (cotacao_compra), 
busca dados através de cotacao_ciclos fazendo JOIN com requisicoes_compra para obter 
centro_custo_id e calcula valor_total somando todas as cotações do ciclo. Atualizada em 2026-01-06.';

