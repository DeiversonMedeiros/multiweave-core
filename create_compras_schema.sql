-- =====================================================
-- MÓDULO COMPRAS - CRIAÇÃO DO ESQUEMA E TABELAS
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Criação completa do módulo de compras integrado
-- com os esquemas existentes (public, almoxarifado, financeiro, rh)
-- =====================================================

-- Criar esquema compras
CREATE SCHEMA IF NOT EXISTS compras;
COMMENT ON SCHEMA compras IS 'Módulo de Compras - Requisições, Cotações, Pedidos e Gestão de Fornecedores';

-- =====================================================
-- TIPOS ENUM
-- =====================================================

-- Status de requisições
CREATE TYPE compras.status_requisicao AS ENUM (
    'rascunho',
    'pendente_aprovacao',
    'aprovada',
    'em_cotacao',
    'cotada',
    'em_pedido',
    'finalizada',
    'cancelada'
);

-- Status de cotações
CREATE TYPE compras.status_cotacao AS ENUM (
    'rascunho',
    'enviada',
    'recebida',
    'aprovada',
    'rejeitada',
    'vencida'
);

-- Status de pedidos
CREATE TYPE compras.status_pedido AS ENUM (
    'rascunho',
    'aprovado',
    'enviado',
    'confirmado',
    'parcialmente_entregue',
    'entregue',
    'cancelado'
);

-- Prioridades
CREATE TYPE compras.prioridade AS ENUM (
    'baixa',
    'normal',
    'alta',
    'urgente'
);

-- Métodos de envio de cotação
CREATE TYPE compras.metodo_envio AS ENUM (
    'email',
    'link_externo',
    'presencial',
    'telefone',
    'whatsapp'
);

-- Tipos de reajuste
CREATE TYPE compras.tipo_reajuste AS ENUM (
    'ipca',
    'igpm',
    'inpc',
    'fixo',
    'livre'
);

-- =====================================================
-- TABELA 1: FORNECEDORES DADOS (Estende public.partners)
-- =====================================================

CREATE TABLE compras.fornecedores_dados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Dados específicos de compras
    contato_principal VARCHAR(255),
    email_cotacao VARCHAR(255),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    
    -- Endereço específico para compras (pode ser diferente do partner)
    uf VARCHAR(2),
    cidade VARCHAR(100),
    endereco TEXT,
    cep VARCHAR(10),
    
    -- Dados comerciais
    prazo_pagamento INTEGER DEFAULT 30, -- dias
    desconto_padrao DECIMAL(5,2) DEFAULT 0, -- percentual
    limite_credito DECIMAL(15,2),
    
    -- Avaliação
    nota_media DECIMAL(3,2) DEFAULT 0,
    total_avaliacoes INTEGER DEFAULT 0,
    
    -- Status e observações
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    UNIQUE(partner_id, company_id)
);

COMMENT ON TABLE compras.fornecedores_dados IS 'Dados específicos de fornecedores para o módulo de compras';
COMMENT ON COLUMN compras.fornecedores_dados.partner_id IS 'Referência ao partner base em public.partners';
COMMENT ON COLUMN compras.fornecedores_dados.nota_media IS 'Média das avaliações (0-10)';
COMMENT ON COLUMN compras.fornecedores_dados.prazo_pagamento IS 'Prazo de pagamento em dias';

-- =====================================================
-- TABELA 2: REQUISIÇÕES DE COMPRA
-- =====================================================

CREATE TABLE compras.requisicoes_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    solicitante_id UUID NOT NULL REFERENCES public.users(id),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    
    -- Numeração e datas
    numero_requisicao VARCHAR(50) NOT NULL,
    data_solicitacao DATE DEFAULT CURRENT_DATE,
    data_necessidade DATE,
    
    -- Status e prioridade
    status compras.status_requisicao DEFAULT 'rascunho',
    prioridade compras.prioridade DEFAULT 'normal',
    
    -- Valores
    valor_total_estimado DECIMAL(15,2) DEFAULT 0,
    valor_total_aprovado DECIMAL(15,2),
    
    -- Aprovação
    aprovado_por UUID REFERENCES public.users(id),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes_aprovacao TEXT,
    
    -- Observações gerais
    observacoes TEXT,
    justificativa TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero_requisicao),
    CHECK (data_necessidade >= data_solicitacao)
);

