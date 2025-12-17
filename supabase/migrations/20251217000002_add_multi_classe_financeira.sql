    -- Habilita múltiplas classes financeiras (OU) em configuracoes_aprovacao_unificada

    -- 1) Adicionar nova coluna array
    ALTER TABLE public.configuracoes_aprovacao_unificada
    ADD COLUMN IF NOT EXISTS classe_financeiras UUID[];

    -- 2) Migrar dados existentes da coluna antiga (string)
    DO $$
    BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'configuracoes_aprovacao_unificada'
        AND column_name = 'classe_financeira'
        AND table_schema = 'public'
    ) THEN
        UPDATE public.configuracoes_aprovacao_unificada
        SET classe_financeiras = CASE 
        WHEN classe_financeira IS NOT NULL THEN ARRAY[classe_financeira::uuid]
        ELSE NULL
        END
        WHERE classe_financeiras IS NULL;
    END IF;
    END$$;

    -- 3) Remover coluna antiga
    ALTER TABLE public.configuracoes_aprovacao_unificada
    DROP COLUMN IF EXISTS classe_financeira;

    -- 4) Atualizar função de obtenção de aprovadores para usar array (OU)
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
        processo_projeto_id UUID;
        processo_classe_financeira UUID;
        processo_usuario_id UUID;
        config_record RECORD;
        aprovador_record RECORD;
    BEGIN
        -- Obter dados da solicitação baseado no tipo
        CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, projeto_id, classe_financeira, usuario_id
            INTO processo_valor, processo_centro_custo_id, processo_projeto_id, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'requisicao_compra' THEN
                SELECT valor_total_estimado, centro_custo_id, projeto_id, solicitante_id
                INTO processo_valor, processo_centro_custo_id, processo_projeto_id, processo_usuario_id
                FROM compras.requisicoes_compra
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'cotacao_compra' THEN
                SELECT valor_total, centro_custo_id, projeto_id
                INTO processo_valor, processo_centro_custo_id, processo_projeto_id
                FROM compras.cotacoes
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'solicitacao_saida_material' THEN
                SELECT valor_total, centro_custo_id, projeto_id, funcionario_solicitante_id
                INTO processo_valor, processo_centro_custo_id, processo_projeto_id, processo_usuario_id
                FROM public.solicitacoes_saida_materiais
                WHERE id = p_processo_id AND company_id = p_company_id;
                
            WHEN 'solicitacao_transferencia_material' THEN
                SELECT valor_total, centro_custo_id
                INTO processo_valor, processo_centro_custo_id
                FROM almoxarifado.transferencias
                WHERE id = p_processo_id AND company_id = p_company_id;
                processo_projeto_id := NULL;
                processo_classe_financeira := NULL;
        END CASE;

        -- Buscar configurações de aprovação que se aplicam
        FOR config_record IN
            SELECT * FROM public.configuracoes_aprovacao_unificada
            WHERE company_id = p_company_id
            AND processo_tipo = p_processo_tipo
            AND ativo = true
            AND (valor_limite IS NULL OR valor_limite >= processo_valor)
            AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
            AND (projeto_id IS NULL OR projeto_id = processo_projeto_id)
            AND (
            classe_financeiras IS NULL 
            OR array_length(classe_financeiras, 1) IS NULL
            OR processo_classe_financeira = ANY(classe_financeiras)
            )
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
    'Atualizada: suporta múltiplas classes financeiras (OU) em classe_financeiras';


