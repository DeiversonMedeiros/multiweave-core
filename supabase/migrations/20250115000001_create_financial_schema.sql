-- =====================================================
-- MIGRAÇÃO: CRIAR ESQUEMA FINANCEIRO
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Cria o esquema financeiro completo com todas as tabelas, políticas RLS e funções
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. CRIAR ESQUEMA FINANCEIRO
-- =====================================================

CREATE SCHEMA IF NOT EXISTS financeiro;

-- Comentário do esquema
COMMENT ON SCHEMA financeiro IS 'Módulo Financeiro - Contas a Pagar/Receber, Tesouraria, Fiscal e Contabilidade';

-- =====================================================
-- 2. CONTAS A PAGAR/RECEBER
-- =====================================================

-- Tabela principal de contas a pagar
CREATE TABLE IF NOT EXISTS financeiro.contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_titulo VARCHAR(50) NOT NULL,
    fornecedor_id UUID REFERENCES public.partners(id),
    fornecedor_nome VARCHAR(255),
    fornecedor_cnpj VARCHAR(18),
    descricao TEXT NOT NULL,
    valor_original DECIMAL(15,2) NOT NULL,
    valor_atual DECIMAL(15,2) NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    departamento VARCHAR(100),
    classe_financeira VARCHAR(100),
    categoria VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'pago', 'vencido', 'cancelado')),
    forma_pagamento VARCHAR(50),
    conta_bancaria_id UUID,
    observacoes TEXT,
    anexos TEXT[],
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_juros DECIMAL(15,2) DEFAULT 0,
    valor_multa DECIMAL(15,2) DEFAULT 0,
    valor_pago DECIMAL(15,2) DEFAULT 0,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    aprovado_por UUID ,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela principal de contas a receber
CREATE TABLE IF NOT EXISTS financeiro.contas_receber (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_titulo VARCHAR(50) NOT NULL,
    cliente_id UUID REFERENCES public.partners(id),
    cliente_nome VARCHAR(255),
    cliente_cnpj VARCHAR(18),
    descricao TEXT NOT NULL,
    valor_original DECIMAL(15,2) NOT NULL,
    valor_atual DECIMAL(15,2) NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    departamento VARCHAR(100),
    classe_financeira VARCHAR(100),
    categoria VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'recebido', 'vencido', 'cancelado')),
    forma_recebimento VARCHAR(50),
    conta_bancaria_id UUID,
    observacoes TEXT,
    anexos TEXT[],
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_juros DECIMAL(15,2) DEFAULT 0,
    valor_multa DECIMAL(15,2) DEFAULT 0,
    valor_recebido DECIMAL(15,2) DEFAULT 0,
    data_confirmacao TIMESTAMP WITH TIME ZONE,
    confirmado_por UUID ,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de borderôs
CREATE TABLE IF NOT EXISTS financeiro.borderos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_borderos VARCHAR(50) NOT NULL,
    data_geracao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    quantidade_titulos INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'gerado' CHECK (status IN ('gerado', 'enviado', 'processado', 'retornado')),
    banco_codigo VARCHAR(10),
    arquivo_remessa TEXT,
    arquivo_retorno TEXT,
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de remessas bancárias
CREATE TABLE IF NOT EXISTS financeiro.remessas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    borderos_id UUID REFERENCES financeiro.borderos(id),
    numero_remessa VARCHAR(50) NOT NULL,
    data_remessa DATE NOT NULL,
    banco_codigo VARCHAR(10) NOT NULL,
    agencia VARCHAR(10),
    conta VARCHAR(20),
    arquivo_cnab TEXT,
    status VARCHAR(20) DEFAULT 'enviada' CHECK (status IN ('enviada', 'processada', 'retornada')),
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de retornos bancários
CREATE TABLE IF NOT EXISTS financeiro.retornos_bancarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    remessa_id UUID REFERENCES financeiro.remessas_bancarias(id),
    numero_retorno VARCHAR(50) NOT NULL,
    data_retorno DATE NOT NULL,
    banco_codigo VARCHAR(10) NOT NULL,
    arquivo_retorno TEXT,
    status VARCHAR(20) DEFAULT 'processado' CHECK (status IN ('processado', 'erro', 'pendente')),
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TESOURARIA
-- =====================================================

