CREATE OR REPLACE FUNCTION public.get_required_approvers(p_processo_tipo character varying, p_processo_id uuid, p_company_id uuid)
 RETURNS TABLE(nivel integer, aprovador_id uuid, is_primary boolean, ordem integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    processo_valor DECIMAL(15,2) := 0;
    processo_centro_custo_id UUID;
    processo_classe_financeira VARCHAR(100);
    processo_classe_financeira_id UUID;
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
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
                AND (nome = processo_classe_financeira OR codigo = processo_classe_financeira)
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
            SELECT 
                COALESCE(SUM(c.valor_total), 0),
                r.centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacao_ciclos cc
            INNER JOIN compras.requisicoes_compra r ON cc.requisicao_id = r.id
            LEFT JOIN compras.cotacoes c ON c.cotacao_ciclo_id = cc.id
            WHERE cc.id = p_processo_id AND cc.company_id = p_company_id
            GROUP BY cc.id, r.centro_custo_id;
            
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
$function$

