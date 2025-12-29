-- =====================================================
-- MIGRAÇÃO: Permissões do Módulo Combustível
-- Data: 2025-12-21
-- Descrição: Configuração de permissões por perfil para o módulo combustível
-- =====================================================

-- =====================================================
-- PERMISSÕES DE MÓDULO PARA COMBUSTÍVEL
-- =====================================================

-- Inserir permissões de módulo para todos os perfis existentes
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'combustivel',
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
ON CONFLICT (profile_id, module_name) DO UPDATE SET
    can_read = EXCLUDED.can_read,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    updated_at = NOW();

-- =====================================================
-- PERMISSÕES DE ENTIDADE PARA COMBUSTÍVEL
-- =====================================================

-- Lista de entidades do módulo combustível
WITH combustivel_entities AS (
    SELECT unnest(ARRAY[
        'fuel_types',
        'approved_gas_stations',
        'refuel_limits',
        'fuel_budgets',
        'budget_revisions',
        'refuel_requests',
        'scheduled_refuels',
        'refuel_records',
        'vehicle_consumption',
        'driver_consumption',
        'consumption_alerts'
    ]) AS entity_name
),
profiles AS (
    SELECT id, nome FROM public.profiles WHERE is_active = true
)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    ce.entity_name,
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
        WHEN p.nome = 'Gerente' THEN 
            CASE 
                WHEN ce.entity_name IN ('refuel_requests', 'refuel_records') THEN true
                ELSE false
            END
        WHEN p.nome = 'Usuário' THEN 
            CASE 
                WHEN ce.entity_name IN ('refuel_requests', 'refuel_records') THEN true
                ELSE false
            END
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN 
            CASE 
                WHEN ce.entity_name IN ('refuel_requests', 'refuel_records') THEN true
                ELSE false
            END
        WHEN p.nome = 'Usuário' THEN 
            CASE 
                WHEN ce.entity_name IN ('refuel_requests', 'refuel_records') THEN true
                ELSE false
            END
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
CROSS JOIN combustivel_entities ce
ON CONFLICT (profile_id, entity_name) DO UPDATE SET
    can_read = EXCLUDED.can_read,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    updated_at = NOW();

-- =====================================================
-- PERMISSÕES ESPECÍFICAS POR ENTIDADE
-- =====================================================

-- Atualizar permissões específicas para entidades sensíveis
-- Configurações (fuel_types, approved_gas_stations, refuel_limits, fuel_budgets) - apenas Admin
UPDATE public.entity_permissions 
SET 
    can_create = CASE 
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Super Admin', 'Administrador')) THEN true
        ELSE false
    END,
    can_edit = CASE 
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Super Admin', 'Administrador')) THEN true
        ELSE false
    END,
    can_delete = CASE 
        WHEN profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Super Admin', 'Administrador')) THEN true
        ELSE false
    END
WHERE entity_name IN ('fuel_types', 'approved_gas_stations', 'refuel_limits', 'fuel_budgets', 'budget_revisions');

-- Relatórios e análises (vehicle_consumption, driver_consumption, consumption_alerts) - apenas leitura para Gerente e Usuário
UPDATE public.entity_permissions 
SET 
    can_create = false,
    can_edit = false,
    can_delete = false
WHERE entity_name IN ('vehicle_consumption', 'driver_consumption', 'consumption_alerts')
AND profile_id IN (SELECT id FROM public.profiles WHERE nome IN ('Gerente', 'Usuário'));

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA combustivel IS 'Módulo Combustível implementado com sucesso - Gestão de consumo, orçamento, solicitações, aprovações e registros de abastecimento';

