-- =====================================================
-- FUNCIONALIDADE: ESTORNO DE CONTAS A PAGAR
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Adiciona funcionalidade de estorno para contas a pagar pagas
-- Autor: Sistema MultiWeave Core
--
-- Esta migração:
-- 1. Adiciona 'estornado' ao constraint de status de contas_pagar
-- 2. Adiciona 'estornado' ao constraint de status de contas_pagar_parcelas
-- 3. Cria função para estornar conta a pagar e criar lançamento contábil de crédito
-- =====================================================

-- 1. ATUALIZAR CONSTRAINT DE STATUS EM CONTAS_PAGAR
-- =====================================================
-- Remove o constraint antigo e adiciona um novo incluindo 'estornado'
ALTER TABLE financeiro.contas_pagar
DROP CONSTRAINT IF EXISTS contas_pagar_status_check;

ALTER TABLE financeiro.contas_pagar
ADD CONSTRAINT contas_pagar_status_check 
CHECK (status IN ('pendente', 'aprovado', 'pago', 'vencido', 'cancelado', 'estornado'));

-- 2. ATUALIZAR CONSTRAINT DE STATUS EM CONTAS_PAGAR_PARCELAS
-- =====================================================
-- Remove o constraint antigo e adiciona um novo incluindo 'estornado'
ALTER TABLE financeiro.contas_pagar_parcelas
DROP CONSTRAINT IF EXISTS contas_pagar_parcelas_status_check;

ALTER TABLE financeiro.contas_pagar_parcelas
ADD CONSTRAINT contas_pagar_parcelas_status_check 
CHECK (status IN ('pendente', 'aprovado', 'pago', 'vencido', 'cancelado', 'estornado'));

