-- =====================================================
-- MIGRAÇÃO: Políticas RLS para Almoxarifado
-- Data: 2025-01-15
-- Descrição: Configuração de segurança e isolamento por empresa
-- =====================================================

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

-- Almoxarifados
ALTER TABLE almoxarifado.almoxarifados ENABLE ROW LEVEL SECURITY;

-- Localizações físicas
ALTER TABLE almoxarifado.localizacoes_fisicas ENABLE ROW LEVEL SECURITY;

-- Materiais e equipamentos
ALTER TABLE almoxarifado.materiais_equipamentos ENABLE ROW LEVEL SECURITY;

-- Estoque atual
ALTER TABLE almoxarifado.estoque_atual ENABLE ROW LEVEL SECURITY;

-- Movimentações de estoque
ALTER TABLE almoxarifado.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Entradas de materiais
ALTER TABLE almoxarifado.entradas_materiais ENABLE ROW LEVEL SECURITY;

-- Itens de entrada
ALTER TABLE almoxarifado.entrada_itens ENABLE ROW LEVEL SECURITY;

-- Checklist de recebimento
ALTER TABLE almoxarifado.checklist_recebimento ENABLE ROW LEVEL SECURITY;

-- Transferências
ALTER TABLE almoxarifado.transferencias ENABLE ROW LEVEL SECURITY;

-- Itens de transferência
ALTER TABLE almoxarifado.transferencia_itens ENABLE ROW LEVEL SECURITY;

-- Inventários
ALTER TABLE almoxarifado.inventarios ENABLE ROW LEVEL SECURITY;

-- Itens de inventário
ALTER TABLE almoxarifado.inventario_itens ENABLE ROW LEVEL SECURITY;

-- Solicitações de compra
ALTER TABLE almoxarifado.solicitacoes_compra ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - ISOLAMENTO POR EMPRESA
-- =====================================================

