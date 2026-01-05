-- =====================================================
-- MIGRAÇÃO: Criação do Schema Metalúrgica
-- Data: 2025-01-05
-- Descrição: Módulo completo de produção metalúrgica com PCP, controle de qualidade,
--            galvanização, paradas de produção e indicadores OEE/MTBF/MTTR
-- =====================================================

-- Criar schema metalurgica
CREATE SCHEMA IF NOT EXISTS metalurgica;
COMMENT ON SCHEMA metalurgica IS 'Módulo de Produção Metalúrgica - OP, OS, PCP, Qualidade, Galvanização e Indicadores';

-- =====================================================
-- TIPOS ENUM
-- =====================================================

-- Tipo de produto
CREATE TYPE metalurgica.tipo_produto AS ENUM (
    'produto_final',
    'semiacabado',
    'materia_prima',
    'insumo'
);

-- Status de Ordem de Produção
CREATE TYPE metalurgica.status_op AS ENUM (
    'rascunho',
    'planejada',
    'aprovada',
    'materiais_reservados',
    'em_producao',
    'pausada',
    'concluida',
    'cancelada'
);

-- Status de Ordem de Serviço
CREATE TYPE metalurgica.status_os AS ENUM (
    'rascunho',
    'planejada',
    'aprovada',
    'materiais_reservados',
    'em_producao',
    'pausada',
    'concluida',
    'cancelada'
);

-- Status de solicitação de materiais
CREATE TYPE metalurgica.status_solicitacao_material AS ENUM (
    'pendente',
    'parcialmente_atendida',
    'atendida',
    'cancelada'
);

-- Status de lote
CREATE TYPE metalurgica.status_lote AS ENUM (
    'em_producao',
    'aguardando_inspecao',
    'aprovado',
    'reprovado',
    'retrabalho',
    'sucata',
    'concluido'
);

-- Status de galvanização
CREATE TYPE metalurgica.status_galvanizacao AS ENUM (
    'pendente',
    'enviado',
    'em_processo',
    'concluido',
    'retornado',
    'entregue_direto',
    'cancelado'
);

-- Status de inspeção
CREATE TYPE metalurgica.status_inspecao AS ENUM (
    'pendente',
    'em_andamento',
    'aprovada',
    'reprovada',
    'retrabalho'
);

-- Tipo de parada
CREATE TYPE metalurgica.tipo_parada AS ENUM (
    'quebra_maquina',
    'falta_material',
    'setup',
    'manutencao_preventiva',
    'qualidade',
    'organizacional',
    'outros'
);

-- Tipo de não conformidade
CREATE TYPE metalurgica.tipo_nao_conformidade AS ENUM (
    'materia_prima',
    'semiacabado',
    'produto_final',
    'galvanizado'
);

-- Status de não conformidade
CREATE TYPE metalurgica.status_nao_conformidade AS ENUM (
    'identificada',
    'em_analise',
    'em_quarentena',
    'retrabalho',
    'sucata',
    'concessao_cliente',
    'resolvida'
);

-- =====================================================
-- 1. PRODUTOS METALÚRGICOS
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_equipamento_id UUID REFERENCES almoxarifado.materiais_equipamentos(id),
    codigo VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    tipo metalurgica.tipo_produto NOT NULL,
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'UN',
    peso_unitario_kg DECIMAL(10,3), -- Peso em kg para controle
    tempo_producao_minutos INTEGER, -- Tempo estimado de produção em minutos
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_produto_codigo_company UNIQUE (codigo, company_id),
    CONSTRAINT check_peso_positivo CHECK (peso_unitario_kg IS NULL OR peso_unitario_kg > 0),
    CONSTRAINT check_tempo_positivo CHECK (tempo_producao_minutos IS NULL OR tempo_producao_minutos > 0)
);

COMMENT ON TABLE metalurgica.produtos IS 'Cadastro de produtos finais, semiacabados e matérias-primas da metalúrgica';
COMMENT ON COLUMN metalurgica.produtos.peso_unitario_kg IS 'Peso unitário em kg para controle de produção por peso';
COMMENT ON COLUMN metalurgica.produtos.tempo_producao_minutos IS 'Tempo estimado de produção em minutos';

