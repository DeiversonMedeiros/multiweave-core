-- Script para criar entidades faltantes do perfil Gestor
-- Entidades específicas das páginas do portal gestor e colaborador

DO $$
DECLARE
    v_gestor_profile_id UUID := 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e';
    v_entity_names TEXT[] := ARRAY[
        'time_tracking_management',
        'vacation_approvals',
        'exam_management',
        'approval_center',
        'approvals',
        'approval_configs',
        'manager_dashboard',
        'portal_colaborador'
    ];
    v_entity_name TEXT;
    v_created_count INTEGER := 0;
BEGIN
    -- Criar entidades que não existem
    FOREACH v_entity_name IN ARRAY v_entity_names
    LOOP
        -- Verificar se a entidade já existe
        IF NOT EXISTS (
            SELECT 1 FROM public.entity_permissions
            WHERE profile_id = v_gestor_profile_id
            AND entity_name = v_entity_name
        ) THEN
            -- Criar a entidade com todas as permissões
            INSERT INTO public.entity_permissions (
                id,
                profile_id,
                entity_name,
                can_read,
                can_create,
                can_edit,
                can_delete,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_gestor_profile_id,
                v_entity_name,
                true,
                true,
                true,
                true,
                NOW(),
                NOW()
            );
            v_created_count := v_created_count + 1;
        ELSE
            -- Se já existe, atualizar para ter todas as permissões
            UPDATE public.entity_permissions
            SET can_read = true,
                can_create = true,
                can_edit = true,
                can_delete = true,
                updated_at = NOW()
            WHERE profile_id = v_gestor_profile_id
            AND entity_name = v_entity_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Criadas/atualizadas % entidades', v_created_count;
    RAISE NOTICE '✅ Entidades do perfil Gestor configuradas!';
END $$;

-- Verificar resultado
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM public.entity_permissions ep
WHERE ep.profile_id = 'f351d6c4-28d1-4e85-9e51-bb507a9f3e7e'
AND ep.entity_name IN (
    'time_tracking_management',
    'vacation_approvals',
    'exam_management',
    'approval_center',
    'approvals',
    'approval_configs',
    'manager_dashboard',
    'portal_colaborador'
)
ORDER BY ep.entity_name;

