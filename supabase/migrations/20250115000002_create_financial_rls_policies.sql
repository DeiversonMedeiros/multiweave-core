-- =====================================================
-- MIGRAÇÃO: POLÍTICAS RLS E FUNÇÕES DO MÓDULO FINANCEIRO
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Cria políticas RLS e funções para o módulo financeiro
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

-- Contas a pagar/receber
ALTER TABLE financeiro.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.borderos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.remessas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.retornos_bancarios ENABLE ROW LEVEL SECURITY;

-- Tesouraria
ALTER TABLE financeiro.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.conciliacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.fluxo_caixa ENABLE ROW LEVEL SECURITY;

-- Fiscal
ALTER TABLE financeiro.nfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.nfse ENABLE ROW LEVEL SECURITY;

-- Contabilidade
ALTER TABLE financeiro.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.lancamentos_contabeis ENABLE ROW LEVEL SECURITY;

-- Aprovações
ALTER TABLE financeiro.configuracoes_aprovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro.aprovacoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. FUNÇÕES DE VERIFICAÇÃO DE PERMISSÕES
-- =====================================================

-- Função para verificar permissão no módulo financeiro
CREATE OR REPLACE FUNCTION financeiro.check_financial_permission(
    p_user_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar se é super admin
    IF public.is_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permissão específica do módulo financeiro
    RETURN public.check_module_permission(p_user_id, 'financeiro', p_permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar permissão de aprovação
CREATE OR REPLACE FUNCTION financeiro.check_approval_permission(
    p_user_id UUID,
    p_company_id UUID,
    p_valor DECIMAL,
    p_centro_custo_id UUID DEFAULT NULL,
    p_departamento TEXT DEFAULT NULL,
    p_classe_financeira TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Verificar se é super admin
    IF public.is_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Obter profile_id do usuário
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true
    LIMIT 1;
    
    -- Se não encontrou perfil, retorna false
    IF user_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se tem permissão de aprovação
    SELECT EXISTS(
        SELECT 1 FROM public.module_permissions mp
        WHERE mp.profile_id = user_profile_id
        AND mp.module_name = 'financeiro'
        AND mp.can_edit = true
    ) INTO has_permission;
    
    -- Se não tem permissão básica, retorna false
    IF NOT has_permission THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar configurações específicas de aprovação
    -- Por valor
    IF EXISTS(
        SELECT 1 FROM financeiro.configuracoes_aprovacao ca
        WHERE ca.company_id = p_company_id
        AND ca.tipo_aprovacao = 'conta_pagar'
        AND ca.valor_limite >= p_valor
        AND (ca.centro_custo_id IS NULL OR ca.centro_custo_id = p_centro_custo_id)
        AND (ca.departamento IS NULL OR ca.departamento = p_departamento)
        AND (ca.classe_financeira IS NULL OR ca.classe_financeira = p_classe_financeira)
        AND (ca.usuario_id IS NULL OR ca.usuario_id = p_user_id)
        AND ca.is_active = true
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter nível de aprovação necessário
CREATE OR REPLACE FUNCTION financeiro.get_required_approval_level(
    p_company_id UUID,
    p_valor DECIMAL,
    p_centro_custo_id UUID DEFAULT NULL,
    p_departamento TEXT DEFAULT NULL,
    p_classe_financeira TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    max_level INTEGER := 0;
BEGIN
    -- Encontrar o maior nível de aprovação necessário
    SELECT COALESCE(MAX(ca.nivel_aprovacao), 1)
    INTO max_level
    FROM financeiro.configuracoes_aprovacao ca
    WHERE ca.company_id = p_company_id
    AND ca.tipo_aprovacao = 'conta_pagar'
    AND ca.valor_limite >= p_valor
    AND (ca.centro_custo_id IS NULL OR ca.centro_custo_id = p_centro_custo_id)
    AND (ca.departamento IS NULL OR ca.departamento = p_departamento)
    AND (ca.classe_financeira IS NULL OR ca.classe_financeira = p_classe_financeira)
    AND ca.is_active = true;
    
    RETURN COALESCE(max_level, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. POLÍTICAS RLS - CONTAS A PAGAR
-- =====================================================

-- Política de SELECT para contas a pagar
CREATE POLICY "Users can view contas_pagar of their companies" ON financeiro.contas_pagar
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

-- Política de INSERT para contas a pagar
CREATE POLICY "Users can create contas_pagar in their companies" ON financeiro.contas_pagar
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'create')
    );

-- Política de UPDATE para contas a pagar
CREATE POLICY "Users can update contas_pagar in their companies" ON financeiro.contas_pagar
    FOR UPDATE USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Política de DELETE para contas a pagar
CREATE POLICY "Users can delete contas_pagar in their companies" ON financeiro.contas_pagar
    FOR DELETE USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'delete')
    );

-- =====================================================
-- 4. POLÍTICAS RLS - CONTAS A RECEBER
-- =====================================================

-- Política de SELECT para contas a receber
CREATE POLICY "Users can view contas_receber of their companies" ON financeiro.contas_receber
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

-- Política de INSERT para contas a receber
CREATE POLICY "Users can create contas_receber in their companies" ON financeiro.contas_receber
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'create')
    );

