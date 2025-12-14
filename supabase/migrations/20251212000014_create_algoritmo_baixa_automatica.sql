-- =====================================================
-- MIGRAÇÃO: ALGORITMO DE BAIXA AUTOMÁTICA
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Implementa algoritmo de baixa automática para conciliação bancária
--            vinculando movimentações a títulos a pagar/receber
-- Autor: Sistema MultiWeave Core
-- Módulo: M4 - Conciliação Bancária

-- =====================================================
-- 1. FUNÇÃO: ALGORITMO DE BAIXA AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.conciliar_movimentacoes_automatico(
    p_conta_bancaria_id UUID,
    p_company_id UUID,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_tolerancia_dias INTEGER DEFAULT 5, -- Tolerância de dias para matching de data
    p_tolerancia_valor DECIMAL(15,2) DEFAULT 0.01 -- Tolerância de valor (R$ 0,01)
)
RETURNS TABLE (
    movimentacao_id UUID,
    tipo_conciliacao VARCHAR(50),
    titulo_id UUID,
    titulo_tipo VARCHAR(20),
    valor_conciliado DECIMAL(15,2),
    diferenca DECIMAL(15,2),
    motivo TEXT,
    status VARCHAR(20)
) AS $$
DECLARE
    v_movimentacao RECORD;
    v_titulo RECORD;
    v_retencoes DECIMAL(15,2);
    v_valor_liquido DECIMAL(15,2);
    v_diferenca DECIMAL(15,2);
    v_tipo_conciliacao VARCHAR(50);
    v_motivo TEXT;
    v_conciliacao_id UUID;
