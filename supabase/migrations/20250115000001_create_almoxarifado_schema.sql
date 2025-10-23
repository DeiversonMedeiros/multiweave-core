-- =====================================================
-- MIGRAÇÃO: Criação do Schema Almoxarifado
-- Data: 2025-01-15
-- Descrição: Estrutura base para o módulo de Almoxarifado
-- =====================================================

-- Criar schema almoxarifado
CREATE SCHEMA IF NOT EXISTS almoxarifado;

-- =====================================================
-- 1. ALMOXARIFADOS/LOCALIZAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.almoxarifados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    endereco TEXT,
    responsavel_id UUID ,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_almoxarifado_codigo_company UNIQUE (codigo, company_id)
);

-- =====================================================
-- 2. LOCALIZAÇÕES FÍSICAS (Rua, Nível, Posição)
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.localizacoes_fisicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id) ON DELETE CASCADE,
    rua VARCHAR(10),
    nivel VARCHAR(10),
    posicao VARCHAR(10),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_localizacao UNIQUE (almoxarifado_id, rua, nivel, posicao)
);

-- =====================================================
-- 3. MATERIAIS E EQUIPAMENTOS (Extensão da tabela materials)
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.materiais_equipamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id), -- Referência ao material base
    codigo_interno VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('material', 'equipamento')),
    classe VARCHAR(100),
    unidade_medida VARCHAR(20) NOT NULL,
    imagem_url TEXT,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    equipamento_proprio BOOLEAN DEFAULT true,
    localizacao_id UUID REFERENCES almoxarifado.localizacoes_fisicas(id),
    estoque_minimo INTEGER DEFAULT 0,
    estoque_maximo INTEGER,
    valor_unitario DECIMAL(15,2),
    validade_dias INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_codigo_interno_company UNIQUE (codigo_interno, company_id),
    CONSTRAINT check_estoque_min_max CHECK (estoque_minimo <= COALESCE(estoque_maximo, 999999))
);

-- =====================================================
-- 4. ESTOQUE ATUAL
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.estoque_atual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_equipamento_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id) ON DELETE CASCADE,
    quantidade_atual INTEGER NOT NULL DEFAULT 0,
    quantidade_reservada INTEGER DEFAULT 0,
    quantidade_disponivel INTEGER GENERATED ALWAYS AS (quantidade_atual - quantidade_reservada) STORED,
    valor_total DECIMAL(15,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_estoque_material_almoxarifado UNIQUE (material_equipamento_id, almoxarifado_id),
    CONSTRAINT check_quantidade_positiva CHECK (quantidade_atual >= 0 AND quantidade_reservada >= 0)
);

-- =====================================================
-- 5. MOVIMENTAÇÕES DE ESTOQUE
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_equipamento_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    almoxarifado_origem_id UUID REFERENCES almoxarifado.almoxarifados(id),
    almoxarifado_destino_id UUID REFERENCES almoxarifado.almoxarifados(id),
    tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'transferencia', 'ajuste', 'inventario')),
    quantidade INTEGER NOT NULL,
    valor_unitario DECIMAL(15,2),
    valor_total DECIMAL(15,2),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    nfe_id UUID REFERENCES financeiro.nfe(id),
    observacoes TEXT,
    usuario_id UUID NOT NULL ,
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'confirmado' CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
    
    -- Constraints
    CONSTRAINT check_quantidade_movimentacao CHECK (quantidade != 0),
    CONSTRAINT check_almoxarifado_origem_destino CHECK (
        (tipo_movimentacao = 'entrada' AND almoxarifado_origem_id IS NULL AND almoxarifado_destino_id IS NOT NULL) OR
        (tipo_movimentacao = 'saida' AND almoxarifado_origem_id IS NOT NULL AND almoxarifado_destino_id IS NULL) OR
        (tipo_movimentacao = 'transferencia' AND almoxarifado_origem_id IS NOT NULL AND almoxarifado_destino_id IS NOT NULL) OR
        (tipo_movimentacao IN ('ajuste', 'inventario') AND almoxarifado_origem_id IS NOT NULL AND almoxarifado_destino_id IS NULL)
    )
);

