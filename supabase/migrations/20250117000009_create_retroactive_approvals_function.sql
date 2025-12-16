-- =====================================================
-- FUNÇÃO SEGURA PARA CRIAR APROVAÇÕES RETROATIVAS
-- Data: 2025-01-17
-- Descrição: Cria aprovações apenas para processos que:
--            1. Não têm aprovações existentes
--            2. Estão em estados que ainda permitem aprovação
--            3. Têm regras de aprovação configuradas
--            4. Atendem aos critérios das regras (valor, centro de custo, etc)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_retroactive_approvals(
    p_processo_tipo VARCHAR(50),
    p_company_id UUID,
    p_limit_processos INTEGER DEFAULT 100
) RETURNS TABLE (
    processo_id UUID,
    status_processo TEXT,
    aprovações_criadas INTEGER,
    sucesso BOOLEAN,
    mensagem TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_record RECORD;
    processo_status TEXT;
    has_approval_config BOOLEAN;
    approvals_created INTEGER;
    total_created INTEGER := 0;
    processo_count INTEGER := 0;
    has_approvers BOOLEAN;
BEGIN
    -- Verificar se há configurações de aprovação para este tipo
    SELECT EXISTS (
        SELECT 1 FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
    ) INTO has_approval_config;
    
    IF NOT has_approval_config THEN
        RAISE NOTICE 'Nenhuma configuração de aprovação encontrada para tipo: % na empresa: %', p_processo_tipo, p_company_id;
        RETURN;
    END IF;
    
    -- Buscar processos sem aprovações baseado no tipo
    IF p_processo_tipo = 'requisicao_compra' THEN
        FOR processo_record IN
            SELECT 
                r.id,
                COALESCE(r.workflow_state, r.status) as status_atual
            FROM compras.requisicoes_compra r
            WHERE r.company_id = p_company_id
            AND (
                COALESCE(r.workflow_state, r.status) IN ('pendente_aprovacao', 'em_aprovacao', 'rascunho')
                OR COALESCE(r.workflow_state, r.status) IS NULL
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.aprovacoes_unificada a
                WHERE a.processo_tipo = 'requisicao_compra'
                AND a.processo_id = r.id
                AND a.company_id = p_company_id
            )
            LIMIT p_limit_processos
        LOOP
            processo_count := processo_count + 1;
            processo_status := processo_record.status_atual;
            
            -- Verificar se há aprovadores configurados para este processo específico
            SELECT EXISTS (
                SELECT 1 FROM public.get_required_approvers(
                    'requisicao_compra',
                    processo_record.id,
                    p_company_id
                )
            ) INTO has_approvers;
            
            IF NOT has_approvers THEN
                RETURN QUERY SELECT 
                    processo_record.id,
                    processo_status::TEXT,
                    0,
                    false,
                    'Nenhum aprovador encontrado para os critérios desta requisição'::TEXT;
                CONTINUE;
            END IF;
            
            -- Criar aprovações usando a função existente
            BEGIN
                PERFORM public.create_approvals_for_process(
                    'requisicao_compra',
                    processo_record.id,
                    p_company_id
                );
                
                -- Contar aprovações criadas
                SELECT COUNT(*) INTO approvals_created
                FROM public.aprovacoes_unificada
                WHERE processo_tipo = 'requisicao_compra'
                AND processo_id = processo_record.id
                AND company_id = p_company_id;
                
                total_created := total_created + approvals_created;
                
                RETURN QUERY SELECT 
                    processo_record.id,
                    processo_status::TEXT,
                    approvals_created,
                    true,
                    format('Aprovações criadas com sucesso: %s', approvals_created)::TEXT;
                    
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT 
                    processo_record.id,
                    processo_status::TEXT,
                    0,
                    false,
                    format('Erro: %s', SQLERRM)::TEXT;
            END;
        END LOOP;
        
    ELSIF p_processo_tipo = 'cotacao_compra' THEN
        -- Tentar primeiro com cotacao_ciclos (tabela mais recente)
        FOR processo_record IN
            SELECT 
                c.id,
                COALESCE(c.workflow_state, c.status) as status_atual
            FROM compras.cotacao_ciclos c
            WHERE c.company_id = p_company_id
            AND (
                COALESCE(c.workflow_state, c.status) IN ('aberta', 'em_cotacao', 'em_aprovacao', 'pendente')
                OR COALESCE(c.workflow_state, c.status) IS NULL
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.aprovacoes_unificada a
                WHERE a.processo_tipo = 'cotacao_compra'
                AND a.processo_id = c.id
                AND a.company_id = p_company_id
            )
            LIMIT p_limit_processos
        LOOP
            processo_count := processo_count + 1;
            processo_status := processo_record.status_atual;
            
            -- Verificar se há aprovadores configurados para este processo específico
            SELECT EXISTS (
                SELECT 1 FROM public.get_required_approvers(
                    'cotacao_compra',
                    processo_record.id,
                    p_company_id
                )
            ) INTO has_approvers;
            
            IF NOT has_approvers THEN
                RETURN QUERY SELECT 
                    processo_record.id,
                    processo_status::TEXT,
                    0,
                    false,
                    'Nenhum aprovador encontrado para os critérios desta cotação'::TEXT;
                CONTINUE;
            END IF;
            
            BEGIN
                PERFORM public.create_approvals_for_process(
                    'cotacao_compra',
                    processo_record.id,
                    p_company_id
                );
                
                SELECT COUNT(*) INTO approvals_created
                FROM public.aprovacoes_unificada
                WHERE processo_tipo = 'cotacao_compra'
                AND processo_id = processo_record.id
                AND company_id = p_company_id;
                
                total_created := total_created + approvals_created;
                
                RETURN QUERY SELECT 
                    processo_record.id,
                    processo_status::TEXT,
                    approvals_created,
                    true,
                    format('Aprovações criadas com sucesso: %s', approvals_created)::TEXT;
                    
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT 
                    processo_record.id,
                    processo_status::TEXT,
                    0,
                    false,
                    format('Erro: %s', SQLERRM)::TEXT;
            END;
        END LOOP;
    ELSE
        RAISE NOTICE 'Tipo de processo não suportado para aprovações retroativas: %', p_processo_tipo;
    END IF;
    
    RAISE NOTICE 'Processados % processos. Total de aprovações criadas: %', processo_count, total_created;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.create_retroactive_approvals(varchar, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_retroactive_approvals(varchar, uuid, integer) TO service_role;

-- Comentário na função
COMMENT ON FUNCTION public.create_retroactive_approvals IS 
'Cria aprovações retroativas de forma segura apenas para processos que:
1. Não têm aprovações existentes
2. Estão em estados que permitem aprovação (pendente, em_aprovacao, rascunho, etc)
3. Têm regras de aprovação configuradas e ativas
4. Atendem aos critérios das regras (valor, centro de custo, departamento, etc)

Retorna relatório detalhado do processo com status de cada processo processado.
Recomendado executar em lotes pequenos (50-100 processos por vez) para evitar sobrecarga.';