COMMENT ON TABLE compras.requisicoes_compra IS 'Requisições de compra com workflow de aprovação';
COMMENT ON COLUMN compras.requisicoes_compra.numero_requisicao IS 'Número sequencial da requisição por empresa';
COMMENT ON COLUMN compras.requisicoes_compra.data_necessidade IS 'Data em que o material é necessário';

-- =====================================================
-- TABELA 3: ITENS DE REQUISIÇÃO
-- =====================================================

CREATE TABLE compras.requisicao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisicao_id UUID NOT NULL REFERENCES compras.requisicoes_compra(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id),
    almoxarifado_id UUID REFERENCES almoxarifado.almoxarifados(id),
    
    -- Quantidade e valores
    quantidade DECIMAL(10,3) NOT NULL CHECK (quantidade > 0),
    unidade_medida VARCHAR(20) DEFAULT 'UN',
    valor_unitario_estimado DECIMAL(10,2),
    valor_total_estimado DECIMAL(15,2),
    
    -- Especificações
    especificacao_tecnica TEXT,
    observacoes TEXT,
    
    -- Status do item
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'cotado', 'aprovado', 'rejeitado')),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(requisicao_id, material_id)
);

COMMENT ON TABLE compras.requisicao_itens IS 'Itens das requisições de compra';
COMMENT ON COLUMN compras.requisicao_itens.almoxarifado_id IS 'Almoxarifado de destino do material';

-- =====================================================
-- TABELA 4: COTAÇÕES
-- =====================================================

CREATE TABLE compras.cotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisicao_id UUID NOT NULL REFERENCES compras.requisicoes_compra(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id),
    
    -- Numeração e datas
    numero_cotacao VARCHAR(50),
    data_cotacao DATE DEFAULT CURRENT_DATE,
    data_validade DATE,
    
    -- Status e método
    status compras.status_cotacao DEFAULT 'rascunho',
    metodo_envio compras.metodo_envio,
    link_fornecedor TEXT,
    
    -- Valores
    valor_total DECIMAL(15,2) DEFAULT 0,
    desconto_percentual DECIMAL(5,2) DEFAULT 0,
    valor_final DECIMAL(15,2) DEFAULT 0,
    
    -- Prazo e condições
    prazo_entrega INTEGER, -- dias
    condicoes_pagamento TEXT,
    observacoes TEXT,
    
    -- Anexos
    anexos JSONB DEFAULT '[]'::jsonb,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    UNIQUE(requisicao_id, fornecedor_id),
    CHECK (data_validade >= data_cotacao)
);

COMMENT ON TABLE compras.cotacoes IS 'Cotações de fornecedores para requisições';
COMMENT ON COLUMN compras.cotacoes.link_fornecedor IS 'Link para fornecedor preencher cotação online';
COMMENT ON COLUMN compras.cotacoes.anexos IS 'Array de anexos em JSON';

-- =====================================================
-- TABELA 5: ITENS DE COTAÇÃO
-- =====================================================

CREATE TABLE compras.cotacao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID NOT NULL REFERENCES compras.cotacoes(id) ON DELETE CASCADE,
    requisicao_item_id UUID NOT NULL REFERENCES compras.requisicao_itens(id),
    material_id UUID NOT NULL REFERENCES public.materials(id),
    
    -- Quantidade e valores
    quantidade DECIMAL(10,3) NOT NULL CHECK (quantidade > 0),
    valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0),
    valor_total DECIMAL(15,2) NOT NULL CHECK (valor_total >= 0),
    
    -- Prazo e condições específicas
    prazo_entrega INTEGER, -- dias
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(cotacao_id, requisicao_item_id)
);

COMMENT ON TABLE compras.cotacao_itens IS 'Itens específicos de cada cotação';