-- =====================================================
-- 2. ESTRUTURA DE PRODUTOS (BOM - Bill of Materials)
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.estrutura_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_pai_id UUID NOT NULL REFERENCES metalurgica.produtos(id) ON DELETE CASCADE,
    produto_filho_id UUID NOT NULL REFERENCES metalurgica.produtos(id) ON DELETE CASCADE,
    quantidade_necessaria DECIMAL(10,4) NOT NULL,
    unidade_medida VARCHAR(20) NOT NULL,
    perda_percentual DECIMAL(5,2) DEFAULT 0, -- Percentual de perda esperada
    sequencia INTEGER, -- Ordem de utilização na produção
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_estrutura_produto UNIQUE (produto_pai_id, produto_filho_id),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_necessaria > 0),
    CONSTRAINT check_produto_diferente CHECK (produto_pai_id != produto_filho_id),
    CONSTRAINT check_perda_valida CHECK (perda_percentual >= 0 AND perda_percentual <= 100)
);

COMMENT ON TABLE metalurgica.estrutura_produtos IS 'Estrutura de produtos (BOM) - define componentes necessários para produção';
COMMENT ON COLUMN metalurgica.estrutura_produtos.perda_percentual IS 'Percentual de perda esperada no processo';

-- =====================================================
-- 3. MÁQUINAS E EQUIPAMENTOS DE PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo VARCHAR(100) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(100), -- Tipo de máquina (solda, corte, dobra, etc.)
    capacidade_producao_hora DECIMAL(10,2), -- Capacidade de produção por hora
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_maquina_codigo_company UNIQUE (codigo, company_id)
);

COMMENT ON TABLE metalurgica.maquinas IS 'Cadastro de máquinas e equipamentos de produção';

-- =====================================================
-- 4. TIPOS DE PARADA
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.tipos_parada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo metalurgica.tipo_parada NOT NULL,
    descricao TEXT,
    afeta_oee BOOLEAN DEFAULT true, -- Se afeta o cálculo de OEE
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_tipo_parada_codigo_company UNIQUE (codigo, company_id)
);

COMMENT ON TABLE metalurgica.tipos_parada IS 'Cadastro de tipos de parada de produção';

-- =====================================================
-- 5. ORDENS DE PRODUÇÃO (OP)
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.ordens_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_op VARCHAR(100) NOT NULL,
    produto_id UUID NOT NULL REFERENCES metalurgica.produtos(id),
    quantidade_solicitada DECIMAL(10,3) NOT NULL,
    quantidade_produzida DECIMAL(10,3) DEFAULT 0,
    peso_total_kg DECIMAL(12,3), -- Peso total em kg
    status metalurgica.status_op DEFAULT 'rascunho',
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    cliente_id UUID REFERENCES public.partners(id),
    data_prevista_inicio DATE,
    data_prevista_termino DATE,
    data_inicio_producao TIMESTAMP WITH TIME ZONE,
    data_termino_producao TIMESTAMP WITH TIME ZONE,
    responsavel_producao_id UUID REFERENCES public.users(id),
    observacoes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_op_numero_company UNIQUE (numero_op, company_id),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_solicitada > 0),
    CONSTRAINT check_quantidade_produzida CHECK (quantidade_produzida >= 0),
    CONSTRAINT check_quantidade_produzida_menor CHECK (quantidade_produzida <= quantidade_solicitada * 1.1) -- Permite até 10% de excesso
);

COMMENT ON TABLE metalurgica.ordens_producao IS 'Ordens de Produção (OP) - Produção de Produtos Finais';
COMMENT ON COLUMN metalurgica.ordens_producao.peso_total_kg IS 'Peso total da produção em kg';

