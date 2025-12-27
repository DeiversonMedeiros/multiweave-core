-- =====================================================
-- CORREÇÃO: Garantir que o trigger de geração de número funcione
-- Sistema ERP MultiWeave Core
-- =====================================================
-- Data: 2025-12-27
-- Descrição: Garante que o trigger para gerar numero_solicitacao
--            esteja ativo e funcionando corretamente

-- Recriar a função de geração de número se não existir
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

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_generate_request_number ON logistica.logistics_requests;

-- Criar trigger
CREATE TRIGGER trigger_generate_request_number
    BEFORE INSERT ON logistica.logistics_requests
    FOR EACH ROW
    WHEN (NEW.numero_solicitacao IS NULL OR NEW.numero_solicitacao = '')
    EXECUTE FUNCTION logistica.generate_request_number();

COMMENT ON FUNCTION logistica.generate_request_number() IS 
'Gera automaticamente o número da solicitação de logística no formato: CODIGO_EMPRESA/ANO/SEQUENCIA';

