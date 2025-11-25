-- =====================================================
-- MIGRAÇÃO: MIGRAR MÓDULO FINANCEIRO PARA SISTEMA DE APROVAÇÕES UNIFICADO
-- =====================================================
-- Data: 2025-11-11
-- Descrição: Remove sistema antigo de aprovações do financeiro e migra para sistema unificado
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. REMOVER TRIGGER E FUNÇÃO ANTIGA DE APROVAÇÕES
-- =====================================================

-- Remover trigger antigo que cria aprovações usando sistema antigo
DROP TRIGGER IF EXISTS trigger_create_contas_pagar_approvals ON financeiro.contas_pagar;

-- Remover função antiga que cria aprovações usando sistema antigo
DROP FUNCTION IF EXISTS financeiro.create_approvals_trigger();

-- Remover função antiga de atualização de status de aprovação
DROP FUNCTION IF EXISTS financeiro.update_approval_status(VARCHAR, UUID, UUID, VARCHAR, TEXT);

-- Remover função antiga que determina nível de aprovação necessário
DROP FUNCTION IF EXISTS financeiro.get_required_approval_level(UUID, DECIMAL, UUID, TEXT, TEXT);

-- =====================================================
-- 2. GARANTIR QUE O TRIGGER DO SISTEMA UNIFICADO ESTÁ ATIVO
-- =====================================================

-- Verificar se o trigger do sistema unificado existe, se não, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_create_approvals_contas_pagar'
    ) THEN
        CREATE TRIGGER trigger_create_approvals_contas_pagar
            AFTER INSERT ON financeiro.contas_pagar
            FOR EACH ROW
            EXECUTE FUNCTION public.create_approvals_on_insert();
    END IF;
END $$;