-- =====================================================
-- 6. ORDENS DE SERVIÇO (OS)
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.ordens_servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_os VARCHAR(100) NOT NULL,
    produto_id UUID NOT NULL REFERENCES metalurgica.produtos(id),
    quantidade_solicitada DECIMAL(10,3) NOT NULL,
    quantidade_produzida DECIMAL(10,3) DEFAULT 0,
    peso_total_kg DECIMAL(12,3), -- Peso total em kg
    status metalurgica.status_os DEFAULT 'rascunho',
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    op_vinculada_id UUID REFERENCES metalurgica.ordens_producao(id), -- OS pode estar vinculada a uma OP
    data_prevista_inicio DATE,
    data_prevista_termino DATE,
    data_inicio_producao TIMESTAMP WITH TIME ZONE,
    data_termino_producao TIMESTAMP WITH TIME ZONE,
    responsavel_producao_id UUID REFERENCES public.users(id),
    observacoes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_os_numero_company UNIQUE (numero_os, company_id),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_solicitada > 0),
    CONSTRAINT check_quantidade_produzida CHECK (quantidade_produzida >= 0),
    CONSTRAINT check_quantidade_produzida_menor CHECK (quantidade_produzida <= quantidade_solicitada * 1.1)
);

COMMENT ON TABLE metalurgica.ordens_servico IS 'Ordens de Serviço (OS) - Produção de Semiacabados';
COMMENT ON COLUMN metalurgica.ordens_servico.op_vinculada_id IS 'OP vinculada quando o semiacabado é para uma OP específica';

-- =====================================================
-- 7. SOLICITAÇÕES DE MATERIAIS PARA PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.solicitacoes_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    op_id UUID REFERENCES metalurgica.ordens_producao(id) ON DELETE CASCADE,
    os_id UUID REFERENCES metalurgica.ordens_servico(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id),
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id),
    quantidade_necessaria DECIMAL(10,4) NOT NULL,
    quantidade_reservada DECIMAL(10,4) DEFAULT 0,
    quantidade_liberada DECIMAL(10,4) DEFAULT 0,
    status metalurgica.status_solicitacao_material DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_op_ou_os CHECK ((op_id IS NOT NULL AND os_id IS NULL) OR (op_id IS NULL AND os_id IS NOT NULL)),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_necessaria > 0),
    CONSTRAINT check_quantidade_reservada CHECK (quantidade_reservada >= 0 AND quantidade_reservada <= quantidade_necessaria),
    CONSTRAINT check_quantidade_liberada CHECK (quantidade_liberada >= 0 AND quantidade_liberada <= quantidade_reservada)
);

COMMENT ON TABLE metalurgica.solicitacoes_materiais IS 'Solicitações de materiais para produção (OP ou OS)';
COMMENT ON COLUMN metalurgica.solicitacoes_materiais.quantidade_reservada IS 'Quantidade reservada no estoque';
COMMENT ON COLUMN metalurgica.solicitacoes_materiais.quantidade_liberada IS 'Quantidade liberada para produção';

-- =====================================================
-- 8. LOTES DE PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_lote VARCHAR(100) NOT NULL,
    op_id UUID REFERENCES metalurgica.ordens_producao(id),
    os_id UUID REFERENCES metalurgica.ordens_servico(id),
    produto_id UUID NOT NULL REFERENCES metalurgica.produtos(id),
    quantidade_produzida DECIMAL(10,3) NOT NULL,
    peso_total_kg DECIMAL(12,3), -- Peso total do lote em kg
    status metalurgica.status_lote DEFAULT 'em_producao',
    data_producao DATE NOT NULL,
    data_inicio_producao TIMESTAMP WITH TIME ZONE,
    data_termino_producao TIMESTAMP WITH TIME ZONE,
    maquina_id UUID REFERENCES metalurgica.maquinas(id),
    responsavel_producao_id UUID REFERENCES public.users(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_lote_numero_company UNIQUE (numero_lote, company_id),
    CONSTRAINT check_op_ou_os CHECK ((op_id IS NOT NULL AND os_id IS NULL) OR (op_id IS NULL AND os_id IS NOT NULL)),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_produzida > 0),
    CONSTRAINT check_peso_positivo CHECK (peso_total_kg IS NULL OR peso_total_kg > 0)
);

