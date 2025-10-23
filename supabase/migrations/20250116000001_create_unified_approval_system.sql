-- =====================================================
-- SISTEMA DE APROVAÇÕES UNIFICADO
-- =====================================================

-- 1. TABELA PRINCIPAL DE CONFIGURAÇÕES DE APROVAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.configuracoes_aprovacao_unificada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Tipo de processo
    processo_tipo VARCHAR(50) NOT NULL CHECK (processo_tipo IN (
        'conta_pagar', 'requisicao_compra', 'cotacao_compra', 
        'solicitacao_saida_material', 'solicitacao_transferencia_material'
    )),
    
    -- Critérios de aplicação (todos opcionais para flexibilidade)
    centro_custo_id UUID REFERENCES cost_centers(id),
    departamento VARCHAR(100),
    classe_financeira VARCHAR(100),
    usuario_id UUID REFERENCES users(id),
    
    -- Limites e níveis
    valor_limite DECIMAL(15,2),
    nivel_aprovacao INTEGER NOT NULL DEFAULT 1,
    
    -- Aprovadores (múltiplos por nível)
    aprovadores JSONB NOT NULL, -- Array de {user_id, is_primary, ordem}
    
    -- Status e auditoria
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

COMMENT ON TABLE public.configuracoes_aprovacao_unificada IS 'Configurações flexíveis de aprovação por processo';
COMMENT ON COLUMN public.configuracoes_aprovacao_unificada.aprovadores IS 'Array de aprovadores: [{"user_id": "uuid", "is_primary": true, "ordem": 1}]';

-- 2. TABELA DE APROVAÇÕES UNIFICADA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.aprovacoes_unificada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identificação da solicitação
    processo_tipo VARCHAR(50) NOT NULL,
    processo_id UUID NOT NULL, -- ID da tabela específica (conta_pagar, requisicao, etc.)
    
    -- Workflow
    nivel_aprovacao INTEGER NOT NULL,
    aprovador_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado')),
    
    -- Dados da aprovação
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    
    -- Transferência de aprovação
    aprovador_original_id UUID REFERENCES users(id), -- Usuário original designado
    transferido_em TIMESTAMP WITH TIME ZONE,
    transferido_por UUID REFERENCES users(id),
    motivo_transferencia TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.aprovacoes_unificada IS 'Workflow unificado de aprovações com transferências';
COMMENT ON COLUMN public.aprovacoes_unificada.aprovador_original_id IS 'Usuário original designado para aprovação';
COMMENT ON COLUMN public.aprovacoes_unificada.transferido_em IS 'Data/hora da transferência';
COMMENT ON COLUMN public.aprovacoes_unificada.transferido_por IS 'Usuário que fez a transferência';

-- 3. TABELA DE HISTÓRICO DE EDIÇÕES (Para Reset de Aprovações)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.historico_edicoes_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identificação da solicitação
    processo_tipo VARCHAR(50) NOT NULL,
    processo_id UUID NOT NULL,
    
    -- Dados da edição
    usuario_editor_id UUID NOT NULL REFERENCES users(id),
    data_edicao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campos_alterados JSONB, -- Array de campos que foram alterados
    valores_anteriores JSONB, -- Valores antes da alteração
    valores_novos JSONB, -- Valores após a alteração
    
    -- Reset de aprovações
    aprovacoes_resetadas BOOLEAN DEFAULT false,
    data_reset TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.historico_edicoes_solicitacoes IS 'Histórico de edições para reset automático de aprovações';
COMMENT ON COLUMN public.historico_edicoes_solicitacoes.campos_alterados IS 'Array de nomes dos campos alterados';
COMMENT ON COLUMN public.historico_edicoes_solicitacoes.valores_anteriores IS 'Valores antes da alteração';
COMMENT ON COLUMN public.historico_edicoes_solicitacoes.valores_novos IS 'Valores após a alteração';

