-- =====================================================
-- MIGRAÇÃO: SISTEMA DE CLASSES FINANCEIRAS E PLANO DE CONTAS COMPLETO
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Cria sistema completo de Classes Financeiras Gerenciais e 
--            ajusta Plano de Contas para suportar estrutura hierárquica completa
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. AJUSTAR TABELA PLANO_CONTAS (se necessário)
-- =====================================================

-- Adicionar campos que podem estar faltando
ALTER TABLE financeiro.plano_contas
ADD COLUMN IF NOT EXISTS aceita_lancamento BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS natureza VARCHAR(20) CHECK (natureza IN ('devedora', 'credora')),
ADD COLUMN IF NOT EXISTS saldo_inicial DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_atual DECIMAL(15,2) DEFAULT 0;

-- Atualizar constraint de tipo_conta para incluir 'custos'
ALTER TABLE financeiro.plano_contas
DROP CONSTRAINT IF EXISTS plano_contas_tipo_conta_check;

ALTER TABLE financeiro.plano_contas
ADD CONSTRAINT plano_contas_tipo_conta_check 
CHECK (tipo_conta IN ('ativo', 'passivo', 'patrimonio', 'receita', 'despesa', 'custos'));

-- Comentários
COMMENT ON COLUMN financeiro.plano_contas.aceita_lancamento IS 'Indica se a conta aceita lançamentos diretos';
COMMENT ON COLUMN financeiro.plano_contas.natureza IS 'Natureza da conta: devedora ou credora';
COMMENT ON COLUMN financeiro.plano_contas.saldo_inicial IS 'Saldo inicial da conta';
COMMENT ON COLUMN financeiro.plano_contas.saldo_atual IS 'Saldo atual da conta';

-- =====================================================
-- 2. CRIAR TABELA CLASSES FINANCEIRAS (GERENCIAIS)
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.classes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    classe_pai_id UUID REFERENCES financeiro.classes_financeiras(id),
    nivel INTEGER NOT NULL DEFAULT 1,
    ordem INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, codigo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_company_id ON financeiro.classes_financeiras(company_id);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_classe_pai_id ON financeiro.classes_financeiras(classe_pai_id);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_codigo ON financeiro.classes_financeiras(codigo);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_is_active ON financeiro.classes_financeiras(is_active);

-- Comentários
COMMENT ON TABLE financeiro.classes_financeiras IS 'Classes Financeiras Gerenciais - Hierarquia Pai/Filho para operações de Telecom';
COMMENT ON COLUMN financeiro.classes_financeiras.codigo IS 'Código único da classe financeira';
COMMENT ON COLUMN financeiro.classes_financeiras.nome IS 'Nome da classe financeira';
COMMENT ON COLUMN financeiro.classes_financeiras.classe_pai_id IS 'Referência à classe pai (para hierarquia)';
COMMENT ON COLUMN financeiro.classes_financeiras.nivel IS 'Nível hierárquico da classe (1 = raiz)';
COMMENT ON COLUMN financeiro.classes_financeiras.ordem IS 'Ordem de exibição';

-- =====================================================
-- 3. CRIAR TABELA DE VINCULAÇÃO (CLASSES → CONTAS CONTÁBEIS)
-- =====================================================

CREATE TABLE IF NOT EXISTS financeiro.classes_financeiras_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    classe_financeira_id UUID NOT NULL REFERENCES financeiro.classes_financeiras(id) ON DELETE CASCADE,
    conta_contabil_id UUID NOT NULL REFERENCES financeiro.plano_contas(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    observacoes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, classe_financeira_id, conta_contabil_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_contas_company_id ON financeiro.classes_financeiras_contas(company_id);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_contas_classe_id ON financeiro.classes_financeiras_contas(classe_financeira_id);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_contas_conta_id ON financeiro.classes_financeiras_contas(conta_contabil_id);
CREATE INDEX IF NOT EXISTS idx_classes_financeiras_contas_is_default ON financeiro.classes_financeiras_contas(is_default);

-- Comentários
COMMENT ON TABLE financeiro.classes_financeiras_contas IS 'Vinculação entre Classes Financeiras Gerenciais e Contas Contábeis';
COMMENT ON COLUMN financeiro.classes_financeiras_contas.classe_financeira_id IS 'ID da classe financeira gerencial';
COMMENT ON COLUMN financeiro.classes_financeiras_contas.conta_contabil_id IS 'ID da conta contábil do plano de contas';
COMMENT ON COLUMN financeiro.classes_financeiras_contas.is_default IS 'Indica se é a conta padrão para esta classe';

-- =====================================================
-- 4. TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.update_classes_financeiras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_classes_financeiras_updated_at
    BEFORE UPDATE ON financeiro.classes_financeiras
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.update_classes_financeiras_updated_at();

CREATE TRIGGER trigger_update_classes_financeiras_contas_updated_at
    BEFORE UPDATE ON financeiro.classes_financeiras_contas
    FOR EACH ROW
    EXECUTE FUNCTION financeiro.update_classes_financeiras_updated_at();

-- =====================================================
-- 5. FUNÇÃO PARA CALCULAR NÍVEL HIERÁRQUICO
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.calculate_classe_nivel(p_classe_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_nivel INTEGER := 1;
    v_pai_id UUID;
BEGIN
    SELECT classe_pai_id INTO v_pai_id
    FROM financeiro.classes_financeiras
    WHERE id = p_classe_id;
    
    WHILE v_pai_id IS NOT NULL LOOP
        v_nivel := v_nivel + 1;
        SELECT classe_pai_id INTO v_pai_id
        FROM financeiro.classes_financeiras
        WHERE id = v_pai_id;
    END LOOP;
    
    RETURN v_nivel;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE financeiro.classes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.classes_financeiras_contas ENABLE ROW LEVEL SECURITY;

-- Policy para classes_financeiras
CREATE POLICY "Users can view classes_financeiras in their companies"
    ON financeiro.classes_financeiras
    FOR SELECT
    USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage classes_financeiras in their companies"
    ON financeiro.classes_financeiras
    FOR ALL
    USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
            AND uc.permission_level IN ('admin', 'edit')
        )
    );

-- Policy para classes_financeiras_contas
CREATE POLICY "Users can view classes_financeiras_contas in their companies"
    ON financeiro.classes_financeiras_contas
    FOR SELECT
    USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage classes_financeiras_contas in their companies"
    ON financeiro.classes_financeiras_contas
    FOR ALL
    USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
            AND uc.permission_level IN ('admin', 'edit')
        )
    );

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT ALL ON TABLE financeiro.classes_financeiras TO authenticated;
GRANT ALL ON TABLE financeiro.classes_financeiras_contas TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro.calculate_classe_nivel(UUID) TO authenticated;

