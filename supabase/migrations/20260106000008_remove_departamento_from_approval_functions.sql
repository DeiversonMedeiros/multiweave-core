-- =====================================================
-- MIGRATION: Remover campo departamento das funções de aprovação
-- =====================================================
-- Data: 2026-01-06
-- Descrição: Remove referências ao campo "departamento" das funções de aprovação
-- Autor: Sistema MultiWeave Core
-- =====================================================

-- 1. Atualizar função get_required_approval_level
-- =====================================================
CREATE OR REPLACE FUNCTION financeiro.get_required_approval_level(
    p_company_id UUID,
    p_valor DECIMAL(15,2),
    p_centro_custo_id UUID,
    p_classe_financeira VARCHAR(100)
) RETURNS INTEGER AS $$
DECLARE
    max_level INTEGER := 0;
BEGIN
    SELECT COALESCE(MAX(nivel_aprovacao), 0) INTO max_level
    FROM financeiro.configuracoes_aprovacao
    WHERE company_id = p_company_id
    AND tipo_aprovacao = 'conta_pagar'
    AND valor_limite >= p_valor
    AND (centro_custo_id IS NULL OR centro_custo_id = p_centro_custo_id)
    AND (classe_financeira IS NULL OR classe_financeira = p_classe_financeira)
    AND is_active = true;
    
    RETURN max_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar função create_approvals_trigger
-- =====================================================
CREATE OR REPLACE FUNCTION financeiro.create_approvals_trigger()
RETURNS TRIGGER AS $$
DECLARE
    required_level INTEGER;
    current_level INTEGER := 1;
    approver_id UUID;
BEGIN
    -- Obter nível de aprovação necessário
    SELECT financeiro.get_required_approval_level(
        NEW.company_id,
        NEW.valor_original,
        NEW.centro_custo_id,
        NEW.classe_financeira
    ) INTO required_level;
    
    -- Criar aprovações para cada nível
    WHILE current_level <= required_level LOOP
        -- Buscar aprovador para o nível atual
        SELECT ca.usuario_id INTO approver_id
        FROM financeiro.configuracoes_aprovacao ca
        WHERE ca.company_id = NEW.company_id
        AND ca.tipo_aprovacao = 'conta_pagar'
        AND ca.nivel_aprovacao = current_level
        AND ca.valor_limite >= NEW.valor_original
        AND (ca.centro_custo_id IS NULL OR ca.centro_custo_id = NEW.centro_custo_id)
        AND (ca.classe_financeira IS NULL OR ca.classe_financeira = NEW.classe_financeira)
        AND ca.is_active = true
        LIMIT 1;
        
        -- Se encontrou aprovador, criar aprovação
        IF approver_id IS NOT NULL THEN
            INSERT INTO financeiro.aprovacoes (
                company_id,
                entidade_tipo,
                entidade_id,
                nivel_aprovacao,
                aprovador_id,
                status
            ) VALUES (
                NEW.company_id,
                'conta_pagar',
                NEW.id,
                current_level,
                approver_id,
                'pendente'
            );
        END IF;
        
        current_level := current_level + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar função get_required_approvers (sistema unificado)
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
    FOR config_record IN
        SELECT * FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
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

COMMENT ON FUNCTION financeiro.get_required_approval_level(UUID, DECIMAL, UUID, VARCHAR) IS 'Determina o nível de aprovação necessário para uma conta a pagar. Atualizada em 2026-01-06 para remover campo departamento.';
COMMENT ON FUNCTION financeiro.create_approvals_trigger() IS 'Trigger para criar aprovações automáticas. Atualizada em 2026-01-06 para remover campo departamento.';
COMMENT ON FUNCTION public.get_required_approvers(VARCHAR, UUID, UUID) IS 'Determina aprovadores necessários para um processo. Atualizada em 2026-01-06 para remover campo departamento.';

