-- Script para corrigir permissões do perfil "Gestor Qualidade"
-- O perfil precisa ter permissões para todas as entidades usadas no portal do colaborador

DO $$
DECLARE
    v_gestor_qualidade_profile_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- 1. Buscar ID do perfil "Gestor Qualidade"
    SELECT id INTO v_gestor_qualidade_profile_id
    FROM public.profiles
    WHERE nome = 'Gestor Qualidade';
    
    IF v_gestor_qualidade_profile_id IS NULL THEN
        RAISE EXCEPTION 'Perfil "Gestor Qualidade" não encontrado!';
    END IF;
    
    RAISE NOTICE 'Perfil encontrado: %', v_gestor_qualidade_profile_id;
    
    -- 2. Garantir permissões de módulo portal_colaborador
    INSERT INTO public.module_permissions (profile_id, module_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'portal_colaborador', true, true, true, false)
    ON CONFLICT (profile_id, module_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    RAISE NOTICE '✅ Permissão de módulo portal_colaborador garantida';
    
    -- 3. Adicionar/atualizar permissões de entidades necessárias para o portal do colaborador
    -- Essas são as entidades usadas nas páginas do portal
    
    -- Entidade portal_colaborador (já existe, mas garantimos)
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'portal_colaborador', true, true, true, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    -- time_records - usado em RegistroPontoPage, HistoricoMarcacoesPage
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'time_records', true, true, true, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    -- periodic_exams - usado em ExamesPage
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'periodic_exams', true, true, true, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    -- income_statements - usado em ComprovantesPage
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'income_statements', true, false, false, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = false,
        can_edit = false,
        can_delete = false;
    
    -- vacations - usado em FeriasPage
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'vacations', true, true, true, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    -- reimbursement_requests - usado em ReembolsosPage
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'reimbursement_requests', true, true, true, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    -- medical_certificates - usado em AtestadosPage (se aplicável)
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'medical_certificates', true, true, true, false)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = false;
    
    -- treinamentos - já existe, mas garantimos
    INSERT INTO public.entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete)
    VALUES (v_gestor_qualidade_profile_id, 'treinamentos', true, true, true, true)
    ON CONFLICT (profile_id, entity_name) 
    DO UPDATE SET 
        can_read = true,
        can_create = true,
        can_edit = true,
        can_delete = true;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Permissões de entidades atualizadas: % registros', v_updated_count;
    
    RAISE NOTICE '✅ Permissões do perfil "Gestor Qualidade" corrigidas com sucesso!';
END $$;

-- Verificar resultado
SELECT 
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete
FROM public.entity_permissions ep
JOIN public.profiles p ON p.id = ep.profile_id
WHERE p.nome = 'Gestor Qualidade'
ORDER BY ep.entity_name;
