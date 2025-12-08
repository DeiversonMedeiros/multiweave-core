-- =====================================================
-- MIGRAÇÃO: Expansão NFe/NFSe e Integração com Contas a Receber
-- =====================================================
-- Data: 2025-12-06
-- Descrição: Expande tabelas NFe e NFSe para gerar notas diretamente no sistema
--            e integra com contas a receber automaticamente
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. EXPANDIR TABELA NFE COM CAMPOS DE CLIENTE E INTEGRAÇÃO
-- =====================================================

-- Adicionar campos de cliente/destinatário
ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.partners(id),
ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS cliente_cnpj VARCHAR(18),
ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS cliente_telefone VARCHAR(20),
ADD COLUMN IF NOT EXISTS cliente_endereco TEXT,
ADD COLUMN IF NOT EXISTS cliente_cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS cliente_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS cliente_cep VARCHAR(10);

-- Adicionar campos de integração com contas a receber
ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS conta_receber_id UUID REFERENCES financeiro.contas_receber(id),
ADD COLUMN IF NOT EXISTS criar_conta_receber BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS condicao_recebimento INTEGER CHECK (condicao_recebimento IS NULL OR condicao_recebimento IN (30, 45, 60, 90));

-- Adicionar campos de configuração fiscal
ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS configuracao_fiscal_id UUID REFERENCES financeiro.configuracao_fiscal(id),
ADD COLUMN IF NOT EXISTS numero_protocolo VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_autorizacao TIMESTAMP WITH TIME ZONE;

-- Adicionar campo para controlar geração automática de número
ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS numero_gerado_automaticamente BOOLEAN DEFAULT false;

-- =====================================================
-- 2. EXPANDIR TABELA NFSE COM CAMPOS DE CLIENTE E INTEGRAÇÃO
-- =====================================================

-- Adicionar campos de cliente/destinatário
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.partners(id),
ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS cliente_cnpj VARCHAR(18),
ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS cliente_telefone VARCHAR(20),
ADD COLUMN IF NOT EXISTS cliente_endereco TEXT,
ADD COLUMN IF NOT EXISTS cliente_cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS cliente_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS cliente_cep VARCHAR(10);

-- Adicionar campos de integração com contas a receber
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS conta_receber_id UUID REFERENCES financeiro.contas_receber(id),
ADD COLUMN IF NOT EXISTS criar_conta_receber BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS condicao_recebimento INTEGER CHECK (condicao_recebimento IS NULL OR condicao_recebimento IN (30, 45, 60, 90));

-- Adicionar campos de configuração fiscal
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS configuracao_fiscal_id UUID REFERENCES financeiro.configuracao_fiscal(id),
ADD COLUMN IF NOT EXISTS numero_protocolo VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_autorizacao TIMESTAMP WITH TIME ZONE;

-- Adicionar campo para controlar geração automática de número
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS numero_gerado_automaticamente BOOLEAN DEFAULT false;

-- Adicionar campo valor_liquido se não existir
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS valor_liquido DECIMAL(15,2) DEFAULT 0;

-- Adicionar campo valor_deducoes se não existir
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS valor_deducoes DECIMAL(15,2) DEFAULT 0;

-- =====================================================
-- 3. CRIAR TABELA DE ITENS DA NFE
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.nfe_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfe_id UUID NOT NULL REFERENCES financeiro.nfe(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_item INTEGER NOT NULL,
    codigo_produto VARCHAR(50),
    descricao TEXT NOT NULL,
    ncm VARCHAR(10),
    cfop VARCHAR(5),
    unidade VARCHAR(10) DEFAULT 'UN',
    quantidade DECIMAL(15,4) NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    valor_seguro DECIMAL(15,2) DEFAULT 0,
    valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
    -- Impostos
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    -- Informações adicionais
    informacoes_adicionais TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT nfe_itens_nfe_numero_unique UNIQUE (nfe_id, numero_item)
);

-- =====================================================
-- 4. CRIAR TABELA DE ITENS DA NFSE
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.nfse_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfse_id UUID NOT NULL REFERENCES financeiro.nfse(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_item INTEGER NOT NULL,
    codigo_servico VARCHAR(20),
    descricao TEXT NOT NULL,
    codigo_tributacao VARCHAR(20),
    unidade VARCHAR(10) DEFAULT 'UN',
    quantidade DECIMAL(15,4) NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_deducoes DECIMAL(15,2) DEFAULT 0,
    -- Impostos
    valor_iss DECIMAL(15,2) DEFAULT 0,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    valor_inss DECIMAL(15,2) DEFAULT 0,
    valor_ir DECIMAL(15,2) DEFAULT 0,
    valor_csll DECIMAL(15,2) DEFAULT 0,
    -- Informações adicionais
    informacoes_adicionais TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT nfse_itens_nfse_numero_unique UNIQUE (nfse_id, numero_item)
);