-- 3. FUNÇÃO PARA ESTORNAR CONTA A PAGAR
-- =====================================================
-- Estorna uma conta a pagar paga, mudando o status para 'estornado'
-- e criando um lançamento contábil de crédito
CREATE OR REPLACE FUNCTION financeiro.estornar_conta_pagar(
    p_conta_pagar_id UUID,
    p_company_id UUID,
    p_estornado_por UUID,
    p_observacoes TEXT DEFAULT NULL,
    p_data_estorno DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conta financeiro.contas_pagar%ROWTYPE;
    v_valor_estornado DECIMAL(15,2);
    v_conta_credito_id UUID;
    v_conta_debito_id UUID;
    v_lancamento_id UUID;
    v_result JSONB;
BEGIN
    -- Verificar se a conta existe e pertence à empresa
    SELECT * INTO v_conta
    FROM financeiro.contas_pagar 
    WHERE id = p_conta_pagar_id 
    AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta a pagar não encontrada ou não pertence à empresa';
    END IF;
    
    -- Verificar se a conta está paga (permite estornar apenas contas pagas)
    IF v_conta.status != 'pago' THEN
        RAISE EXCEPTION 'Apenas contas com status "pago" podem ser estornadas. Status atual: %', v_conta.status;
    END IF;
    
    -- Verificar se já foi estornada
    IF v_conta.status = 'estornado' THEN
        RAISE EXCEPTION 'Esta conta já foi estornada';
    END IF;
    
    -- Calcular valor a estornar (valor pago)
    v_valor_estornado := COALESCE(v_conta.valor_pago, v_conta.valor_atual, 0);
    
    IF v_valor_estornado <= 0 THEN
        RAISE EXCEPTION 'Não é possível estornar uma conta com valor zero ou negativo';
    END IF;
    
    -- Buscar conta contábil de crédito padrão para estorno
    -- Tenta buscar uma conta de "Receitas Diversas" ou "Outras Receitas" ou "Estornos"
    -- Se não encontrar, usa a primeira conta de receita disponível
    SELECT id INTO v_conta_credito_id
    FROM financeiro.plano_contas
    WHERE company_id = p_company_id
    AND tipo_conta = 'receita'
    AND (
        LOWER(descricao) LIKE '%estorno%' 
        OR LOWER(descricao) LIKE '%receita diversa%'
        OR LOWER(descricao) LIKE '%outras receitas%'
        OR codigo LIKE '7%' -- Contas de receita geralmente começam com 7
    )
    AND is_active = true
    ORDER BY 
        CASE 
            WHEN LOWER(descricao) LIKE '%estorno%' THEN 1
            WHEN LOWER(descricao) LIKE '%receita diversa%' THEN 2
            WHEN LOWER(descricao) LIKE '%outras receitas%' THEN 3
            ELSE 4
        END,
        codigo
    LIMIT 1;
    
    -- Se não encontrou conta específica, busca qualquer conta de receita
    IF v_conta_credito_id IS NULL THEN
        SELECT id INTO v_conta_credito_id
        FROM financeiro.plano_contas
        WHERE company_id = p_company_id
        AND tipo_conta = 'receita'
        AND is_active = true
        ORDER BY codigo
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, busca conta de ativo (caixa/banco)
    IF v_conta_credito_id IS NULL THEN
        SELECT id INTO v_conta_credito_id
        FROM financeiro.plano_contas
        WHERE company_id = p_company_id
        AND tipo_conta = 'ativo'
        AND (
            LOWER(descricao) LIKE '%caixa%'
            OR LOWER(descricao) LIKE '%banco%'
            OR codigo LIKE '1.1%' -- Contas de caixa/banco geralmente começam com 1.1
        )
        AND is_active = true
        ORDER BY codigo
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, usa a primeira conta ativa disponível
    IF v_conta_credito_id IS NULL THEN
        SELECT id INTO v_conta_credito_id
        FROM financeiro.plano_contas
        WHERE company_id = p_company_id
        AND is_active = true
        ORDER BY codigo
        LIMIT 1;
    END IF;
    
    IF v_conta_credito_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível encontrar uma conta contábil para o crédito. Configure o plano de contas primeiro.';
    END IF;
    
    -- Buscar conta contábil de débito (conta de despesa original ou conta de fornecedor)
    -- Tenta buscar uma conta de despesa relacionada à classe financeira
    IF v_conta.classe_financeira IS NOT NULL THEN
        SELECT pc.id INTO v_conta_debito_id
        FROM financeiro.plano_contas pc
        WHERE pc.company_id = p_company_id
        AND pc.tipo_conta = 'despesa'
        AND (
            LOWER(pc.descricao) LIKE '%' || LOWER(v_conta.classe_financeira) || '%'
            OR LOWER(pc.codigo) LIKE '%' || LOWER(v_conta.classe_financeira) || '%'
        )
        AND pc.is_active = true
        ORDER BY pc.codigo
        LIMIT 1;
    END IF;
    
    -- Se não encontrou, busca qualquer conta de despesa
    IF v_conta_debito_id IS NULL THEN
        SELECT id INTO v_conta_debito_id
        FROM financeiro.plano_contas
        WHERE company_id = p_company_id
        AND tipo_conta = 'despesa'
        AND is_active = true
        ORDER BY codigo
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, usa a primeira conta ativa disponível
    IF v_conta_debito_id IS NULL THEN
        SELECT id INTO v_conta_debito_id
        FROM financeiro.plano_contas
        WHERE company_id = p_company_id
        AND is_active = true
        ORDER BY codigo
        LIMIT 1;
    END IF;
    
    IF v_conta_debito_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível encontrar uma conta contábil para o débito. Configure o plano de contas primeiro.';
    END IF;
    
    -- Atualizar status da conta para 'estornado'
    UPDATE financeiro.contas_pagar
    SET status = 'estornado',
        observacoes = COALESCE(
            observacoes || E'\n\n--- Estorno em ' || TO_CHAR(p_data_estorno, 'DD/MM/YYYY') || ' ---\n' || COALESCE(p_observacoes, 'Conta estornada - valor devolvido ao fornecedor'),
            '--- Estorno em ' || TO_CHAR(p_data_estorno, 'DD/MM/YYYY') || ' ---\n' || COALESCE(p_observacoes, 'Conta estornada - valor devolvido ao fornecedor')
        ),
        updated_at = NOW()
    WHERE id = p_conta_pagar_id
    AND company_id = p_company_id;
    
    -- Se a conta for parcelada, estornar todas as parcelas pagas
    IF v_conta.is_parcelada THEN
        UPDATE financeiro.contas_pagar_parcelas
        SET status = 'estornado',
            observacoes = COALESCE(
                observacoes || E'\n\n--- Estorno em ' || TO_CHAR(p_data_estorno, 'DD/MM/YYYY') || ' ---\n' || COALESCE(p_observacoes, 'Parcela estornada'),
                '--- Estorno em ' || TO_CHAR(p_data_estorno, 'DD/MM/YYYY') || ' ---\n' || COALESCE(p_observacoes, 'Parcela estornada')
            ),
            updated_at = NOW()
        WHERE conta_pagar_id = p_conta_pagar_id
        AND company_id = p_company_id
        AND status = 'pago';
    END IF;
    
    -- Criar lançamento contábil de crédito (estorno)
    -- DÉBITO: Conta de despesa (reduz a despesa)
    -- CRÉDITO: Conta de receita/caixa (aumenta o crédito)
    INSERT INTO financeiro.lancamentos_contabeis (
        id,
        company_id,
        data_lancamento,
        conta_debito_id,
        conta_credito_id,
        valor,
        historico,
        documento,
        centro_custo_id,
        projeto_id,
        tipo_lancamento,
        origem_id,
        origem_tipo,
        created_by,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_company_id,
        p_data_estorno,
        v_conta_debito_id,
        v_conta_credito_id,
        v_valor_estornado,
        'Estorno de conta a pagar - ' || v_conta.numero_titulo || ' - ' || COALESCE(v_conta.descricao, 'Sem descrição') || COALESCE(' - ' || p_observacoes, ''),
        v_conta.numero_titulo || '-EST',
        v_conta.centro_custo_id,
        v_conta.projeto_id,
        'automatico',
        p_conta_pagar_id,
        'conta_pagar_estorno',
        p_estornado_por,
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO v_lancamento_id;
    
    -- Retornar resultado
    v_result := jsonb_build_object(
        'success', true,
        'conta_pagar_id', p_conta_pagar_id,
        'lancamento_id', v_lancamento_id,
        'valor_estornado', v_valor_estornado,
        'conta_debito_id', v_conta_debito_id,
        'conta_credito_id', v_conta_credito_id,
        'data_estorno', p_data_estorno
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, fazer rollback e retornar erro
        RAISE EXCEPTION 'Erro ao estornar conta a pagar: %', SQLERRM;
END;
$$;

-- Comentários
COMMENT ON FUNCTION financeiro.estornar_conta_pagar IS 'Estorna uma conta a pagar paga, mudando o status para estornado e criando um lançamento contábil de crédito';

-- Garantir permissões
GRANT EXECUTE ON FUNCTION financeiro.estornar_conta_pagar TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.estornar_conta_pagar TO service_role;