COMMENT ON TABLE metalurgica.lotes IS 'Lotes de produção - controle de produção por lote';
COMMENT ON COLUMN metalurgica.lotes.peso_total_kg IS 'Peso total do lote em kg';

-- =====================================================
-- 9. PARADAS DE PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.paradas_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    maquina_id UUID NOT NULL REFERENCES metalurgica.maquinas(id),
    tipo_parada_id UUID NOT NULL REFERENCES metalurgica.tipos_parada(id),
    op_id UUID REFERENCES metalurgica.ordens_producao(id),
    os_id UUID REFERENCES metalurgica.ordens_servico(id),
    data_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_hora_termino TIMESTAMP WITH TIME ZONE,
    duracao_minutos INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN data_hora_termino IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (data_hora_termino - data_hora_inicio)) / 60
            ELSE NULL
        END
    ) STORED,
    descricao TEXT,
    responsavel_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_data_termino_maior CHECK (data_hora_termino IS NULL OR data_hora_termino >= data_hora_inicio)
);

COMMENT ON TABLE metalurgica.paradas_producao IS 'Registro de paradas de produção para cálculo de OEE, MTBF e MTTR';

-- =====================================================
-- 10. GALVANIZAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.galvanizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_galvanizacao VARCHAR(100) NOT NULL,
    fornecedor_id UUID NOT NULL REFERENCES public.partners(id),
    status metalurgica.status_galvanizacao DEFAULT 'pendente',
    entrega_direta_cliente BOOLEAN DEFAULT false, -- Se será entregue direto ao cliente
    cliente_id UUID REFERENCES public.partners(id), -- Cliente para entrega direta
    data_envio DATE,
    data_prevista_retorno DATE,
    data_retorno DATE,
    data_entrega_cliente DATE, -- Data de entrega direta ao cliente
    peso_total_kg DECIMAL(12,3), -- Peso total enviado para galvanização
    observacoes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_galvanizacao_numero_company UNIQUE (numero_galvanizacao, company_id),
    CONSTRAINT check_entrega_direta_cliente CHECK (entrega_direta_cliente = false OR cliente_id IS NOT NULL)
);

COMMENT ON TABLE metalurgica.galvanizacoes IS 'Controle de envio e retorno de produtos para galvanização';
COMMENT ON COLUMN metalurgica.galvanizacoes.entrega_direta_cliente IS 'Se o produto será entregue direto do fornecedor ao cliente (sem retorno físico)';

-- =====================================================
-- 11. ITENS DE GALVANIZAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.galvanizacao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    galvanizacao_id UUID NOT NULL REFERENCES metalurgica.galvanizacoes(id) ON DELETE CASCADE,
    lote_id UUID NOT NULL REFERENCES metalurgica.lotes(id),
    quantidade DECIMAL(10,3) NOT NULL,
    peso_kg DECIMAL(12,3),
    observacoes TEXT,
    
    -- Constraints
    CONSTRAINT check_quantidade_positiva CHECK (quantidade > 0),
    CONSTRAINT check_peso_positivo CHECK (peso_kg IS NULL OR peso_kg > 0)
);

COMMENT ON TABLE metalurgica.galvanizacao_itens IS 'Itens (lotes) enviados para galvanização';

-- =====================================================
-- 12. INSPEÇÕES DE QUALIDADE
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.inspecoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    lote_id UUID NOT NULL REFERENCES metalurgica.lotes(id),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('inspecao_inicial', 'inspecao_final', 'inspecao_galvanizado')),
    status metalurgica.status_inspecao DEFAULT 'pendente',
    data_inspecao DATE,
    inspetor_id UUID REFERENCES public.users(id),
    quantidade_inspecionada DECIMAL(10,3),
    quantidade_aprovada DECIMAL(10,3) DEFAULT 0,
    quantidade_reprovada DECIMAL(10,3) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_quantidade_inspecionada CHECK (quantidade_inspecionada > 0),
    CONSTRAINT check_quantidade_aprovada CHECK (quantidade_aprovada >= 0),
    CONSTRAINT check_quantidade_reprovada CHECK (quantidade_reprovada >= 0),
    CONSTRAINT check_quantidade_total CHECK (quantidade_aprovada + quantidade_reprovada <= quantidade_inspecionada)
);