-- 4. TABELA DE SAÍDAS DE MATERIAIS (Nova funcionalidade)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes_saida_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    funcionario_solicitante_id UUID NOT NULL REFERENCES users(id),
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id),
    centro_custo_id UUID REFERENCES cost_centers(id),
    projeto_id UUID REFERENCES projects(id),
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_saida TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado', 'entregue')),
    valor_total DECIMAL(15,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.solicitacoes_saida_materiais IS 'Solicitações de saída de materiais para funcionários';

-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para configuracoes_aprovacao_unificada
CREATE INDEX IF NOT EXISTS idx_config_aprov_unif_company_id ON public.configuracoes_aprovacao_unificada(company_id);
CREATE INDEX IF NOT EXISTS idx_config_aprov_unif_processo_tipo ON public.configuracoes_aprovacao_unificada(processo_tipo);
CREATE INDEX IF NOT EXISTS idx_config_aprov_unif_centro_custo ON public.configuracoes_aprovacao_unificada(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_config_aprov_unif_ativo ON public.configuracoes_aprovacao_unificada(ativo);

-- Índices para aprovacoes_unificada
CREATE INDEX IF NOT EXISTS idx_aprov_unif_company_id ON public.aprovacoes_unificada(company_id);
CREATE INDEX IF NOT EXISTS idx_aprov_unif_processo ON public.aprovacoes_unificada(processo_tipo, processo_id);
CREATE INDEX IF NOT EXISTS idx_aprov_unif_aprovador ON public.aprovacoes_unificada(aprovador_id);
CREATE INDEX IF NOT EXISTS idx_aprov_unif_status ON public.aprovacoes_unificada(status);
CREATE INDEX IF NOT EXISTS idx_aprov_unif_nivel ON public.aprovacoes_unificada(nivel_aprovacao);

-- Índices para historico_edicoes_solicitacoes
CREATE INDEX IF NOT EXISTS idx_hist_edicoes_company_id ON public.historico_edicoes_solicitacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_hist_edicoes_processo ON public.historico_edicoes_solicitacoes(processo_tipo, processo_id);
CREATE INDEX IF NOT EXISTS idx_hist_edicoes_editor ON public.historico_edicoes_solicitacoes(usuario_editor_id);
CREATE INDEX IF NOT EXISTS idx_hist_edicoes_data ON public.historico_edicoes_solicitacoes(data_edicao);

-- Índices para solicitacoes_saida_materiais
CREATE INDEX IF NOT EXISTS idx_solic_saida_company_id ON public.solicitacoes_saida_materiais(company_id);
CREATE INDEX IF NOT EXISTS idx_solic_saida_funcionario ON public.solicitacoes_saida_materiais(funcionario_solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solic_saida_almoxarifado ON public.solicitacoes_saida_materiais(almoxarifado_id);
CREATE INDEX IF NOT EXISTS idx_solic_saida_status ON public.solicitacoes_saida_materiais(status);
CREATE INDEX IF NOT EXISTS idx_solic_saida_data ON public.solicitacoes_saida_materiais(data_solicitacao);

-- 6. RLS (Row Level Security) POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.configuracoes_aprovacao_unificada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprovacoes_unificada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_edicoes_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_saida_materiais ENABLE ROW LEVEL SECURITY;

-- Políticas para configuracoes_aprovacao_unificada
CREATE POLICY "Users can view approval configs for their company" ON public.configuracoes_aprovacao_unificada
    FOR SELECT USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));

CREATE POLICY "Users can manage approval configs for their company" ON public.configuracoes_aprovacao_unificada
    FOR ALL USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));

-- Políticas para aprovacoes_unificada
CREATE POLICY "Users can view approvals for their company" ON public.aprovacoes_unificada
    FOR SELECT USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));

CREATE POLICY "Users can manage approvals for their company" ON public.aprovacoes_unificada
    FOR ALL USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));

-- Políticas para historico_edicoes_solicitacoes
CREATE POLICY "Users can view edit history for their company" ON public.historico_edicoes_solicitacoes
    FOR SELECT USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));

CREATE POLICY "Users can create edit history for their company" ON public.historico_edicoes_solicitacoes
    FOR INSERT WITH CHECK (company_id = (SELECT current_setting('app.current_company_id')::uuid));

-- Políticas para solicitacoes_saida_materiais
CREATE POLICY "Users can view material exit requests for their company" ON public.solicitacoes_saida_materiais
    FOR SELECT USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));

CREATE POLICY "Users can manage material exit requests for their company" ON public.solicitacoes_saida_materiais
    FOR ALL USING (company_id = (SELECT current_setting('app.current_company_id')::uuid));
