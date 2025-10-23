-- =====================================================
-- MIGRAÇÃO: TRIGGERS E FUNÇÕES DE AUTOMAÇÃO DO MÓDULO FINANCEIRO
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Cria triggers e funções de automação para o módulo financeiro
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. TRIGGERS DE AUDITORIA (updated_at)
-- =====================================================

-- Trigger para contas a pagar
CREATE TRIGGER update_contas_pagar_updated_at
    BEFORE UPDATE ON financeiro.contas_pagar
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para contas a receber
CREATE TRIGGER update_contas_receber_updated_at
    BEFORE UPDATE ON financeiro.contas_receber
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para borderôs
CREATE TRIGGER update_borderos_updated_at
    BEFORE UPDATE ON financeiro.borderos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para remessas bancárias
CREATE TRIGGER update_remessas_bancarias_updated_at
    BEFORE UPDATE ON financeiro.remessas_bancarias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para retornos bancários
CREATE TRIGGER update_retornos_bancarios_updated_at
    BEFORE UPDATE ON financeiro.retornos_bancarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para contas bancárias
CREATE TRIGGER update_contas_bancarias_updated_at
    BEFORE UPDATE ON financeiro.contas_bancarias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para conciliações bancárias
CREATE TRIGGER update_conciliacoes_bancarias_updated_at
    BEFORE UPDATE ON financeiro.conciliacoes_bancarias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para fluxo de caixa
CREATE TRIGGER update_fluxo_caixa_updated_at
    BEFORE UPDATE ON financeiro.fluxo_caixa
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para NF-e
CREATE TRIGGER update_nfe_updated_at
    BEFORE UPDATE ON financeiro.nfe
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para NFS-e
CREATE TRIGGER update_nfse_updated_at
    BEFORE UPDATE ON financeiro.nfse
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para plano de contas
CREATE TRIGGER update_plano_contas_updated_at
    BEFORE UPDATE ON financeiro.plano_contas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para lançamentos contábeis
CREATE TRIGGER update_lancamentos_contabeis_updated_at
    BEFORE UPDATE ON financeiro.lancamentos_contabeis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para configurações de aprovação
CREATE TRIGGER update_configuracoes_aprovacao_updated_at
    BEFORE UPDATE ON financeiro.configuracoes_aprovacao
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para aprovações
CREATE TRIGGER update_aprovacoes_updated_at
    BEFORE UPDATE ON financeiro.aprovacoes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 2. FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Função para gerar número de título automaticamente
CREATE OR REPLACE FUNCTION financeiro.generate_titulo_number(
    p_company_id UUID,
    p_tipo VARCHAR(10) -- 'PAGAR' ou 'RECEBER'
) RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    titulo_number VARCHAR(50);
BEGIN
    -- Obter próximo número sequencial
    IF p_tipo = 'PAGAR' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_titulo FROM '^[0-9]+') AS INTEGER)), 0) + 1
        INTO next_number
        FROM financeiro.contas_pagar
        WHERE company_id = p_company_id
        AND numero_titulo ~ '^[0-9]+';
    ELSE
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_titulo FROM '^[0-9]+') AS INTEGER)), 0) + 1
        INTO next_number
        FROM financeiro.contas_receber
        WHERE company_id = p_company_id
        AND numero_titulo ~ '^[0-9]+';
    END IF;
    
    -- Formatar número do título
    titulo_number := LPAD(next_number::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM NOW());
    
    RETURN titulo_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular valor atual com juros e multa
CREATE OR REPLACE FUNCTION financeiro.calculate_valor_atual(
    p_valor_original DECIMAL,
    p_data_vencimento DATE,
    p_data_calculo DATE DEFAULT CURRENT_DATE,
    p_taxa_juros DECIMAL DEFAULT 0,
    p_taxa_multa DECIMAL DEFAULT 0
) RETURNS DECIMAL AS $$
DECLARE
    dias_atraso INTEGER;
    valor_juros DECIMAL;
    valor_multa DECIMAL;
    valor_atual DECIMAL;