BEGIN
    -- Processar cada movimentação pendente
    FOR v_movimentacao IN 
        SELECT * FROM financeiro.movimentacoes_bancarias
        WHERE conta_bancaria_id = p_conta_bancaria_id
        AND company_id = p_company_id
        AND status_conciliacao = 'pendente'
        AND (p_data_inicio IS NULL OR data_movimento >= p_data_inicio)
        AND (p_data_fim IS NULL OR data_movimento <= p_data_fim)
        ORDER BY data_movimento, valor
    LOOP
        -- ============================================
        -- ESTRATÉGIA 1: MATCHING POR VALOR EXATO
        -- ============================================
        IF v_movimentacao.tipo_movimento = 'debito' THEN
            -- Buscar título a pagar com valor exato (considerando retenções)
            FOR v_titulo IN
                SELECT 
                    cp.id,
                    cp.numero_titulo,
                    cp.valor_atual,
                    cp.data_vencimento,
                    cp.status,
                    COALESCE(SUM(rf.valor_retencao), 0) as total_retencoes
                FROM financeiro.contas_pagar cp
                LEFT JOIN financeiro.retencoes_fonte rf ON rf.conta_pagar_id = cp.id AND rf.status != 'cancelado'
                WHERE cp.company_id = p_company_id
                AND cp.status IN ('aprovado', 'pendente')
                AND cp.conta_bancaria_id = p_conta_bancaria_id
                AND ABS(cp.valor_atual - COALESCE(SUM(rf.valor_retencao), 0) - v_movimentacao.valor) <= p_tolerancia_valor
                AND ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - cp.data_vencimento))) <= p_tolerancia_dias
                AND NOT EXISTS (
                    SELECT 1 FROM financeiro.conciliacoes_movimentacoes cm
                    WHERE cm.conta_pagar_id = cp.id
                    AND cm.status = 'conciliada'
                )
                GROUP BY cp.id, cp.numero_titulo, cp.valor_atual, cp.data_vencimento, cp.status
                ORDER BY ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - cp.data_vencimento)))
                LIMIT 1
            LOOP
                v_valor_liquido := v_titulo.valor_atual - v_titulo.total_retencoes;
                v_diferenca := ABS(v_movimentacao.valor - v_valor_liquido);
                
                IF v_diferenca <= p_tolerancia_valor THEN
                    v_tipo_conciliacao := 'valor_exato';
                    v_motivo := 'Valor exato encontrado';
                    
                    -- Criar conciliação
                    INSERT INTO financeiro.conciliacoes_movimentacoes (
                        company_id,
                        movimentacao_id,
                        conta_pagar_id,
                        tipo_conciliacao,
                        valor_conciliado,
                        valor_diferenca,
                        motivo_diferenca,
                        status
                    ) VALUES (
                        p_company_id,
                        v_movimentacao.id,
                        v_titulo.id,
                        v_tipo_conciliacao,
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'conciliada'
                    ) RETURNING id INTO v_conciliacao_id;
                    
                    -- Atualizar movimentação
                    UPDATE financeiro.movimentacoes_bancarias
                    SET 
                        conta_pagar_id = v_titulo.id,
                        status_conciliacao = 'conciliada',
                        valor_esperado = v_valor_liquido,
                        diferenca_valor = v_diferenca,
                        motivo_diferenca = v_motivo,
                        updated_at = NOW()
                    WHERE id = v_movimentacao.id;
                    
                    -- Atualizar status do título
                    UPDATE financeiro.contas_pagar
                    SET 
                        status = 'pago',
                        data_pagamento = v_movimentacao.data_movimento,
                        valor_pago = v_valor_liquido,
                        updated_at = NOW()
                    WHERE id = v_titulo.id;
                    
                    -- Retornar resultado
                    RETURN QUERY
                    SELECT 
                        v_movimentacao.id,
                        v_tipo_conciliacao,
                        v_titulo.id,
                        'conta_pagar'::VARCHAR(20),
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'conciliada'::VARCHAR(20);
                    
                    EXIT; -- Sair do loop interno
                END IF;
            END LOOP;
        END IF;
        
        -- Para créditos, buscar títulos a receber
        IF v_movimentacao.tipo_movimento = 'credito' THEN
            FOR v_titulo IN
                SELECT 
                    cr.id,
                    cr.numero_titulo,
                    cr.valor_atual,
                    cr.data_vencimento,
                    cr.status
                FROM financeiro.contas_receber cr
                WHERE cr.company_id = p_company_id
                AND cr.status IN ('confirmado', 'pendente')
                AND cr.conta_bancaria_id = p_conta_bancaria_id
                AND ABS(cr.valor_atual - v_movimentacao.valor) <= p_tolerancia_valor
                AND ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - cr.data_vencimento))) <= p_tolerancia_dias
                AND NOT EXISTS (
                    SELECT 1 FROM financeiro.conciliacoes_movimentacoes cm
                    WHERE cm.conta_receber_id = cr.id
                    AND cm.status = 'conciliada'
                )
                ORDER BY ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - cr.data_vencimento)))
                LIMIT 1
            LOOP
                v_diferenca := ABS(v_movimentacao.valor - v_titulo.valor_atual);
                
                IF v_diferenca <= p_tolerancia_valor THEN
                    v_tipo_conciliacao := 'valor_exato';
                    v_motivo := 'Valor exato encontrado';
                    
                    -- Criar conciliação
                    INSERT INTO financeiro.conciliacoes_movimentacoes (
                        company_id,
                        movimentacao_id,
                        conta_receber_id,
                        tipo_conciliacao,
                        valor_conciliado,
                        valor_diferenca,
                        motivo_diferenca,
                        status
                    ) VALUES (
                        p_company_id,
                        v_movimentacao.id,
                        v_titulo.id,
                        v_tipo_conciliacao,
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'conciliada'
                    );
                    
                    -- Atualizar movimentação
                    UPDATE financeiro.movimentacoes_bancarias
                    SET 
                        conta_receber_id = v_titulo.id,
                        status_conciliacao = 'conciliada',
                        valor_esperado = v_titulo.valor_atual,
                        diferenca_valor = v_diferenca,
                        motivo_diferenca = v_motivo,
                        updated_at = NOW()
                    WHERE id = v_movimentacao.id;
                    
                    -- Atualizar status do título
                    UPDATE financeiro.contas_receber
                    SET 
                        status = 'recebido',
                        data_recebimento = v_movimentacao.data_movimento,
                        valor_recebido = v_movimentacao.valor,
                        updated_at = NOW()
                    WHERE id = v_titulo.id;
                    
                    -- Retornar resultado
                    RETURN QUERY
                    SELECT 
                        v_movimentacao.id,
                        v_tipo_conciliacao,
                        v_titulo.id,
                        'conta_receber'::VARCHAR(20),
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'conciliada'::VARCHAR(20);
                    
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        -- ============================================
        -- ESTRATÉGIA 2: MATCHING COM LOTE DE PAGAMENTO
        -- ============================================
        IF v_movimentacao.tipo_movimento = 'debito' THEN
            FOR v_titulo IN
                SELECT 
                    lp.id as lote_id,
                    lp.valor_liquido,
                    lp.data_prevista_pagamento
                FROM financeiro.lotes_pagamento lp
                WHERE lp.company_id = p_company_id
                AND lp.conta_bancaria_id = p_conta_bancaria_id
                AND lp.status = 'enviado'
                AND ABS(lp.valor_liquido - v_movimentacao.valor) <= p_tolerancia_valor
                AND ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - lp.data_prevista_pagamento))) <= p_tolerancia_dias
                AND NOT EXISTS (
                    SELECT 1 FROM financeiro.conciliacoes_movimentacoes cm
                    WHERE cm.lote_pagamento_id = lp.id
                    AND cm.status = 'conciliada'
                )
                ORDER BY ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - lp.data_prevista_pagamento)))
                LIMIT 1
            LOOP
                v_diferenca := ABS(v_movimentacao.valor - v_titulo.valor_liquido);
                
                IF v_diferenca <= p_tolerancia_valor THEN
                    v_tipo_conciliacao := 'valor_lote';
                    v_motivo := 'Pagamento de lote identificado';
                    
                    -- Criar conciliação
                    INSERT INTO financeiro.conciliacoes_movimentacoes (
                        company_id,
                        movimentacao_id,
                        lote_pagamento_id,
                        tipo_conciliacao,
                        valor_conciliado,
                        valor_diferenca,
                        motivo_diferenca,
                        status
                    ) VALUES (
                        p_company_id,
                        v_movimentacao.id,
                        v_titulo.lote_id,
                        v_tipo_conciliacao,
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'conciliada'
                    );
                    
                    -- Atualizar movimentação
                    UPDATE financeiro.movimentacoes_bancarias
                    SET 
                        lote_pagamento_id = v_titulo.lote_id,
                        status_conciliacao = 'conciliada',
                        valor_esperado = v_titulo.valor_liquido,
                        diferenca_valor = v_diferenca,
                        motivo_diferenca = v_motivo,
                        updated_at = NOW()
                    WHERE id = v_movimentacao.id;
                    
                    -- Atualizar status do lote
                    UPDATE financeiro.lotes_pagamento
                    SET 
                        status = 'processado',
                        data_processamento = v_movimentacao.data_movimento,
                        updated_at = NOW()
                    WHERE id = v_titulo.lote_id;
                    
                    -- Marcar todos os itens do lote como pagos
                    UPDATE financeiro.lote_pagamento_itens
                    SET status_item = 'pago', updated_at = NOW()
                    WHERE lote_pagamento_id = v_titulo.lote_id
                    AND status_item = 'incluido';
                    
                    -- Atualizar status das contas a pagar do lote
                    UPDATE financeiro.contas_pagar cp
                    SET 
                        status = 'pago',
                        data_pagamento = v_movimentacao.data_movimento,
                        valor_pago = lpi.valor_liquido,
                        updated_at = NOW()
                    FROM financeiro.lote_pagamento_itens lpi
                    WHERE lpi.lote_pagamento_id = v_titulo.lote_id
                    AND lpi.conta_pagar_id = cp.id
                    AND lpi.status_item = 'pago';
                    
                    -- Retornar resultado
                    RETURN QUERY
                    SELECT 
                        v_movimentacao.id,
                        v_tipo_conciliacao,
                        v_titulo.lote_id,
                        'lote_pagamento'::VARCHAR(20),
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'conciliada'::VARCHAR(20);
                    
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        -- ============================================
        -- ESTRATÉGIA 3: MATCHING COM DIFERENÇA (RETENÇÕES/TARIFAS)
        -- ============================================
        -- Se não encontrou match exato, tentar com diferença atribuível a retenções
        IF v_movimentacao.tipo_movimento = 'debito' THEN
            FOR v_titulo IN
                SELECT 
                    cp.id,
                    cp.valor_atual,
                    cp.data_vencimento,
                    COALESCE(SUM(rf.valor_retencao), 0) as total_retencoes
                FROM financeiro.contas_pagar cp
                LEFT JOIN financeiro.retencoes_fonte rf ON rf.conta_pagar_id = cp.id AND rf.status != 'cancelado'
                WHERE cp.company_id = p_company_id
                AND cp.status IN ('aprovado', 'pendente')
                AND cp.conta_bancaria_id = p_conta_bancaria_id
                AND ABS(EXTRACT(DAY FROM (v_movimentacao.data_movimento - cp.data_vencimento))) <= p_tolerancia_dias
                AND NOT EXISTS (
                    SELECT 1 FROM financeiro.conciliacoes_movimentacoes cm
                    WHERE cm.conta_pagar_id = cp.id
                    AND cm.status = 'conciliada'
                )
                GROUP BY cp.id, cp.valor_atual, cp.data_vencimento
                HAVING ABS((cp.valor_atual - COALESCE(SUM(rf.valor_retencao), 0)) - v_movimentacao.valor) <= (cp.valor_atual * 0.1) -- Tolerância de 10%
                ORDER BY ABS((cp.valor_atual - COALESCE(SUM(rf.valor_retencao), 0)) - v_movimentacao.valor)
                LIMIT 1
            LOOP
                v_valor_liquido := v_titulo.valor_atual - v_titulo.total_retencoes;
                v_diferenca := ABS(v_movimentacao.valor - v_valor_liquido);
                
                -- Se diferença é pequena (até 10% do valor), considerar como match com diferença
                IF v_diferenca <= (v_titulo.valor_atual * 0.1) THEN
                    v_tipo_conciliacao := 'com_diferenca';
                    v_motivo := 'Diferença atribuível a retenções ou tarifas: R$ ' || v_diferenca::TEXT;
                    
                    -- Criar conciliação
                    INSERT INTO financeiro.conciliacoes_movimentacoes (
                        company_id,
                        movimentacao_id,
                        conta_pagar_id,
                        tipo_conciliacao,
                        valor_conciliado,
                        valor_diferenca,
                        motivo_diferenca,
                        status
                    ) VALUES (
                        p_company_id,
                        v_movimentacao.id,
                        v_titulo.id,
                        v_tipo_conciliacao,
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'pendente_validacao' -- Requer validação manual
                    );
                    
                    -- Atualizar movimentação
                    UPDATE financeiro.movimentacoes_bancarias
                    SET 
                        conta_pagar_id = v_titulo.id,
                        status_conciliacao = 'divergente',
                        valor_esperado = v_valor_liquido,
                        diferenca_valor = v_diferenca,
                        motivo_diferenca = v_motivo,
                        updated_at = NOW()
                    WHERE id = v_movimentacao.id;
                    
                    -- Criar pendência
                    INSERT INTO financeiro.conciliacoes_pendencias (
                        company_id,
                        movimentacao_id,
                        conta_pagar_id,
                        tipo_pendencia,
                        descricao,
                        valor_esperado,
                        valor_real,
                        diferenca,
                        status
                    ) VALUES (
                        p_company_id,
                        v_movimentacao.id,
                        v_titulo.id,
                        'divergencia_valor',
                        'Diferença de R$ ' || v_diferenca::TEXT || ' entre valor esperado e valor real',
                        v_valor_liquido,
                        v_movimentacao.valor,
                        v_diferenca,
                        'pendente'
                    );
                    
                    -- Retornar resultado
                    RETURN QUERY
                    SELECT 
                        v_movimentacao.id,
                        v_tipo_conciliacao,
                        v_titulo.id,
                        'conta_pagar'::VARCHAR(20),
                        v_movimentacao.valor,
                        v_diferenca,
                        v_motivo,
                        'pendente_validacao'::VARCHAR(20);
                    
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        -- Se não encontrou nenhum match, criar pendência
        INSERT INTO financeiro.conciliacoes_pendencias (
            company_id,
            movimentacao_id,
            tipo_pendencia,
            descricao,
            valor_real,
            status
        ) VALUES (
            p_company_id,
            v_movimentacao.id,
            'movimentacao_sem_titulo',
            'Movimentação de R$ ' || v_movimentacao.valor::TEXT || ' em ' || v_movimentacao.data_movimento::TEXT || ' sem título correspondente',
            v_movimentacao.valor,
            'pendente'
        );
        
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.conciliar_movimentacoes_automatico(UUID, UUID, DATE, DATE, INTEGER, DECIMAL) IS 
'Algoritmo de baixa automática que vincula movimentações bancárias a títulos a pagar/receber usando múltiplas estratégias de matching';