COMMENT ON TABLE metalurgica.inspecoes IS 'Inspeções de qualidade de lotes produzidos';

-- =====================================================
-- 13. CERTIFICADOS DE QUALIDADE
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.certificados_qualidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_certificado VARCHAR(100) NOT NULL,
    lote_id UUID NOT NULL REFERENCES metalurgica.lotes(id),
    inspecao_id UUID NOT NULL REFERENCES metalurgica.inspecoes(id),
    produto_id UUID NOT NULL REFERENCES metalurgica.produtos(id),
    quantidade_certificada DECIMAL(10,3) NOT NULL,
    peso_total_kg DECIMAL(12,3),
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    emitido_por UUID NOT NULL REFERENCES public.users(id),
    observacoes TEXT,
    arquivo_url TEXT, -- URL do certificado em PDF
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_certificado_numero_company UNIQUE (numero_certificado, company_id),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_certificada > 0),
    CONSTRAINT check_peso_positivo CHECK (peso_total_kg IS NULL OR peso_total_kg > 0)
);

COMMENT ON TABLE metalurgica.certificados_qualidade IS 'Certificados de qualidade gerados automaticamente após inspeção final';

-- =====================================================
-- 14. NÃO CONFORMIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.nao_conformidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_nc VARCHAR(100) NOT NULL,
    tipo metalurgica.tipo_nao_conformidade NOT NULL,
    status metalurgica.status_nao_conformidade DEFAULT 'identificada',
    lote_id UUID REFERENCES metalurgica.lotes(id),
    material_id UUID REFERENCES almoxarifado.materiais_equipamentos(id),
    descricao_problema TEXT NOT NULL,
    quantidade_afetada DECIMAL(10,3),
    area_quarentena VARCHAR(255), -- Área de quarentena onde está segregado
    acao_corretiva TEXT,
    responsavel_id UUID REFERENCES public.users(id),
    data_identificacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_resolucao DATE,
    observacoes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_nc_numero_company UNIQUE (numero_nc, company_id),
    CONSTRAINT check_lote_ou_material CHECK (lote_id IS NOT NULL OR material_id IS NOT NULL),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_afetada IS NULL OR quantidade_afetada > 0)
);

COMMENT ON TABLE metalurgica.nao_conformidades IS 'Controle de não conformidades conforme procedimento específico';

-- =====================================================
-- 15. PCP - PLANEJAMENTO E CONTROLE DE PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.planejamento_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovado', 'em_execucao', 'concluido', 'cancelado')),
    observacoes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_periodo_valido CHECK (periodo_fim >= periodo_inicio)
);

COMMENT ON TABLE metalurgica.planejamento_producao IS 'Planejamento de produção por período';

-- =====================================================
-- 16. ITENS DO PLANEJAMENTO DE PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS metalurgica.planejamento_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planejamento_id UUID NOT NULL REFERENCES metalurgica.planejamento_producao(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES metalurgica.produtos(id),
    quantidade_planejada DECIMAL(10,3) NOT NULL,
    quantidade_realizada DECIMAL(10,3) DEFAULT 0,
    data_prevista DATE,
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_planejada > 0),
    CONSTRAINT check_quantidade_realizada CHECK (quantidade_realizada >= 0)
);

