-- =====================================================
-- MIGRATION: Atualizar funções de aprovação para usar cotacao_ciclos
-- Data: 2025-01-31
-- Descrição: Atualiza as funções de aprovação para buscar dados de cotacao_ciclos
--            ao invés de cotacoes (tabela legada), e calcular o valor total
--            a partir dos itens vencedores
-- =====================================================

-- 1. Atualizar get_required_approvers para buscar de cotacao_ciclos
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
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            -- Buscar de cotacao_ciclos e calcular valor total dos itens vencedores
            -- IMPORTANTE: Frete e imposto são por fornecedor, não por item
            SELECT 
                cc.centro_custo_id,
                COALESCE(
                    (
                        -- Subtotal dos itens vencedores (sem frete/imposto)
                        SELECT SUM(
                            (cif.quantidade_ofertada * cif.valor_unitario) 
                            - COALESCE(cif.desconto_valor, 0) 
                            - ((cif.quantidade_ofertada * cif.valor_unitario) * COALESCE(cif.desconto_percentual, 0) / 100)
                        )
                        FROM compras.cotacao_item_fornecedor cif
                        INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
                        WHERE cf.cotacao_ciclo_id = p_processo_id
                        AND cif.is_vencedor = true
                        AND cif.company_id = p_company_id
                    ) +
                    -- Adicionar frete e imposto UMA VEZ por fornecedor vencedor
                    (
                        SELECT SUM(
                            COALESCE(cf.valor_frete, 0) + COALESCE(cf.valor_imposto, 0)
                        )
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
                ) as valor_total
            INTO processo_centro_custo_id, processo_valor
            FROM compras.cotacao_ciclos cc
            WHERE cc.id = p_processo_id AND cc.company_id = p_company_id;
            
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

-- 2. Atualizar process_approval para atualizar cotacao_ciclos
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_approval(
    p_aprovacao_id UUID,
    p_status VARCHAR(20), -- 'aprovado', 'rejeitado', 'cancelado'
    p_observacoes TEXT,
    p_aprovador_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approval_record RECORD;
    all_approved BOOLEAN := false;
    entity_company_id UUID;
BEGIN
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM public.aprovacoes_unificada
    WHERE id = p_aprovacao_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status da aprovação
    UPDATE public.aprovacoes_unificada
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = p_aprovacao_id;
    
    -- Se foi aprovado, verificar se todas as aprovações foram concluídas
    IF p_status = 'aprovado' THEN
        -- Verificar se todas as aprovações foram aprovadas
        SELECT NOT EXISTS(
            SELECT 1 FROM public.aprovacoes_unificada
            WHERE processo_tipo = approval_record.processo_tipo
            AND processo_id = approval_record.processo_id
            AND company_id = approval_record.company_id
            AND status = 'pendente'
        ) INTO all_approved;
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            -- Atualizar status da entidade baseado no tipo
            CASE approval_record.processo_tipo
                WHEN 'conta_pagar' THEN
                    UPDATE financeiro.contas_pagar
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'requisicao_compra' THEN
                    UPDATE compras.requisicoes_compra
                    SET status = 'aprovada',
                        data_aprovacao = NOW(),
                        aprovado_por = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'cotacao_compra' THEN
                    -- Atualizar cotacao_ciclos ao invés de cotacoes
                    UPDATE compras.cotacao_ciclos
                    SET status = 'aprovada',
                        workflow_state = 'aprovada',
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'solicitacao_saida_material' THEN
                    UPDATE public.solicitacoes_saida_materiais
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
                    
                WHEN 'solicitacao_transferencia_material' THEN
                    UPDATE almoxarifado.transferencias
                    SET status = 'aprovado',
                        data_aprovacao = NOW(),
                        aprovador_id = p_aprovador_id,
                        updated_at = NOW()
                    WHERE id = approval_record.processo_id;
            END CASE;
        END IF;
    END IF;
    
    -- Se foi rejeitado ou cancelado, atualizar status da entidade
    IF p_status IN ('rejeitado', 'cancelado') THEN
        CASE approval_record.processo_tipo
            WHEN 'conta_pagar' THEN
                UPDATE financeiro.contas_pagar
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'requisicao_compra' THEN
                UPDATE compras.requisicoes_compra
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'rejeitada'
                    ELSE 'cancelada'
                END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'cotacao_compra' THEN
                -- Atualizar cotacao_ciclos
                UPDATE compras.cotacao_ciclos
                SET status = CASE 
                    WHEN p_status = 'rejeitado' THEN 'reprovada'
                    ELSE 'cancelada'
                END,
                    workflow_state = CASE 
                    WHEN p_status = 'rejeitado' THEN 'reprovada'
                    ELSE 'cancelada'
                END,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'solicitacao_saida_material' THEN
                UPDATE public.solicitacoes_saida_materiais
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
                
            WHEN 'solicitacao_transferencia_material' THEN
                UPDATE almoxarifado.transferencias
                SET status = p_status,
                    updated_at = NOW()
                WHERE id = approval_record.processo_id;
        END CASE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 3. Atualizar can_edit_solicitation para verificar cotacao_ciclos
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_edit_solicitation(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    entity_status VARCHAR(20);
BEGIN
    -- Verificar status da entidade baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT status INTO entity_status
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id;
            
        WHEN 'requisicao_compra' THEN
            SELECT status INTO entity_status
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id;
            
        WHEN 'cotacao_compra' THEN
            -- Buscar de cotacao_ciclos
            SELECT status INTO entity_status
            FROM compras.cotacao_ciclos
            WHERE id = p_processo_id;
            
        WHEN 'solicitacao_saida_material' THEN
            SELECT status INTO entity_status
            FROM public.solicitacoes_saida_materiais
            WHERE id = p_processo_id;
            
        WHEN 'solicitacao_transferencia_material' THEN
            SELECT status INTO entity_status
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id;
    END CASE;
    
    -- Retorna true se não estiver cancelado
    RETURN entity_status IS NOT NULL AND entity_status != 'cancelado';
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers IS 'Atualizado para usar cotacao_ciclos ao invés de cotacoes (tabela legada)';
COMMENT ON FUNCTION public.process_approval IS 'Atualizado para atualizar cotacao_ciclos ao invés de cotacoes';
COMMENT ON FUNCTION public.can_edit_solicitation IS 'Atualizado para verificar status em cotacao_ciclos';

