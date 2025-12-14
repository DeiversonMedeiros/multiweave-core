-- =====================================================
-- MIGRAÇÃO: M7 - GOVERNANÇA, PLANEJAMENTO E MÉRITO
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Implementa estrutura para mensurar nível de organização de gestores,
--            identificando faltas de planejamento, solicitações urgentes e violações de SLA
-- Autor: Sistema MultiWeave Core
-- Módulo: M7 - Governança, Planejamento e Mérito

-- =====================================================
-- 1. TIPOS ENUM
-- =====================================================

-- Tipo de evento de planejamento
CREATE TYPE financeiro.tipo_evento_planejamento AS ENUM (
    'pagamento_hoje',
    'compra_urgente',
    'medicao_fora_janela',
    'documento_fora_prazo',
    'requisicao_sem_antecedencia'
);

-- Etapa do processo financeiro
CREATE TYPE financeiro.etapa_processo AS ENUM (
    'criacao_requisicao',
    'aprovacao_requisicao',
    'criacao_cotacao',
    'aprovacao_cotacao',
    'criacao_pedido',
    'envio_pedido',
    'envio_medicao',
    'criacao_conta_pagar',
    'envio_documentos_pagamento',
    'aprovacao_pagamento',
    'pagamento'
);

-- =====================================================
-- 2. TABELA: PARAMETRIZAÇÃO DE SLAs POR ETAPA
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.slas_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Etapa do processo
    etapa_processo financeiro.etapa_processo NOT NULL,
    
    -- Prazos em horas
    prazo_minimo_horas INTEGER NOT NULL DEFAULT 24, -- Prazo mínimo aceitável
    prazo_ideal_horas INTEGER NOT NULL DEFAULT 72, -- Prazo ideal recomendado
    
    -- Descrição e observações
    descricao TEXT,
    observacoes TEXT,
    
    -- Status e auditoria
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraint: uma configuração por etapa por empresa
    UNIQUE(company_id, etapa_processo)
);

COMMENT ON TABLE financeiro.slas_etapas IS 'Configuração de SLAs (prazos) por etapa do processo financeiro';
COMMENT ON COLUMN financeiro.slas_etapas.prazo_minimo_horas IS 'Prazo mínimo aceitável em horas (abaixo disso é considerado violação)';
COMMENT ON COLUMN financeiro.slas_etapas.prazo_ideal_horas IS 'Prazo ideal recomendado em horas';

-- Índices
CREATE INDEX IF NOT EXISTS idx_slas_etapas_company_id ON financeiro.slas_etapas(company_id);
CREATE INDEX IF NOT EXISTS idx_slas_etapas_etapa ON financeiro.slas_etapas(etapa_processo);
CREATE INDEX IF NOT EXISTS idx_slas_etapas_ativo ON financeiro.slas_etapas(ativo);

-- =====================================================
-- 3. TABELA: EVENTOS DE PLANEJAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.eventos_planejamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação do evento
    tipo_evento financeiro.tipo_evento_planejamento NOT NULL,
    etapa_processo financeiro.etapa_processo NOT NULL,
    
    -- Gestor responsável
    gestor_id UUID NOT NULL REFERENCES public.users(id),
    gestor_nome VARCHAR(255), -- Cache do nome para performance
    
    -- Origem do evento
    origem_tipo VARCHAR(50) NOT NULL, -- 'conta_pagar', 'requisicao_compra', 'medicao', etc.
    origem_id UUID NOT NULL, -- ID do registro que gerou o evento
    
    -- Datas importantes
    data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_necessidade DATE, -- Data em que era necessário
    data_solicitacao DATE, -- Data em que foi solicitado
    antecedencia_horas INTEGER, -- Antecedência calculada em horas (pode ser negativo)
    
    -- Informações do evento
    motivo TEXT NOT NULL, -- Motivo informado pelo usuário ou sistema
    valor DECIMAL(15,2), -- Valor associado (se aplicável)
    
    -- Violação de SLA
    violou_sla BOOLEAN DEFAULT false,
    sla_configurado_horas INTEGER, -- SLA configurado para esta etapa
    diferenca_sla_horas INTEGER, -- Diferença em horas do SLA (negativo = violação)
    
    -- Status e auditoria
    resolvido BOOLEAN DEFAULT false,
    data_resolucao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE financeiro.eventos_planejamento IS 'Registro de eventos de planejamento (pagamentos para hoje, compras urgentes, medições fora da janela)';
