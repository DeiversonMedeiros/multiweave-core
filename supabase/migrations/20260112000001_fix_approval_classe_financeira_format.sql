-- =====================================================
-- CORREÇÃO: Suporte ao formato completo de classe financeira nas aprovações
-- Data: 2026-01-12
-- Descrição: Atualiza get_required_approvers para suportar formato "codigo - nome"
--            da classe financeira ao buscar configurações de aprovação
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
    processo_classe_financeira_id UUID;  -- ID da classe financeira
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, classe_financeira, created_by
            INTO processo_valor, processo_centro_custo_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
            -- CONVERSÃO: Buscar ID da classe financeira pelo nome ou código
            -- Suporta formato "codigo - nome" ou apenas "nome" ou apenas "codigo"
            IF processo_classe_financeira IS NOT NULL AND trim(processo_classe_financeira) != '' THEN
                -- Verificar se está no formato "codigo - nome" e buscar por código, nome ou formato completo
                SELECT id INTO processo_classe_financeira_id
                FROM financeiro.classes_financeiras
                WHERE company_id = p_company_id
                AND (
                    -- Buscar por formato completo "codigo - nome"
                    (codigo || ' - ' || nome) = processo_classe_financeira
                    -- Buscar por código extraído (se houver hífen)
                    OR (processo_classe_financeira LIKE '%-%' AND codigo = trim(split_part(processo_classe_financeira, '-', 1)))
                    -- Buscar por nome extraído (se houver hífen)
                    OR (processo_classe_financeira LIKE '%-%' AND nome = trim(split_part(processo_classe_financeira, '-', 2)))
                    -- Buscar por nome ou código exato (se não houver hífen)
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
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacoes
            WHERE id = p_processo_id AND company_id = p_company_id;
            
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
    -- IMPORTANTE: Retornar apenas a configuração mais específica (prioridade: centro_custo + classe > centro_custo > classe > genérica)
    -- Comparar processo_classe_financeira_id (UUID) com classe_financeiras (UUID[])
    -- Usar subquery com LIMIT para pegar apenas a primeira (mais específica)
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
    -- Ordenar por especificidade: mais específica primeiro
    -- Prioridade: 1) centro_custo + classe_financeira (ambos correspondem), 2) centro_custo, 3) classe_financeira, 4) genérica
    -- Dentro de cada nível, priorizar configurações com menos classes financeiras (mais específicas)
    ORDER BY 
        -- Priorizar configurações com centro_custo E classe_financeira específicos E que correspondem
        CASE 
            WHEN centro_custo_id IS NOT NULL 
                AND classe_financeiras IS NOT NULL 
                AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_centro_custo_id IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL
                AND centro_custo_id = processo_centro_custo_id
                AND processo_classe_financeira_id = ANY(classe_financeiras)
            THEN 1 
            ELSE 2 
        END,
        -- Depois priorizar configurações com centro_custo específico que corresponde
        CASE 
            WHEN centro_custo_id IS NOT NULL 
                AND processo_centro_custo_id IS NOT NULL
                AND centro_custo_id = processo_centro_custo_id
            THEN 1 
            ELSE 2 
        END,
        -- Depois priorizar configurações com classe_financeira específica que corresponde
        CASE 
            WHEN classe_financeiras IS NOT NULL 
                AND array_length(classe_financeiras, 1) IS NOT NULL
                AND processo_classe_financeira_id IS NOT NULL
                AND processo_classe_financeira_id = ANY(classe_financeiras)
            THEN 1 
            ELSE 2 
        END,
        -- Priorizar configurações com menos classes financeiras (mais específicas) - CRÍTICO para selecionar a correta
        COALESCE(array_length(classe_financeiras, 1), 999) ASC,
        nivel_aprovacao, 
        COALESCE(valor_limite, 0) DESC
    LIMIT 1;  -- IMPORTANTE: Retornar apenas a primeira (mais específica)
    
    -- Se encontrou uma configuração, processar seus aprovadores
    IF FOUND THEN
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
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 
'Determina aprovadores necessários para um processo. 
Atualizada em 2026-01-12: 
- Suporta formato completo "codigo - nome" da classe financeira
- Extrai código ou nome quando necessário
- Compara UUID da classe financeira com array UUID[] na configuração';
