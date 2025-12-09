-- =====================================================
-- CORREÇÃO: Validar nivel_aprovacao antes de inserir
-- =====================================================
-- Data: 2025-12-09
-- Descrição: Adiciona validação para evitar inserir aprovações com nivel_aprovacao NULL
-- =====================================================

-- 1. Corrigir função get_required_approvers para garantir que nivel não seja NULL
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
        AND nivel_aprovacao IS NOT NULL  -- Garantir que nivel_aprovacao não seja NULL
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
            WHERE (aprovador->>'user_id')::UUID IS NOT NULL  -- Garantir que user_id não seja NULL
        LOOP
            -- Garantir que nivel_aprovacao não seja NULL antes de retornar
            IF config_record.nivel_aprovacao IS NOT NULL AND aprovador_record.user_id IS NOT NULL THEN
                nivel := config_record.nivel_aprovacao;
                aprovador_id := aprovador_record.user_id;
                is_primary := aprovador_record.is_primary;
                ordem := aprovador_record.ordem;
                RETURN NEXT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- 2. Corrigir função create_approvals_for_process para validar antes de inserir
CREATE OR REPLACE FUNCTION public.create_approvals_for_process(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    approver_record RECORD;
    approval_created BOOLEAN := false;
BEGIN
    -- Limpar aprovações existentes para este processo
    DELETE FROM public.aprovacoes_unificada 
    WHERE processo_tipo = p_processo_tipo 
    AND processo_id = p_processo_id 
    AND company_id = p_company_id;

    -- Criar novas aprovações baseadas nas configurações
    FOR approver_record IN
        SELECT * FROM public.get_required_approvers(p_processo_tipo, p_processo_id, p_company_id)
        WHERE nivel IS NOT NULL AND aprovador_id IS NOT NULL  -- Filtrar NULLs na query
        ORDER BY nivel, ordem
    LOOP
        -- Validação adicional (redundante mas segura)
        IF approver_record.nivel IS NOT NULL AND approver_record.aprovador_id IS NOT NULL THEN
            INSERT INTO public.aprovacoes_unificada (
                company_id,
                processo_tipo,
                processo_id,
                nivel_aprovacao,
                aprovador_id,
                aprovador_original_id,
                status
            ) VALUES (
                p_company_id,
                p_processo_tipo,
                p_processo_id,
                approver_record.nivel,
                approver_record.aprovador_id,
                approver_record.aprovador_id,
                'pendente'
            );
            
            approval_created := true;
        END IF;
    END LOOP;

    RETURN approval_created;
END;
$$;

COMMENT ON FUNCTION public.create_approvals_for_process IS 'Cria aprovações automáticas para um processo, validando que nivel_aprovacao e aprovador_id não sejam NULL';
COMMENT ON FUNCTION public.get_required_approvers IS 'Retorna aprovadores necessários, garantindo que nivel_aprovacao e aprovador_id não sejam NULL';