-- =====================================================
-- TABELA 6: PEDIDOS DE COMPRA
-- =====================================================

CREATE TABLE compras.pedidos_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID REFERENCES compras.cotacoes(id),
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Numeração e datas
    numero_pedido VARCHAR(50) NOT NULL,
    data_pedido DATE DEFAULT CURRENT_DATE,
    data_entrega_prevista DATE,
    data_entrega_real DATE,
    
    -- Status
    status compras.status_pedido DEFAULT 'rascunho',
    
    -- Valores
    valor_total DECIMAL(15,2) DEFAULT 0,
    desconto_percentual DECIMAL(5,2) DEFAULT 0,
    valor_final DECIMAL(15,2) DEFAULT 0,
    
    -- Dados da NF (pode ser diferente do fornecedor - multi-CNPJ)
    cnpj_emissor VARCHAR(18),
    razao_social_emissor VARCHAR(255),
    
    -- Observações
    observacoes TEXT,
    condicoes_especiais TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero_pedido),
    CHECK (data_entrega_prevista >= data_pedido)
);

COMMENT ON TABLE compras.pedidos_compra IS 'Pedidos de compra gerados a partir de cotações';
COMMENT ON COLUMN compras.pedidos_compra.cnpj_emissor IS 'CNPJ que emitirá a NF (pode ser diferente do fornecedor)';

-- =====================================================
-- TABELA 7: ITENS DE PEDIDO
-- =====================================================

CREATE TABLE compras.pedido_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES compras.pedidos_compra(id) ON DELETE CASCADE,
    cotacao_item_id UUID REFERENCES compras.cotacao_itens(id),
    material_id UUID NOT NULL REFERENCES public.materials(id),
    
    -- Quantidade e valores
    quantidade DECIMAL(10,3) NOT NULL CHECK (quantidade > 0),
    valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0),
    valor_total DECIMAL(15,2) NOT NULL CHECK (valor_total >= 0),
    
    -- Status e prazo
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'parcial', 'cancelado')),
    prazo_entrega INTEGER, -- dias
    quantidade_entregue DECIMAL(10,3) DEFAULT 0,
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE compras.pedido_itens IS 'Itens específicos de cada pedido de compra';

-- =====================================================
-- TABELA 8: AVALIAÇÕES DE FORNECEDOR
-- =====================================================

CREATE TABLE compras.avaliacoes_fornecedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES compras.pedidos_compra(id),
    avaliador_id UUID NOT NULL REFERENCES public.users(id),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Notas (0-10)
    nota_prazo DECIMAL(3,2) NOT NULL CHECK (nota_prazo >= 0 AND nota_prazo <= 10),
    nota_qualidade DECIMAL(3,2) NOT NULL CHECK (nota_qualidade >= 0 AND nota_qualidade <= 10),
    nota_preco DECIMAL(3,2) NOT NULL CHECK (nota_preco >= 0 AND nota_preco <= 10),
    nota_atendimento DECIMAL(3,2) NOT NULL CHECK (nota_atendimento >= 0 AND nota_atendimento <= 10),
    
    -- Média calculada
    media_geral DECIMAL(3,2) GENERATED ALWAYS AS (
        (nota_prazo + nota_qualidade + nota_preco + nota_atendimento) / 4
    ) STORED,
    
    -- Observações
    observacoes TEXT,
    data_avaliacao DATE DEFAULT CURRENT_DATE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE compras.avaliacoes_fornecedor IS 'Avaliações de fornecedores por pedidos';
COMMENT ON COLUMN compras.avaliacoes_fornecedor.media_geral IS 'Média automática das 4 notas';

-- =====================================================
-- TABELA 9: CONTRATOS
-- =====================================================

CREATE TABLE compras.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Numeração e descrição
    numero_contrato VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    
    -- Período
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    renovacao_automatica BOOLEAN DEFAULT false,
    
    -- Valores
    valor_total DECIMAL(15,2),
    valor_mensal DECIMAL(15,2),
    
    -- Reajuste
    tipo_reajuste compras.tipo_reajuste,
    indice_reajuste VARCHAR(50),
    percentual_reajuste DECIMAL(5,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'finalizado', 'cancelado')),
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero_contrato),
    CHECK (data_fim >= data_inicio)
);