BEGIN
    -- Calcular dias de atraso
    dias_atraso := GREATEST(0, p_data_calculo - p_data_vencimento);
    
    -- Calcular multa (aplicada uma vez)
    IF dias_atraso > 0 THEN
        valor_multa := p_valor_original * (p_taxa_multa / 100);
    ELSE
        valor_multa := 0;
    END IF;
    
    -- Calcular juros (aplicados por dia)
    IF dias_atraso > 0 THEN
        valor_juros := p_valor_original * (p_taxa_juros / 100) * (dias_atraso / 30.0);
    ELSE
        valor_juros := 0;
    END IF;
    
    -- Calcular valor atual
    valor_atual := p_valor_original + valor_multa + valor_juros;
    
    RETURN ROUND(valor_atual, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar aprovações automáticas
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
        NEW.departamento,
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
        AND (ca.departamento IS NULL OR ca.departamento = NEW.departamento)
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

-- Trigger para criar aprovações automáticas em contas a pagar
CREATE TRIGGER trigger_create_contas_pagar_approvals
    AFTER INSERT ON financeiro.contas_pagar
    FOR EACH ROW EXECUTE FUNCTION financeiro.create_approvals_trigger();

-- Função para atualizar status de aprovação
CREATE OR REPLACE FUNCTION financeiro.update_approval_status(
    p_entidade_tipo VARCHAR(50),
    p_entidade_id UUID,
    p_aprovador_id UUID,
    p_status VARCHAR(20),
    p_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    approval_record RECORD;
    all_approved BOOLEAN := FALSE;
    entity_company_id UUID;
BEGIN
    -- Obter registro de aprovação
    SELECT * INTO approval_record
    FROM financeiro.aprovacoes
    WHERE entidade_tipo = p_entidade_tipo
    AND entidade_id = p_entidade_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se não encontrou, retorna false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status da aprovação
    UPDATE financeiro.aprovacoes
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = approval_record.id;
    
    -- Se foi aprovado, verificar se todas as aprovações foram concluídas
    IF p_status = 'aprovado' THEN
        -- Verificar se todas as aprovações foram aprovadas
        SELECT NOT EXISTS(
            SELECT 1 FROM financeiro.aprovacoes
            WHERE entidade_tipo = p_entidade_tipo
            AND entidade_id = p_entidade_id
            AND status = 'pendente'
        ) INTO all_approved;
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            -- Obter company_id da entidade
            IF p_entidade_tipo = 'conta_pagar' THEN
                SELECT company_id INTO entity_company_id
                FROM financeiro.contas_pagar
                WHERE id = p_entidade_id;
                
                -- Atualizar status para aprovado
                UPDATE financeiro.contas_pagar
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    aprovado_por = p_aprovador_id,
                    updated_at = NOW()
                WHERE id = p_entidade_id;
            END IF;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar relatório de aging
CREATE OR REPLACE FUNCTION financeiro.get_aging_report(
    p_company_id UUID,
    p_data_corte DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    fornecedor_nome VARCHAR(255),
    total_pendente DECIMAL(15,2),
    vencido_1_30 DECIMAL(15,2),
    vencido_31_60 DECIMAL(15,2),
    vencido_61_90 DECIMAL(15,2),
    vencido_mais_90 DECIMAL(15,2),
    a_vencer_1_30 DECIMAL(15,2),
    a_vencer_31_60 DECIMAL(15,2),
    a_vencer_mais_60 DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.fornecedor_nome,
        SUM(cp.valor_atual) as total_pendente,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '30 days' 
            AND cp.data_vencimento >= p_data_corte - INTERVAL '60 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_1_30,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '60 days' 
            AND cp.data_vencimento >= p_data_corte - INTERVAL '90 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_31_60,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '90 days' 
            AND cp.data_vencimento >= p_data_corte - INTERVAL '120 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_61_90,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '120 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_mais_90,
        SUM(CASE 
            WHEN cp.data_vencimento >= p_data_corte 
            AND cp.data_vencimento <= p_data_corte + INTERVAL '30 days'
            THEN cp.valor_atual ELSE 0 END) as a_vencer_1_30,
        SUM(CASE 
            WHEN cp.data_vencimento > p_data_corte + INTERVAL '30 days' 
            AND cp.data_vencimento <= p_data_corte + INTERVAL '60 days'
            THEN cp.valor_atual ELSE 0 END) as a_vencer_31_60,
        SUM(CASE 
            WHEN cp.data_vencimento > p_data_corte + INTERVAL '60 days'
            THEN cp.valor_atual ELSE 0 END) as a_vencer_mais_60
    FROM financeiro.contas_pagar cp
    WHERE cp.company_id = p_company_id
    AND cp.status IN ('pendente', 'aprovado')
    AND cp.is_active = true
    GROUP BY cp.fornecedor_nome
    ORDER BY total_pendente DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular DSO (Days Sales Outstanding)
CREATE OR REPLACE FUNCTION financeiro.calculate_dso(
    p_company_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
) RETURNS DECIMAL AS $$
DECLARE
    total_recebido DECIMAL(15,2);
    media_diaria DECIMAL(15,2);
    dias_periodo INTEGER;
    dso DECIMAL(10,2);
BEGIN
    -- Calcular dias do período
    dias_periodo := p_data_fim - p_data_inicio + 1;
    
    -- Calcular total recebido no período
    SELECT COALESCE(SUM(valor_recebido), 0)
    INTO total_recebido
    FROM financeiro.contas_receber
    WHERE company_id = p_company_id
    AND data_recebimento BETWEEN p_data_inicio AND p_data_fim
    AND is_active = true;
    
    -- Calcular média diária
    media_diaria := total_recebido / dias_periodo;
    
    -- Calcular saldo pendente
    SELECT COALESCE(SUM(valor_atual), 0)
    INTO total_recebido
    FROM financeiro.contas_receber
    WHERE company_id = p_company_id
    AND status IN ('pendente', 'confirmado')
    AND is_active = true;
    
    -- Calcular DSO
    IF media_diaria > 0 THEN
        dso := total_recebido / media_diaria;
    ELSE
        dso := 0;
    END IF;
    
    RETURN ROUND(dso, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular DPO (Days Payable Outstanding)
CREATE OR REPLACE FUNCTION financeiro.calculate_dpo(
    p_company_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
) RETURNS DECIMAL AS $$
DECLARE
    total_pago DECIMAL(15,2);
    media_diaria DECIMAL(15,2);
    dias_periodo INTEGER;
    dpo DECIMAL(10,2);
BEGIN
    -- Calcular dias do período
    dias_periodo := p_data_fim - p_data_inicio + 1;
    
    -- Calcular total pago no período
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO total_pago
    FROM financeiro.contas_pagar
    WHERE company_id = p_company_id
    AND data_pagamento BETWEEN p_data_inicio AND p_data_fim
    AND is_active = true;
    
    -- Calcular média diária
    media_diaria := total_pago / dias_periodo;
    
    -- Calcular saldo pendente
    SELECT COALESCE(SUM(valor_atual), 0)
    INTO total_pago
    FROM financeiro.contas_pagar
    WHERE company_id = p_company_id
    AND status IN ('pendente', 'aprovado')
    AND is_active = true;
    
    -- Calcular DPO
    IF media_diaria > 0 THEN
        dpo := total_pago / media_diaria;
    ELSE
        dpo := 0;
    END IF;
    
    RETURN ROUND(dpo, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNÇÕES DE INTEGRAÇÃO
-- =====================================================

-- Função para processar retorno bancário
CREATE OR REPLACE FUNCTION financeiro.process_bank_return(
    p_company_id UUID,
    p_arquivo_retorno TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    return_record RECORD;
    conta_pagar_record RECORD;
BEGIN
    -- Aqui seria implementada a lógica de processamento do arquivo CNAB
    -- Por enquanto, apenas um placeholder
    
    -- Exemplo de processamento:
    -- 1. Parse do arquivo CNAB
    -- 2. Identificação dos títulos
    -- 3. Atualização dos status
    -- 4. Criação de lançamentos contábeis
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar arquivo de remessa
CREATE OR REPLACE FUNCTION financeiro.generate_remittance_file(
    p_company_id UUID,
    p_borderos_id UUID
) RETURNS TEXT AS $$
DECLARE
    remittance_data TEXT := '';
    bordero_record RECORD;
    conta_record RECORD;
BEGIN
    -- Obter dados do borderô
    SELECT * INTO bordero_record
    FROM financeiro.borderos
    WHERE id = p_borderos_id
    AND company_id = p_company_id;
    
    -- Aqui seria implementada a geração do arquivo CNAB
    -- Por enquanto, apenas um placeholder
    
    -- Exemplo de estrutura:
    -- 1. Header do arquivo
    -- 2. Registros de títulos
    -- 3. Trailer do arquivo
    
    RETURN remittance_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. GRANTS PARA FUNÇÕES
-- =====================================================

-- Grant para funções de automação
GRANT ALL ON FUNCTION financeiro.generate_titulo_number(UUID, VARCHAR) TO postgres;
GRANT ALL ON FUNCTION financeiro.generate_titulo_number(UUID, VARCHAR) TO anon;
GRANT ALL ON FUNCTION financeiro.generate_titulo_number(UUID, VARCHAR) TO authenticated;
GRANT ALL ON FUNCTION financeiro.generate_titulo_number(UUID, VARCHAR) TO service_role;

GRANT ALL ON FUNCTION financeiro.calculate_valor_atual(DECIMAL, DATE, DATE, DECIMAL, DECIMAL) TO postgres;
GRANT ALL ON FUNCTION financeiro.calculate_valor_atual(DECIMAL, DATE, DATE, DECIMAL, DECIMAL) TO anon;
GRANT ALL ON FUNCTION financeiro.calculate_valor_atual(DECIMAL, DATE, DATE, DECIMAL, DECIMAL) TO authenticated;
GRANT ALL ON FUNCTION financeiro.calculate_valor_atual(DECIMAL, DATE, DATE, DECIMAL, DECIMAL) TO service_role;

GRANT ALL ON FUNCTION financeiro.update_approval_status(VARCHAR, UUID, UUID, VARCHAR, TEXT) TO postgres;
GRANT ALL ON FUNCTION financeiro.update_approval_status(VARCHAR, UUID, UUID, VARCHAR, TEXT) TO anon;
GRANT ALL ON FUNCTION financeiro.update_approval_status(VARCHAR, UUID, UUID, VARCHAR, TEXT) TO authenticated;
GRANT ALL ON FUNCTION financeiro.update_approval_status(VARCHAR, UUID, UUID, VARCHAR, TEXT) TO service_role;

GRANT ALL ON FUNCTION financeiro.get_aging_report(UUID, DATE) TO postgres;
GRANT ALL ON FUNCTION financeiro.get_aging_report(UUID, DATE) TO anon;
GRANT ALL ON FUNCTION financeiro.get_aging_report(UUID, DATE) TO authenticated;
GRANT ALL ON FUNCTION financeiro.get_aging_report(UUID, DATE) TO service_role;

GRANT ALL ON FUNCTION financeiro.calculate_dso(UUID, DATE, DATE) TO postgres;
GRANT ALL ON FUNCTION financeiro.calculate_dso(UUID, DATE, DATE) TO anon;
GRANT ALL ON FUNCTION financeiro.calculate_dso(UUID, DATE, DATE) TO authenticated;
GRANT ALL ON FUNCTION financeiro.calculate_dso(UUID, DATE, DATE) TO service_role;

GRANT ALL ON FUNCTION financeiro.calculate_dpo(UUID, DATE, DATE) TO postgres;
GRANT ALL ON FUNCTION financeiro.calculate_dpo(UUID, DATE, DATE) TO anon;
GRANT ALL ON FUNCTION financeiro.calculate_dpo(UUID, DATE, DATE) TO authenticated;
GRANT ALL ON FUNCTION financeiro.calculate_dpo(UUID, DATE, DATE) TO service_role;

GRANT ALL ON FUNCTION financeiro.process_bank_return(UUID, TEXT) TO postgres;
GRANT ALL ON FUNCTION financeiro.process_bank_return(UUID, TEXT) TO anon;
GRANT ALL ON FUNCTION financeiro.process_bank_return(UUID, TEXT) TO authenticated;
GRANT ALL ON FUNCTION financeiro.process_bank_return(UUID, TEXT) TO service_role;

GRANT ALL ON FUNCTION financeiro.generate_remittance_file(UUID, UUID) TO postgres;
GRANT ALL ON FUNCTION financeiro.generate_remittance_file(UUID, UUID) TO anon;
GRANT ALL ON FUNCTION financeiro.generate_remittance_file(UUID, UUID) TO authenticated;
GRANT ALL ON FUNCTION financeiro.generate_remittance_file(UUID, UUID) TO service_role;

