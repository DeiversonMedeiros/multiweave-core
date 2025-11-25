-- =====================================================
-- SISTEMA DE PERMISSÕES GRANULARES
-- =====================================================
-- Este sistema permite:
-- 1. Limitar acesso por ownership (usuário só vê o que criou)
-- 2. Limitar acesso por centro de custo (usuário só vê centros de custo permitidos)
-- 3. Combinar ambas as regras para manter sigilo entre usuários e centros de custo
-- =====================================================

-- =====================================================
-- TABELA 1: USER COST CENTER PERMISSIONS
-- =====================================================
-- Relaciona usuários com centros de custo permitidos
-- Um usuário pode ter acesso a múltiplos centros de custo
-- O admin do sistema gerencia essas permissões

CREATE TABLE IF NOT EXISTS public.user_cost_center_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
    
    -- Permissões específicas por centro de custo (opcional, pode herdar do perfil)
    can_read BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT false,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, company_id, cost_center_id)
);

COMMENT ON TABLE public.user_cost_center_permissions IS 'Permissões de usuários por centro de custo - permite que admin defina quais centros de custo cada usuário pode acessar';
COMMENT ON COLUMN public.user_cost_center_permissions.user_id IS 'Usuário que terá acesso ao centro de custo';
COMMENT ON COLUMN public.user_cost_center_permissions.cost_center_id IS 'Centro de custo permitido para o usuário';
COMMENT ON COLUMN public.user_cost_center_permissions.can_read IS 'Pode visualizar registros deste centro de custo';
COMMENT ON COLUMN public.user_cost_center_permissions.can_create IS 'Pode criar registros para este centro de custo';
COMMENT ON COLUMN public.user_cost_center_permissions.can_edit IS 'Pode editar registros deste centro de custo';
COMMENT ON COLUMN public.user_cost_center_permissions.can_delete IS 'Pode deletar registros deste centro de custo';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_cost_center_permissions_user_id ON public.user_cost_center_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cost_center_permissions_company_id ON public.user_cost_center_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_cost_center_permissions_cost_center_id ON public.user_cost_center_permissions(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_user_cost_center_permissions_user_company ON public.user_cost_center_permissions(user_id, company_id);

-- =====================================================
-- TABELA 2: ENTITY OWNERSHIP PERMISSIONS
-- =====================================================
-- Define quais entidades devem respeitar ownership (created_by)
-- e quais devem respeitar centro de custo
-- Permite configuração flexível por entidade

CREATE TABLE IF NOT EXISTS public.entity_ownership_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name TEXT NOT NULL UNIQUE,
    schema_name TEXT NOT NULL DEFAULT 'public',
    table_name TEXT NOT NULL,
    
    -- Configurações de restrição
    enforce_ownership BOOLEAN DEFAULT false, -- Se true, usuário só vê o que criou
    enforce_cost_center BOOLEAN DEFAULT false, -- Se true, usuário só vê seus centros de custo
    ownership_field TEXT DEFAULT 'created_by', -- Campo que identifica o criador
    cost_center_field TEXT DEFAULT 'centro_custo_id', -- Campo que identifica o centro de custo
    
    -- Descrição
    description TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.entity_ownership_config IS 'Configuração de restrições de ownership e centro de custo por entidade';
COMMENT ON COLUMN public.entity_ownership_config.entity_name IS 'Nome da entidade (ex: requisicoes_compra, contas_pagar)';
COMMENT ON COLUMN public.entity_ownership_config.enforce_ownership IS 'Se true, força que usuário só veja registros criados por ele';
COMMENT ON COLUMN public.entity_ownership_config.enforce_cost_center IS 'Se true, força que usuário só veja registros de seus centros de custo permitidos';

-- Inserir configurações padrão para as entidades mencionadas
INSERT INTO public.entity_ownership_config (entity_name, schema_name, table_name, enforce_ownership, enforce_cost_center, ownership_field, cost_center_field, description)
VALUES
    ('requisicoes_compra', 'compras', 'requisicoes_compra', true, true, 'created_by', 'centro_custo_id', 'Requisições de compra - restrito por criador e centro de custo'),
    ('contas_pagar', 'financeiro', 'contas_pagar', true, true, 'created_by', 'centro_custo_id', 'Contas a pagar - restrito por criador e centro de custo'),
    ('solicitacoes_saida_materiais', 'public', 'solicitacoes_saida_materiais', true, true, 'funcionario_solicitante_id', 'centro_custo_id', 'Solicitações de saída de materiais - restrito por solicitante e centro de custo'),
    ('transferencias', 'almoxarifado', 'transferencias', true, true, 'solicitante_id', NULL, 'Transferências de materiais - restrito por criador e centro de custo dos itens')
ON CONFLICT (entity_name) DO NOTHING;

-- =====================================================
-- FUNÇÃO 1: Verificar se usuário tem acesso a centro de custo
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_cost_center_access(
    p_user_id UUID,
    p_company_id UUID,
    p_cost_center_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Admin sempre tem acesso
    IF public.is_admin_simple(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se usuário tem permissão explícita para este centro de custo
    RETURN EXISTS (
        SELECT 1
        FROM public.user_cost_center_permissions
        WHERE user_id = p_user_id
        AND company_id = p_company_id
        AND cost_center_id = p_cost_center_id
    );
END;
$$;

COMMENT ON FUNCTION public.user_has_cost_center_access IS 'Verifica se usuário tem acesso a um centro de custo específico';

-- =====================================================
-- FUNÇÃO 2: Obter centros de custo permitidos para usuário
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_allowed_cost_centers(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS TABLE(cost_center_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Admin vê todos os centros de custo
    IF public.is_admin_simple(p_user_id) THEN
        RETURN QUERY
        SELECT cc.id
        FROM public.cost_centers cc
        WHERE cc.company_id = p_company_id
        AND cc.ativo = true;
    ELSE
        -- Usuário comum vê apenas os permitidos
        RETURN QUERY
        SELECT uccp.cost_center_id
        FROM public.user_cost_center_permissions uccp
        WHERE uccp.user_id = p_user_id
        AND uccp.company_id = p_company_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_allowed_cost_centers IS 'Retorna lista de IDs de centros de custo que o usuário pode acessar';

-- =====================================================
-- FUNÇÃO 3: Verificar permissão granular completa
-- =====================================================
-- Verifica se usuário pode acessar um registro específico
-- Considera ownership e centro de custo

CREATE OR REPLACE FUNCTION public.check_granular_permission(
    p_user_id UUID,
    p_company_id UUID,
    p_entity_name TEXT,
    p_record_id UUID,
    p_action TEXT DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_record RECORD;
    v_ownership_field TEXT;
    v_cost_center_field TEXT;
    v_record_owner_id UUID;
    v_record_cost_center_id UUID;
    v_has_ownership_access BOOLEAN := TRUE;
    v_has_cost_center_access BOOLEAN := TRUE;
BEGIN
    -- Admin sempre tem acesso
    IF public.is_admin_simple(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar configuração da entidade
    SELECT * INTO v_config
    FROM public.entity_ownership_config
    WHERE entity_name = p_entity_name;
    
    -- Se não há configuração, permite acesso (comportamento padrão)
    IF v_config IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Se não há restrições configuradas, permite acesso
    IF NOT v_config.enforce_ownership AND NOT v_config.enforce_cost_center THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar o registro
    EXECUTE format(
        'SELECT * FROM %I.%I WHERE id = $1',
        v_config.schema_name,
        v_config.table_name
    ) INTO v_record USING p_record_id;
    
    -- Se registro não existe, nega acesso
    IF v_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar ownership se configurado
    IF v_config.enforce_ownership THEN
        v_ownership_field := v_config.ownership_field;
        EXECUTE format('SELECT ($1.%I)::uuid', v_ownership_field) INTO v_record_owner_id USING v_record;
        
        -- Se o campo de ownership não existe ou é NULL, nega acesso
        IF v_record_owner_id IS NULL THEN
            v_has_ownership_access := FALSE;
        ELSE
            -- Verificar se o usuário é o criador
            v_has_ownership_access := (v_record_owner_id = p_user_id);
        END IF;
    END IF;
    
    -- Verificar centro de custo se configurado
    IF v_config.enforce_cost_center AND v_config.cost_center_field IS NOT NULL THEN
        v_cost_center_field := v_config.cost_center_field;
        EXECUTE format('SELECT ($1.%I)::uuid', v_cost_center_field) INTO v_record_cost_center_id USING v_record;
        
        -- Se o campo de centro de custo não existe ou é NULL, nega acesso
        IF v_record_cost_center_id IS NULL THEN
            v_has_cost_center_access := FALSE;
        ELSE
            -- Verificar se usuário tem acesso a este centro de custo
            v_has_cost_center_access := public.user_has_cost_center_access(
                p_user_id,
                p_company_id,
                v_record_cost_center_id
            );
        END IF;
    END IF;
    
    -- Retornar TRUE apenas se ambas as verificações passarem
    RETURN v_has_ownership_access AND v_has_cost_center_access;
END;
$$;

COMMENT ON FUNCTION public.check_granular_permission IS 'Verifica se usuário tem permissão granular (ownership + centro de custo) para acessar um registro específico';

-- =====================================================
-- FUNÇÃO 4: Filtrar registros por permissões granulares
-- =====================================================
-- Retorna apenas os registros que o usuário pode acessar
-- Usado em listagens

CREATE OR REPLACE FUNCTION public.filter_records_by_granular_permissions(
    p_user_id UUID,
    p_company_id UUID,
    p_entity_name TEXT,
    p_schema_name TEXT DEFAULT NULL,
    p_table_name TEXT DEFAULT NULL
)
RETURNS TABLE(record_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_ownership_field TEXT;
    v_cost_center_field TEXT;
    v_sql TEXT;
    v_allowed_cost_centers UUID[];
BEGIN
    -- Admin vê tudo
    IF public.is_admin_simple(p_user_id) THEN
        RETURN QUERY
        EXECUTE format(
            'SELECT id FROM %I.%I WHERE company_id = $1',
            COALESCE(p_schema_name, 'public'),
            COALESCE(p_table_name, p_entity_name)
        ) USING p_company_id;
        RETURN;
    END IF;
    
    -- Buscar configuração
    SELECT * INTO v_config
    FROM public.entity_ownership_config
    WHERE entity_name = p_entity_name;
    
    -- Se não há configuração, retorna todos (comportamento padrão)
    IF v_config IS NULL THEN
        RETURN QUERY
        EXECUTE format(
            'SELECT id FROM %I.%I WHERE company_id = $1',
            COALESCE(p_schema_name, 'public'),
            COALESCE(p_table_name, p_entity_name)
        ) USING p_company_id;
        RETURN;
    END IF;
    
    -- Obter centros de custo permitidos se necessário
    IF v_config.enforce_cost_center AND v_config.cost_center_field IS NOT NULL THEN
        SELECT ARRAY_AGG(cost_center_id) INTO v_allowed_cost_centers
        FROM public.get_user_allowed_cost_centers(p_user_id, p_company_id);
        
        -- Se não tem centros de custo permitidos, retorna vazio
        IF v_allowed_cost_centers IS NULL OR array_length(v_allowed_cost_centers, 1) = 0 THEN
            RETURN;
        END IF;
    END IF;
    
    -- Construir query base
    v_sql := format(
        'SELECT id FROM %I.%I WHERE company_id = $1',
        v_config.schema_name,
        v_config.table_name
    );
    
    -- Adicionar filtro de ownership se configurado
    IF v_config.enforce_ownership THEN
        v_ownership_field := v_config.ownership_field;
        v_sql := v_sql || format(' AND %I = $2', v_ownership_field);
    END IF;
    
    -- Adicionar filtro de centro de custo se configurado
    IF v_config.enforce_cost_center AND v_config.cost_center_field IS NOT NULL THEN
        v_cost_center_field := v_config.cost_center_field;
        IF v_config.enforce_ownership THEN
            v_sql := v_sql || format(' AND %I = ANY($3)', v_cost_center_field);
        ELSE
            v_sql := v_sql || format(' AND %I = ANY($2)', v_cost_center_field);
        END IF;
    END IF;
    
    -- Executar query com os parâmetros corretos
    IF v_config.enforce_ownership AND v_config.enforce_cost_center AND v_config.cost_center_field IS NOT NULL THEN
        RETURN QUERY EXECUTE v_sql USING p_company_id, p_user_id, v_allowed_cost_centers;
    ELSIF v_config.enforce_ownership THEN
        RETURN QUERY EXECUTE v_sql USING p_company_id, p_user_id;
    ELSIF v_config.enforce_cost_center AND v_config.cost_center_field IS NOT NULL THEN
        RETURN QUERY EXECUTE v_sql USING p_company_id, v_allowed_cost_centers;
    ELSE
        RETURN QUERY EXECUTE v_sql USING p_company_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.filter_records_by_granular_permissions IS 'Filtra registros retornando apenas os que o usuário pode acessar baseado em ownership e centro de custo';

-- =====================================================
-- RLS Policies para user_cost_center_permissions
-- =====================================================

ALTER TABLE public.user_cost_center_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view their own cost center permissions"
ON public.user_cost_center_permissions
FOR SELECT
USING (
    user_id = auth.uid() OR
    public.is_admin_simple(auth.uid())
);

-- Policy: Apenas admins podem gerenciar permissões
CREATE POLICY "Only admins can manage cost center permissions"
ON public.user_cost_center_permissions
FOR ALL
USING (public.is_admin_simple(auth.uid()))
WITH CHECK (public.is_admin_simple(auth.uid()));

-- =====================================================
-- RLS Policies para entity_ownership_config
-- =====================================================

ALTER TABLE public.entity_ownership_config ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver configurações (read-only para não-admins)
CREATE POLICY "Everyone can view ownership config"
ON public.entity_ownership_config
FOR SELECT
USING (true);

-- Policy: Apenas admins podem modificar configurações
CREATE POLICY "Only admins can modify ownership config"
ON public.entity_ownership_config
FOR ALL
USING (public.is_admin_simple(auth.uid()))
WITH CHECK (public.is_admin_simple(auth.uid()));

-- =====================================================
-- Triggers para updated_at
-- =====================================================

CREATE TRIGGER update_user_cost_center_permissions_updated_at
BEFORE UPDATE ON public.user_cost_center_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_entity_ownership_config_updated_at
BEFORE UPDATE ON public.entity_ownership_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

