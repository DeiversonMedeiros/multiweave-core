-- Análise completa das entidades de permissão
-- Comparar entidades no banco vs entidades no código

-- 1. Entidades que existem no banco para o perfil Gestor
SELECT 
    'Entidades no banco (perfil Gestor)' as tipo,
    COUNT(DISTINCT entity_name) as total
FROM public.entity_permissions
WHERE profile_id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e';

-- 2. Lista completa de entidades no banco para o perfil Gestor
SELECT 
    entity_name,
    can_read,
    can_create,
    can_edit,
    can_delete
FROM public.entity_permissions
WHERE profile_id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e'
ORDER BY entity_name;

-- 3. Entidades que foram criadas mas podem não estar no PermissionManager
-- (entidades específicas das páginas)
SELECT 
    entity_name,
    'Criada manualmente - pode não estar na interface' as observacao
FROM public.entity_permissions
WHERE profile_id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e'
AND entity_name IN (
    'time_tracking_management',
    'vacation_approvals',
    'exam_management',
    'approval_center',
    'approvals',
    'approval_configs',
    'manager_dashboard',
    'portal_colaborador'
);

-- 4. Verificar entidades que estão no PermissionManager mas podem não existir no banco
-- (comparar com a lista do código)