-- Política de UPDATE para contas a receber
CREATE POLICY "Users can update contas_receber in their companies" ON financeiro.contas_receber
    FOR UPDATE USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Política de DELETE para contas a receber
CREATE POLICY "Users can delete contas_receber in their companies" ON financeiro.contas_receber
    FOR DELETE USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'delete')
    );

-- =====================================================
-- 5. POLÍTICAS RLS - TESOURARIA
-- =====================================================

-- Políticas para contas bancárias
CREATE POLICY "Users can view contas_bancarias of their companies" ON financeiro.contas_bancarias
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage contas_bancarias in their companies" ON financeiro.contas_bancarias
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para conciliações bancárias
CREATE POLICY "Users can view conciliacoes_bancarias of their companies" ON financeiro.conciliacoes_bancarias
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage conciliacoes_bancarias in their companies" ON financeiro.conciliacoes_bancarias
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para fluxo de caixa
CREATE POLICY "Users can view fluxo_caixa of their companies" ON financeiro.fluxo_caixa
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage fluxo_caixa in their companies" ON financeiro.fluxo_caixa
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- =====================================================
-- 6. POLÍTICAS RLS - FISCAL
-- =====================================================

-- Políticas para NF-e
CREATE POLICY "Users can view nfe of their companies" ON financeiro.nfe
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage nfe in their companies" ON financeiro.nfe
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para NFS-e
CREATE POLICY "Users can view nfse of their companies" ON financeiro.nfse
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage nfse in their companies" ON financeiro.nfse
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- =====================================================
-- 7. POLÍTICAS RLS - CONTABILIDADE
-- =====================================================

-- Políticas para plano de contas
CREATE POLICY "Users can view plano_contas of their companies" ON financeiro.plano_contas
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage plano_contas in their companies" ON financeiro.plano_contas
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para lançamentos contábeis
CREATE POLICY "Users can view lancamentos_contabeis of their companies" ON financeiro.lancamentos_contabeis
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage lancamentos_contabeis in their companies" ON financeiro.lancamentos_contabeis
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- =====================================================
-- 8. POLÍTICAS RLS - APROVAÇÕES
-- =====================================================

-- Políticas para configurações de aprovação
CREATE POLICY "Users can view configuracoes_aprovacao of their companies" ON financeiro.configuracoes_aprovacao
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage configuracoes_aprovacao in their companies" ON financeiro.configuracoes_aprovacao
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para aprovações
CREATE POLICY "Users can view aprovacoes of their companies" ON financeiro.aprovacoes
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage aprovacoes in their companies" ON financeiro.aprovacoes
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- =====================================================
-- 9. POLÍTICAS RLS - BORDERÔS E REMESSAS
-- =====================================================

-- Políticas para borderôs
CREATE POLICY "Users can view borderos of their companies" ON financeiro.borderos
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage borderos in their companies" ON financeiro.borderos
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para remessas bancárias
CREATE POLICY "Users can view remessas_bancarias of their companies" ON financeiro.remessas_bancarias
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage remessas_bancarias in their companies" ON financeiro.remessas_bancarias
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- Políticas para retornos bancários
CREATE POLICY "Users can view retornos_bancarios of their companies" ON financeiro.retornos_bancarios
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
    );

CREATE POLICY "Users can manage retornos_bancarios in their companies" ON financeiro.retornos_bancarios
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id
            FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
            AND uc.ativo = true
        )
        AND financeiro.check_financial_permission(auth.uid(), 'edit')
    );

-- =====================================================
-- 10. GRANTS DE PERMISSÕES
-- =====================================================

-- Grant para esquema financeiro
GRANT USAGE ON SCHEMA financeiro TO postgres;
GRANT USAGE ON SCHEMA financeiro TO anon;
GRANT USAGE ON SCHEMA financeiro TO authenticated;
GRANT USAGE ON SCHEMA financeiro TO service_role;

-- Grant para todas as tabelas do esquema financeiro
GRANT ALL ON ALL TABLES IN SCHEMA financeiro TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA financeiro TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA financeiro TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA financeiro TO service_role;

-- Grant para todas as sequências do esquema financeiro
GRANT ALL ON ALL SEQUENCES IN SCHEMA financeiro TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA financeiro TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA financeiro TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA financeiro TO service_role;

-- Grant para todas as funções do esquema financeiro
GRANT ALL ON ALL FUNCTIONS IN SCHEMA financeiro TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA financeiro TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA financeiro TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA financeiro TO service_role;

