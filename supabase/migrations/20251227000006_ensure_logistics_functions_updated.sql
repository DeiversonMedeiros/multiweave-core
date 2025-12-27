-- =====================================================
-- GARANTIR QUE FUNÇÕES DE LOGÍSTICA ESTÃO ATUALIZADAS
-- Sistema ERP MultiWeave Core
-- =====================================================
-- Data: 2025-12-27
-- Descrição: Garante que as funções create_logistics_request
--            e generate_request_number estão atualizadas e funcionando

-- Atualizar função create_logistics_request para incluir numero_solicitacao como NULL
CREATE OR REPLACE FUNCTION logistica.create_logistics_request(
    p_company_id UUID,
    p_tipo_transporte TEXT,
    p_setor_solicitante TEXT,
    p_previsao_envio DATE,
    p_prazo_destino DATE,
    p_endereco_retirada TEXT,
    p_endereco_entrega TEXT,
    p_nome_responsavel_remetente TEXT,
    p_telefone_responsavel_remetente TEXT,
    p_nome_responsavel_destinatario TEXT,
    p_solicitado_por UUID,
    p_km_estimado NUMERIC DEFAULT NULL,
    p_cep_retirada TEXT DEFAULT NULL,
    p_cep_entrega TEXT DEFAULT NULL,
    p_cpf_responsavel_remetente TEXT DEFAULT NULL,
    p_cpf_responsavel_destinatario TEXT DEFAULT NULL,
    p_telefone_responsavel_destinatario TEXT DEFAULT NULL,
    p_peso NUMERIC DEFAULT NULL,
    p_largura NUMERIC DEFAULT NULL,
    p_altura NUMERIC DEFAULT NULL,
    p_comprimento NUMERIC DEFAULT NULL,
    p_quantidade_volumes INTEGER DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_cost_center_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_segmento TEXT DEFAULT NULL,
    p_cliente TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    INSERT INTO logistica.logistics_requests (
        company_id,
        numero_solicitacao, -- Será gerado pelo trigger se NULL
        tipo_transporte,
        setor_solicitante,
        previsao_envio,
        prazo_destino,
        km_estimado,
        endereco_retirada,
        endereco_entrega,
        cep_retirada,
        cep_entrega,
        nome_responsavel_remetente,
        cpf_responsavel_remetente,
        telefone_responsavel_remetente,
        nome_responsavel_destinatario,
        cpf_responsavel_destinatario,
        telefone_responsavel_destinatario,
        peso,
        largura,
        altura,
        comprimento,
        quantidade_volumes,
        project_id,
        cost_center_id,
        os_number,
        segmento,
        cliente,
        observacoes,
        solicitado_por,
        status
    ) VALUES (
        p_company_id,
        NULL, -- Deixar NULL para o trigger gerar automaticamente
        p_tipo_transporte::logistica.transport_type,
        p_setor_solicitante::logistica.requesting_sector,
        p_previsao_envio,
        p_prazo_destino,
        p_km_estimado,
        p_endereco_retirada,
        p_endereco_entrega,
        p_cep_retirada,
        p_cep_entrega,
        p_nome_responsavel_remetente,
        p_cpf_responsavel_remetente,
        p_telefone_responsavel_remetente,
        p_nome_responsavel_destinatario,
        p_cpf_responsavel_destinatario,
        p_telefone_responsavel_destinatario,
        p_peso,
        p_largura,
        p_altura,
        p_comprimento,
        p_quantidade_volumes,
        p_project_id,
        p_cost_center_id,
        p_os_number,
        p_segmento,
        p_cliente,
        p_observacoes,
        p_solicitado_por,
        'pendente'
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função generate_request_number para usar numero_empresa
CREATE OR REPLACE FUNCTION logistica.generate_request_number()
RETURNS TRIGGER AS $$
DECLARE
    v_company_code TEXT;
    v_year TEXT;
    v_sequence INTEGER;
    v_number TEXT;
BEGIN
    -- Se já tem número, não gera
    IF NEW.numero_solicitacao IS NOT NULL AND NEW.numero_solicitacao != '' THEN
        RETURN NEW;
    END IF;
    
    -- Buscar número da empresa ou gerar código baseado no nome
    SELECT COALESCE(numero_empresa, UPPER(SUBSTRING(REPLACE(nome_fantasia, ' ', ''), 1, 4))) INTO v_company_code
    FROM public.companies
    WHERE id = NEW.company_id;
    
    -- Se ainda não tem código, usar primeiros 4 caracteres do UUID
    IF v_company_code IS NULL OR v_company_code = '' THEN
        v_company_code := UPPER(SUBSTRING(REPLACE(NEW.company_id::TEXT, '-', ''), 1, 4));
    END IF;
    
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Buscar próximo número da sequência
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_solicitacao FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM logistica.logistics_requests
    WHERE company_id = NEW.company_id
    AND numero_solicitacao LIKE v_company_code || '/' || v_year || '/%';
    
    v_number := v_company_code || '/' || v_year || '/' || LPAD(v_sequence::TEXT, 6, '0');
    NEW.numero_solicitacao := v_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trigger_generate_request_number ON logistica.logistics_requests;
CREATE TRIGGER trigger_generate_request_number
    BEFORE INSERT ON logistica.logistics_requests
    FOR EACH ROW
    WHEN (NEW.numero_solicitacao IS NULL OR NEW.numero_solicitacao = '')
    EXECUTE FUNCTION logistica.generate_request_number();

COMMENT ON FUNCTION logistica.generate_request_number() IS 
'Gera automaticamente o número da solicitação de logística no formato: CODIGO_EMPRESA/ANO/SEQUENCIA';