-- =====================================================
-- 6. ENTRADAS DE MATERIAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.entradas_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nfe_id UUID REFERENCES financeiro.nfe(id),
    fornecedor_id UUID REFERENCES public.partners(id),
    numero_nota VARCHAR(50),
    data_entrada DATE NOT NULL,
    valor_total DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'inspecao', 'aprovado', 'rejeitado')),
    checklist_aprovado BOOLEAN DEFAULT false,
    usuario_recebimento_id UUID ,
    usuario_aprovacao_id UUID ,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. ITENS DE ENTRADA
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.entrada_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_id UUID NOT NULL REFERENCES almoxarifado.entradas_materiais(id) ON DELETE CASCADE,
    material_equipamento_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    quantidade_recebida INTEGER NOT NULL,
    quantidade_aprovada INTEGER DEFAULT 0,
    valor_unitario DECIMAL(15,2),
    valor_total DECIMAL(15,2),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    lote VARCHAR(100),
    validade DATE,
    observacoes TEXT,
    
    -- Constraints
    CONSTRAINT check_quantidade_entrada CHECK (quantidade_recebida > 0 AND quantidade_aprovada >= 0)
);

-- =====================================================
-- 8. CHECKLIST DE RECEBIMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.checklist_recebimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_id UUID NOT NULL REFERENCES almoxarifado.entradas_materiais(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES almoxarifado.entrada_itens(id) ON DELETE CASCADE,
    criterio VARCHAR(255) NOT NULL,
    aprovado BOOLEAN NOT NULL,
    observacoes TEXT,
    usuario_id UUID NOT NULL ,
    data_verificacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. TRANSFERÊNCIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.transferencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    almoxarifado_origem_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id) ON DELETE CASCADE,
    almoxarifado_destino_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id) ON DELETE CASCADE,
    solicitante_id UUID NOT NULL ,
    aprovador_id UUID ,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_transferencia TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'transferido')),
    observacoes TEXT,
    
    -- Constraints
    CONSTRAINT check_almoxarifado_diferentes CHECK (almoxarifado_origem_id != almoxarifado_destino_id)
);

-- =====================================================
-- 10. ITENS DE TRANSFERÊNCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.transferencia_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transferencia_id UUID NOT NULL REFERENCES almoxarifado.transferencias(id) ON DELETE CASCADE,
    material_equipamento_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    quantidade_solicitada INTEGER NOT NULL,
    quantidade_aprovada INTEGER DEFAULT 0,
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    
    -- Constraints
    CONSTRAINT check_quantidade_transferencia CHECK (quantidade_solicitada > 0 AND quantidade_aprovada >= 0)
);

-- =====================================================
-- 11. INVENTÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.inventarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('geral', 'ciclico', 'rotativo')),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'validado', 'fechado')),
    responsavel_id UUID NOT NULL ,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_data_inventario CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- =====================================================
-- 12. ITENS DE INVENTÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.inventario_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id UUID NOT NULL REFERENCES almoxarifado.inventarios(id) ON DELETE CASCADE,
    material_equipamento_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    quantidade_sistema INTEGER NOT NULL,
    quantidade_contada INTEGER,
    divergencia INTEGER GENERATED ALWAYS AS (COALESCE(quantidade_contada, 0) - quantidade_sistema) STORED,
    observacoes TEXT,
    contador_id UUID ,
    data_contagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_inventario_item UNIQUE (inventario_id, material_equipamento_id)
);

-- =====================================================
-- 13. SOLICITAÇÕES DE COMPRA AUTOMÁTICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.solicitacoes_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_equipamento_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id) ON DELETE CASCADE,
    quantidade_solicitada INTEGER NOT NULL,
    quantidade_minima INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'atendido')),
    centro_custo_id UUID REFERENCES public.cost_centers(id),
    projeto_id UUID REFERENCES public.projects(id),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atendido_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT check_quantidade_solicitacao CHECK (quantidade_solicitada > 0 AND quantidade_minima > 0)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para almoxarifados
