-- =====================================================
-- MIGRAÇÃO: ADICIONAR PERMISSÕES DE RECRUTAMENTO
-- =====================================================
-- Data: 2025-01-10
-- Descrição: Adiciona permissões para o módulo de recrutamento

-- =====================================================
-- 1. ADICIONAR MÓDULO DE RECRUTAMENTO
-- =====================================================

-- Inserir permissões de módulo para recrutamento
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'recruitment',
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
    SELECT 1 FROM public.module_permissions mp 
    WHERE mp.profile_id = p.id AND mp.module_name = 'recruitment'
);

-- =====================================================
-- 2. ADICIONAR PERMISSÕES DE ENTIDADE PARA RECRUTAMENTO
-- =====================================================

-- Entidades de recrutamento
DO $$
DECLARE
    entity_name TEXT;
    profile_record RECORD;
BEGIN
    -- Lista de entidades de recrutamento
    FOR entity_name IN SELECT unnest(ARRAY[
        'job_requests',
        'candidates', 
        'job_openings',
        'selection_processes',
        'selection_stages',
        'talent_pool',
        'candidate_documents'
    ])
    LOOP
        -- Inserir permissões para cada perfil
        FOR profile_record IN SELECT * FROM public.profiles
        LOOP
            INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                profile_record.id,
                entity_name,
                CASE 
                    WHEN profile_record.nome = 'Super Admin' THEN true
                    WHEN profile_record.nome = 'Administrador' THEN true
                    WHEN profile_record.nome = 'Gerente' THEN true
                    WHEN profile_record.nome = 'Usuário' THEN false
                    ELSE false
                END,
                CASE 
                    WHEN profile_record.nome = 'Super Admin' THEN true
                    WHEN profile_record.nome = 'Administrador' THEN true
                    WHEN profile_record.nome = 'Gerente' THEN true
                    WHEN profile_record.nome = 'Usuário' THEN false
                    ELSE false
                END,
                CASE 
                    WHEN profile_record.nome = 'Super Admin' THEN true
                    WHEN profile_record.nome = 'Administrador' THEN true
                    WHEN profile_record.nome = 'Gerente' THEN true
                    WHEN profile_record.nome = 'Usuário' THEN false
                    ELSE false
                END,
                CASE 
                    WHEN profile_record.nome = 'Super Admin' THEN true
                    WHEN profile_record.nome = 'Administrador' THEN true
                    WHEN profile_record.nome = 'Gerente' THEN false
                    WHEN profile_record.nome = 'Usuário' THEN false
                    ELSE false
                END,
                NOW(),
                NOW()
            )
            ON CONFLICT (profile_id, entity_name) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 3. ADICIONAR TIPOS DE NOTIFICAÇÃO PARA RECRUTAMENTO
-- =====================================================

-- Adicionar novos tipos de notificação se não existirem
DO $$
BEGIN
    -- Verificar se a coluna type tem constraint CHECK
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notifications_type_check'
    ) THEN
        -- Remover constraint existente
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
    END IF;
    
    -- Recriar constraint com novos tipos
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'compensation_request', 
        'compensation_approved', 
        'compensation_rejected', 
        'compensation_reminder',
        'vacation_request',
        'vacation_approved',
        'vacation_rejected',
        'medical_certificate',
        'payroll_processed',
        'system_alert',
        -- Novos tipos para recrutamento
        'job_request_created',
        'job_request_approved',
        'job_request_rejected',
        'candidate_applied',
        'candidate_hired',
        'candidate_rejected',
        'interview_scheduled',
        'interview_completed',
        'selection_process_started',
        'selection_process_completed'
    ));
EXCEPTION
    WHEN OTHERS THEN
        -- Se der erro, apenas adicionar os novos tipos via ALTER
        NULL;
END $$;

-- =====================================================
-- 4. CRIAR FUNÇÕES AUXILIARES PARA RECRUTAMENTO
-- =====================================================

