-- =====================================================
-- MIGRAÇÃO: Adicionar permissões de serviços
-- Data: 2025-12-10
-- Descrição: Adiciona permissões para a entidade 'services' (serviços) no módulo de cadastros
-- =====================================================

-- Adicionar permissões de entidade para services (serviços)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'services',
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
    WHERE ep.profile_id = p.id AND ep.entity_name = 'services'
);