-- =====================================================
-- 2. FUNÇÃO: ATUALIZAR STATUS DE TÍTULOS APÓS CONCILIAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.atualizar_status_titulos_conciliados()
RETURNS TRIGGER AS $$
BEGIN
    -- Se conciliação foi aprovada, atualizar status dos títulos
    IF NEW.status = 'conciliada' AND OLD.status != 'conciliada' THEN
        -- Atualizar conta a pagar
        IF NEW.conta_pagar_id IS NOT NULL THEN
            UPDATE financeiro.contas_pagar
            SET 
                status = 'pago',
                data_pagamento = (SELECT data_movimento FROM financeiro.movimentacoes_bancarias WHERE id = NEW.movimentacao_id),
                valor_pago = NEW.valor_conciliado,
                updated_at = NOW()
            WHERE id = NEW.conta_pagar_id
            AND status != 'pago';
        END IF;
        
        -- Atualizar conta a receber
        IF NEW.conta_receber_id IS NOT NULL THEN
            UPDATE financeiro.contas_receber
            SET 
                status = 'recebido',
                data_recebimento = (SELECT data_movimento FROM financeiro.movimentacoes_bancarias WHERE id = NEW.movimentacao_id),
                valor_recebido = NEW.valor_conciliado,
                updated_at = NOW()
            WHERE id = NEW.conta_receber_id
            AND status != 'recebido';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_status_titulos_conciliados ON financeiro.conciliacoes_movimentacoes;
CREATE TRIGGER trigger_atualizar_status_titulos_conciliados
    AFTER UPDATE OF status ON financeiro.conciliacoes_movimentacoes
    FOR EACH ROW
    WHEN (NEW.status = 'conciliada' AND OLD.status != 'conciliada')
    EXECUTE FUNCTION financeiro.atualizar_status_titulos_conciliados();

COMMENT ON FUNCTION financeiro.atualizar_status_titulos_conciliados() IS 'Atualiza status de títulos automaticamente quando conciliação é aprovada';