-- 1. ALMOXARIFADOS
CREATE POLICY "almoxarifados_company_isolation" ON almoxarifado.almoxarifados
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 2. LOCALIZAÇÕES FÍSICAS
CREATE POLICY "localizacoes_fisicas_company_isolation" ON almoxarifado.localizacoes_fisicas
    FOR ALL USING (
        almoxarifado_id IN (
            SELECT id FROM almoxarifado.almoxarifados 
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- 3. MATERIAIS E EQUIPAMENTOS
CREATE POLICY "materiais_equipamentos_company_isolation" ON almoxarifado.materiais_equipamentos
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 4. ESTOQUE ATUAL
CREATE POLICY "estoque_atual_company_isolation" ON almoxarifado.estoque_atual
    FOR ALL USING (
        material_equipamento_id IN (
            SELECT id FROM almoxarifado.materiais_equipamentos 
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- 5. MOVIMENTAÇÕES DE ESTOQUE
CREATE POLICY "movimentacoes_estoque_company_isolation" ON almoxarifado.movimentacoes_estoque
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 6. ENTRADAS DE MATERIAIS
CREATE POLICY "entradas_materiais_company_isolation" ON almoxarifado.entradas_materiais
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 7. ITENS DE ENTRADA
CREATE POLICY "entrada_itens_company_isolation" ON almoxarifado.entrada_itens
    FOR ALL USING (
        entrada_id IN (
            SELECT id FROM almoxarifado.entradas_materiais 
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- 8. CHECKLIST DE RECEBIMENTO
CREATE POLICY "checklist_recebimento_company_isolation" ON almoxarifado.checklist_recebimento
    FOR ALL USING (
        entrada_id IN (
            SELECT id FROM almoxarifado.entradas_materiais 
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- 9. TRANSFERÊNCIAS
CREATE POLICY "transferencias_company_isolation" ON almoxarifado.transferencias
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 10. ITENS DE TRANSFERÊNCIA
CREATE POLICY "transferencia_itens_company_isolation" ON almoxarifado.transferencia_itens
    FOR ALL USING (
        transferencia_id IN (
            SELECT id FROM almoxarifado.transferencias 
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- 11. INVENTÁRIOS
CREATE POLICY "inventarios_company_isolation" ON almoxarifado.inventarios
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 12. ITENS DE INVENTÁRIO
CREATE POLICY "inventario_itens_company_isolation" ON almoxarifado.inventario_itens
    FOR ALL USING (
        inventario_id IN (
            SELECT id FROM almoxarifado.inventarios 
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- 13. SOLICITAÇÕES DE COMPRA
CREATE POLICY "solicitacoes_compra_company_isolation" ON almoxarifado.solicitacoes_compra
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- =====================================================
-- POLÍTICAS DE PERMISSÃO POR PERFIL
-- =====================================================

-- Função auxiliar para verificar permissões de módulo
CREATE OR REPLACE FUNCTION almoxarifado.check_module_permission(permission_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Obter perfil do usuário na empresa atual
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = COALESCE(
        current_setting('app.current_company_id', true)::uuid,
        (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
    )
    AND uc.ativo = true
    LIMIT 1;

    IF user_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar permissão no módulo almoxarifado
    SELECT 
        CASE permission_type
            WHEN 'read' THEN mp.can_read
            WHEN 'create' THEN mp.can_create
            WHEN 'edit' THEN mp.can_edit
            WHEN 'delete' THEN mp.can_delete
            ELSE false
        END INTO has_permission
    FROM public.module_permissions mp
    WHERE mp.profile_id = user_profile_id
    AND mp.module_name = 'almoxarifado'
    AND mp.can_read = true;

    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS ESPECÍFICAS POR AÇÃO
-- =====================================================

-- Políticas de leitura (SELECT)
CREATE POLICY "almoxarifados_select_policy" ON almoxarifado.almoxarifados
    FOR SELECT USING (almoxarifado.check_module_permission('read'));

CREATE POLICY "materiais_equipamentos_select_policy" ON almoxarifado.materiais_equipamentos
    FOR SELECT USING (almoxarifado.check_module_permission('read'));

CREATE POLICY "estoque_atual_select_policy" ON almoxarifado.estoque_atual
    FOR SELECT USING (almoxarifado.check_module_permission('read'));

CREATE POLICY "movimentacoes_estoque_select_policy" ON almoxarifado.movimentacoes_estoque
    FOR SELECT USING (almoxarifado.check_module_permission('read'));

-- Políticas de inserção (INSERT)
CREATE POLICY "almoxarifados_insert_policy" ON almoxarifado.almoxarifados
    FOR INSERT WITH CHECK (almoxarifado.check_module_permission('create'));

CREATE POLICY "materiais_equipamentos_insert_policy" ON almoxarifado.materiais_equipamentos
    FOR INSERT WITH CHECK (almoxarifado.check_module_permission('create'));

CREATE POLICY "movimentacoes_estoque_insert_policy" ON almoxarifado.movimentacoes_estoque
    FOR INSERT WITH CHECK (almoxarifado.check_module_permission('create'));

-- Políticas de atualização (UPDATE)
CREATE POLICY "almoxarifados_update_policy" ON almoxarifado.almoxarifados
    FOR UPDATE USING (almoxarifado.check_module_permission('edit'));

CREATE POLICY "materiais_equipamentos_update_policy" ON almoxarifado.materiais_equipamentos
    FOR UPDATE USING (almoxarifado.check_module_permission('edit'));

CREATE POLICY "estoque_atual_update_policy" ON almoxarifado.estoque_atual
    FOR UPDATE USING (almoxarifado.check_module_permission('edit'));

-- Políticas de exclusão (DELETE)
CREATE POLICY "almoxarifados_delete_policy" ON almoxarifado.almoxarifados
    FOR DELETE USING (almoxarifado.check_module_permission('delete'));

CREATE POLICY "materiais_equipamentos_delete_policy" ON almoxarifado.materiais_equipamentos
    FOR DELETE USING (almoxarifado.check_module_permission('delete'));

-- =====================================================
-- GRANTS PARA USUÁRIOS AUTENTICADOS
-- =====================================================

-- Conceder permissões básicas para usuários autenticados
GRANT USAGE ON SCHEMA almoxarifado TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA almoxarifado TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA almoxarifado TO authenticated;

-- =====================================================
-- COMENTÁRIOS DAS POLÍTICAS
-- =====================================================

COMMENT ON POLICY "almoxarifados_company_isolation" ON almoxarifado.almoxarifados IS 'Isolamento de dados por empresa';
COMMENT ON POLICY "materiais_equipamentos_company_isolation" ON almoxarifado.materiais_equipamentos IS 'Isolamento de materiais por empresa';
COMMENT ON POLICY "estoque_atual_company_isolation" ON almoxarifado.estoque_atual IS 'Isolamento de estoque por empresa';
COMMENT ON POLICY "movimentacoes_estoque_company_isolation" ON almoxarifado.movimentacoes_estoque IS 'Isolamento de movimentações por empresa';

COMMENT ON FUNCTION almoxarifado.check_module_permission(TEXT) IS 'Verifica permissões do usuário no módulo almoxarifado';
