-- =====================================================
-- ADICIONAR CAMPOS ANEXO_BOLETO E ANEXO_NOTA_FISCAL À FUNÇÃO RPC
-- =====================================================
-- Data: 2026-01-04
-- Descrição: Adiciona campos anexo_boleto e anexo_nota_fiscal à função list_contas_pagar_with_approval_status
-- Autor: Sistema MultiWeave Core
-- =====================================================

-- Remover a função existente antes de recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS public.list_contas_pagar_with_approval_status(UUID);

CREATE FUNCTION public.list_contas_pagar_with_approval_status(
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
    anexo_boleto TEXT,
    anexo_nota_fiscal TEXT,
    numero_nota_fiscal VARCHAR(50),
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
    approval_status VARCHAR(50),
    total_aprovacoes INTEGER,
    aprovacoes_pendentes INTEGER,
    aprovacoes_aprovadas INTEGER,
    aprovacoes_rejeitadas INTEGER,
    nivel_atual_aprovacao INTEGER,
    proximo_aprovador_id UUID,
    -- Campos de parcelamento
    is_parcelada BOOLEAN,
    numero_parcelas INTEGER,
    intervalo_parcelas VARCHAR(20),
    -- Campos de urgência
    is_urgente BOOLEAN,
    motivo_urgencia TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, financeiro
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
        cp.anexo_boleto,
        cp.anexo_nota_fiscal,
        cp.numero_nota_fiscal,
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
        -- Status de aprovação agregado
        COALESCE(
            CASE 
                WHEN COUNT(DISTINCT a.id) = 0 THEN 'sem_aprovacao'
                WHEN COUNT(DISTINCT CASE WHEN a.status = 'rejeitado' THEN a.id END) > 0 THEN 'rejeitado'
                WHEN COUNT(DISTINCT CASE WHEN a.status = 'aprovado' THEN a.id END) = COUNT(DISTINCT a.id) 
                     AND COUNT(DISTINCT a.id) > 0 THEN 'aprovado'
                WHEN COUNT(DISTINCT CASE WHEN a.status = 'pendente' THEN a.id END) > 0 THEN 'em_aprovacao'
                ELSE 'pendente'
            END,
            'sem_aprovacao'
        )::VARCHAR(50) AS approval_status,
        COUNT(DISTINCT a.id)::INTEGER AS total_aprovacoes,
        COUNT(DISTINCT CASE WHEN a.status = 'pendente' THEN a.id END)::INTEGER AS aprovacoes_pendentes,
        COUNT(DISTINCT CASE WHEN a.status = 'aprovado' THEN a.id END)::INTEGER AS aprovacoes_aprovadas,
        COUNT(DISTINCT CASE WHEN a.status = 'rejeitado' THEN a.id END)::INTEGER AS aprovacoes_rejeitadas,
        COALESCE(MIN(CASE WHEN a.status = 'pendente' THEN a.nivel_aprovacao END), 0)::INTEGER AS nivel_atual_aprovacao,
        (
            SELECT a2.aprovador_id 
            FROM public.aprovacoes_unificada a2 
            WHERE a2.processo_id = cp.id 
            AND a2.processo_tipo = 'conta_pagar'
            AND a2.status = 'pendente'
            AND a2.nivel_aprovacao = COALESCE(MIN(CASE WHEN a.status = 'pendente' THEN a.nivel_aprovacao END), 0)
            ORDER BY a2.nivel_aprovacao ASC, a2.created_at ASC
            LIMIT 1
        ) AS proximo_aprovador_id,
        -- Campos de parcelamento
        cp.is_parcelada,
        cp.numero_parcelas,
        cp.intervalo_parcelas,
        -- Campos de urgência
        cp.is_urgente,
        cp.motivo_urgencia
    FROM financeiro.contas_pagar cp
    LEFT JOIN public.aprovacoes_unificada a 
        ON a.processo_id = cp.id 
        AND a.processo_tipo = 'conta_pagar'
        AND a.company_id = cp.company_id
    WHERE cp.company_id = p_company_id
    AND cp.is_active = true
    GROUP BY 
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
        cp.anexo_boleto,
        cp.anexo_nota_fiscal,
        cp.numero_nota_fiscal,
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
        cp.is_parcelada,
        cp.numero_parcelas,
        cp.intervalo_parcelas,
        cp.is_urgente,
        cp.motivo_urgencia
    ORDER BY cp.data_vencimento ASC, cp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_contas_pagar_with_approval_status(UUID) IS 'Lista contas a pagar com status de aprovação agregado, campos de parcelamento/urgência e anexos (boleto e nota fiscal). Atualizada em 2026-01-04 para incluir anexo_boleto e anexo_nota_fiscal.';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.list_contas_pagar_with_approval_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_contas_pagar_with_approval_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_contas_pagar_with_approval_status(UUID) TO anon;

