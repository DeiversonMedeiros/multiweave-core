-- =====================================================
-- CRIAÇÃO DE PERMISSÕES PARA ENTIDADE HOLIDAYS
-- Data: 2025-01-21
-- Descrição: Cria permissões para a entidade holidays para todos os perfis
-- =====================================================

-- Inserir permissões para holidays para todos os perfis existentes
INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
SELECT 
    p.id as profile_id,
    'holidays' as entity_name,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN true
        ELSE false
    END as can_read,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        ELSE false
    END as can_create,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        ELSE false
    END as can_edit,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        ELSE false
    END as can_delete
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = 'holidays'
);

-- Verificar se as permissões foram criadas
SELECT 
    ep.id,
    p.nome as profile_name,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM public.entity_permissions ep
JOIN public.profiles p ON ep.profile_id = p.id
WHERE ep.entity_name = 'holidays'
ORDER BY p.nome;