-- =====================================================
-- 3. ATUALIZAR FUNÇÃO RPC PARA USAR APENAS SISTEMA UNIFICADO
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_contas_pagar_with_approval_status(
    p_company_id UUID
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    numero_titulo VARCHAR(50),
    fornecedor_id UUID,
    fornecedor_nome VARCHAR(255),
    fornecedor_cnpj VARCHAR(18),
    descricao TEXT,
    valor_original DECIMAL(15,2),
    valor_atual DECIMAL(15,2),
    data_emissao DATE,
    data_vencimento DATE,
    data_pagamento DATE,
    centro_custo_id UUID,
    projeto_id UUID,
    departamento VARCHAR(100),
    classe_financeira VARCHAR(100),
    categoria VARCHAR(100),
    status VARCHAR(20),
    forma_pagamento VARCHAR(50),
    conta_bancaria_id UUID,
    observacoes TEXT,
    anexos TEXT[],
    valor_desconto DECIMAL(15,2),
    valor_juros DECIMAL(15,2),
    valor_multa DECIMAL(15,2),
    valor_pago DECIMAL(15,2),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    aprovado_por UUID,
    created_by UUID,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    -- Campos de status de aprovação agregado (apenas sistema unificado)
    approval_status VARCHAR(50), -- 'pendente', 'em_aprovacao', 'aprovado', 'rejeitado', 'sem_aprovacao'
    total_aprovacoes INTEGER,
    aprovacoes_pendentes INTEGER,
    aprovacoes_aprovadas INTEGER,
    aprovacoes_rejeitadas INTEGER,
    nivel_atual_aprovacao INTEGER,
    proximo_aprovador_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.company_id,
        cp.numero_titulo,
        cp.fornecedor_id,
        cp.fornecedor_nome,
        cp.fornecedor_cnpj,
        cp.descricao,
        cp.valor_original,
        cp.valor_atual,
        cp.data_emissao,
        cp.data_vencimento,
        cp.data_pagamento,
        cp.centro_custo_id,
        cp.projeto_id,
        cp.departamento,
        cp.classe_financeira,
        cp.categoria,
        cp.status,
        cp.forma_pagamento,
        cp.conta_bancaria_id,
        cp.observacoes,
        cp.anexos,
        cp.valor_desconto,
        cp.valor_juros,
        cp.valor_multa,
        cp.valor_pago,
        cp.data_aprovacao,
        cp.aprovado_por,
        cp.created_by,
        cp.is_active,
        cp.created_at,
        cp.updated_at,
        -- Calcular status de aprovação agregado (apenas sistema unificado)
        CASE 
            -- Verificar se há aprovações rejeitadas
            WHEN EXISTS (
                SELECT 1 FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status = 'rejeitado'
            ) THEN 'rejeitado'::VARCHAR(50)
            -- Verificar se todas as aprovações foram aprovadas
            WHEN NOT EXISTS (
                SELECT 1 FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status IN ('pendente', 'rejeitado')
            ) AND EXISTS (
                SELECT 1 FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status = 'aprovado'
            ) THEN 'aprovado'::VARCHAR(50)
            -- Verificar se há aprovações pendentes
            WHEN EXISTS (
                SELECT 1 FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status = 'pendente'
            ) THEN 'em_aprovacao'::VARCHAR(50)
            -- Se não há aprovações configuradas
            ELSE 'sem_aprovacao'::VARCHAR(50)
        END AS approval_status,
        -- Contar total de aprovações (sistema unificado)
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER
                FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
            ),
            0
        ) AS total_aprovacoes,
        -- Contar aprovações pendentes (sistema unificado)
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER
                FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status = 'pendente'
            ),
            0
        ) AS aprovacoes_pendentes,
        -- Contar aprovações aprovadas (sistema unificado)
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER
                FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status = 'aprovado'
            ),
            0
        ) AS aprovacoes_aprovadas,
        -- Contar aprovações rejeitadas (sistema unificado)
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER
                FROM public.aprovacoes_unificada au
                WHERE au.processo_tipo = 'conta_pagar'
                AND au.processo_id = cp.id
                AND au.status = 'rejeitado'
            ),
            0
        ) AS aprovacoes_rejeitadas,
        -- Nível atual de aprovação (menor nível pendente, sistema unificado)
        (
            SELECT MIN(au.nivel_aprovacao)::INTEGER
            FROM public.aprovacoes_unificada au
            WHERE au.processo_tipo = 'conta_pagar'
            AND au.processo_id = cp.id
            AND au.status = 'pendente'
        ) AS nivel_atual_aprovacao,
        -- Próximo aprovador (primeiro aprovador pendente, sistema unificado)
        (
            SELECT au.aprovador_id
            FROM public.aprovacoes_unificada au
            WHERE au.processo_tipo = 'conta_pagar'
            AND au.processo_id = cp.id
            AND au.status = 'pendente'
            ORDER BY au.nivel_aprovacao ASC, au.created_at ASC
            LIMIT 1
        ) AS proximo_aprovador_id
    FROM financeiro.contas_pagar cp
    WHERE cp.company_id = p_company_id
    AND cp.is_active = true
    ORDER BY cp.data_vencimento ASC, cp.created_at DESC;
END;
$$;

-- Comentários
COMMENT ON FUNCTION public.list_contas_pagar_with_approval_status IS 'Lista contas a pagar com status de aprovação agregado usando APENAS o sistema unificado (public.aprovacoes_unificada)';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.list_contas_pagar_with_approval_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_contas_pagar_with_approval_status(UUID) TO service_role;

-- =====================================================
-- 4. COMENTÁRIOS DE DEPRECATION NAS TABELAS ANTIGAS
-- =====================================================

COMMENT ON TABLE financeiro.configuracoes_aprovacao IS '[DEPRECATED] Use public.configuracoes_aprovacao_unificada. Esta tabela não deve ser mais usada para novos processos.';
COMMENT ON TABLE financeiro.aprovacoes IS '[DEPRECATED] Use public.aprovacoes_unificada. Esta tabela não deve ser mais usada para novos processos.';

-- =====================================================
-- 5. NOTA IMPORTANTE
-- =====================================================
-- As tabelas financeiro.configuracoes_aprovacao e financeiro.aprovacoes
-- não foram removidas para manter compatibilidade com dados históricos.
-- No entanto, o sistema agora usa APENAS o sistema unificado para novos processos.
-- 
-- Para migrar dados existentes (se necessário):
-- 1. Verificar se há aprovações pendentes no sistema antigo
-- 2. Migrar configurações de financeiro.configuracoes_aprovacao para public.configuracoes_aprovacao_unificada
-- 3. Migrar aprovações de financeiro.aprovacoes para public.aprovacoes_unificada
-- 4. Após migração completa, as tabelas antigas podem ser removidas