COMMENT ON TABLE metalurgica.planejamento_itens IS 'Itens do planejamento de produção';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_company_id ON metalurgica.produtos(company_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON metalurgica.produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON metalurgica.produtos(ativo) WHERE ativo = true;

-- Índices para estrutura_produtos
CREATE INDEX IF NOT EXISTS idx_estrutura_produto_pai ON metalurgica.estrutura_produtos(produto_pai_id);
CREATE INDEX IF NOT EXISTS idx_estrutura_produto_filho ON metalurgica.estrutura_produtos(produto_filho_id);

-- Índices para ordens_producao
CREATE INDEX IF NOT EXISTS idx_op_company_id ON metalurgica.ordens_producao(company_id);
CREATE INDEX IF NOT EXISTS idx_op_status ON metalurgica.ordens_producao(status);
CREATE INDEX IF NOT EXISTS idx_op_produto ON metalurgica.ordens_producao(produto_id);
CREATE INDEX IF NOT EXISTS idx_op_data_prevista ON metalurgica.ordens_producao(data_prevista_inicio);

-- Índices para ordens_servico
CREATE INDEX IF NOT EXISTS idx_os_company_id ON metalurgica.ordens_servico(company_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON metalurgica.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_produto ON metalurgica.ordens_servico(produto_id);
CREATE INDEX IF NOT EXISTS idx_os_op_vinculada ON metalurgica.ordens_servico(op_vinculada_id);

-- Índices para solicitacoes_materiais
CREATE INDEX IF NOT EXISTS idx_solicitacoes_op ON metalurgica.solicitacoes_materiais(op_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_os ON metalurgica.solicitacoes_materiais(os_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON metalurgica.solicitacoes_materiais(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_material ON metalurgica.solicitacoes_materiais(material_id);

-- Índices para lotes
CREATE INDEX IF NOT EXISTS idx_lotes_company_id ON metalurgica.lotes(company_id);
CREATE INDEX IF NOT EXISTS idx_lotes_op ON metalurgica.lotes(op_id);
CREATE INDEX IF NOT EXISTS idx_lotes_os ON metalurgica.lotes(os_id);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON metalurgica.lotes(status);
CREATE INDEX IF NOT EXISTS idx_lotes_data_producao ON metalurgica.lotes(data_producao);

-- Índices para paradas_producao
CREATE INDEX IF NOT EXISTS idx_paradas_company_id ON metalurgica.paradas_producao(company_id);
CREATE INDEX IF NOT EXISTS idx_paradas_maquina ON metalurgica.paradas_producao(maquina_id);
CREATE INDEX IF NOT EXISTS idx_paradas_tipo ON metalurgica.paradas_producao(tipo_parada_id);
CREATE INDEX IF NOT EXISTS idx_paradas_data_inicio ON metalurgica.paradas_producao(data_hora_inicio);

-- Índices para galvanizacoes
CREATE INDEX IF NOT EXISTS idx_galvanizacoes_company_id ON metalurgica.galvanizacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_galvanizacoes_status ON metalurgica.galvanizacoes(status);
CREATE INDEX IF NOT EXISTS idx_galvanizacoes_fornecedor ON metalurgica.galvanizacoes(fornecedor_id);

-- Índices para inspecoes
CREATE INDEX IF NOT EXISTS idx_inspecoes_company_id ON metalurgica.inspecoes(company_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_lote ON metalurgica.inspecoes(lote_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_status ON metalurgica.inspecoes(status);

-- Índices para certificados_qualidade
CREATE INDEX IF NOT EXISTS idx_certificados_company_id ON metalurgica.certificados_qualidade(company_id);
CREATE INDEX IF NOT EXISTS idx_certificados_lote ON metalurgica.certificados_qualidade(lote_id);
CREATE INDEX IF NOT EXISTS idx_certificados_data_emissao ON metalurgica.certificados_qualidade(data_emissao);

-- Índices para nao_conformidades
CREATE INDEX IF NOT EXISTS idx_nc_company_id ON metalurgica.nao_conformidades(company_id);
CREATE INDEX IF NOT EXISTS idx_nc_status ON metalurgica.nao_conformidades(status);
CREATE INDEX IF NOT EXISTS idx_nc_tipo ON metalurgica.nao_conformidades(tipo);

-- Índices para planejamento_producao
CREATE INDEX IF NOT EXISTS idx_planejamento_company_id ON metalurgica.planejamento_producao(company_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_status ON metalurgica.planejamento_producao(status);
CREATE INDEX IF NOT EXISTS idx_planejamento_periodo ON metalurgica.planejamento_producao(periodo_inicio, periodo_fim);