COMMENT ON TABLE compras.contratos IS 'Contratos com fornecedores';
COMMENT ON COLUMN compras.contratos.renovacao_automatica IS 'Se o contrato deve ser renovado automaticamente';

-- =====================================================
-- TABELA 10: COMPRAS RECORRENTES
-- =====================================================

CREATE TABLE compras.compras_recorrentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID REFERENCES compras.contratos(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Quantidade e valores
    quantidade_mensal DECIMAL(10,3) NOT NULL CHECK (quantidade_mensal > 0),
    valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0),
    valor_total_mensal DECIMAL(15,2) GENERATED ALWAYS AS (quantidade_mensal * valor_unitario) STORED,
    
    -- Próxima compra
    proxima_compra DATE,
    frequencia_dias INTEGER DEFAULT 30,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'finalizado')),
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE compras.compras_recorrentes IS 'Compras recorrentes baseadas em contratos';

-- =====================================================
-- TABELA 11: HISTÓRICO DE PREÇOS
-- =====================================================

CREATE TABLE compras.historico_precos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES compras.fornecedores_dados(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Valores
    valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0),
    quantidade DECIMAL(10,3),
    
    -- Referências
    cotacao_id UUID REFERENCES compras.cotacoes(id),
    pedido_id UUID REFERENCES compras.pedidos_compra(id),
    
    -- Data e observações
    data_cotacao DATE DEFAULT CURRENT_DATE,
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE compras.historico_precos IS 'Histórico de preços de materiais por fornecedor';

-- =====================================================
-- TABELA 12: HISTÓRICO DE COMPRAS
-- =====================================================

CREATE TABLE compras.historico_compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES compras.pedidos_compra(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id),
    fornecedor_id UUID NOT NULL REFERENCES compras.fornecedores_dados(id),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Quantidade e valores
    quantidade DECIMAL(10,3) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    
    -- Datas
    data_compra DATE NOT NULL,
    data_entrega DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'entregue' CHECK (status IN ('pendente', 'entregue', 'parcial', 'cancelado')),
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE compras.historico_compras IS 'Histórico consolidado de todas as compras realizadas';

-- =====================================================
-- TABELA 13: APROVAÇÕES DE REQUISIÇÃO
-- =====================================================

CREATE TABLE compras.aprovacoes_requisicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisicao_id UUID NOT NULL REFERENCES compras.requisicoes_compra(id) ON DELETE CASCADE,
    aprovador_id UUID NOT NULL REFERENCES public.users(id),
    nivel_aprovacao INTEGER NOT NULL CHECK (nivel_aprovacao > 0),
    
    -- Status da aprovação
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE compras.aprovacoes_requisicao IS 'Workflow de aprovação para requisições';

-- =====================================================
-- TABELA 14: APROVAÇÕES DE COTAÇÃO
-- =====================================================

CREATE TABLE compras.aprovacoes_cotacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotacao_id UUID NOT NULL REFERENCES compras.cotacoes(id) ON DELETE CASCADE,
    aprovador_id UUID NOT NULL REFERENCES public.users(id),
    nivel_aprovacao INTEGER NOT NULL CHECK (nivel_aprovacao > 0),
    
    -- Status da aprovação
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE compras.aprovacoes_cotacao IS 'Workflow de aprovação para cotações';

-- =====================================================
-- TABELA 15: CONFIGURAÇÕES DE APROVAÇÃO
-- =====================================================

CREATE TABLE compras.configuracoes_aprovacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Tipo de documento
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('requisicao', 'cotacao', 'pedido')),
    
    -- Limites
    valor_limite DECIMAL(15,2) NOT NULL CHECK (valor_limite > 0),
    nivel_aprovacao INTEGER NOT NULL CHECK (nivel_aprovacao > 0),
    
    -- Filtros
    departamento_id UUID REFERENCES public.cost_centers(id),
    classe_financeira VARCHAR(50),
    perfil_id UUID REFERENCES public.profiles(id),
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    UNIQUE(company_id, tipo_documento, valor_limite, nivel_aprovacao)
);