-- =====================================================
-- 5. FUNÇÃO PARA GERAR NÚMERO E SÉRIE DA NFE AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.generate_nfe_number(
    p_company_id UUID,
    p_configuracao_fiscal_id UUID
) RETURNS JSON AS $$
DECLARE
    v_config RECORD;
    v_next_number INTEGER;
    v_serie VARCHAR(5);
    v_result JSON;
BEGIN
    -- Buscar configuração fiscal
    SELECT 
        serie_numeracao,
        numero_inicial,
        numero_final
    INTO v_config
    FROM financeiro.configuracao_fiscal
    WHERE id = p_configuracao_fiscal_id
    AND company_id = p_company_id
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuração fiscal não encontrada ou inativa';
    END IF;
    
    v_serie := LPAD(v_config.serie_numeracao::TEXT, 3, '0');
    
    -- Buscar último número usado
    SELECT COALESCE(MAX(CAST(numero_nfe AS INTEGER)), v_config.numero_inicial - 1)
    INTO v_next_number
    FROM financeiro.nfe
    WHERE company_id = p_company_id
    AND serie = v_serie
    AND numero_gerado_automaticamente = true
    AND numero_nfe ~ '^[0-9]+$';
    
    -- Incrementar número
    v_next_number := v_next_number + 1;
    
    -- Verificar se ultrapassou o limite
    IF v_config.numero_final IS NOT NULL AND v_next_number > v_config.numero_final THEN
        RAISE EXCEPTION 'Número máximo de notas fiscais atingido para esta série';
    END IF;
    
    -- Retornar resultado
    v_result := json_build_object(
        'numero', LPAD(v_next_number::TEXT, 9, '0'),
        'serie', v_serie
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÃO PARA GERAR NÚMERO DA NFSE AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.generate_nfse_number(
    p_company_id UUID,
    p_configuracao_fiscal_id UUID
) RETURNS VARCHAR(20) AS $$
DECLARE
    v_config RECORD;
    v_next_number INTEGER;
BEGIN
    -- Buscar configuração fiscal
    SELECT 
        serie_numeracao,
        numero_inicial,
        numero_final
    INTO v_config
    FROM financeiro.configuracao_fiscal
    WHERE id = p_configuracao_fiscal_id
    AND company_id = p_company_id
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuração fiscal não encontrada ou inativa';
    END IF;
    
    -- Buscar último número usado
    SELECT COALESCE(MAX(CAST(numero_nfse AS INTEGER)), v_config.numero_inicial - 1)
    INTO v_next_number
    FROM financeiro.nfse
    WHERE company_id = p_company_id
    AND numero_gerado_automaticamente = true
    AND numero_nfse ~ '^[0-9]+$';
    
    -- Incrementar número
    v_next_number := v_next_number + 1;
    
    -- Verificar se ultrapassou o limite
    IF v_config.numero_final IS NOT NULL AND v_next_number > v_config.numero_final THEN
        RAISE EXCEPTION 'Número máximo de notas fiscais atingido para esta série';
    END IF;
    
    RETURN LPAD(v_next_number::TEXT, 15, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNÇÃO PARA CRIAR CONTA A RECEBER A PARTIR DE NFE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.create_conta_receber_from_nfe(
    p_nfe_id UUID
) RETURNS UUID AS $$
DECLARE
    v_nfe RECORD;
    v_conta_receber_id UUID;
    v_data_vencimento DATE;
    v_numero_titulo VARCHAR(50);
BEGIN
    -- Buscar dados da NFe
    SELECT 
        n.*,
        c.numero_titulo as titulo_existente
    INTO v_nfe
    FROM financeiro.nfe n
    LEFT JOIN financeiro.contas_receber c ON c.id = n.conta_receber_id
    WHERE n.id = p_nfe_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NFe não encontrada';
    END IF;
    
    -- Verificar se já existe conta a receber
    IF v_nfe.conta_receber_id IS NOT NULL THEN
        RETURN v_nfe.conta_receber_id;
    END IF;
    
    -- Verificar se deve criar conta a receber
    IF NOT v_nfe.criar_conta_receber THEN
        RETURN NULL;
    END IF;
    
    -- Calcular data de vencimento
    IF v_nfe.condicao_recebimento IS NOT NULL THEN
        v_data_vencimento := v_nfe.data_emissao + (v_nfe.condicao_recebimento || ' days')::INTERVAL;
    ELSE
        v_data_vencimento := v_nfe.data_emissao + INTERVAL '30 days';
    END IF;
    
    -- Gerar número do título
    SELECT financeiro.generate_titulo_number(v_nfe.company_id, 'RECEBER')
    INTO v_numero_titulo;
    
    -- Criar conta a receber
    INSERT INTO financeiro.contas_receber (
        company_id,
        numero_titulo,
        cliente_id,
        cliente_nome,
        cliente_cnpj,
        descricao,
        valor_original,
        valor_atual,
        data_emissao,
        data_vencimento,
        condicao_recebimento,
        valor_pis,
        valor_cofins,
        valor_csll,
        valor_ir,
        valor_inss,
        valor_iss,
        categoria,
        status,
        observacoes,
        created_by
    ) VALUES (
        v_nfe.company_id,
        v_numero_titulo,
        v_nfe.cliente_id,
        v_nfe.cliente_nome,
        v_nfe.cliente_cnpj,
        'NF-e ' || v_nfe.numero_nfe || '/' || v_nfe.serie || ' - ' || COALESCE(v_nfe.observacoes, ''),
        v_nfe.valor_total,
        v_nfe.valor_total,
        v_nfe.data_emissao,
        v_data_vencimento,
        v_nfe.condicao_recebimento,
        v_nfe.valor_pis,
        v_nfe.valor_cofins,
        0, -- CSLL não aplicável em NFe
        0, -- IR não aplicável em NFe
        0, -- INSS não aplicável em NFe
        0, -- ISS não aplicável em NFe
        'Vendas',
        'pendente',
        'Gerada automaticamente a partir da NF-e ' || v_nfe.numero_nfe || '/' || v_nfe.serie,
        v_nfe.created_by
    )
    RETURNING id INTO v_conta_receber_id;
    
    -- Atualizar NFe com o ID da conta a receber
    UPDATE financeiro.nfe
    SET conta_receber_id = v_conta_receber_id
    WHERE id = p_nfe_id;
    
    RETURN v_conta_receber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNÇÃO PARA CRIAR CONTA A RECEBER A PARTIR DE NFSE
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.create_conta_receber_from_nfse(
    p_nfse_id UUID
) RETURNS UUID AS $$
DECLARE
    v_nfse RECORD;
    v_conta_receber_id UUID;
    v_data_vencimento DATE;
    v_numero_titulo VARCHAR(50);
BEGIN
    -- Buscar dados da NFSe
    SELECT 
        n.*,
        c.numero_titulo as titulo_existente
    INTO v_nfse
    FROM financeiro.nfse n
    LEFT JOIN financeiro.contas_receber c ON c.id = n.conta_receber_id
    WHERE n.id = p_nfse_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NFSe não encontrada';
    END IF;
    
    -- Verificar se já existe conta a receber
    IF v_nfse.conta_receber_id IS NOT NULL THEN
        RETURN v_nfse.conta_receber_id;
    END IF;
    
    -- Verificar se deve criar conta a receber
    IF NOT v_nfse.criar_conta_receber THEN
        RETURN NULL;
    END IF;
    
    -- Calcular data de vencimento
    IF v_nfse.condicao_recebimento IS NOT NULL THEN
        v_data_vencimento := v_nfse.data_emissao + (v_nfse.condicao_recebimento || ' days')::INTERVAL;
    ELSE
        v_data_vencimento := v_nfse.data_emissao + INTERVAL '30 days';
    END IF;
    
    -- Gerar número do título
    SELECT financeiro.generate_titulo_number(v_nfse.company_id, 'RECEBER')
    INTO v_numero_titulo;
    
    -- Criar conta a receber
    INSERT INTO financeiro.contas_receber (
        company_id,
        numero_titulo,
        cliente_id,
        cliente_nome,
        cliente_cnpj,
        descricao,
        valor_original,
        valor_atual,
        data_emissao,
        data_vencimento,
        condicao_recebimento,
        valor_pis,
        valor_cofins,
        valor_csll,
        valor_ir,
        valor_inss,
        valor_iss,
        categoria,
        status,
        observacoes,
        created_by
    ) VALUES (
        v_nfse.company_id,
        v_numero_titulo,
        v_nfse.cliente_id,
        v_nfse.cliente_nome,
        v_nfse.cliente_cnpj,
        'NFS-e ' || v_nfse.numero_nfse || ' - ' || COALESCE(v_nfse.observacoes, ''),
        v_nfse.valor_servico,
        v_nfse.valor_servico,
        v_nfse.data_emissao,
        v_data_vencimento,
        v_nfse.condicao_recebimento,
        v_nfse.valor_pis,
        v_nfse.valor_cofins,
        v_nfse.valor_csll,
        v_nfse.valor_ir,
        v_nfse.valor_inss,
        v_nfse.valor_iss,
        'Serviços',
        'pendente',
        'Gerada automaticamente a partir da NFS-e ' || v_nfse.numero_nfse,
        v_nfse.created_by
    )
    RETURNING id INTO v_conta_receber_id;
    
    -- Atualizar NFSe com o ID da conta a receber
    UPDATE financeiro.nfse
    SET conta_receber_id = v_conta_receber_id
    WHERE id = p_nfse_id;
    
    RETURN v_conta_receber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGER PARA CRIAR CONTA A RECEBER QUANDO NFE É AUTORIZADA
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.trigger_create_conta_receber_on_nfe_authorized()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a nota foi autorizada e deve criar conta a receber
    IF NEW.status_sefaz = 'autorizada' 
       AND OLD.status_sefaz != 'autorizada'
       AND NEW.criar_conta_receber = true
       AND NEW.conta_receber_id IS NULL THEN
        
        PERFORM financeiro.create_conta_receber_from_nfe(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_conta_receber_on_nfe_authorized
    AFTER UPDATE OF status_sefaz ON financeiro.nfe
    FOR EACH ROW
    WHEN (NEW.status_sefaz = 'autorizada' AND OLD.status_sefaz != 'autorizada')
    EXECUTE FUNCTION financeiro.trigger_create_conta_receber_on_nfe_authorized();

-- =====================================================
-- 10. TRIGGER PARA CRIAR CONTA A RECEBER QUANDO NFSE É AUTORIZADA
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.trigger_create_conta_receber_on_nfse_authorized()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a nota foi autorizada e deve criar conta a receber
    IF NEW.status_sefaz = 'autorizada' 
       AND OLD.status_sefaz != 'autorizada'
       AND NEW.criar_conta_receber = true
       AND NEW.conta_receber_id IS NULL THEN
        
        PERFORM financeiro.create_conta_receber_from_nfse(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_conta_receber_on_nfse_authorized
    AFTER UPDATE OF status_sefaz ON financeiro.nfse
    FOR EACH ROW
    WHEN (NEW.status_sefaz = 'autorizada' AND OLD.status_sefaz != 'autorizada')
    EXECUTE FUNCTION financeiro.trigger_create_conta_receber_on_nfse_authorized();

-- =====================================================
-- 11. TRIGGERS DE UPDATED_AT PARA NOVAS TABELAS
-- =====================================================

CREATE TRIGGER update_nfe_itens_updated_at
    BEFORE UPDATE ON financeiro.nfe_itens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_nfse_itens_updated_at
    BEFORE UPDATE ON financeiro.nfse_itens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 12. COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN financeiro.nfe.cliente_id IS 'Cliente/destinatário da nota fiscal';
COMMENT ON COLUMN financeiro.nfe.conta_receber_id IS 'Conta a receber criada automaticamente a partir desta nota';
COMMENT ON COLUMN financeiro.nfe.criar_conta_receber IS 'Indica se deve criar conta a receber automaticamente quando autorizada';
COMMENT ON COLUMN financeiro.nfe.condicao_recebimento IS 'Condição de recebimento em dias (30, 45, 60 ou 90)';
COMMENT ON COLUMN financeiro.nfe.numero_gerado_automaticamente IS 'Indica se o número foi gerado automaticamente pelo sistema';

COMMENT ON COLUMN financeiro.nfse.cliente_id IS 'Cliente/destinatário da nota fiscal de serviço';
COMMENT ON COLUMN financeiro.nfse.conta_receber_id IS 'Conta a receber criada automaticamente a partir desta nota';
COMMENT ON COLUMN financeiro.nfse.criar_conta_receber IS 'Indica se deve criar conta a receber automaticamente quando autorizada';
COMMENT ON COLUMN financeiro.nfse.condicao_recebimento IS 'Condição de recebimento em dias (30, 45, 60 ou 90)';
COMMENT ON COLUMN financeiro.nfse.numero_gerado_automaticamente IS 'Indica se o número foi gerado automaticamente pelo sistema';

COMMENT ON TABLE financeiro.nfe_itens IS 'Itens da Nota Fiscal Eletrônica';
COMMENT ON TABLE financeiro.nfse_itens IS 'Itens da Nota Fiscal de Serviços Eletrônica';

