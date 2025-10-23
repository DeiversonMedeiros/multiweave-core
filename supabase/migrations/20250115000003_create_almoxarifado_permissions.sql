-- =====================================================
-- MIGRAÇÃO: Permissões do Módulo Almoxarifado
-- Data: 2025-01-15
-- Descrição: Configuração de permissões por perfil para o módulo
-- =====================================================

-- =====================================================
-- PERMISSÕES DE MÓDULO PARA ALMOXARIFADO
-- =====================================================

-- Inserir permissões de módulo para todos os perfis existentes
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'almoxarifado',
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN true
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN false
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    NOW(),
    NOW()
FROM public.profiles p
WHERE p.is_active = true
ON CONFLICT (profile_id, module_name) DO NOTHING;

-- =====================================================
-- PERMISSÕES DE ENTIDADE PARA ALMOXARIFADO
-- =====================================================

-- Lista de entidades do módulo almoxarifado
WITH almoxarifado_entities AS (
    SELECT unnest(ARRAY[
        'almoxarifados',
        'materiais_equipamentos', 
        'estoque_atual',
        'movimentacoes_estoque',
        'entradas_materiais',
        'entrada_itens',
        'checklist_recebimento',
        'transferencias',
        'transferencia_itens',
        'inventarios',
        'inventario_itens',
        'solicitacoes_compra'
    ]) AS entity_name
),
profiles AS (
    SELECT id, nome FROM public.profiles WHERE is_active = true
)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    ae.entity_name,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN true
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN false
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    NOW(),
    NOW()
FROM profiles p
CROSS JOIN almoxarifado_entities ae
ON CONFLICT (profile_id, entity_name) DO NOTHING;

-- =====================================================
-- PERMISSÕES ESPECÍFICAS POR ENTIDADE
-- =====================================================

-- Atualizar permissões específicas para entidades sensíveis
UPDATE public.entity_permissions 
SET 
    can_create = CASE 
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Super Admin', 'Administrador')) THEN true
        ELSE false
    END,
    can_edit = CASE 
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Super Admin', 'Administrador')) THEN true
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome = 'Gerente') AND entity_name IN ('movimentacoes_estoque', 'entradas_materiais', 'transferencias', 'inventarios') THEN true
        ELSE false
    END,
    can_delete = CASE 
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Super Admin', 'Administrador')) THEN true
        ELSE false
    END
WHERE entity_name IN ('almoxarifados', 'materiais_equipamentos', 'solicitacoes_compra');

-- =====================================================
-- FUNÇÕES AUXILIARES PARA VERIFICAÇÃO DE PERMISSÕES
-- =====================================================

-- Função para verificar permissão de leitura
CREATE OR REPLACE FUNCTION almoxarifado.can_read_entity(entity_name TEXT)
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

    -- Verificar permissão na entidade específica
    SELECT ep.can_read INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar permissão de criação
CREATE OR REPLACE FUNCTION almoxarifado.can_create_entity(entity_name TEXT)
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

    -- Verificar permissão na entidade específica
    SELECT ep.can_create INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar permissão de edição
CREATE OR REPLACE FUNCTION almoxarifado.can_edit_entity(entity_name TEXT)
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

    -- Verificar permissão na entidade específica
    SELECT ep.can_edit INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar permissão de exclusão
CREATE OR REPLACE FUNCTION almoxarifado.can_delete_entity(entity_name TEXT)
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

    -- Verificar permissão na entidade específica
    SELECT ep.can_delete INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS PARA AUDITORIA
-- =====================================================

-- Função de auditoria para almoxarifado
CREATE OR REPLACE FUNCTION almoxarifado.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    operation_type TEXT;
BEGIN
    -- Determinar tipo de operação
    IF TG_OP = 'DELETE' THEN
        operation_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation_type := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Inserir log de auditoria
    INSERT INTO rh.audit_logs (
        table_name,
        operation_type,
        old_data,
        new_data,
        user_id,
        company_id,
        created_at
    ) VALUES (
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        operation_type,
        old_data,
        new_data,
        auth.uid(),
        COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        ),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoria nas tabelas principais
CREATE TRIGGER audit_almoxarifados_trigger
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.almoxarifados
    FOR EACH ROW EXECUTE FUNCTION almoxarifado.audit_trigger_function();

CREATE TRIGGER audit_materiais_equipamentos_trigger
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.materiais_equipamentos
    FOR EACH ROW EXECUTE FUNCTION almoxarifado.audit_trigger_function();

CREATE TRIGGER audit_movimentacoes_estoque_trigger
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION almoxarifado.audit_trigger_function();

CREATE TRIGGER audit_entradas_materiais_trigger
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.entradas_materiais
    FOR EACH ROW EXECUTE FUNCTION almoxarifado.audit_trigger_function();

CREATE TRIGGER audit_transferencias_trigger
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.transferencias
    FOR EACH ROW EXECUTE FUNCTION almoxarifado.audit_trigger_function();

CREATE TRIGGER audit_inventarios_trigger
    AFTER INSERT OR UPDATE OR DELETE ON almoxarifado.inventarios
    FOR EACH ROW EXECUTE FUNCTION almoxarifado.audit_trigger_function();

-- =====================================================
-- COMENTÁRIOS DAS FUNÇÕES
-- =====================================================

COMMENT ON FUNCTION almoxarifado.can_read_entity(TEXT) IS 'Verifica se o usuário pode ler a entidade especificada';
COMMENT ON FUNCTION almoxarifado.can_create_entity(TEXT) IS 'Verifica se o usuário pode criar registros na entidade especificada';
COMMENT ON FUNCTION almoxarifado.can_edit_entity(TEXT) IS 'Verifica se o usuário pode editar registros na entidade especificada';
COMMENT ON FUNCTION almoxarifado.can_delete_entity(TEXT) IS 'Verifica se o usuário pode excluir registros da entidade especificada';
COMMENT ON FUNCTION almoxarifado.audit_trigger_function() IS 'Função de trigger para auditoria de operações no módulo almoxarifado';
