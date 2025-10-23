-- =====================================================
-- MIGRAÇÃO: Adicionar permissões de departamentos ao módulo de cadastros
-- Data: 2025-01-20
-- Descrição: Adiciona permissões para a entidade 'units' (departamentos) no módulo de cadastros
-- =====================================================

-- Adicionar permissões de entidade para units (departamentos)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'units',
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
WHERE NOT EXISTS (
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'units'
);

-- Adicionar permissões de módulo para cadastros (se não existir)
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'cadastros',
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
WHERE NOT EXISTS (
    SELECT 1 FROM public.module_permissions mp 
    WHERE mp.profile_id = p.id AND mp.module_name = 'cadastros'
);

-- Log de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Permissões de departamentos adicionadas ao módulo de cadastros com sucesso!';
    RAISE NOTICE 'Entidade units (departamentos) configurada com permissões granulares';
    RAISE NOTICE 'Módulo cadastros configurado com permissões apropriadas';
END $$;