COMMENT ON TABLE compras.configuracoes_aprovacao IS 'Configurações de aprovação por valor, departamento e perfil';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para requisições
CREATE INDEX idx_requisicoes_company_status ON compras.requisicoes_compra(company_id, status);
CREATE INDEX idx_requisicoes_solicitante ON compras.requisicoes_compra(solicitante_id);
CREATE INDEX idx_requisicoes_data ON compras.requisicoes_compra(data_solicitacao);

-- Índices para cotações
CREATE INDEX idx_cotacoes_requisicao ON compras.cotacoes(requisicao_id);
CREATE INDEX idx_cotacoes_fornecedor ON compras.cotacoes(fornecedor_id);
CREATE INDEX idx_cotacoes_status ON compras.cotacoes(status);

-- Índices para pedidos
CREATE INDEX idx_pedidos_company_status ON compras.pedidos_compra(company_id, status);
CREATE INDEX idx_pedidos_fornecedor ON compras.pedidos_compra(fornecedor_id);
CREATE INDEX idx_pedidos_data ON compras.pedidos_compra(data_pedido);

-- Índices para histórico
CREATE INDEX idx_historico_precos_material ON compras.historico_precos(material_id, data_cotacao);
CREATE INDEX idx_historico_compras_material ON compras.historico_compras(material_id, data_compra);
CREATE INDEX idx_historico_compras_fornecedor ON compras.historico_compras(fornecedor_id, data_compra);

-- Índices para fornecedores
CREATE INDEX idx_fornecedores_partner ON compras.fornecedores_dados(partner_id);
CREATE INDEX idx_fornecedores_company ON compras.fornecedores_dados(company_id);
CREATE INDEX idx_fornecedores_uf ON compras.fornecedores_dados(uf);

-- =====================================================
-- TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION compras.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas principais
CREATE TRIGGER update_requisicoes_updated_at BEFORE UPDATE ON compras.requisicoes_compra FOR EACH ROW EXECUTE FUNCTION compras.update_updated_at_column();
CREATE TRIGGER update_cotacoes_updated_at BEFORE UPDATE ON compras.cotacoes FOR EACH ROW EXECUTE FUNCTION compras.update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON compras.pedidos_compra FOR EACH ROW EXECUTE FUNCTION compras.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON compras.fornecedores_dados FOR EACH ROW EXECUTE FUNCTION compras.update_updated_at_column();

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para gerar número sequencial de requisição
CREATE OR REPLACE FUNCTION compras.gerar_numero_requisicao(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    proximo_numero INTEGER;
    numero_formatado VARCHAR(50);
BEGIN
    -- Buscar próximo número
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_requisicao FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM compras.requisicoes_compra
    WHERE company_id = p_company_id;
    
    -- Formatar número
    numero_formatado := 'REQ-' || LPAD(proximo_numero::TEXT, 6, '0');
    
    RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número sequencial de pedido
CREATE OR REPLACE FUNCTION compras.gerar_numero_pedido(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    proximo_numero INTEGER;
    numero_formatado VARCHAR(50);
BEGIN
    -- Buscar próximo número
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM compras.pedidos_compra
    WHERE company_id = p_company_id;
    
    -- Formatar número
    numero_formatado := 'PED-' || LPAD(proximo_numero::TEXT, 6, '0');
    
    RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA compras IS 'Módulo de Compras completo com requisições, cotações, pedidos, avaliação de fornecedores e contratos';

-- Log de criação
INSERT INTO rh.audit_logs (
    table_name,
    operation_type,
    new_data,
    user_id,
    company_id,
    created_at
) VALUES (
    'compras.schema',
    'CREATE',
    '{"schema": "compras", "tables": 15, "description": "Módulo de Compras criado com sucesso"}'::jsonb,
    (SELECT id FROM public.users LIMIT 1),
    (SELECT id FROM public.companies LIMIT 1),
    NOW()
);


