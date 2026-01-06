-- =====================================================
-- CORREÇÃO: get_required_approvers - Buscar centro_custo_id da requisição para cotações
-- Data: 2025-01-31
-- Descrição: A tabela compras.cotacoes não tem centro_custo_id diretamente,
--            mas está relacionada a compras.requisicoes_compra que tem.
--            Esta correção faz JOIN com a requisição para buscar o centro_custo_id.
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
            -- Requisições de compra não têm coluna departamento
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            -- processo_departamento permanece NULL para requisições
            
        WHEN 'cotacao_compra' THEN
            -- Cotações não têm centro_custo_id diretamente, buscar da requisição relacionada
            SELECT 
                c.valor_total,
                r.centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacoes c
            INNER JOIN compras.requisicoes_compra r ON c.requisicao_id = r.id
            WHERE c.id = p_processo_id AND r.company_id = p_company_id;
            
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
        -- Para requisições de compra, ignorar filtro de departamento (coluna não existe)
        AND (
            p_processo_tipo != 'requisicao_compra' 
            OR (departamento IS NULL)
        )
        -- Para outros tipos, usar filtro de departamento normalmente
        AND (
            p_processo_tipo = 'requisicao_compra'
            OR (departamento IS NULL OR departamento = processo_departamento)
        )
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

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 
'Determina os aprovadores necessários para um processo. Para cotações, busca o centro_custo_id da requisição relacionada. Para requisições de compra, ignora o filtro de departamento pois essa coluna não existe na tabela.';