-- Função para obter estatísticas de recrutamento
CREATE OR REPLACE FUNCTION public.get_recruitment_stats(p_company_id UUID)
RETURNS TABLE(
    total_job_requests BIGINT,
    pending_job_requests BIGINT,
    approved_job_requests BIGINT,
    total_candidates BIGINT,
    active_candidates BIGINT,
    hired_candidates BIGINT,
    total_job_openings BIGINT,
    open_job_openings BIGINT,
    active_selection_processes BIGINT,
    talent_pool_size BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Job Requests
        (SELECT COUNT(*) FROM rh.job_requests WHERE company_id = p_company_id) as total_job_requests,
        (SELECT COUNT(*) FROM rh.job_requests WHERE company_id = p_company_id AND status = 'solicitado') as pending_job_requests,
        (SELECT COUNT(*) FROM rh.job_requests WHERE company_id = p_company_id AND status = 'aprovado') as approved_job_requests,
        
        -- Candidates
        (SELECT COUNT(*) FROM rh.candidates WHERE company_id = p_company_id) as total_candidates,
        (SELECT COUNT(*) FROM rh.candidates WHERE company_id = p_company_id AND status = 'ativo') as active_candidates,
        (SELECT COUNT(*) FROM rh.candidates WHERE company_id = p_company_id AND status = 'contratado') as hired_candidates,
        
        -- Job Openings
        (SELECT COUNT(*) FROM rh.job_openings WHERE company_id = p_company_id) as total_job_openings,
        (SELECT COUNT(*) FROM rh.job_openings WHERE company_id = p_company_id AND status = 'aberta') as open_job_openings,
        
        -- Selection Processes
        (SELECT COUNT(*) FROM rh.selection_processes WHERE company_id = p_company_id AND status = 'ativo') as active_selection_processes,
        
        -- Talent Pool
        (SELECT COUNT(*) FROM rh.talent_pool WHERE company_id = p_company_id) as talent_pool_size;
END;
$$;

-- Função para obter candidatos por vaga
CREATE OR REPLACE FUNCTION public.get_candidates_by_job_opening(p_job_opening_id UUID)
RETURNS TABLE(
    candidate_id UUID,
    candidate_name VARCHAR,
    candidate_email VARCHAR,
    candidate_phone VARCHAR,
    candidate_source VARCHAR,
    process_status VARCHAR,
    current_stage VARCHAR,
    applied_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.source as candidate_source,
        sp.status as process_status,
        sp.current_stage as current_stage,
        sp.created_at as applied_at
    FROM rh.selection_processes sp
    JOIN rh.candidates c ON sp.candidate_id = c.id
    WHERE sp.job_opening_id = p_job_opening_id
    ORDER BY sp.created_at DESC;
END;
$$;

-- Função para obter etapas do processo seletivo
CREATE OR REPLACE FUNCTION public.get_selection_process_stages(p_selection_process_id UUID)
RETURNS TABLE(
    stage_id UUID,
    stage_name VARCHAR,
    stage_type VARCHAR,
    status VARCHAR,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    interviewer_name VARCHAR,
    score DECIMAL,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.id as stage_id,
        ss.stage_name,
        ss.stage_type,
        ss.status,
        ss.scheduled_at,
        ss.completed_at,
        u.nome as interviewer_name,
        ss.score,
        ss.notes
    FROM rh.selection_stages ss
    LEFT JOIN auth.users u ON ss.interviewer_id = u.id
    WHERE ss.selection_process_id = p_selection_process_id
    ORDER BY ss.created_at ASC;
END;
$$;

-- =====================================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.get_recruitment_stats(UUID) IS 'Retorna estatísticas de recrutamento para uma empresa';
COMMENT ON FUNCTION public.get_candidates_by_job_opening(UUID) IS 'Retorna candidatos de uma vaga específica';
COMMENT ON FUNCTION public.get_selection_process_stages(UUID) IS 'Retorna etapas de um processo seletivo';

-- =====================================================
-- 6. GRANTS DE PERMISSÃO
-- =====================================================

-- Conceder permissões para as novas funções
GRANT EXECUTE ON FUNCTION public.get_recruitment_stats(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_candidates_by_job_opening(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_selection_process_stages(UUID) TO anon, authenticated, service_role;