-- Tabela de contas bancárias
CREATE TABLE IF NOT EXISTS financeiro.contas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    banco_codigo VARCHAR(10) NOT NULL,
    banco_nome VARCHAR(100) NOT NULL,
    agencia VARCHAR(10) NOT NULL,
    conta VARCHAR(20) NOT NULL,
    tipo_conta VARCHAR(20) NOT NULL CHECK (tipo_conta IN ('corrente', 'poupanca', 'investimento')),
    moeda VARCHAR(3) DEFAULT 'BRL',
    saldo_atual DECIMAL(15,2) DEFAULT 0,
    saldo_disponivel DECIMAL(15,2) DEFAULT 0,
    limite_credito DECIMAL(15,2) DEFAULT 0,
    data_saldo DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conciliações bancárias
CREATE TABLE IF NOT EXISTS financeiro.conciliacoes_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    conta_bancaria_id UUID NOT NULL REFERENCES financeiro.contas_bancarias(id),
    data_conciliacao DATE NOT NULL,
    saldo_banco DECIMAL(15,2) NOT NULL,
    saldo_sistema DECIMAL(15,2) NOT NULL,
    diferenca DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliada', 'divergente')),
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de fluxo de caixa
CREATE TABLE IF NOT EXISTS financeiro.fluxo_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    data_projecao DATE NOT NULL,
    tipo_movimento VARCHAR(20) NOT NULL CHECK (tipo_movimento IN ('entrada', 'saida')),
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    conta_bancaria_id UUID REFERENCES financeiro.contas_bancarias(id),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    status VARCHAR(20) DEFAULT 'previsto' CHECK (status IN ('previsto', 'confirmado', 'realizado')),
    data_confirmacao DATE,
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. FISCAL
-- =====================================================

-- Tabela de NF-e
CREATE TABLE IF NOT EXISTS financeiro.nfe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chave_acesso VARCHAR(44) UNIQUE NOT NULL,
    numero_nfe VARCHAR(20) NOT NULL,
    serie VARCHAR(5) NOT NULL,
    data_emissao DATE NOT NULL,
    data_saida DATE,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    status_sefaz VARCHAR(20) DEFAULT 'pendente' CHECK (status_sefaz IN ('pendente', 'autorizada', 'rejeitada', 'cancelada', 'inutilizada')),
    xml_nfe TEXT,
    danfe_url TEXT,
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de NFS-e
CREATE TABLE IF NOT EXISTS financeiro.nfse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_nfse VARCHAR(20) NOT NULL,
    codigo_verificacao VARCHAR(50),
    data_emissao DATE NOT NULL,
    data_competencia DATE NOT NULL,
    valor_servico DECIMAL(15,2) NOT NULL,
    valor_iss DECIMAL(15,2) DEFAULT 0,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    valor_csll DECIMAL(15,2) DEFAULT 0,
    valor_ir DECIMAL(15,2) DEFAULT 0,
    status_sefaz VARCHAR(20) DEFAULT 'pendente' CHECK (status_sefaz IN ('pendente', 'autorizada', 'rejeitada', 'cancelada')),
    xml_nfse TEXT,
    observacoes TEXT,
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CONTABILIDADE
-- =====================================================

-- Tabela de plano de contas
CREATE TABLE IF NOT EXISTS financeiro.plano_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo_conta VARCHAR(20) NOT NULL CHECK (tipo_conta IN ('ativo', 'passivo', 'patrimonio', 'receita', 'despesa')),
    nivel INTEGER NOT NULL DEFAULT 1,
    conta_pai_id UUID REFERENCES financeiro.plano_contas(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, codigo)
);

-- Tabela de lançamentos contábeis
CREATE TABLE IF NOT EXISTS financeiro.lancamentos_contabeis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    data_lancamento DATE NOT NULL,
    conta_debito_id UUID NOT NULL REFERENCES financeiro.plano_contas(id),
    conta_credito_id UUID NOT NULL REFERENCES financeiro.plano_contas(id),
    valor DECIMAL(15,2) NOT NULL,
    historico TEXT NOT NULL,
    documento VARCHAR(50),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    tipo_lancamento VARCHAR(20) DEFAULT 'manual' CHECK (tipo_lancamento IN ('manual', 'automatico', 'importado')),
    origem_id UUID,
    origem_tipo VARCHAR(50),
    created_by UUID ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SISTEMA DE APROVAÇÃO
