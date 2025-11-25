-- FIX: audit triggers to cast JSON values to JSONB and call public.audit_log
-- Date: 2025-11-18

CREATE OR REPLACE FUNCTION public.audit_compensation_requests()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'create',
            'compensation_requests',
            NEW.id,
            NULL::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'update',
            'compensation_requests',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.audit_log(
            OLD.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'delete',
            'compensation_requests',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.audit_compensation_approvals()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM rh.compensation_requests
    WHERE id = COALESCE(NEW.compensation_request_id, OLD.compensation_request_id);
    
    IF TG_OP = 'INSERT' THEN
        PERFORM public.audit_log(
            v_company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'approve',
            'compensation_approvals',
            NEW.id,
            NULL::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.audit_log(
            v_company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            CASE 
                WHEN OLD.status = 'pending' AND NEW.status = 'approved' THEN 'approve'
                WHEN OLD.status = 'pending' AND NEW.status = 'rejected' THEN 'reject'
                ELSE 'update'
            END,
            'compensation_approvals',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.audit_approval_levels()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'create',
            'approval_levels',
            NEW.id,
            NULL::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'update',
            'approval_levels',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.audit_log(
            OLD.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'delete',
            'approval_levels',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