COMMENT ON COLUMN financeiro.eventos_planejamento.antecedencia_horas IS 'Antecedência em horas: positivo = com antecedência, negativo = sem antecedência';
COMMENT ON COLUMN financeiro.eventos_planejamento.violou_sla IS 'Indica se o evento violou o SLA configurado para a etapa';
COMMENT ON COLUMN financeiro.eventos_planejamento.diferenca_sla_horas IS 'Diferença em horas do SLA: negativo = violação, positivo = dentro do prazo';

-- Índices
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_company_id ON financeiro.eventos_planejamento(company_id);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_gestor_id ON financeiro.eventos_planejamento(gestor_id);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_tipo ON financeiro.eventos_planejamento(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_etapa ON financeiro.eventos_planejamento(etapa_processo);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_data_evento ON financeiro.eventos_planejamento(data_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_violou_sla ON financeiro.eventos_planejamento(violou_sla);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_origem ON financeiro.eventos_planejamento(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_eventos_planejamento_resolvido ON financeiro.eventos_planejamento(resolvido);

-- =====================================================
-- 4. TABELA: KPIs DE PLANEJAMENTO POR GESTOR
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.kpis_planejamento_gestor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    gestor_id UUID NOT NULL REFERENCES public.users(id),
    gestor_nome VARCHAR(255), -- Cache do nome
    
    -- Período de cálculo
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    
    -- KPIs calculados
    total_operacoes INTEGER DEFAULT 0, -- Total de operações do gestor no período
    operacoes_urgentes INTEGER DEFAULT 0, -- Total de operações urgentes
    percentual_operacoes_urgentes DECIMAL(5,2) DEFAULT 0, -- % de operações urgentes
    
    tempo_medio_antecedencia_horas DECIMAL(10,2) DEFAULT 0, -- Tempo médio de antecedência em horas
    tempo_medio_antecedencia_dias DECIMAL(5,2) DEFAULT 0, -- Tempo médio de antecedência em dias
    
    total_violacoes_sla INTEGER DEFAULT 0, -- Total de violações de SLA
    percentual_violacoes_sla DECIMAL(5,2) DEFAULT 0, -- % de operações que violaram SLA
    
    -- Detalhamento por tipo
    eventos_pagamento_hoje INTEGER DEFAULT 0,
    eventos_compra_urgente INTEGER DEFAULT 0,
    eventos_medicao_fora_janela INTEGER DEFAULT 0,
    eventos_documento_fora_prazo INTEGER DEFAULT 0,
    eventos_requisicao_sem_antecedencia INTEGER DEFAULT 0,
    
    -- Valores financeiros
    valor_total_operacoes DECIMAL(15,2) DEFAULT 0,
    valor_operacoes_urgentes DECIMAL(15,2) DEFAULT 0,
    
    -- Status e auditoria
    data_calculo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: um registro por gestor por período
    UNIQUE(company_id, gestor_id, periodo_inicio, periodo_fim)
);

COMMENT ON TABLE financeiro.kpis_planejamento_gestor IS 'KPIs de planejamento calculados por gestor e período';
COMMENT ON COLUMN financeiro.kpis_planejamento_gestor.percentual_operacoes_urgentes IS 'Percentual de operações urgentes sobre o total';
COMMENT ON COLUMN financeiro.kpis_planejamento_gestor.tempo_medio_antecedencia_horas IS 'Tempo médio de antecedência em horas (positivo = com antecedência, negativo = sem antecedência)';
COMMENT ON COLUMN financeiro.kpis_planejamento_gestor.percentual_violacoes_sla IS 'Percentual de operações que violaram SLA';

-- Índices
CREATE INDEX IF NOT EXISTS idx_kpis_gestor_company_id ON financeiro.kpis_planejamento_gestor(company_id);
CREATE INDEX IF NOT EXISTS idx_kpis_gestor_gestor_id ON financeiro.kpis_planejamento_gestor(gestor_id);
CREATE INDEX IF NOT EXISTS idx_kpis_gestor_periodo ON financeiro.kpis_planejamento_gestor(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_kpis_gestor_data_calculo ON financeiro.kpis_planejamento_gestor(data_calculo);

-- =====================================================
-- 5. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para slas_etapas
CREATE OR REPLACE FUNCTION financeiro.update_slas_etapas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_slas_etapas_updated_at
    BEFORE UPDATE ON financeiro.slas_etapas
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.update_slas_etapas_updated_at();

-- Trigger para eventos_planejamento
CREATE OR REPLACE FUNCTION financeiro.update_eventos_planejamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_eventos_planejamento_updated_at
    BEFORE UPDATE ON financeiro.eventos_planejamento
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.update_eventos_planejamento_updated_at();

-- Trigger para kpis_planejamento_gestor
CREATE OR REPLACE FUNCTION financeiro.update_kpis_planejamento_gestor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kpis_planejamento_gestor_updated_at
    BEFORE UPDATE ON financeiro.kpis_planejamento_gestor
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.update_kpis_planejamento_gestor_updated_at();

-- =====================================================
-- 6. FUNÇÃO: REGISTRAR EVENTO DE PLANEJAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.registrar_evento_planejamento(
    p_company_id UUID,
    p_tipo_evento financeiro.tipo_evento_planejamento,
    p_etapa_processo financeiro.etapa_processo,
    p_gestor_id UUID,
    p_origem_tipo VARCHAR(50),
    p_origem_id UUID,
    p_motivo TEXT,
    p_data_necessidade DATE DEFAULT NULL,
    p_data_solicitacao DATE DEFAULT NULL,
    p_valor DECIMAL(15,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_evento_id UUID;
    v_gestor_nome VARCHAR(255);
    v_antecedencia_horas INTEGER;
    v_sla_configurado INTEGER;
    v_diferenca_sla INTEGER;
    v_violou_sla BOOLEAN := false;
BEGIN
    -- Buscar nome do gestor
    SELECT nome INTO v_gestor_nome
    FROM public.users
    WHERE id = p_gestor_id;
    
    -- Calcular antecedência se tiver as datas
    IF p_data_necessidade IS NOT NULL AND p_data_solicitacao IS NOT NULL THEN
        v_antecedencia_horas := EXTRACT(EPOCH FROM (p_data_necessidade::timestamp - p_data_solicitacao::timestamp)) / 3600;
    END IF;
    
    -- Buscar SLA configurado para a etapa
    SELECT prazo_minimo_horas INTO v_sla_configurado
    FROM financeiro.slas_etapas
    WHERE company_id = p_company_id
      AND etapa_processo = p_etapa_processo
      AND ativo = true;
    
    -- Verificar se violou SLA
    IF v_sla_configurado IS NOT NULL AND v_antecedencia_horas IS NOT NULL THEN
        v_diferenca_sla := v_antecedencia_horas - v_sla_configurado;
        IF v_diferenca_sla < 0 THEN
            v_violou_sla := true;
        END IF;
    END IF;
    
    -- Inserir evento
    INSERT INTO financeiro.eventos_planejamento (
        company_id,
        tipo_evento,
        etapa_processo,
        gestor_id,
        gestor_nome,
        origem_tipo,
        origem_id,
        motivo,
        data_necessidade,
        data_solicitacao,
        antecedencia_horas,
        valor,
        violou_sla,
        sla_configurado_horas,
        diferenca_sla_horas
    ) VALUES (
        p_company_id,
        p_tipo_evento,
        p_etapa_processo,
        p_gestor_id,
        v_gestor_nome,
        p_origem_tipo,
        p_origem_id,
        p_motivo,
        p_data_necessidade,
        p_data_solicitacao,
        v_antecedencia_horas,
        p_valor,
        v_violou_sla,
        v_sla_configurado,
        v_diferenca_sla
    ) RETURNING id INTO v_evento_id;
    
    RETURN v_evento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.registrar_evento_planejamento IS 'Registra um evento de planejamento e verifica se violou SLA';

-- =====================================================
-- 7. TRIGGER: DETECTAR PAGAMENTOS "PARA HOJE"
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.detectar_pagamento_hoje()
RETURNS TRIGGER AS $$
DECLARE
    v_gestor_id UUID;
    v_motivo TEXT;
BEGIN
    -- Verificar se é pagamento para hoje e urgente
    IF NEW.data_vencimento = CURRENT_DATE AND (NEW.is_urgente = true OR NEW.data_vencimento = NEW.data_emissao) THEN
        -- Identificar gestor responsável
        v_gestor_id := COALESCE(NEW.created_by, (SELECT user_id FROM public.user_companies WHERE company_id = NEW.company_id LIMIT 1));
        
        -- Montar motivo
        IF NEW.is_urgente = true THEN
            v_motivo := COALESCE(NEW.motivo_urgencia, 'Pagamento urgente para hoje');
        ELSE
            v_motivo := 'Pagamento criado para hoje sem antecedência';
        END IF;
        
        -- Registrar evento
        PERFORM financeiro.registrar_evento_planejamento(
            p_company_id := NEW.company_id,
            p_tipo_evento := 'pagamento_hoje',
            p_etapa_processo := 'criacao_conta_pagar',
            p_gestor_id := v_gestor_id,
            p_origem_tipo := 'conta_pagar',
            p_origem_id := NEW.id,
            p_motivo := v_motivo,
            p_data_necessidade := NEW.data_vencimento,
            p_data_solicitacao := NEW.data_emissao,
            p_valor := NEW.valor_atual
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_detectar_pagamento_hoje
    AFTER INSERT OR UPDATE ON financeiro.contas_pagar
    FOR EACH ROW
    WHEN (NEW.data_vencimento = CURRENT_DATE OR NEW.is_urgente = true)
    EXECUTE FUNCTION financeiro.detectar_pagamento_hoje();

COMMENT ON FUNCTION financeiro.detectar_pagamento_hoje IS 'Detecta e registra pagamentos criados para hoje ou marcados como urgentes';

-- =====================================================
-- 8. TRIGGER: DETECTAR COMPRAS URGENTES
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.detectar_compra_urgente()
RETURNS TRIGGER AS $$
DECLARE
    v_antecedencia_horas INTEGER;
    v_motivo TEXT;
BEGIN
    -- Verificar se é compra urgente
    IF NEW.prioridade = 'urgente'::compras.prioridade OR NEW.is_emergencial = true THEN
        -- Calcular antecedência
        IF NEW.data_necessidade IS NOT NULL AND NEW.data_solicitacao IS NOT NULL THEN
            v_antecedencia_horas := EXTRACT(EPOCH FROM (NEW.data_necessidade::timestamp - NEW.data_solicitacao::timestamp)) / 3600;
        END IF;
        
        -- Montar motivo
        IF NEW.prioridade = 'urgente'::compras.prioridade THEN
            v_motivo := 'Requisição de compra marcada como urgente';
        ELSIF NEW.is_emergencial = true THEN
            v_motivo := COALESCE(NEW.justificativa, 'Requisição de compra emergencial');
        ELSE
            v_motivo := 'Requisição de compra sem antecedência adequada';
        END IF;
        
        -- Registrar evento
        PERFORM financeiro.registrar_evento_planejamento(
            p_company_id := NEW.company_id,
            p_tipo_evento := 'compra_urgente',
            p_etapa_processo := 'criacao_requisicao',
            p_gestor_id := NEW.solicitante_id,
            p_origem_tipo := 'requisicao_compra',
            p_origem_id := NEW.id,
            p_motivo := v_motivo,
            p_data_necessidade := NEW.data_necessidade,
            p_data_solicitacao := NEW.data_solicitacao,
            p_valor := NEW.valor_total_estimado
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_detectar_compra_urgente
    AFTER INSERT OR UPDATE ON compras.requisicoes_compra
    FOR EACH ROW
    WHEN (NEW.prioridade = 'urgente'::compras.prioridade OR NEW.is_emergencial = true)
    EXECUTE FUNCTION financeiro.detectar_compra_urgente();

COMMENT ON FUNCTION financeiro.detectar_compra_urgente IS 'Detecta e registra requisições de compra urgentes ou emergenciais';

-- =====================================================
-- 9. FUNÇÃO: CALCULAR KPIs DE PLANEJAMENTO POR GESTOR
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.calcular_kpis_planejamento_gestor(
    p_company_id UUID,
    p_gestor_id UUID,
    p_periodo_inicio DATE,
    p_periodo_fim DATE
)
RETURNS UUID AS $$
DECLARE
    v_kpi_id UUID;
    v_gestor_nome VARCHAR(255);
    v_total_operacoes INTEGER := 0;
    v_operacoes_urgentes INTEGER := 0;
    v_percentual_urgentes DECIMAL(5,2) := 0;
    v_tempo_medio_antecedencia DECIMAL(10,2) := 0;
    v_total_violacoes INTEGER := 0;
    v_percentual_violacoes DECIMAL(5,2) := 0;
    v_eventos_pagamento_hoje INTEGER := 0;
    v_eventos_compra_urgente INTEGER := 0;
    v_eventos_medicao_fora_janela INTEGER := 0;
    v_eventos_documento_fora_prazo INTEGER := 0;
    v_eventos_requisicao_sem_antecedencia INTEGER := 0;
    v_valor_total DECIMAL(15,2) := 0;
    v_valor_urgentes DECIMAL(15,2) := 0;
BEGIN
    -- Buscar nome do gestor
    SELECT nome INTO v_gestor_nome
    FROM public.users WHERE id = p_gestor_id;
    
    -- Calcular totais de eventos
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE tipo_evento IN ('pagamento_hoje', 'compra_urgente')),
        AVG(antecedencia_horas) FILTER (WHERE antecedencia_horas IS NOT NULL),
        COUNT(*) FILTER (WHERE violou_sla = true),
        COUNT(*) FILTER (WHERE tipo_evento = 'pagamento_hoje'),
        COUNT(*) FILTER (WHERE tipo_evento = 'compra_urgente'),
        COUNT(*) FILTER (WHERE tipo_evento = 'medicao_fora_janela'),
        COUNT(*) FILTER (WHERE tipo_evento = 'documento_fora_prazo'),
        COUNT(*) FILTER (WHERE tipo_evento = 'requisicao_sem_antecedencia'),
        COALESCE(SUM(valor), 0),
        COALESCE(SUM(valor) FILTER (WHERE tipo_evento IN ('pagamento_hoje', 'compra_urgente')), 0)
    INTO 
        v_total_operacoes,
        v_operacoes_urgentes,
        v_tempo_medio_antecedencia,
        v_total_violacoes,
        v_eventos_pagamento_hoje,
        v_eventos_compra_urgente,
        v_eventos_medicao_fora_janela,
        v_eventos_documento_fora_prazo,
        v_eventos_requisicao_sem_antecedencia,
        v_valor_total,
        v_valor_urgentes
    FROM financeiro.eventos_planejamento
    WHERE company_id = p_company_id
      AND gestor_id = p_gestor_id
      AND data_evento::date BETWEEN p_periodo_inicio AND p_periodo_fim;
    
    -- Calcular percentuais
    IF v_total_operacoes > 0 THEN
        v_percentual_urgentes := (v_operacoes_urgentes::DECIMAL / v_total_operacoes::DECIMAL) * 100;
        v_percentual_violacoes := (v_total_violacoes::DECIMAL / v_total_operacoes::DECIMAL) * 100;
    END IF;
    
    -- Inserir ou atualizar KPI
    INSERT INTO financeiro.kpis_planejamento_gestor (
        company_id,
        gestor_id,
        gestor_nome,
        periodo_inicio,
        periodo_fim,
        total_operacoes,
        operacoes_urgentes,
        percentual_operacoes_urgentes,
        tempo_medio_antecedencia_horas,
        tempo_medio_antecedencia_dias,
        total_violacoes_sla,
        percentual_violacoes_sla,
        eventos_pagamento_hoje,
        eventos_compra_urgente,
        eventos_medicao_fora_janela,
        eventos_documento_fora_prazo,
        eventos_requisicao_sem_antecedencia,
        valor_total_operacoes,
        valor_operacoes_urgentes
    ) VALUES (
        p_company_id,
        p_gestor_id,
        v_gestor_nome,
        p_periodo_inicio,
        p_periodo_fim,
        v_total_operacoes,
        v_operacoes_urgentes,
        v_percentual_urgentes,
        v_tempo_medio_antecedencia,
        COALESCE(v_tempo_medio_antecedencia / 24, 0),
        v_total_violacoes,
        v_percentual_violacoes,
        v_eventos_pagamento_hoje,
        v_eventos_compra_urgente,
        v_eventos_medicao_fora_janela,
        v_eventos_documento_fora_prazo,
        v_eventos_requisicao_sem_antecedencia,
        v_valor_total,
        v_valor_urgentes
    )
    ON CONFLICT (company_id, gestor_id, periodo_inicio, periodo_fim)
    DO UPDATE SET
        gestor_nome = EXCLUDED.gestor_nome,
        total_operacoes = EXCLUDED.total_operacoes,
        operacoes_urgentes = EXCLUDED.operacoes_urgentes,
        percentual_operacoes_urgentes = EXCLUDED.percentual_operacoes_urgentes,
        tempo_medio_antecedencia_horas = EXCLUDED.tempo_medio_antecedencia_horas,
        tempo_medio_antecedencia_dias = EXCLUDED.tempo_medio_antecedencia_dias,
        total_violacoes_sla = EXCLUDED.total_violacoes_sla,
        percentual_violacoes_sla = EXCLUDED.percentual_violacoes_sla,
        eventos_pagamento_hoje = EXCLUDED.eventos_pagamento_hoje,
        eventos_compra_urgente = EXCLUDED.eventos_compra_urgente,
        eventos_medicao_fora_janela = EXCLUDED.eventos_medicao_fora_janela,
        eventos_documento_fora_prazo = EXCLUDED.eventos_documento_fora_prazo,
        eventos_requisicao_sem_antecedencia = EXCLUDED.eventos_requisicao_sem_antecedencia,
        valor_total_operacoes = EXCLUDED.valor_total_operacoes,
        valor_operacoes_urgentes = EXCLUDED.valor_operacoes_urgentes,
        data_calculo = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_kpi_id;
    
    RETURN v_kpi_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.calcular_kpis_planejamento_gestor IS 'Calcula e armazena KPIs de planejamento para um gestor em um período';

-- =====================================================
-- 10. POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE financeiro.slas_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.eventos_planejamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.kpis_planejamento_gestor ENABLE ROW LEVEL SECURITY;

-- Políticas para slas_etapas
CREATE POLICY "Users can view slas_etapas of their companies"
ON financeiro.slas_etapas FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create slas_etapas in their companies"
ON financeiro.slas_etapas FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update slas_etapas in their companies"
ON financeiro.slas_etapas FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete slas_etapas in their companies"
ON financeiro.slas_etapas FOR DELETE
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

-- Políticas para eventos_planejamento
CREATE POLICY "Users can view eventos_planejamento of their companies"
ON financeiro.eventos_planejamento FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create eventos_planejamento in their companies"
ON financeiro.eventos_planejamento FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update eventos_planejamento in their companies"
ON financeiro.eventos_planejamento FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

-- Políticas para kpis_planejamento_gestor
CREATE POLICY "Users can view kpis_planejamento_gestor of their companies"
ON financeiro.kpis_planejamento_gestor FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create kpis_planejamento_gestor in their companies"
ON financeiro.kpis_planejamento_gestor FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update kpis_planejamento_gestor in their companies"
ON financeiro.kpis_planejamento_gestor FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

-- =====================================================
-- 11. GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA financeiro TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA financeiro TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA financeiro TO authenticated;

-- =====================================================
-- 12. DADOS INICIAIS: SLAs PADRÃO
-- =====================================================

-- Função para criar SLAs padrão para uma empresa
CREATE OR REPLACE FUNCTION financeiro.criar_slas_padrao(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Inserir SLAs padrão apenas se não existirem
    INSERT INTO financeiro.slas_etapas (company_id, etapa_processo, prazo_minimo_horas, prazo_ideal_horas, descricao)
    VALUES
        (p_company_id, 'criacao_requisicao', 24, 72, 'Prazo mínimo para criar requisição antes da necessidade'),
        (p_company_id, 'envio_pedido', 48, 120, 'Prazo mínimo para enviar pedido antes da necessidade'),
        (p_company_id, 'envio_medicao', 24, 72, 'Prazo mínimo para enviar medição dentro da janela'),
        (p_company_id, 'envio_documentos_pagamento', 24, 72, 'Prazo mínimo para enviar documentos para pagamento'),
        (p_company_id, 'criacao_conta_pagar', 24, 72, 'Prazo mínimo para criar conta a pagar antes do vencimento')
    ON CONFLICT (company_id, etapa_processo) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION financeiro.criar_slas_padrao IS 'Cria configurações de SLA padrão para uma empresa';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