-- =====================================================

-- Tabela de configurações de aprovação
CREATE TABLE IF NOT EXISTS financeiro.configuracoes_aprovacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_aprovacao VARCHAR(50) NOT NULL, -- 'conta_pagar', 'conta_receber', 'pagamento', 'recebimento'
    valor_limite DECIMAL(15,2) NOT NULL,
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    departamento VARCHAR(100),
    classe_financeira VARCHAR(100),
    usuario_id UUID ,
    nivel_aprovacao INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de aprovações
CREATE TABLE IF NOT EXISTS financeiro.aprovacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entidade_tipo VARCHAR(50) NOT NULL, -- 'conta_pagar', 'conta_receber', 'pagamento', 'recebimento'
    entidade_id UUID NOT NULL,
    nivel_aprovacao INTEGER NOT NULL,
    aprovador_id UUID NOT NULL ,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para contas a pagar
CREATE INDEX IF NOT EXISTS idx_contas_pagar_company_id ON financeiro.contas_pagar(company_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON financeiro.contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON financeiro.contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON financeiro.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_centro_custo ON financeiro.contas_pagar(centro_custo_id);

-- Índices para contas a receber
CREATE INDEX IF NOT EXISTS idx_contas_receber_company_id ON financeiro.contas_receber(company_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON financeiro.contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON financeiro.contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON financeiro.contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_centro_custo ON financeiro.contas_receber(centro_custo_id);

-- Índices para tesouraria
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_company_id ON financeiro.contas_bancarias(company_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_company_id ON financeiro.fluxo_caixa(company_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data ON financeiro.fluxo_caixa(data_projecao);

-- Índices para fiscal
CREATE INDEX IF NOT EXISTS idx_nfe_company_id ON financeiro.nfe(company_id);
CREATE INDEX IF NOT EXISTS idx_nfe_chave ON financeiro.nfe(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfse_company_id ON financeiro.nfse(company_id);

-- Índices para contabilidade
CREATE INDEX IF NOT EXISTS idx_plano_contas_company_id ON financeiro.plano_contas(company_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_company_id ON financeiro.lancamentos_contabeis(company_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON financeiro.lancamentos_contabeis(data_lancamento);

-- Índices para aprovações
CREATE INDEX IF NOT EXISTS idx_aprovacoes_company_id ON financeiro.aprovacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_entidade ON financeiro.aprovacoes(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_aprovador ON financeiro.aprovacoes(aprovador_id);

-- =====================================================
-- 8. COMENTÁRIOS DAS TABELAS
-- =====================================================

COMMENT ON TABLE financeiro.contas_pagar IS 'Contas a pagar da empresa';
COMMENT ON TABLE financeiro.contas_receber IS 'Contas a receber da empresa';
COMMENT ON TABLE financeiro.borderos IS 'Borderôs de cobrança';
COMMENT ON TABLE financeiro.remessas_bancarias IS 'Remessas bancárias (CNAB)';
COMMENT ON TABLE financeiro.retornos_bancarios IS 'Retornos bancários (CNAB)';
COMMENT ON TABLE financeiro.contas_bancarias IS 'Contas bancárias da empresa';
COMMENT ON TABLE financeiro.conciliacoes_bancarias IS 'Conciliações bancárias';
COMMENT ON TABLE financeiro.fluxo_caixa IS 'Fluxo de caixa e projeções';
COMMENT ON TABLE financeiro.nfe IS 'Notas Fiscais Eletrônicas';
COMMENT ON TABLE financeiro.nfse IS 'Notas Fiscais de Serviços Eletrônicas';
COMMENT ON TABLE financeiro.plano_contas IS 'Plano de contas contábil';
COMMENT ON TABLE financeiro.lancamentos_contabeis IS 'Lançamentos contábeis';
COMMENT ON TABLE financeiro.configuracoes_aprovacao IS 'Configurações de aprovação por valor/centro de custo/departamento/classe/usuário';
COMMENT ON TABLE financeiro.aprovacoes IS 'Histórico de aprovações';

