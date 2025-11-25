-- =====================================================
-- SISTEMA DE ALERTAS DE VENCIMENTO
-- Data: 2025-11-15
-- Descrição: Sistema de alertas para contas a pagar e receber próximas a vencer ou vencidas
-- Autor: Sistema MultiWeave Core
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO PARA CALCULAR STATUS DE VENCIMENTO
-- =====================================================

-- Função auxiliar para calcular dias até vencimento e tipo de alerta
CREATE OR REPLACE FUNCTION financeiro.calculate_due_date_status(
    p_data_vencimento DATE,
    p_status VARCHAR(20),
    p_data_pagamento DATE DEFAULT NULL,
    p_dias_alerta INTEGER DEFAULT 7
)
RETURNS TABLE(
    dias_ate_vencimento INTEGER,
    tipo_alerta VARCHAR(20),
    esta_vencida BOOLEAN,
    esta_proxima_vencer BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_dias_ate_vencimento INTEGER;
    v_tipo_alerta VARCHAR(20);
    v_esta_vencida BOOLEAN;
    v_esta_proxima_vencer BOOLEAN;
BEGIN
    -- Se já foi pago/recebido, não há alerta
    IF p_data_pagamento IS NOT NULL OR p_status IN ('pago', 'recebido', 'cancelado') THEN
        RETURN QUERY SELECT 
            NULL::INTEGER,
            'sem_alerta'::VARCHAR(20),
            false,
            false;
        RETURN;
    END IF;
    
    -- Calcular dias até vencimento
    v_dias_ate_vencimento := p_data_vencimento - CURRENT_DATE;
    
    -- Determinar se está vencida
    v_esta_vencida := v_dias_ate_vencimento < 0;
    
    -- Determinar se está próxima a vencer (dentro dos dias de alerta)
    v_esta_proxima_vencer := v_dias_ate_vencimento >= 0 AND v_dias_ate_vencimento <= p_dias_alerta;
    
    -- Determinar tipo de alerta
    IF v_esta_vencida THEN
        v_tipo_alerta := 'vencida';
    ELSIF v_esta_proxima_vencer THEN
        IF v_dias_ate_vencimento = 0 THEN
            v_tipo_alerta := 'vencendo_hoje';
        ELSIF v_dias_ate_vencimento <= 3 THEN
            v_tipo_alerta := 'vencendo_em_3_dias';
        ELSE
            v_tipo_alerta := 'vencendo_em_7_dias';
        END IF;
    ELSE
        v_tipo_alerta := 'sem_alerta';
    END IF;
    
    RETURN QUERY SELECT 
        v_dias_ate_vencimento,
        v_tipo_alerta,
        v_esta_vencida,
        v_esta_proxima_vencer;
END;
$$;

-- =====================================================
-- 2. FUNÇÃO RPC PARA ALERTAS DE CONTAS A PAGAR
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_contas_pagar_alerts(
    p_company_id UUID,
    p_dias_alerta INTEGER DEFAULT 7,
    p_include_paid BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    numero_titulo VARCHAR(50),
    fornecedor_nome VARCHAR(255),
    descricao TEXT,
    valor_atual DECIMAL(15,2),
    data_vencimento DATE,
    data_pagamento DATE,
    status VARCHAR(20),
    dias_ate_vencimento INTEGER,
    tipo_alerta VARCHAR(20),
    esta_vencida BOOLEAN,
    esta_proxima_vencer BOOLEAN,
    valor_pago DECIMAL(15,2),
    valor_restante DECIMAL(15,2)
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
        cp.fornecedor_nome,
        cp.descricao,
        cp.valor_atual,
        cp.data_vencimento,
        cp.data_pagamento,
        cp.status,
        alert.dias_ate_vencimento,
        alert.tipo_alerta,
        alert.esta_vencida,
        alert.esta_proxima_vencer,
        cp.valor_pago,
        (cp.valor_atual - COALESCE(cp.valor_pago, 0)) AS valor_restante
    FROM financeiro.contas_pagar cp
    CROSS JOIN LATERAL financeiro.calculate_due_date_status(
        cp.data_vencimento,
        cp.status,
        cp.data_pagamento,
        p_dias_alerta
    ) AS alert
    WHERE cp.company_id = p_company_id
        AND cp.is_active = true
        AND (p_include_paid = true OR cp.status NOT IN ('pago', 'cancelado'))
        AND alert.tipo_alerta != 'sem_alerta'
    ORDER BY 
        CASE alert.tipo_alerta
            WHEN 'vencida' THEN 1
            WHEN 'vencendo_hoje' THEN 2
            WHEN 'vencendo_em_3_dias' THEN 3
            WHEN 'vencendo_em_7_dias' THEN 4
            ELSE 5
        END,
        cp.data_vencimento ASC;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO RPC PARA ALERTAS DE CONTAS A RECEBER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_contas_receber_alerts(
    p_company_id UUID,
    p_dias_alerta INTEGER DEFAULT 7,
    p_include_received BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    numero_titulo VARCHAR(50),
    cliente_nome VARCHAR(255),
    descricao TEXT,
    valor_atual DECIMAL(15,2),
    data_vencimento DATE,
    data_recebimento DATE,
    status VARCHAR(20),
    dias_ate_vencimento INTEGER,
    tipo_alerta VARCHAR(20),
    esta_vencida BOOLEAN,
    esta_proxima_vencer BOOLEAN,
    valor_recebido DECIMAL(15,2),
    valor_restante DECIMAL(15,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, financeiro
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.company_id,
        cr.numero_titulo,
        cr.cliente_nome,
        cr.descricao,
        cr.valor_atual,
        cr.data_vencimento,
        cr.data_recebimento,
        cr.status,
        alert.dias_ate_vencimento,
        alert.tipo_alerta,
        alert.esta_vencida,
        alert.esta_proxima_vencer,
        cr.valor_recebido,
        (cr.valor_atual - COALESCE(cr.valor_recebido, 0)) AS valor_restante
    FROM financeiro.contas_receber cr
    CROSS JOIN LATERAL financeiro.calculate_due_date_status(
        cr.data_vencimento,
        cr.status,
        cr.data_recebimento,
        p_dias_alerta
    ) AS alert
    WHERE cr.company_id = p_company_id
        AND cr.is_active = true
        AND (p_include_received = true OR cr.status NOT IN ('recebido', 'cancelado'))
        AND alert.tipo_alerta != 'sem_alerta'
    ORDER BY 
        CASE alert.tipo_alerta
            WHEN 'vencida' THEN 1
            WHEN 'vencendo_hoje' THEN 2
            WHEN 'vencendo_em_3_dias' THEN 3
            WHEN 'vencendo_em_7_dias' THEN 4
            ELSE 5
        END,
        cr.data_vencimento ASC;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO RPC PARA RESUMO DE ALERTAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_financial_alerts_summary(
    p_company_id UUID,
    p_dias_alerta INTEGER DEFAULT 7
)
RETURNS TABLE(
    total_contas_pagar_vencidas INTEGER,
    total_contas_pagar_proximas_vencer INTEGER,
    total_contas_pagar_vencendo_hoje INTEGER,
    valor_total_contas_pagar_vencidas DECIMAL(15,2),
    valor_total_contas_pagar_proximas_vencer DECIMAL(15,2),
    total_contas_receber_vencidas INTEGER,
    total_contas_receber_proximas_vencer INTEGER,
    total_contas_receber_vencendo_hoje INTEGER,
    valor_total_contas_receber_vencidas DECIMAL(15,2),
    valor_total_contas_receber_proximas_vencer DECIMAL(15,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, financeiro
AS $$
BEGIN
    RETURN QUERY
    WITH contas_pagar_alerts AS (
        SELECT 
            alert.esta_vencida,
            alert.esta_proxima_vencer,
            alert.tipo_alerta,
            (cp.valor_atual - COALESCE(cp.valor_pago, 0)) AS valor_restante
        FROM financeiro.contas_pagar cp
        CROSS JOIN LATERAL financeiro.calculate_due_date_status(
            cp.data_vencimento,
            cp.status,
            cp.data_pagamento,
            p_dias_alerta
        ) AS alert
        WHERE cp.company_id = p_company_id
            AND cp.is_active = true
            AND cp.status NOT IN ('pago', 'cancelado')
            AND alert.tipo_alerta != 'sem_alerta'
    ),
    contas_receber_alerts AS (
        SELECT 
            alert.esta_vencida,
            alert.esta_proxima_vencer,
            alert.tipo_alerta,
            (cr.valor_atual - COALESCE(cr.valor_recebido, 0)) AS valor_restante
        FROM financeiro.contas_receber cr
        CROSS JOIN LATERAL financeiro.calculate_due_date_status(
            cr.data_vencimento,
            cr.status,
            cr.data_recebimento,
            p_dias_alerta
        ) AS alert
        WHERE cr.company_id = p_company_id
            AND cr.is_active = true
            AND cr.status NOT IN ('recebido', 'cancelado')
            AND alert.tipo_alerta != 'sem_alerta'
    ),
    pagar_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE esta_vencida = true)::INTEGER AS total_vencidas,
            COUNT(*) FILTER (WHERE esta_proxima_vencer = true AND esta_vencida = false)::INTEGER AS total_proximas_vencer,
            COUNT(*) FILTER (WHERE tipo_alerta = 'vencendo_hoje')::INTEGER AS total_vencendo_hoje,
            COALESCE(SUM(valor_restante) FILTER (WHERE esta_vencida = true), 0) AS valor_vencidas,
            COALESCE(SUM(valor_restante) FILTER (WHERE esta_proxima_vencer = true AND esta_vencida = false), 0) AS valor_proximas_vencer
        FROM contas_pagar_alerts
    ),
    receber_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE esta_vencida = true)::INTEGER AS total_vencidas,
            COUNT(*) FILTER (WHERE esta_proxima_vencer = true AND esta_vencida = false)::INTEGER AS total_proximas_vencer,
            COUNT(*) FILTER (WHERE tipo_alerta = 'vencendo_hoje')::INTEGER AS total_vencendo_hoje,
            COALESCE(SUM(valor_restante) FILTER (WHERE esta_vencida = true), 0) AS valor_vencidas,
            COALESCE(SUM(valor_restante) FILTER (WHERE esta_proxima_vencer = true AND esta_vencida = false), 0) AS valor_proximas_vencer
        FROM contas_receber_alerts
    )
    SELECT 
        ps.total_vencidas AS total_contas_pagar_vencidas,
        ps.total_proximas_vencer AS total_contas_pagar_proximas_vencer,
        ps.total_vencendo_hoje AS total_contas_pagar_vencendo_hoje,
        ps.valor_vencidas AS valor_total_contas_pagar_vencidas,
        ps.valor_proximas_vencer AS valor_total_contas_pagar_proximas_vencer,
        rs.total_vencidas AS total_contas_receber_vencidas,
        rs.total_proximas_vencer AS total_contas_receber_proximas_vencer,
        rs.total_vencendo_hoje AS total_contas_receber_vencendo_hoje,
        rs.valor_vencidas AS valor_total_contas_receber_vencidas,
        rs.valor_proximas_vencer AS valor_total_contas_receber_proximas_vencer
    FROM pagar_stats ps
    CROSS JOIN receber_stats rs;
END;
$$;

-- =====================================================
-- 5. FUNÇÃO PARA ATUALIZAR STATUS AUTOMATICAMENTE
-- =====================================================

-- Função para atualizar status de contas vencidas
CREATE OR REPLACE FUNCTION financeiro.update_overdue_accounts_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualizar contas a pagar vencidas
    UPDATE financeiro.contas_pagar
    SET 
        status = 'vencido',
        updated_at = NOW()
    WHERE 
        is_active = true
        AND status NOT IN ('pago', 'cancelado', 'vencido')
        AND data_vencimento < CURRENT_DATE
        AND (data_pagamento IS NULL OR data_pagamento > data_vencimento);
    
    -- Atualizar contas a receber vencidas
    UPDATE financeiro.contas_receber
    SET 
        status = 'vencido',
        updated_at = NOW()
    WHERE 
        is_active = true
        AND status NOT IN ('recebido', 'cancelado', 'vencido')
        AND data_vencimento < CURRENT_DATE
        AND (data_recebimento IS NULL OR data_recebimento > data_vencimento);
END;
$$;

-- =====================================================
-- 5.1. FUNÇÃO WRAPPER PARA JOB AGENDADO
-- =====================================================

-- Função wrapper que executa todas as atualizações de status
CREATE OR REPLACE FUNCTION financeiro.update_all_overdue_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM financeiro.update_overdue_accounts_status();
    PERFORM financeiro.update_overdue_parcelas_status();
END;
$$;

-- =====================================================
-- 5.2. JOB AGENDADO PARA ATUALIZAR STATUS (pg_cron)
-- =====================================================

-- Verificar se pg_cron está disponível e criar job
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remover job existente se houver
        PERFORM cron.unschedule('update-overdue-accounts-status-daily')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'update-overdue-accounts-status-daily'
        );
        
        -- Criar job diário para atualizar status de contas vencidas
        -- Executa todos os dias às 1h da manhã
        PERFORM cron.schedule(
            'update-overdue-accounts-status-daily',
            '0 1 * * *', -- Todos os dias às 1:00 AM
            'SELECT financeiro.update_all_overdue_status();'
        );
        
        RAISE NOTICE 'Job agendado criado: update-overdue-accounts-status-daily';
    ELSE
        RAISE NOTICE 'Extensão pg_cron não encontrada. Job agendado não será criado.';
        RAISE NOTICE 'Para habilitar, execute: CREATE EXTENSION IF NOT EXISTS pg_cron;';
        RAISE NOTICE 'Para executar manualmente: SELECT financeiro.update_all_overdue_status();';
    END IF;
END $$;

-- =====================================================
-- 6. FUNÇÃO PARA ATUALIZAR STATUS DE PARCELAS VENCIDAS
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.update_overdue_parcelas_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualizar parcelas vencidas
    UPDATE financeiro.contas_pagar_parcelas
    SET 
        status = 'vencido',
        updated_at = NOW()
    WHERE 
        status NOT IN ('pago', 'cancelado', 'vencido')
        AND data_vencimento < CURRENT_DATE
        AND (data_pagamento IS NULL OR data_pagamento > data_vencimento);
END;
$$;

-- =====================================================
-- 7. FUNÇÃO RPC PARA ALERTAS DE PARCELAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_contas_pagar_parcelas_alerts(
    p_company_id UUID,
    p_dias_alerta INTEGER DEFAULT 7,
    p_include_paid BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    conta_pagar_id UUID,
    company_id UUID,
    numero_parcela INTEGER,
    numero_titulo VARCHAR(50),
    valor_parcela DECIMAL(15,2),
    valor_atual DECIMAL(15,2),
    data_vencimento DATE,
    data_pagamento DATE,
    status VARCHAR(20),
    dias_ate_vencimento INTEGER,
    tipo_alerta VARCHAR(20),
    esta_vencida BOOLEAN,
    esta_proxima_vencer BOOLEAN,
    valor_pago DECIMAL(15,2),
    valor_restante DECIMAL(15,2),
    fornecedor_nome VARCHAR(255),
    descricao TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, financeiro
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpp.id,
        cpp.conta_pagar_id,
        cpp.company_id,
        cpp.numero_parcela,
        cpp.numero_titulo,
        cpp.valor_parcela,
        cpp.valor_atual,
        cpp.data_vencimento,
        cpp.data_pagamento,
        cpp.status,
        alert.dias_ate_vencimento,
        alert.tipo_alerta,
        alert.esta_vencida,
        alert.esta_proxima_vencer,
        cpp.valor_pago,
        (cpp.valor_atual - COALESCE(cpp.valor_pago, 0)) AS valor_restante,
        cp.fornecedor_nome,
        cp.descricao
    FROM financeiro.contas_pagar_parcelas cpp
    INNER JOIN financeiro.contas_pagar cp ON cp.id = cpp.conta_pagar_id
    CROSS JOIN LATERAL financeiro.calculate_due_date_status(
        cpp.data_vencimento,
        cpp.status,
        cpp.data_pagamento,
        p_dias_alerta
    ) AS alert
    WHERE cpp.company_id = p_company_id
        AND (p_include_paid = true OR cpp.status NOT IN ('pago', 'cancelado'))
        AND alert.tipo_alerta != 'sem_alerta'
    ORDER BY 
        CASE alert.tipo_alerta
            WHEN 'vencida' THEN 1
            WHEN 'vencendo_hoje' THEN 2
            WHEN 'vencendo_em_3_dias' THEN 3
            WHEN 'vencendo_em_7_dias' THEN 4
            ELSE 5
        END,
        cpp.data_vencimento ASC;
END;
$$;

-- =====================================================
-- 8. GRANT PERMISSÕES
-- =====================================================

GRANT EXECUTE ON FUNCTION financeiro.calculate_due_date_status(DATE, VARCHAR, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contas_pagar_alerts(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contas_receber_alerts(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_alerts_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.update_overdue_accounts_status() TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.update_overdue_parcelas_status() TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.update_all_overdue_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contas_pagar_parcelas_alerts(UUID, INTEGER, BOOLEAN) TO authenticated;

-- =====================================================
-- 9. COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION financeiro.calculate_due_date_status IS 'Calcula o status de vencimento de uma conta baseado na data de vencimento';
COMMENT ON FUNCTION public.get_contas_pagar_alerts IS 'Retorna alertas de contas a pagar próximas a vencer ou vencidas';
COMMENT ON FUNCTION public.get_contas_receber_alerts IS 'Retorna alertas de contas a receber próximas a vencer ou vencidas';
COMMENT ON FUNCTION public.get_financial_alerts_summary IS 'Retorna um resumo consolidado de todos os alertas financeiros';
COMMENT ON FUNCTION financeiro.update_overdue_accounts_status IS 'Atualiza automaticamente o status de contas vencidas';
COMMENT ON FUNCTION financeiro.update_overdue_parcelas_status IS 'Atualiza automaticamente o status de parcelas vencidas';
COMMENT ON FUNCTION financeiro.update_all_overdue_status IS 'Função wrapper que atualiza status de todas as contas e parcelas vencidas (usada pelo job agendado)';
COMMENT ON FUNCTION public.get_contas_pagar_parcelas_alerts IS 'Retorna alertas de parcelas de contas a pagar próximas a vencer ou vencidas';