CREATE INDEX IF NOT EXISTS idx_almoxarifados_company_id ON almoxarifado.almoxarifados(company_id);
CREATE INDEX IF NOT EXISTS idx_almoxarifados_ativo ON almoxarifado.almoxarifados(ativo) WHERE ativo = true;

-- Índices para materiais_equipamentos
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_company_id ON almoxarifado.materiais_equipamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_tipo ON almoxarifado.materiais_equipamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_status ON almoxarifado.materiais_equipamentos(status);
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_codigo ON almoxarifado.materiais_equipamentos(codigo_interno);

-- Índices para estoque_atual
CREATE INDEX IF NOT EXISTS idx_estoque_atual_material ON almoxarifado.estoque_atual(material_equipamento_id);
CREATE INDEX IF NOT EXISTS idx_estoque_atual_almoxarifado ON almoxarifado.estoque_atual(almoxarifado_id);

-- Índices para movimentacoes_estoque
CREATE INDEX IF NOT EXISTS idx_movimentacoes_company_id ON almoxarifado.movimentacoes_estoque(company_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_material ON almoxarifado.movimentacoes_estoque(material_equipamento_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON almoxarifado.movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON almoxarifado.movimentacoes_estoque(data_movimentacao);

-- Índices para entradas_materiais
CREATE INDEX IF NOT EXISTS idx_entradas_company_id ON almoxarifado.entradas_materiais(company_id);
CREATE INDEX IF NOT EXISTS idx_entradas_data ON almoxarifado.entradas_materiais(data_entrada);
CREATE INDEX IF NOT EXISTS idx_entradas_status ON almoxarifado.entradas_materiais(status);

-- Índices para transferencias
CREATE INDEX IF NOT EXISTS idx_transferencias_company_id ON almoxarifado.transferencias(company_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_status ON almoxarifado.transferencias(status);
CREATE INDEX IF NOT EXISTS idx_transferencias_solicitante ON almoxarifado.transferencias(solicitante_id);

-- Índices para inventarios
CREATE INDEX IF NOT EXISTS idx_inventarios_company_id ON almoxarifado.inventarios(company_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_status ON almoxarifado.inventarios(status);
CREATE INDEX IF NOT EXISTS idx_inventarios_tipo ON almoxarifado.inventarios(tipo);

-- Índices para solicitacoes_compra
CREATE INDEX IF NOT EXISTS idx_solicitacoes_company_id ON almoxarifado.solicitacoes_compra(company_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON almoxarifado.solicitacoes_compra(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_prioridade ON almoxarifado.solicitacoes_compra(prioridade);

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================

COMMENT ON SCHEMA almoxarifado IS 'Schema para controle de almoxarifado e estoque';
COMMENT ON TABLE almoxarifado.almoxarifados IS 'Cadastro de almoxarifados/locais de estoque';
COMMENT ON TABLE almoxarifado.localizacoes_fisicas IS 'Localizações físicas dentro dos almoxarifados';
COMMENT ON TABLE almoxarifado.materiais_equipamentos IS 'Materiais e equipamentos do almoxarifado';
COMMENT ON TABLE almoxarifado.estoque_atual IS 'Controle de estoque atual por material e almoxarifado';
COMMENT ON TABLE almoxarifado.movimentacoes_estoque IS 'Histórico de todas as movimentações de estoque';
COMMENT ON TABLE almoxarifado.entradas_materiais IS 'Entradas de materiais via NF-e ou manual';
COMMENT ON TABLE almoxarifado.entrada_itens IS 'Itens específicos de cada entrada';
COMMENT ON TABLE almoxarifado.checklist_recebimento IS 'Checklist de inspeção de recebimento';
COMMENT ON TABLE almoxarifado.transferencias IS 'Transferências entre almoxarifados';
COMMENT ON TABLE almoxarifado.transferencia_itens IS 'Itens específicos de cada transferência';
COMMENT ON TABLE almoxarifado.inventarios IS 'Controle de inventários físicos';
COMMENT ON TABLE almoxarifado.inventario_itens IS 'Itens contados em cada inventário';
COMMENT ON TABLE almoxarifado.solicitacoes_compra IS 'Solicitações automáticas de compra por estoque mínimo';
