-- Migration: Add Training Module Permissions
-- Description: Adds training module permissions to the system

-- Insert training module permissions for all existing profiles
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'treinamento',
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
    WHERE mp.profile_id = p.id AND mp.module_name = 'treinamento'
);

-- Insert training entity permissions for all existing profiles
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'trainings',
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
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'trainings'
);

-- Insert training_enrollments entity permissions
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'training_enrollments',
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
        WHEN p.nome = 'Gerente' THEN false
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    NOW(),
    NOW()
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'training_enrollments'
);

-- Insert training_attendance entity permissions
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'training_attendance',
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
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'training_attendance'
);

-- Insert training_certificates entity permissions
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'training_certificates',
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
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'training_certificates'
);

-- Insert training_evaluations entity permissions
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'training_evaluations',
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
        WHEN p.nome = 'Gerente' THEN false
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    NOW(),
    NOW()
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'training_evaluations'
);
