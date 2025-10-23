
\restrict zUK3aT6cUu6LAD1qJQyUfVQsbMF9hAFVYBqaQSEhgtEjdyDZHN0TUbCTUthsOJ1


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."material_type" AS ENUM (
    'produto',
    'servico',
    'materia_prima'
);


ALTER TYPE "public"."material_type" OWNER TO "postgres";


CREATE TYPE "public"."partner_type" AS ENUM (
    'cliente',
    'fornecedor',
    'transportador'
);


ALTER TYPE "public"."partner_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'user',
    'manager'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN rh.adjust_bank_hours_balance(p_employee_id, p_company_id, p_hours_amount, p_description);
END;
$$;


ALTER FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") IS 'Wrapper para rh.adjust_bank_hours_balance - permite chamada via RPC do Supabase';



CREATE OR REPLACE FUNCTION "public"."atualizar_dias_gozados"("employee_id_param" "uuid", "ano_param" integer, "dias_usados" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    dias_atuais INTEGER;
    dias_restantes INTEGER;
BEGIN
    -- Buscar dias atuais
    SELECT ve.dias_gozados, ve.dias_restantes
    INTO dias_atuais, dias_restantes
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = employee_id_param
      AND ve.ano_aquisitivo = ano_param
      AND ve.status IN ('ativo', 'parcialmente_gozado');
    
    -- Verificar se hÃ¡ dias suficientes
    IF dias_restantes < dias_usados THEN
        RETURN false;
    END IF;
    
    -- Atualizar dias gozados
    UPDATE rh.vacation_entitlements
    SET 
        dias_gozados = dias_atuais + dias_usados,
        dias_restantes = dias_restantes - dias_usados,
        status = CASE 
            WHEN (dias_restantes - dias_usados) = 0 THEN 'gozado'
            ELSE 'parcialmente_gozado'
        END,
        updated_at = NOW()
    WHERE employee_id = employee_id_param
      AND ano_aquisitivo = ano_param
      AND status IN ('ativo', 'parcialmente_gozado');
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."atualizar_dias_gozados"("employee_id_param" "uuid", "ano_param" integer, "dias_usados" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."atualizar_dias_gozados"("employee_id_param" "uuid", "ano_param" integer, "dias_usados" integer) IS 'Atualiza os dias de fÃ©rias gozados por um funcionÃ¡rio';



CREATE OR REPLACE FUNCTION "public"."audit_approval_levels"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'create',
            'approval_levels',
            NEW.id,
            NULL,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'update',
            'approval_levels',
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM audit_log(
            OLD.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'delete',
            'approval_levels',
            OLD.id,
            row_to_json(OLD),
            NULL,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_approval_levels"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_compensation_approvals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Buscar company_id da solicitaÃ§Ã£o relacionada
    SELECT company_id INTO v_company_id
    FROM rh.compensation_requests
    WHERE id = COALESCE(NEW.compensation_request_id, OLD.compensation_request_id);
    
    IF TG_OP = 'INSERT' THEN
        PERFORM audit_log(
            v_company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'approve',
            'compensation_approvals',
            NEW.id,
            NULL,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit_log(
            v_company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            CASE 
                WHEN OLD.status = 'pending' AND NEW.status = 'approved' THEN 'approve'
                WHEN OLD.status = 'pending' AND NEW.status = 'rejected' THEN 'reject'
                ELSE 'update'
            END,
            'compensation_approvals',
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_compensation_approvals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_compensation_requests"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'create',
            'compensation_requests',
            NEW.id,
            NULL,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit_log(
            NEW.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'update',
            'compensation_requests',
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM audit_log(
            OLD.company_id,
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            'delete',
            'compensation_requests',
            OLD.id,
            row_to_json(OLD),
            NULL,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            current_setting('request.headers', true)::json->>'x-session-id'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_compensation_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_log"("p_company_id" "uuid", "p_user_id" "uuid", "p_action" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_old_values" "jsonb" DEFAULT NULL::"jsonb", "p_new_values" "jsonb" DEFAULT NULL::"jsonb", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_session_id" character varying DEFAULT NULL::character varying) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_config RECORD;
    v_should_log BOOLEAN := false;
BEGIN
    -- Verificar se auditoria estÃ¡ habilitada para esta entidade
    SELECT * INTO v_config
    FROM rh.audit_config
    WHERE company_id = p_company_id
    AND entity_type = p_entity_type
    AND is_enabled = true;
    
    -- Se nÃ£o hÃ¡ configuraÃ§Ã£o especÃ­fica, usar configuraÃ§Ã£o padrÃ£o
    IF NOT FOUND THEN
        v_should_log := true; -- Log por padrÃ£o
    ELSE
        -- Verificar nÃ­vel de log
        CASE v_config.log_level
            WHEN 'all' THEN
                v_should_log := true;
            WHEN 'changes' THEN
                v_should_log := (p_old_values IS NOT NULL OR p_new_values IS NOT NULL);
            WHEN 'critical' THEN
                v_should_log := p_action IN ('create', 'delete', 'approve', 'reject');
            ELSE
                v_should_log := true;
        END CASE;
    END IF;
    
    -- Registrar log se necessÃ¡rio
    IF v_should_log THEN
        INSERT INTO rh.audit_logs (
            company_id,
            user_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            ip_address,
            user_agent,
            session_id
        ) VALUES (
            p_company_id,
            p_user_id,
            p_action,
            p_entity_type,
            p_entity_id,
            p_old_values,
            p_new_values,
            p_ip_address,
            p_user_agent,
            p_session_id
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."audit_log"("p_company_id" "uuid", "p_user_id" "uuid", "p_action" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_log"("p_company_id" "uuid", "p_user_id" "uuid", "p_action" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" character varying) IS 'FunÃ§Ã£o para registrar logs de auditoria';



CREATE OR REPLACE FUNCTION "public"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") RETURNS TABLE("ano" integer, "dias_disponiveis" integer, "dias_gozados" integer, "dias_restantes" integer, "status" character varying, "data_vencimento" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ve.ano_aquisitivo as ano,
        ve.dias_disponiveis,
        ve.dias_gozados,
        ve.dias_restantes,
        ve.status,
        ve.data_vencimento
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = employee_id_param
      AND ve.status IN ('ativo', 'parcialmente_gozado')
    ORDER BY ve.ano_aquisitivo DESC;
END;
$$;


ALTER FUNCTION "public"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") IS 'Busca anos de fÃ©rias disponÃ­veis para um funcionÃ¡rio';



CREATE OR REPLACE FUNCTION "public"."calcular_dias_ferias_disponiveis"("employee_id_param" "uuid", "ano_param" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    dias_disponiveis INTEGER;
BEGIN
    SELECT ve.dias_restantes
    INTO dias_disponiveis
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = employee_id_param
      AND ve.ano_aquisitivo = ano_param
      AND ve.status IN ('ativo', 'parcialmente_gozado');
    
    RETURN COALESCE(dias_disponiveis, 0);
END;
$$;


ALTER FUNCTION "public"."calcular_dias_ferias_disponiveis"("employee_id_param" "uuid", "ano_param" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calcular_dias_ferias_disponiveis"("employee_id_param" "uuid", "ano_param" integer) IS 'Calcula dias disponÃ­veis de fÃ©rias para um funcionÃ¡rio em um ano especÃ­fico';



CREATE OR REPLACE FUNCTION "public"."calculate_medical_certificate_days"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Calcular dias de afastamento automaticamente
  NEW.dias_afastamento = EXTRACT(DAY FROM (NEW.data_fim - NEW.data_inicio)) + 1;
  
  -- Atualizar data_aprovacao quando status for aprovado
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    NEW.data_aprovacao = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_medical_certificate_days"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN 
  -- Por enquanto, sempre retorna true para permitir acesso
  -- TODO: Implementar verificaÃ§Ã£o de permissÃµes quando necessÃ¡rio
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_access"("p_user_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    WHERE uc.user_id = p_user_id 
    AND uc.company_id = p_company_id
    AND uc.ativo = true
  );
END;
$$;


ALTER FUNCTION "public"."check_company_access"("p_user_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_approvals INTEGER;
    v_approved_count INTEGER;
    v_rejected_count INTEGER;
BEGIN
    -- Contar total de aprovaÃ§Ãµes necessÃ¡rias
    SELECT COUNT(*) INTO v_total_approvals
    FROM rh.compensation_approvals
    WHERE compensation_request_id = p_compensation_request_id;
    
    -- Contar aprovaÃ§Ãµes aprovadas
    SELECT COUNT(*) INTO v_approved_count
    FROM rh.compensation_approvals
    WHERE compensation_request_id = p_compensation_request_id
    AND status = 'approved';
    
    -- Contar aprovaÃ§Ãµes rejeitadas
    SELECT COUNT(*) INTO v_rejected_count
    FROM rh.compensation_approvals
    WHERE compensation_request_id = p_compensation_request_id
    AND status = 'rejected';
    
    -- Determinar status
    IF v_rejected_count > 0 THEN
        RETURN 'rejected';
    ELSIF v_approved_count = v_total_approvals THEN
        RETURN 'approved';
    ELSE
        RETURN 'pending';
    END IF;
END;
$$;


ALTER FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") IS 'Verifica o status geral de aprovaÃ§Ã£o de uma solicitaÃ§Ã£o';



CREATE OR REPLACE FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se o usuÃ¡rio Ã© admin
  IF is_admin_simple(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Verificar permissÃ£o especÃ­fica da entidade
  SELECT 
    CASE p_action
      WHEN 'read' THEN ep.can_read
      WHEN 'create' THEN ep.can_create
      WHEN 'edit' THEN ep.can_edit
      WHEN 'delete' THEN ep.can_delete
      ELSE FALSE
    END
  INTO has_permission
  FROM entity_permissions ep
  JOIN user_companies uc ON ep.profile_id = uc.profile_id
  WHERE uc.user_id = p_user_id
    AND ep.entity_name = p_entity_name
    AND uc.ativo = true;

  RETURN COALESCE(has_permission, FALSE);
END;
$$;


ALTER FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN 
  RETURN EXISTS (
    SELECT 1 FROM public.user_companies uc 
    JOIN public.profiles p ON uc.profile_id = p.id 
    JOIN public.entity_permissions ep ON ep.profile_id = p.id 
    WHERE uc.user_id = check_entity_permission.user_id 
    AND uc.ativo = true 
    AND ep.schema_name = check_entity_permission.schema_name
    AND ep.table_name = check_entity_permission.table_name
    AND (
      (action = 'read' AND ep.can_read = true) OR 
      (action = 'create' AND ep.can_create = true) OR 
      (action = 'edit' AND ep.can_edit = true) OR 
      (action = 'delete' AND ep.can_delete = true)
    )
  );
END;
$$;


ALTER FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se o usuÃ¡rio Ã© admin
  IF is_admin_simple(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Verificar permissÃ£o especÃ­fica do mÃ³dulo
  SELECT 
    CASE p_action
      WHEN 'read' THEN mp.can_read
      WHEN 'create' THEN mp.can_create
      WHEN 'edit' THEN mp.can_edit
      WHEN 'delete' THEN mp.can_delete
      ELSE FALSE
    END
  INTO has_permission
  FROM module_permissions mp
  JOIN user_companies uc ON mp.profile_id = uc.profile_id
  WHERE uc.user_id = p_user_id
    AND mp.module_name = p_module_name
    AND uc.ativo = true;

  RETURN COALESCE(has_permission, FALSE);
END;
$$;


ALTER FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_permission"("p_module_name" "text", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN 
  RETURN EXISTS (
    SELECT 1 FROM public.user_companies uc 
    JOIN public.profiles p ON uc.profile_id = p.id 
    JOIN public.module_permissions mp ON mp.profile_id = p.id 
    WHERE uc.user_id = auth.uid() 
    AND uc.ativo = true 
    AND mp.module_name = p_module_name 
    AND (
      (p_permission = 'read' AND mp.can_read = true) OR 
      (p_permission = 'create' AND mp.can_create = true) OR 
      (p_permission = 'edit' AND mp.can_edit = true) OR 
      (p_permission = 'delete' AND mp.can_delete = true)
    )
  );
END;
$$;


ALTER FUNCTION "public"."check_user_permission"("p_module_name" "text", "p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_config RECORD;
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Para cada configuraÃ§Ã£o de auditoria
    FOR v_config IN
        SELECT DISTINCT company_id, entity_type, retention_days
        FROM rh.audit_config
        WHERE is_enabled = true
    LOOP
        -- Calcular data de corte
        v_cutoff_date := NOW() - INTERVAL '1 day' * v_config.retention_days;
        
        -- Remover logs antigos
        DELETE FROM rh.audit_logs
        WHERE company_id = v_config.company_id
        AND entity_type = v_config.entity_type
        AND created_at < v_cutoff_date;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_audit_logs"() IS 'FunÃ§Ã£o para limpeza automÃ¡tica de logs antigos';



CREATE OR REPLACE FUNCTION "public"."create_calculation_log"("company_id_param" "uuid", "processo_id_param" "text", "tipo_processo_param" "text", "mes_referencia_param" integer, "ano_referencia_param" integer, "descricao_processo_param" "text" DEFAULT NULL::"text", "usuario_id_param" "uuid" DEFAULT NULL::"uuid", "usuario_nome_param" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO rh.calculation_logs (
    company_id,
    processo_id,
    tipo_processo,
    descricao_processo,
    mes_referencia,
    ano_referencia,
    status,
    progresso,
    total_funcionarios,
    funcionarios_processados,
    eventos_calculados,
    erros_encontrados,
    inicio_processamento,
    usuario_id,
    usuario_nome,
    logs_execucao,
    erros_execucao
  ) VALUES (
    company_id_param,
    processo_id_param,
    tipo_processo_param,
    descricao_processo_param,
    mes_referencia_param,
    ano_referencia_param,
    'iniciado',
    0,
    0,
    0,
    0,
    0,
    now(),
    usuario_id_param,
    usuario_nome_param,
    '[]'::jsonb,
    '[]'::jsonb
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar log de cÃ¡lculo: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_calculation_log"("company_id_param" "uuid", "processo_id_param" "text", "tipo_processo_param" "text", "mes_referencia_param" integer, "ano_referencia_param" integer, "descricao_processo_param" "text", "usuario_id_param" "uuid", "usuario_nome_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_compensation_approvals"("p_compensation_request_id" "uuid", "p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_request RECORD;
    v_level_id UUID;
    v_approver RECORD;
BEGIN
    -- Buscar dados da solicitaÃ§Ã£o
    SELECT * INTO v_request
    FROM rh.compensation_requests
    WHERE id = p_compensation_request_id;
    
    -- Determinar nÃ­vel de aprovaÃ§Ã£o necessÃ¡rio
    v_level_id := get_required_approval_level(
        p_company_id,
        v_request.quantidade_horas,
        v_request.valor_total
    );
    
    -- Criar aprovaÃ§Ãµes para cada aprovador do nÃ­vel
    FOR v_approver IN
        SELECT ala.user_id, ala.is_primary
        FROM rh.approval_level_approvers ala
        WHERE ala.approval_level_id = v_level_id
        AND ala.is_active = true
    LOOP
        INSERT INTO rh.compensation_approvals (
            compensation_request_id,
            approval_level_id,
            approver_id,
            status
        ) VALUES (
            p_compensation_request_id,
            v_level_id,
            v_approver.user_id,
            'pending'
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_compensation_approvals"("p_compensation_request_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_compensation_approvals"("p_compensation_request_id" "uuid", "p_company_id" "uuid") IS 'Cria as aprovaÃ§Ãµes necessÃ¡rias para uma solicitaÃ§Ã£o';



CREATE OR REPLACE FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text" DEFAULT 'ativo'::"text", "user_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result_record record;
  result_json jsonb;
BEGIN
  -- Inserir funcionÃ¡rio
  INSERT INTO rh.employees (
    id,
    company_id,
    nome,
    cpf,
    data_admissao,
    status,
    user_id
  ) VALUES (
    gen_random_uuid(),
    company_id_param,
    nome_param,
    cpf_param,
    data_admissao_param,
    status_param,
    user_id_param
  ) RETURNING * INTO result_record;
  
  -- Converter resultado para JSON
  result_json := to_jsonb(result_record);
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar funcionÃ¡rio: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text" DEFAULT 'ativo'::"text", "user_id_param" "uuid" DEFAULT NULL::"uuid", "matricula_param" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result_record record;
  result_json jsonb;
  generated_matricula text;
BEGIN
  -- Gerar matrÃ­cula se nÃ£o fornecida
  IF matricula_param IS NULL OR matricula_param = '' THEN
    generated_matricula := public.generate_employee_matricula(company_id_param);
  ELSE
    generated_matricula := matricula_param;
  END IF;
  
  -- Inserir funcionÃ¡rio
  INSERT INTO rh.employees (
    id,
    company_id,
    nome,
    cpf,
    data_admissao,
    status,
    user_id,
    matricula
  ) VALUES (
    gen_random_uuid(),
    company_id_param,
    nome_param,
    cpf_param,
    data_admissao_param,
    status_param,
    user_id_param,
    generated_matricula
  ) RETURNING * INTO result_record;
  
  -- Converter resultado para JSON
  result_json := to_jsonb(result_record);
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar funcionÃ¡rio: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid", "matricula_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "data_param" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result_record record;
  result_json jsonb;
  insert_sql text;
  values_sql text;
  keys_array text[];
  values_array text[];
  key text;
  value text;
BEGIN
  -- Extrair chaves e valores do JSON
  SELECT array_agg(key), array_agg(value::text)
  INTO keys_array, values_array
  FROM jsonb_each(data_param);
  
  -- Construir SQL de inserÃ§Ã£o
  insert_sql := format(
    'INSERT INTO %I.%I (company_id, %s) VALUES (%L, %s) RETURNING *',
    schema_name,
    table_name,
    array_to_string(keys_array, ', '),
    company_id_param,
    array_to_string(
      array(
        SELECT CASE 
          WHEN v = 'null' THEN 'NULL'
          ELSE quote_literal(v)
        END
        FROM unnest(values_array) AS v
      ), 
      ', '
    )
  );
  
  -- Executar inserÃ§Ã£o
  EXECUTE insert_sql INTO result_record;
  
  -- Converter resultado para JSON
  result_json := to_jsonb(result_record);
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "data_param" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_periodic_exam"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_vencimento" "date", "p_status" character varying DEFAULT 'agendado'::character varying, "p_medico_responsavel" character varying DEFAULT NULL::character varying, "p_clinica_local" character varying DEFAULT NULL::character varying, "p_observacoes" "text" DEFAULT NULL::"text", "p_resultado" character varying DEFAULT NULL::character varying, "p_restricoes" "text" DEFAULT NULL::"text", "p_anexos" "text"[] DEFAULT NULL::"text"[], "p_custo" numeric DEFAULT NULL::numeric, "p_pago" boolean DEFAULT false, "p_data_pagamento" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "company_id" "uuid", "employee_id" "uuid", "tipo_exame" character varying, "data_agendamento" "date", "data_realizacao" "date", "data_vencimento" "date", "status" character varying, "medico_responsavel" character varying, "clinica_local" character varying, "observacoes" "text", "resultado" character varying, "restricoes" "text", "anexos" "text"[], "custo" numeric, "pago" boolean, "data_pagamento" "date", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_exam_id UUID;
  exam_record RECORD;
BEGIN
  -- Verificar se a empresa existe
  IF NOT EXISTS (SELECT 1 FROM companies WHERE companies.id = p_company_id) THEN
    RAISE EXCEPTION 'Empresa nÃ£o encontrada';
  END IF;

  -- Verificar se o funcionÃ¡rio existe e pertence Ã  empresa
  IF NOT EXISTS (
    SELECT 1 FROM rh.employees 
    WHERE rh.employees.id = p_employee_id AND rh.employees.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'FuncionÃ¡rio nÃ£o encontrado ou nÃ£o pertence Ã  empresa';
  END IF;

  -- Inserir o exame
  INSERT INTO rh.periodic_exams (
    company_id,
    employee_id,
    tipo_exame,
    data_agendamento,
    data_vencimento,
    status,
    medico_responsavel,
    clinica_local,
    observacoes,
    resultado,
    restricoes,
    anexos,
    custo,
    pago,
    data_pagamento
  ) VALUES (
    p_company_id,
    p_employee_id,
    p_tipo_exame,
    p_data_agendamento,
    p_data_vencimento,
    p_status,
    p_medico_responsavel,
    p_clinica_local,
    p_observacoes,
    p_resultado,
    p_restricoes,
    p_anexos,
    p_custo,
    p_pago,
    p_data_pagamento
  ) RETURNING * INTO exam_record;

  -- Retornar o exame criado
  RETURN QUERY SELECT * FROM rh.periodic_exams WHERE rh.periodic_exams.id = exam_record.id;
END;
$$;


ALTER FUNCTION "public"."create_periodic_exam"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile"("p_nome" "text", "p_descricao" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true) RETURNS TABLE("id" "uuid", "nome" "text", "descricao" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para criar perfis
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar perfis';
  END IF;
  
  -- Verificar se o nome jÃ¡ existe
  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.nome = p_nome) THEN
    RAISE EXCEPTION 'JÃ¡ existe um perfil com este nome: %', p_nome;
  END IF;
  
  -- Criar novo perfil
  INSERT INTO profiles (nome, descricao, is_active, permissoes)
  VALUES (p_nome, p_descricao, p_is_active, '{}')
  RETURNING profiles.id INTO new_profile_id;
  
  -- Retornar perfil criado
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = new_profile_id;
END;
$$;


ALTER FUNCTION "public"."create_profile"("p_nome" "text", "p_descricao" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_periodo_aquisitivo"("employee_id_param" "uuid", "company_id_param" "uuid", "data_admissao_param" "date", "ano_param" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    novo_id UUID;
    data_inicio DATE;
    data_fim DATE;
    data_vencimento DATE;
BEGIN
    -- Calcular datas do perÃ­odo aquisitivo
    data_inicio := data_admissao_param;
    data_fim := data_inicio + INTERVAL '12 months' - INTERVAL '1 day';
    data_vencimento := data_fim + INTERVAL '12 months';
    
    -- Inserir perÃ­odo aquisitivo
    INSERT INTO rh.vacation_entitlements (
        id,
        employee_id,
        company_id,
        ano_aquisitivo,
        data_inicio_periodo,
        data_fim_periodo,
        data_vencimento,
        dias_disponiveis,
        dias_gozados,
        dias_restantes,
        status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        employee_id_param,
        company_id_param,
        ano_param,
        data_inicio,
        data_fim,
        data_vencimento,
        30, -- 30 dias de fÃ©rias por ano
        0,  -- Nenhum dia gozado inicialmente
        30, -- 30 dias restantes
        'ativo',
        NOW(),
        NOW()
    ) RETURNING id INTO novo_id;
    
    RETURN novo_id;
END;
$$;


ALTER FUNCTION "public"."criar_periodo_aquisitivo"("employee_id_param" "uuid", "company_id_param" "uuid", "data_admissao_param" "date", "ano_param" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."criar_periodo_aquisitivo"("employee_id_param" "uuid", "company_id_param" "uuid", "data_admissao_param" "date", "ano_param" integer) IS 'Cria um novo perÃ­odo aquisitivo de fÃ©rias';



CREATE OR REPLACE FUNCTION "public"."delete_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  affected_rows INTEGER;
  sql_query TEXT;
BEGIN
  -- Construir query dinÃ¢mica
  sql_query := format('DELETE FROM %I.%I WHERE id = $1 AND company_id = $2',
    schema_name,
    table_name
  );
  
  -- Executar query
  EXECUTE sql_query USING id_param, company_id_param;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar dados: %', SQLERRM;
END;
$_$;


ALTER FUNCTION "public"."delete_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se o exame existe e pertence Ã  empresa
  IF NOT EXISTS (
    SELECT 1 FROM rh.periodic_exams 
    WHERE rh.periodic_exams.id = p_exam_id AND rh.periodic_exams.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Exame nÃ£o encontrado ou nÃ£o pertence Ã  empresa';
  END IF;

  -- Deletar o exame
  DELETE FROM rh.periodic_exams 
  WHERE rh.periodic_exams.id = p_exam_id AND rh.periodic_exams.company_id = p_company_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_company_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se numero_empresa nÃ£o foi fornecido, gerar automaticamente
  IF NEW.numero_empresa IS NULL OR NEW.numero_empresa = '' THEN
    NEW.numero_empresa := LPAD(nextval('public.company_number_seq')::text, 2, '0');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_company_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_employee_matricula"("company_id_param" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  company_number text;
  next_sequence integer;
  matricula text;
BEGIN
  -- Buscar nÃºmero da empresa
  SELECT numero_empresa INTO company_number
  FROM public.companies 
  WHERE id = company_id_param;
  
  -- Se nÃ£o encontrou a empresa, retornar erro
  IF company_number IS NULL THEN
    RAISE EXCEPTION 'Empresa nÃ£o encontrada';
  END IF;
  
  -- Buscar prÃ³ximo nÃºmero sequencial para esta empresa
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(e.matricula FROM LENGTH(company_number) + 1) AS INTEGER)
  ), 0) + 1
  INTO next_sequence
  FROM rh.employees e
  WHERE e.company_id = company_id_param 
    AND e.matricula IS NOT NULL 
    AND e.matricula ~ ('^' || company_number || '[0-9]+$');
  
  -- Gerar matrÃ­cula no formato: numero_empresa + numero_sequencial (3 dÃ­gitos)
  matricula := company_number || LPAD(next_sequence::text, 3, '0');
  
  RETURN matricula;
END;
$_$;


ALTER FUNCTION "public"."generate_employee_matricula"("company_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_audit_logs"("p_company_id" "uuid", "p_entity_type" character varying DEFAULT NULL::character varying, "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_action" character varying DEFAULT NULL::character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "company_id" "uuid", "user_id" "uuid", "action" character varying, "entity_type" character varying, "entity_id" "uuid", "old_values" "jsonb", "new_values" "jsonb", "ip_address" "inet", "user_agent" "text", "session_id" character varying, "created_at" timestamp with time zone, "user_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.company_id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.session_id,
        al.created_at,
        p.nome::TEXT
    FROM rh.audit_logs al
    LEFT JOIN profiles p ON p.id = al.user_id
    WHERE al.company_id = p_company_id
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_entity_id IS NULL OR al.entity_id = p_entity_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_audit_logs"("p_company_id" "uuid", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action" character varying, "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_audit_logs"("p_company_id" "uuid", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action" character varying, "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer, "p_offset" integer) IS 'FunÃ§Ã£o para buscar logs de auditoria com filtros';



CREATE OR REPLACE FUNCTION "public"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("current_balance" numeric, "accumulated_hours" numeric, "compensated_hours" numeric, "expired_hours" numeric, "last_calculation_date" "date", "has_bank_hours" boolean, "max_accumulation_hours" numeric, "accumulation_period_months" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM rh.get_bank_hours_balance(p_employee_id, p_company_id);
END;
$$;


ALTER FUNCTION "public"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") IS 'Wrapper para rh.get_bank_hours_balance - permite chamada via RPC do Supabase';



CREATE OR REPLACE FUNCTION "public"."get_calculation_logs"("company_id_param" "uuid", "filters" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" "uuid", "company_id" "uuid", "processo_id" "text", "tipo_processo" "text", "descricao_processo" "text", "mes_referencia" integer, "ano_referencia" integer, "status" "text", "progresso" integer, "total_funcionarios" integer, "funcionarios_processados" integer, "eventos_calculados" integer, "erros_encontrados" integer, "inicio_processamento" timestamp with time zone, "fim_processamento" timestamp with time zone, "tempo_execucao_segundos" integer, "usuario_id" "uuid", "usuario_nome" "text", "logs_execucao" "jsonb", "erros_execucao" "jsonb", "resumo_calculos" "jsonb", "observacoes" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  where_clause TEXT := 'WHERE company_id = $1';
  order_clause TEXT := 'ORDER BY created_at DESC';
BEGIN
  -- Construir filtros dinÃ¢micos
  IF filters->>'mes_referencia' IS NOT NULL THEN
    where_clause := where_clause || ' AND mes_referencia = ' || (filters->>'mes_referencia')::text;
  END IF;
  
  IF filters->>'ano_referencia' IS NOT NULL THEN
    where_clause := where_clause || ' AND ano_referencia = ' || (filters->>'ano_referencia')::text;
  END IF;
  
  IF filters->>'status' IS NOT NULL THEN
    where_clause := where_clause || ' AND status = ''' || (filters->>'status')::text || '''';
  END IF;
  
  IF filters->>'tipo_processo' IS NOT NULL THEN
    where_clause := where_clause || ' AND tipo_processo = ''' || (filters->>'tipo_processo')::text || '''';
  END IF;
  
  -- Executar query
  RETURN QUERY EXECUTE format('
    SELECT 
      id, company_id, processo_id, tipo_processo, descricao_processo,
      mes_referencia, ano_referencia, status, progresso,
      total_funcionarios, funcionarios_processados, eventos_calculados, erros_encontrados,
      inicio_processamento, fim_processamento, tempo_execucao_segundos,
      usuario_id, usuario_nome, logs_execucao, erros_execucao, resumo_calculos,
      observacoes, created_at, updated_at
    FROM rh.calculation_logs
    %s
    %s
  ', where_clause, order_clause) USING company_id_param;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao buscar logs de cÃ¡lculo: %', SQLERRM;
END;
$_$;


ALTER FUNCTION "public"."get_calculation_logs"("company_id_param" "uuid", "filters" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text" DEFAULT NULL::"text", "filters" "jsonb" DEFAULT '{}'::"jsonb", "limit_param" integer DEFAULT 100, "offset_param" integer DEFAULT 0, "order_by" "text" DEFAULT 'created_at'::"text", "order_direction" "text" DEFAULT 'DESC'::"text") RETURNS TABLE("id" "text", "data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    order_clause text;
    total_rows bigint;
    filter_key text;
    filter_value text;
    current_user_id uuid;
    user_companies uuid[];
    has_company_access boolean := false;
BEGIN
    -- Obter ID do usuário atual
    current_user_id := auth.uid();
    
    -- Se não há usuário autenticado, negar acesso
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Verificar se o usuário tem permissão para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Obter empresas do usuário
    SELECT ARRAY(
        SELECT uc.company_id 
        FROM public.user_companies uc 
        WHERE uc.user_id = current_user_id 
        AND uc.ativo = true
    ) INTO user_companies;
    
    -- Se for super admin, permitir acesso a todas as empresas
    IF public.is_admin_simple(current_user_id) THEN
        has_company_access := true;
    ELSE
        -- Verificar se o usuário tem acesso à empresa específica
        IF company_id_param IS NOT NULL THEN
            has_company_access := (company_id_param::uuid = ANY(user_companies));
        ELSE
            -- Se não especificou empresa, permitir se tiver acesso a pelo menos uma
            has_company_access := (array_length(user_companies, 1) > 0);
        END IF;
    END IF;
    
    -- Se não tem acesso à empresa, negar
    IF NOT has_company_access THEN
        RAISE EXCEPTION 'Acesso negado para empresa %', COALESCE(company_id_param, 'não especificada');
    END IF;
    
    -- Construir cláusula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    ELSE
        -- Se não especificou empresa, filtrar pelas empresas do usuário
        IF NOT public.is_admin_simple(current_user_id) THEN
            where_clause := where_clause || ' AND company_id = ANY(ARRAY[' || 
                array_to_string(user_companies, ',') || ']::uuid[])';
        END IF;
    END IF;
    
    -- Adicionar filtros dinâmicos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            -- Pular filtros vazios ou com valor "all"
            IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
                -- Verificar se é um campo UUID
                IF filter_key LIKE '%_id' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::uuid';
                -- Verificar se é um campo de data
                ELSIF filter_key LIKE '%_date' OR filter_key LIKE 'data_%' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::date';
                -- Verificar se é um campo booleano
                ELSIF filter_value IN ('true', 'false') THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ' || filter_value;
                -- Campo de texto com busca
                ELSIF filter_key = 'search' THEN
                    where_clause := where_clause || ' AND (nome ILIKE ''%' || filter_value || '%'' OR matricula ILIKE ''%' || filter_value || '%'' OR cpf ILIKE ''%' || filter_value || '%'')';
                -- Outros campos de texto
                ELSE
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''';
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- Construir cláusula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    EXECUTE count_query INTO total_rows;
    
    -- Query principal para buscar dados
    query_text := format('
        SELECT 
            t.id::text,
            to_jsonb(t.*) as data,
            %s::bigint as total_count
        FROM %I.%I t 
        %s 
        %s
        LIMIT %s OFFSET %s
    ', total_rows, schema_name, table_name, where_clause, order_clause, limit_param, offset_param);
    
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text" DEFAULT NULL::"text", "filters" "jsonb" DEFAULT '{}'::"jsonb", "limit_param" integer DEFAULT 100, "offset_param" integer DEFAULT 0, "order_by" "text" DEFAULT 'created_at'::"text", "order_direction" "text" DEFAULT 'DESC'::"text") RETURNS TABLE("id" "text", "data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    order_clause text;
    total_rows bigint;
    filter_key text;
    filter_value text;
BEGIN
    -- Construir clÃ¡usula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Adicionar filtros dinÃ¢micos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            -- Pular filtros vazios ou com valor "all"
            IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
                -- Verificar se Ã© um campo UUID
                IF filter_key LIKE '%_id' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::uuid';
                -- Verificar se Ã© um campo de data
                ELSIF filter_key LIKE '%_date' OR filter_key LIKE 'data_%' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::date';
                -- Verificar se Ã© um campo booleano
                ELSIF filter_value IN ('true', 'false') THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ' || filter_value;
                -- Campo de texto com busca
                ELSIF filter_key = 'search' THEN
                    where_clause := where_clause || ' AND (nome ILIKE ''%' || filter_value || '%'' OR matricula ILIKE ''%' || filter_value || '%'' OR cpf ILIKE ''%' || filter_value || '%'')';
                -- Outros campos de texto
                ELSE
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''';
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- Construir clÃ¡usula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    EXECUTE count_query INTO total_rows;
    
    -- Query principal para buscar dados
    query_text := format('
        SELECT 
            t.id::text,
            to_jsonb(t.*) as data,
            %s::bigint as total_count
        FROM %I.%I t 
        %s 
        %s
        LIMIT %s OFFSET %s
    ', total_rows, schema_name, table_name, where_clause, order_clause, limit_param, offset_param);
    
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") IS 'FunÃ§Ã£o simplificada para buscar dados de entidades sem verificaÃ§Ã£o de permissÃµes';



CREATE OR REPLACE FUNCTION "public"."get_entity_data_with_joins"("schema_name" "text", "table_name" "text", "company_id_param" "text" DEFAULT NULL::"text", "joins" "jsonb" DEFAULT '[]'::"jsonb", "filters" "jsonb" DEFAULT '{}'::"jsonb", "limit_param" integer DEFAULT 100, "offset_param" integer DEFAULT 0) RETURNS TABLE("id" "text", "data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    query_text text;
    join_clause text := '';
    where_clause text := 'WHERE 1=1';
    i jsonb;
BEGIN
    -- Verificar permissÃµes
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Construir JOINs dinÃ¢micos
    IF joins IS NOT NULL AND jsonb_typeof(joins) = 'array' THEN
        FOR i IN SELECT * FROM jsonb_array_elements(joins)
        LOOP
            join_clause := join_clause || ' LEFT JOIN ' || 
                (i->>'schema') || '.' || (i->>'table') || ' ' || (i->>'alias') || 
                ' ON ' || (i->>'condition');
        END LOOP;
    END IF;
    
    -- Construir WHERE (mesma lÃ³gica da funÃ§Ã£o anterior)
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND ' || table_name || '.company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Query principal
    query_text := format('
        SELECT 
            %I.id::text,
            to_jsonb(%I.*) as data,
            COUNT(*) OVER() as total_count
        FROM %I.%I %I
        %s
        %s
        LIMIT %s OFFSET %s
    ', table_name, table_name, schema_name, table_name, table_name, join_clause, where_clause, limit_param, offset_param);
    
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."get_entity_data_with_joins"("schema_name" "text", "table_name" "text", "company_id_param" "text", "joins" "jsonb", "filters" "jsonb", "limit_param" integer, "offset_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entity_permissions_by_profile"("p_profile_id" "uuid") RETURNS TABLE("id" "uuid", "profile_id" "uuid", "entity_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para acessar este perfil
  -- Permitir acesso se auth.uid() for NULL (execuÃ§Ã£o direta) ou se for admin
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar permissÃµes';
  END IF;
  
  RETURN QUERY
  SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    ep.created_at,
    ep.updated_at
  FROM entity_permissions ep
  WHERE ep.profile_id = p_profile_id;
END;
$$;


ALTER FUNCTION "public"."get_entity_permissions_by_profile"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_module_permissions_by_profile"("p_profile_id" "uuid") RETURNS TABLE("id" "uuid", "profile_id" "uuid", "module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para acessar este perfil
  -- Permitir acesso se auth.uid() for NULL (execuÃ§Ã£o direta) ou se for admin
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar permissÃµes';
  END IF;
  
  RETURN QUERY
  SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.created_at,
    mp.updated_at
  FROM module_permissions mp
  WHERE mp.profile_id = p_profile_id;
END;
$$;


ALTER FUNCTION "public"."get_module_permissions_by_profile"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid" DEFAULT NULL::"uuid", "p_tipo_exame" character varying DEFAULT NULL::character varying, "p_status" character varying DEFAULT NULL::character varying, "p_resultado" character varying DEFAULT NULL::character varying, "p_data_inicio" "date" DEFAULT NULL::"date", "p_data_fim" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "company_id" "uuid", "employee_id" "uuid", "employee_name" character varying, "tipo_exame" character varying, "data_agendamento" "date", "data_realizacao" "date", "data_vencimento" "date", "status" character varying, "medico_responsavel" character varying, "clinica_local" character varying, "observacoes" "text", "resultado" character varying, "restricoes" "text", "anexos" "text"[], "custo" numeric, "pago" boolean, "data_pagamento" "date", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.id,
    pe.company_id,
    pe.employee_id,
    e.nome as employee_name,
    pe.tipo_exame,
    pe.data_agendamento,
    pe.data_realizacao,
    pe.data_vencimento,
    pe.status,
    pe.medico_responsavel,
    pe.clinica_local,
    pe.observacoes,
    pe.resultado,
    pe.restricoes,
    pe.anexos,
    pe.custo,
    pe.pago,
    pe.data_pagamento,
    pe.created_at,
    pe.updated_at
  FROM rh.periodic_exams pe
  LEFT JOIN rh.employees e ON pe.employee_id = e.id
  WHERE pe.company_id = p_company_id
    AND (p_employee_id IS NULL OR pe.employee_id = p_employee_id)
    AND (p_tipo_exame IS NULL OR pe.tipo_exame = p_tipo_exame)
    AND (p_status IS NULL OR pe.status = p_status)
    AND (p_resultado IS NULL OR pe.resultado = p_resultado)
    AND (p_data_inicio IS NULL OR pe.data_agendamento >= p_data_inicio)
    AND (p_data_fim IS NULL OR pe.data_agendamento <= p_data_fim)
  ORDER BY pe.data_agendamento DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_required_approval_level"("p_company_id" "uuid", "p_hours" numeric, "p_amount" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_level_id UUID;
BEGIN
    SELECT id INTO v_level_id
    FROM rh.approval_levels
    WHERE company_id = p_company_id
    AND is_active = true
    AND (
        (max_hours IS NULL OR p_hours <= max_hours) AND
        (max_amount IS NULL OR p_amount IS NULL OR p_amount <= max_amount)
    )
    ORDER BY level_order ASC
    LIMIT 1;
    
    RETURN v_level_id;
END;
$$;


ALTER FUNCTION "public"."get_required_approval_level"("p_company_id" "uuid", "p_hours" numeric, "p_amount" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_required_approval_level"("p_company_id" "uuid", "p_hours" numeric, "p_amount" numeric) IS 'Determina o nÃ­vel de aprovaÃ§Ã£o necessÃ¡rio baseado em horas e valor';



CREATE OR REPLACE FUNCTION "public"."get_time_records_simple"("company_id_param" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "company_id" "uuid", "data_registro" "date", "entrada" time without time zone, "saida" time without time zone, "entrada_almoco" time without time zone, "saida_almoco" time without time zone, "entrada_extra1" time without time zone, "saida_extra1" time without time zone, "horas_trabalhadas" numeric, "horas_extras" numeric, "horas_faltas" numeric, "status" character varying, "observacoes" "text", "aprovado_por" "uuid", "aprovado_em" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "employee_nome" character varying, "employee_matricula" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.entrada_extra1,
    tr.saida_extra1,
    tr.horas_trabalhadas,
    tr.horas_extras,
    tr.horas_faltas,
    tr.status,
    tr.observacoes,
    tr.aprovado_por,
    tr.aprovado_em,
    tr.created_at,
    tr.updated_at,
    e.nome as employee_nome,
    e.matricula as employee_matricula
  FROM rh.time_records tr
  LEFT JOIN rh.employees e ON tr.employee_id = e.id
  WHERE tr.company_id = company_id_param
  ORDER BY tr.data_registro DESC, e.nome;
END;
$$;


ALTER FUNCTION "public"."get_time_records_simple"("company_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_companies"() RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN 
  RETURN ARRAY(
    SELECT uc.company_id 
    FROM public.user_companies uc 
    WHERE uc.user_id = auth.uid() 
    AND uc.ativo = true
  );
END;
$$;


ALTER FUNCTION "public"."get_user_companies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Se for super admin, retorna todas as permissÃµes
  IF is_admin_new(p_user_id) THEN
    RETURN QUERY
    SELECT DISTINCT
      mp.module_name,
      true as can_read,
      true as can_create,
      true as can_edit,
      true as can_delete
    FROM module_permissions mp;
    RETURN;
  END IF;
  
  -- Retorna permissÃµes especÃ­ficas do usuÃ¡rio
  RETURN QUERY
  SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete
  FROM user_companies uc
  JOIN module_permissions mp ON uc.profile_id = mp.profile_id
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true;
END;
$$;


ALTER FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions_simple"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete
  FROM module_permissions mp
  JOIN user_companies uc ON mp.profile_id = uc.profile_id
  WHERE uc.user_id = p_user_id
    AND uc.ativo = true;
END;
$$;


ALTER FUNCTION "public"."get_user_permissions_simple"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"("user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN 
  RETURN (
    SELECT json_build_object(
      'profile_id', p.id, 
      'profile_name', p.name, 
      'permissoes_gerais', p.permissions,
      'company_id', uc.company_id,
      'ativo', uc.ativo
    ) 
    FROM public.user_companies uc 
    JOIN public.profiles p ON uc.profile_id = p.id 
    WHERE uc.user_id = get_user_profile.user_id 
    AND uc.ativo = true 
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION "public"."get_user_profile"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Insere na tabela public.users apenas com dados bÃ¡sicos
  INSERT INTO public.users (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'FunÃ§Ã£o simplificada que apenas cria entrada bÃ¡sica em public.users. 
O vÃ­nculo usuÃ¡rio-funcionÃ¡rio agora Ã© feito manualmente no modal "Novo FuncionÃ¡rio".';



CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_all_production"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_profile_id UUID;
  total_production_modules INTEGER;
  user_permissions_count INTEGER;
BEGIN
  -- Obter profile_id do usuÃ¡rio
  SELECT uc.profile_id INTO user_profile_id
  FROM user_companies uc
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true
  LIMIT 1;
  
  -- Se nÃ£o encontrou perfil, retorna false
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Contar total de mÃ³dulos de produÃ§Ã£o
  SELECT COUNT(DISTINCT module_name) INTO total_production_modules
  FROM module_permissions
  WHERE module_name NOT LIKE 'teste_%';
  
  -- Contar quantos mÃ³dulos de produÃ§Ã£o o usuÃ¡rio tem com todas as permissÃµes
  SELECT COUNT(*) INTO user_permissions_count
  FROM module_permissions mp
  WHERE mp.profile_id = user_profile_id
  AND mp.module_name NOT LIKE 'teste_%'
  AND mp.can_read = true
  AND mp.can_create = true
  AND mp.can_edit = true
  AND mp.can_delete = true;
  
  -- Retorna true se tem todas as permissÃµes dos mÃ³dulos de produÃ§Ã£o
  RETURN user_permissions_count = total_production_modules;
END;
$$;


ALTER FUNCTION "public"."is_admin_all_production"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_simple"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = p_user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_simple"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid" DEFAULT NULL::"uuid", "p_tipo_exame" character varying DEFAULT NULL::character varying, "p_status" character varying DEFAULT NULL::character varying, "p_resultado" character varying DEFAULT NULL::character varying, "p_data_inicio" "date" DEFAULT NULL::"date", "p_data_fim" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "company_id" "uuid", "employee_id" "uuid", "employee_name" character varying, "tipo_exame" character varying, "data_agendamento" "date", "data_realizacao" "date", "data_vencimento" "date", "status" character varying, "medico_responsavel" character varying, "clinica_local" character varying, "observacoes" "text", "resultado" character varying, "restricoes" "text", "anexos" "text"[], "custo" numeric, "pago" boolean, "data_pagamento" "date", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.id,
    pe.company_id,
    pe.employee_id,
    e.nome as employee_name,
    pe.tipo_exame,
    pe.data_agendamento,
    pe.data_realizacao,
    pe.data_vencimento,
    pe.status,
    pe.medico_responsavel,
    pe.clinica_local,
    pe.observacoes,
    pe.resultado,
    pe.restricoes,
    pe.anexos,
    pe.custo,
    pe.pago,
    pe.data_pagamento,
    pe.created_at,
    pe.updated_at
  FROM rh.periodic_exams pe
  JOIN rh.employees e ON pe.employee_id = e.id
  WHERE pe.company_id = p_company_id
    AND (p_employee_id IS NULL OR pe.employee_id = p_employee_id)
    AND (p_tipo_exame IS NULL OR pe.tipo_exame = p_tipo_exame)
    AND (p_status IS NULL OR pe.status = p_status)
    AND (p_resultado IS NULL OR pe.resultado = p_resultado)
    AND (p_data_inicio IS NULL OR pe.data_agendamento >= p_data_inicio)
    AND (p_data_fim IS NULL OR pe.data_agendamento <= p_data_fim)
  ORDER BY pe.data_agendamento DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN rh.run_bank_hours_calculation(p_company_id, p_calculation_date);
END;
$$;


ALTER FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") IS 'Wrapper para rh.run_bank_hours_calculation - permite chamada via RPC do Supabase';



CREATE OR REPLACE FUNCTION "public"."set_company_context"("company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM set_config('app.current_company_id', company_id::text, true);
END;
$$;


ALTER FUNCTION "public"."set_company_context"("company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_auth_context"() RETURNS TABLE("current_user_id" "uuid", "is_admin_result" boolean, "module_permissions_count" bigint, "entity_permissions_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    is_admin_simple(auth.uid()) as is_admin_result,
    (SELECT COUNT(*) FROM module_permissions) as module_permissions_count,
    (SELECT COUNT(*) FROM entity_permissions) as entity_permissions_count;
END;
$$;


ALTER FUNCTION "public"."test_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_authenticated_access"("test_user_id" "uuid", "schema_name" "text", "table_name" "text", "company_id_param" "text" DEFAULT NULL::"text", "filters" "jsonb" DEFAULT '{}'::"jsonb", "limit_param" integer DEFAULT 100, "offset_param" integer DEFAULT 0, "order_by" "text" DEFAULT 'created_at'::"text", "order_direction" "text" DEFAULT 'DESC'::"text") RETURNS TABLE("id" "text", "data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    order_clause text;
    total_rows bigint;
    filter_key text;
    filter_value text;
    user_companies uuid[];
    has_company_access boolean := false;
BEGIN
    -- Verificar se o usuÃ¡rio tem permissÃ£o para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Obter empresas do usuÃ¡rio
    SELECT ARRAY(
        SELECT uc.company_id 
        FROM public.user_companies uc 
        WHERE uc.user_id = test_user_id 
        AND uc.ativo = true
    ) INTO user_companies;
    
    -- Se for super admin, permitir acesso a todas as empresas
    IF public.is_admin(test_user_id) THEN
        has_company_access := true;
    ELSE
        -- Verificar se o usuÃ¡rio tem acesso Ã  empresa especÃ­fica
        IF company_id_param IS NOT NULL THEN
            has_company_access := (company_id_param::uuid = ANY(user_companies));
        ELSE
            -- Se nÃ£o especificou empresa, permitir se tiver acesso a pelo menos uma
            has_company_access := (array_length(user_companies, 1) > 0);
        END IF;
    END IF;
    
    -- Se nÃ£o tem acesso Ã  empresa, negar
    IF NOT has_company_access THEN
        RAISE EXCEPTION 'Acesso negado para empresa %', COALESCE(company_id_param, 'nÃ£o especificada');
    END IF;
    
    -- Construir clÃ¡usula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    ELSE
        -- Se nÃ£o especificou empresa, filtrar pelas empresas do usuÃ¡rio
        IF NOT public.is_admin(test_user_id) THEN
            where_clause := where_clause || ' AND company_id = ANY(ARRAY[' || 
                array_to_string(user_companies, ',') || ']::uuid[])';
        END IF;
    END IF;
    
    -- Adicionar filtros dinÃ¢micos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            -- Pular filtros vazios ou com valor "all"
            IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
                -- Verificar se Ã© um campo UUID
                IF filter_key LIKE '%_id' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::uuid';
                -- Verificar se Ã© um campo de data
                ELSIF filter_key LIKE '%_date' OR filter_key LIKE 'data_%' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::date';
                -- Verificar se Ã© um campo booleano
                ELSIF filter_value IN ('true', 'false') THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ' || filter_value;
                -- Campo de texto com busca
                ELSIF filter_key = 'search' THEN
                    where_clause := where_clause || ' AND (nome ILIKE ''%' || filter_value || '%'' OR matricula ILIKE ''%' || filter_value || '%'' OR cpf ILIKE ''%' || filter_value || '%'')';
                -- Outros campos de texto
                ELSE
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''';
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- Construir clÃ¡usula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    EXECUTE count_query INTO total_rows;
    
    -- Query principal para buscar dados
    query_text := format('
        SELECT 
            t.id::text,
            to_jsonb(t.*) as data,
            %s::bigint as total_count
        FROM %I.%I t 
        %s 
        %s
        LIMIT %s OFFSET %s
    ', total_rows, schema_name, table_name, where_clause, order_clause, limit_param, offset_param);
    
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."test_authenticated_access"("test_user_id" "uuid", "schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text" DEFAULT NULL::"text", "filters" "jsonb" DEFAULT '{}'::"jsonb", "limit_param" integer DEFAULT 100, "offset_param" integer DEFAULT 0, "order_by" "text" DEFAULT 'created_at'::"text", "order_direction" "text" DEFAULT 'DESC'::"text") RETURNS TABLE("id" "text", "data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    order_clause text;
    total_rows bigint;
    filter_key text;
    filter_value text;
BEGIN
    -- Construir clÃ¡usula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Adicionar filtros dinÃ¢micos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        
        -- Filtros especÃ­ficos conhecidos
        IF filters ? 'search' AND filters->>'search' != '' THEN
            where_clause := where_clause || ' AND (nome ILIKE ''%' || (filters->>'search') || '%'' OR matricula ILIKE ''%' || (filters->>'search') || '%'')';
        END IF;
        
        IF filters ? 'status' AND filters->>'status' != '' THEN
            where_clause := where_clause || ' AND status = ''' || (filters->>'status') || '''';
        END IF;
        
        IF filters ? 'start_date' AND filters->>'start_date' != '' THEN
            where_clause := where_clause || ' AND created_at >= ''' || (filters->>'start_date') || '''::date';
        END IF;
        
        IF filters ? 'end_date' AND filters->>'end_date' != '' THEN
            where_clause := where_clause || ' AND created_at <= ''' || (filters->>'end_date') || '''::date';
        END IF;
        
        IF filters ? 'is_active' THEN
            where_clause := where_clause || ' AND is_active = ' || (filters->>'is_active')::boolean;
        END IF;
        
        -- Filtros dinÃ¢micos para campos especÃ­ficos conhecidos
        IF filters ? 'employee_id' AND filters->>'employee_id' != '' THEN
            where_clause := where_clause || ' AND employee_id = ''' || (filters->>'employee_id') || '''::uuid';
        END IF;
        
        IF filters ? 'data_registro' AND filters->>'data_registro' != '' THEN
            where_clause := where_clause || ' AND data_registro = ''' || (filters->>'data_registro') || '''::date';
        END IF;
        
        IF filters ? 'id' AND filters->>'id' != '' THEN
            where_clause := where_clause || ' AND id = ''' || (filters->>'id') || '''::uuid';
        END IF;
    END IF;
    
    -- Construir clÃ¡usula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    EXECUTE count_query INTO total_rows;
    
    -- Query principal para buscar dados
    query_text := format('
        SELECT 
            t.id::text,
            to_jsonb(t.*) as data,
            %s::bigint as total_count
        FROM %I.%I t 
        %s 
        %s
        LIMIT %s OFFSET %s
    ', total_rows, schema_name, table_name, where_clause, order_clause, limit_param, offset_param);
    
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."test_get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_time_bank_access"("company_id_param" "text") RETURNS TABLE("id" "text", "data" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    total_rows bigint;
BEGIN
    -- Construir clÃ¡usula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Query para buscar dados
    query_text := 'SELECT id::text, to_jsonb(t.*) as data, COUNT(*) OVER() as total_count FROM rh.time_bank t ' || where_clause || ' ORDER BY created_at DESC LIMIT 100';
    
    -- Query para contar total
    count_query := 'SELECT COUNT(*) FROM rh.time_bank t ' || where_clause;
    
    -- Executar query de contagem
    EXECUTE count_query INTO total_rows;
    
    -- Retornar dados
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."test_time_bank_access"("company_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_create_compensation_approvals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Criar aprovaÃ§Ãµes apenas para novas solicitaÃ§Ãµes
    IF TG_OP = 'INSERT' AND NEW.status = 'pendente' THEN
        PERFORM create_compensation_approvals(NEW.id, NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_create_compensation_approvals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_absence_types_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_absence_types_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_allowance_types_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_allowance_types_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_approval_levels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_approval_levels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_audit_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_audit_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calculation_log"("log_id_param" "uuid", "company_id_param" "uuid", "updates" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE rh.calculation_logs 
  SET 
    status = COALESCE((updates->>'status')::text, status),
    progresso = COALESCE((updates->>'progresso')::integer, progresso),
    total_funcionarios = COALESCE((updates->>'total_funcionarios')::integer, total_funcionarios),
    funcionarios_processados = COALESCE((updates->>'funcionarios_processados')::integer, funcionarios_processados),
    eventos_calculados = COALESCE((updates->>'eventos_calculados')::integer, eventos_calculados),
    erros_encontrados = COALESCE((updates->>'erros_encontrados')::integer, erros_encontrados),
    fim_processamento = CASE WHEN updates->>'fim_processamento' IS NOT NULL THEN (updates->>'fim_processamento')::timestamptz ELSE fim_processamento END,
    tempo_execucao_segundos = COALESCE((updates->>'tempo_execucao_segundos')::integer, tempo_execucao_segundos),
    logs_execucao = COALESCE(updates->'logs_execucao', logs_execucao),
    erros_execucao = COALESCE(updates->'erros_execucao', erros_execucao),
    resumo_calculos = COALESCE(updates->'resumo_calculos', resumo_calculos),
    updated_at = now()
  WHERE id = log_id_param AND company_id = company_id_param;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar log de cÃ¡lculo: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."update_calculation_log"("log_id_param" "uuid", "company_id_param" "uuid", "updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cid_codes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cid_codes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_companies_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_companies_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_compensation_approvals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_compensation_approvals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_compensation_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_compensation_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_deficiency_types_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_deficiency_types_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_delay_reasons_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_delay_reasons_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_disciplinary_actions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_disciplinary_actions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee_shifts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_employee_shifts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employment_contracts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_employment_contracts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid", "data_param" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  result JSONB;
  sql_query TEXT;
BEGIN
  -- Construir query dinÃ¢mica
  sql_query := format('UPDATE %I.%I SET %s, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    (SELECT string_agg(key || ' = $' || (row_number() OVER() + 2)::text, ', ') FROM jsonb_each(data_param))
  );
  
  -- Executar query
  EXECUTE sql_query INTO result USING id_param, company_id_param, (SELECT array_agg(value) FROM jsonb_each(data_param));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar dados: %', SQLERRM;
END;
$_$;


ALTER FUNCTION "public"."update_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid", "data_param" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entity_permission"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "entity_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
  updated_permission RECORD;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para gerenciar permissÃµes
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar permissÃµes';
  END IF;
  
  -- Buscar permissÃ£o existente
  SELECT ep.id INTO permission_id
  FROM entity_permissions ep
  WHERE ep.profile_id = p_profile_id AND ep.entity_name = p_entity_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE entity_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO entity_permissions (
      profile_id,
      entity_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_entity_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING entity_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    ep.created_at,
    ep.updated_at
  FROM entity_permissions ep
  WHERE ep.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_entity_permission"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entity_permission_no_auth"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "entity_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Buscar permissÃ£o existente
  SELECT ep.id INTO permission_id
  FROM entity_permissions ep
  WHERE ep.profile_id = p_profile_id AND ep.entity_name = p_entity_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE entity_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE entity_permissions.id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO entity_permissions (
      profile_id,
      entity_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_entity_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING entity_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    ep.created_at,
    ep.updated_at
  FROM entity_permissions ep
  WHERE ep.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_entity_permission_no_auth"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entity_permission_production"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "entity_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para gerenciar permissÃµes
  -- Usa verificaÃ§Ã£o baseada em permissÃµes de produÃ§Ã£o
  IF auth.uid() IS NOT NULL AND NOT is_admin_all_production(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuÃ¡rios com permissÃµes administrativas podem gerenciar permissÃµes';
  END IF;
  
  -- Buscar permissÃ£o existente
  SELECT ep.id INTO permission_id
  FROM entity_permissions ep
  WHERE ep.profile_id = p_profile_id AND ep.entity_name = p_entity_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE entity_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE entity_permissions.can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE entity_permissions.can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE entity_permissions.can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE entity_permissions.can_delete END,
      updated_at = NOW()
    WHERE entity_permissions.id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO entity_permissions (
      profile_id,
      entity_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_entity_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING entity_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    ep.created_at,
    ep.updated_at
  FROM entity_permissions ep
  WHERE ep.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_entity_permission_production"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entity_permission_with_check"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "entity_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para gerenciar permissÃµes
  -- Usa verificaÃ§Ã£o baseada em permissÃµes em vez de nome do perfil
  IF auth.uid() IS NOT NULL AND NOT is_admin_by_permissions_flexible(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuÃ¡rios com permissÃµes administrativas podem gerenciar permissÃµes';
  END IF;
  
  -- Buscar permissÃ£o existente
  SELECT ep.id INTO permission_id
  FROM entity_permissions ep
  WHERE ep.profile_id = p_profile_id AND ep.entity_name = p_entity_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE entity_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE entity_permissions.id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO entity_permissions (
      profile_id,
      entity_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_entity_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING entity_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    ep.id,
    ep.profile_id,
    ep.entity_name,
    ep.can_read,
    ep.can_create,
    ep.can_edit,
    ep.can_delete,
    ep.created_at,
    ep.updated_at
  FROM entity_permissions ep
  WHERE ep.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_entity_permission_with_check"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_esocial_integrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_esocial_integrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_consolidations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_consolidations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fgts_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_fgts_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_income_statements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_income_statements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inss_brackets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_inss_brackets_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_irrf_brackets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_irrf_brackets_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_permission"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
  updated_permission RECORD;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para gerenciar permissÃµes
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar permissÃµes';
  END IF;
  
  -- Buscar permissÃ£o existente
  SELECT mp.id INTO permission_id
  FROM module_permissions mp
  WHERE mp.profile_id = p_profile_id AND mp.module_name = p_module_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE module_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO module_permissions (
      profile_id,
      module_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_module_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING module_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.created_at,
    mp.updated_at
  FROM module_permissions mp
  WHERE mp.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_module_permission"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_permission_no_auth"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Buscar permissÃ£o existente
  SELECT mp.id INTO permission_id
  FROM module_permissions mp
  WHERE mp.profile_id = p_profile_id AND mp.module_name = p_module_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE module_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE module_permissions.id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO module_permissions (
      profile_id,
      module_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_module_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING module_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.created_at,
    mp.updated_at
  FROM module_permissions mp
  WHERE mp.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_module_permission_no_auth"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_permission_production"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para gerenciar permissÃµes
  -- Usa verificaÃ§Ã£o baseada em permissÃµes de produÃ§Ã£o
  IF auth.uid() IS NOT NULL AND NOT is_admin_all_production(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuÃ¡rios com permissÃµes administrativas podem gerenciar permissÃµes';
  END IF;
  
  -- Buscar permissÃ£o existente
  SELECT mp.id INTO permission_id
  FROM module_permissions mp
  WHERE mp.profile_id = p_profile_id AND mp.module_name = p_module_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE module_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE module_permissions.can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE module_permissions.can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE module_permissions.can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE module_permissions.can_delete END,
      updated_at = NOW()
    WHERE module_permissions.id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO module_permissions (
      profile_id,
      module_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_module_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING module_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.created_at,
    mp.updated_at
  FROM module_permissions mp
  WHERE mp.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_module_permission_production"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_permission_with_check"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) RETURNS TABLE("id" "uuid", "profile_id" "uuid", "module_name" "text", "can_read" boolean, "can_create" boolean, "can_edit" boolean, "can_delete" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  permission_id UUID;
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para gerenciar permissÃµes
  -- Usa verificaÃ§Ã£o baseada em permissÃµes em vez de nome do perfil
  IF auth.uid() IS NOT NULL AND NOT is_admin_by_permissions_flexible(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas usuÃ¡rios com permissÃµes administrativas podem gerenciar permissÃµes';
  END IF;
  
  -- Buscar permissÃ£o existente
  SELECT mp.id INTO permission_id
  FROM module_permissions mp
  WHERE mp.profile_id = p_profile_id AND mp.module_name = p_module_name;
  
  IF permission_id IS NOT NULL THEN
    -- Atualizar permissÃ£o existente
    UPDATE module_permissions
    SET 
      can_read = CASE WHEN p_action = 'can_read' THEN p_value ELSE can_read END,
      can_create = CASE WHEN p_action = 'can_create' THEN p_value ELSE can_create END,
      can_edit = CASE WHEN p_action = 'can_edit' THEN p_value ELSE can_edit END,
      can_delete = CASE WHEN p_action = 'can_delete' THEN p_value ELSE can_delete END,
      updated_at = NOW()
    WHERE module_permissions.id = permission_id;
  ELSE
    -- Criar nova permissÃ£o
    INSERT INTO module_permissions (
      profile_id,
      module_name,
      can_read,
      can_create,
      can_edit,
      can_delete,
      created_at,
      updated_at
    ) VALUES (
      p_profile_id,
      p_module_name,
      CASE WHEN p_action = 'can_read' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_create' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_edit' THEN p_value ELSE FALSE END,
      CASE WHEN p_action = 'can_delete' THEN p_value ELSE FALSE END,
      NOW(),
      NOW()
    )
    RETURNING module_permissions.id INTO permission_id;
  END IF;
  
  -- Retornar permissÃ£o atualizada
  RETURN QUERY
  SELECT 
    mp.id,
    mp.profile_id,
    mp.module_name,
    mp.can_read,
    mp.can_create,
    mp.can_edit,
    mp.can_delete,
    mp.created_at,
    mp.updated_at
  FROM module_permissions mp
  WHERE mp.id = permission_id;
END;
$$;


ALTER FUNCTION "public"."update_module_permission_with_check"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid" DEFAULT NULL::"uuid", "p_tipo_exame" character varying DEFAULT NULL::character varying, "p_data_agendamento" "date" DEFAULT NULL::"date", "p_data_realizacao" "date" DEFAULT NULL::"date", "p_data_vencimento" "date" DEFAULT NULL::"date", "p_status" character varying DEFAULT NULL::character varying, "p_medico_responsavel" character varying DEFAULT NULL::character varying, "p_clinica_local" character varying DEFAULT NULL::character varying, "p_observacoes" "text" DEFAULT NULL::"text", "p_resultado" character varying DEFAULT NULL::character varying, "p_restricoes" "text" DEFAULT NULL::"text", "p_anexos" "text"[] DEFAULT NULL::"text"[], "p_custo" numeric DEFAULT NULL::numeric, "p_pago" boolean DEFAULT NULL::boolean, "p_data_pagamento" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "company_id" "uuid", "employee_id" "uuid", "tipo_exame" character varying, "data_agendamento" "date", "data_realizacao" "date", "data_vencimento" "date", "status" character varying, "medico_responsavel" character varying, "clinica_local" character varying, "observacoes" "text", "resultado" character varying, "restricoes" "text", "anexos" "text"[], "custo" numeric, "pago" boolean, "data_pagamento" "date", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  exam_record RECORD;
BEGIN
  -- Verificar se o exame existe e pertence Ã  empresa
  IF NOT EXISTS (
    SELECT 1 FROM rh.periodic_exams 
    WHERE rh.periodic_exams.id = p_exam_id AND rh.periodic_exams.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Exame nÃ£o encontrado ou nÃ£o pertence Ã  empresa';
  END IF;

  -- Atualizar apenas os campos fornecidos
  UPDATE rh.periodic_exams SET
    employee_id = COALESCE(p_employee_id, employee_id),
    tipo_exame = COALESCE(p_tipo_exame, tipo_exame),
    data_agendamento = COALESCE(p_data_agendamento, data_agendamento),
    data_realizacao = COALESCE(p_data_realizacao, data_realizacao),
    data_vencimento = COALESCE(p_data_vencimento, data_vencimento),
    status = COALESCE(p_status, status),
    medico_responsavel = COALESCE(p_medico_responsavel, medico_responsavel),
    clinica_local = COALESCE(p_clinica_local, clinica_local),
    observacoes = COALESCE(p_observacoes, observacoes),
    resultado = COALESCE(p_resultado, resultado),
    restricoes = COALESCE(p_restricoes, restricoes),
    anexos = COALESCE(p_anexos, anexos),
    custo = COALESCE(p_custo, custo),
    pago = COALESCE(p_pago, pago),
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    updated_at = NOW()
  WHERE rh.periodic_exams.id = p_exam_id
  RETURNING * INTO exam_record;

  -- Retornar o exame atualizado
  RETURN QUERY SELECT * FROM rh.periodic_exams WHERE rh.periodic_exams.id = p_exam_id;
END;
$$;


ALTER FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile"("p_id" "uuid", "p_nome" "text", "p_descricao" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true) RETURNS TABLE("id" "uuid", "nome" "text", "descricao" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se o usuÃ¡rio tem permissÃ£o para atualizar perfis
  IF auth.uid() IS NOT NULL AND NOT is_admin_simple(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem atualizar perfis';
  END IF;
  
  -- Verificar se o nome jÃ¡ existe (exceto para o prÃ³prio perfil)
  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.nome = p_nome AND profiles.id != p_id) THEN
    RAISE EXCEPTION 'JÃ¡ existe um perfil com este nome: %', p_nome;
  END IF;
  
  -- Atualizar perfil
  UPDATE profiles
  SET 
    nome = p_nome,
    descricao = p_descricao,
    is_active = p_is_active,
    updated_at = NOW()
  WHERE profiles.id = p_id;
  
  -- Retornar perfil atualizado
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = p_id;
END;
$$;


ALTER FUNCTION "public"."update_profile"("p_id" "uuid", "p_nome" "text", "p_descricao" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rubricas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_rubricas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_schedule_planning_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_schedule_planning_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_shifts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_work_shifts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_company_access"("user_id" "uuid", "company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = $1 
    AND company_id = $2
    AND ativo = true
  );
$_$;


ALTER FUNCTION "public"."user_has_company_access"("user_id" "uuid", "company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_company_access_new"("p_user_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Super admin tem acesso a todas as empresas
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se o usuÃ¡rio tem acesso Ã  empresa
  RETURN EXISTS (
    SELECT 1
    FROM user_companies uc
    WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true
  );
END;
$$;


ALTER FUNCTION "public"."user_has_company_access_new"("p_user_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validar_solicitacao_ferias"("employee_id_param" "uuid", "ano_param" integer, "dias_solicitados" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    dias_disponiveis INTEGER;
    resultado JSON;
BEGIN
    -- Buscar dias disponÃ­veis
    SELECT ve.dias_restantes
    INTO dias_disponiveis
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = employee_id_param
      AND ve.ano_aquisitivo = ano_param
      AND ve.status IN ('ativo', 'parcialmente_gozado');
    
    -- Validar solicitaÃ§Ã£o
    IF dias_disponiveis IS NULL THEN
        resultado := json_build_object(
            'valido', false,
            'erro', 'PerÃ­odo aquisitivo nÃ£o encontrado',
            'dias_disponiveis', 0,
            'dias_solicitados', dias_solicitados
        );
    ELSIF dias_solicitados > dias_disponiveis THEN
        resultado := json_build_object(
            'valido', false,
            'erro', 'Dias solicitados excedem os dias disponÃ­veis',
            'dias_disponiveis', dias_disponiveis,
            'dias_solicitados', dias_solicitados
        );
    ELSE
        resultado := json_build_object(
            'valido', true,
            'erro', null,
            'dias_disponiveis', dias_disponiveis,
            'dias_solicitados', dias_solicitados
        );
    END IF;
    
    RETURN resultado;
END;
$$;


ALTER FUNCTION "public"."validar_solicitacao_ferias"("employee_id_param" "uuid", "ano_param" integer, "dias_solicitados" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validar_solicitacao_ferias"("employee_id_param" "uuid", "ano_param" integer, "dias_solicitados" integer) IS 'Valida uma solicitaÃ§Ã£o de fÃ©rias';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razao_social" "text" NOT NULL,
    "nome_fantasia" "text" NOT NULL,
    "cnpj" "text" NOT NULL,
    "inscricao_estadual" "text",
    "endereco" "jsonb",
    "contato" "jsonb",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "numero_empresa" character varying(10)
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies" IS 'Tabela de empresas';



COMMENT ON COLUMN "public"."companies"."razao_social" IS 'Razão social da empresa';



COMMENT ON COLUMN "public"."companies"."nome_fantasia" IS 'Nome fantasia da empresa';



COMMENT ON COLUMN "public"."companies"."cnpj" IS 'CNPJ da empresa';



COMMENT ON COLUMN "public"."companies"."inscricao_estadual" IS 'Inscrição estadual da empresa';



COMMENT ON COLUMN "public"."companies"."endereco" IS 'Dados de endereço da empresa (JSON)';



COMMENT ON COLUMN "public"."companies"."contato" IS 'Dados de contato da empresa (JSON)';



COMMENT ON COLUMN "public"."companies"."ativo" IS 'Se a empresa está ativa';



CREATE SEQUENCE IF NOT EXISTS "public"."company_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."company_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "nome" "text" NOT NULL,
    "codigo" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cost_centers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "entity_name" "text" NOT NULL,
    "can_read" boolean DEFAULT false,
    "can_create" boolean DEFAULT false,
    "can_edit" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."entity_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."entity_permissions" IS 'PermissÃµes por entidade - incluindo periodic_exams';



CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "nome" "text" NOT NULL,
    "codigo" "text" NOT NULL,
    "tipo" "public"."material_type" NOT NULL,
    "unidade_medida" "text" NOT NULL,
    "classe" "text",
    "ncm" "text",
    "cfop" "text",
    "cst" "text",
    "imagem_url" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "can_read" boolean DEFAULT false,
    "can_create" boolean DEFAULT false,
    "can_edit" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."module_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."module_permissions" IS 'PermissÃµes por mÃ³dulo - incluindo RH';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['compensation_request'::character varying, 'compensation_approved'::character varying, 'compensation_rejected'::character varying, 'compensation_reminder'::character varying, 'vacation_request'::character varying, 'vacation_approved'::character varying, 'vacation_rejected'::character varying, 'medical_certificate'::character varying, 'payroll_processed'::character varying, 'system_alert'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Tabela de notificaÃ§Ãµes do sistema';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Tipo da notificaÃ§Ã£o: compensation_request, compensation_approved, etc.';



COMMENT ON COLUMN "public"."notifications"."data" IS 'Dados adicionais da notificaÃ§Ã£o em formato JSON';



COMMENT ON COLUMN "public"."notifications"."is_read" IS 'Indica se a notificaÃ§Ã£o foi lida pelo usuÃ¡rio';



CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "tipo" "public"."partner_type"[] NOT NULL,
    "razao_social" "text" NOT NULL,
    "nome_fantasia" "text",
    "cnpj" "text" NOT NULL,
    "matriz_id" "uuid",
    "endereco" "jsonb",
    "contato" "jsonb",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "permissoes" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "cost_center_id" "uuid",
    "nome" "text" NOT NULL,
    "codigo" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "profile_id" "uuid",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_cnpj_key" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_numero_empresa_key" UNIQUE ("numero_empresa");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_company_id_codigo_key" UNIQUE ("company_id", "codigo");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_profile_id_entity_name_key" UNIQUE ("profile_id", "entity_name");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_company_id_codigo_key" UNIQUE ("company_id", "codigo");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_permissions"
    ADD CONSTRAINT "module_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_permissions"
    ADD CONSTRAINT "module_permissions_profile_id_module_name_key" UNIQUE ("profile_id", "module_name");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_company_id_cnpj_key" UNIQUE ("company_id", "cnpj");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_company_id_codigo_key" UNIQUE ("company_id", "codigo");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_companies"
    ADD CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_companies"
    ADD CONSTRAINT "user_companies_user_id_company_id_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_companies_ativo" ON "public"."companies" USING "btree" ("ativo");



CREATE INDEX "idx_companies_cnpj" ON "public"."companies" USING "btree" ("cnpj");



CREATE INDEX "idx_cost_centers_company_id" ON "public"."cost_centers" USING "btree" ("company_id");



CREATE INDEX "idx_entity_permissions_entity_name" ON "public"."entity_permissions" USING "btree" ("entity_name");



CREATE INDEX "idx_entity_permissions_profile_id" ON "public"."entity_permissions" USING "btree" ("profile_id");



CREATE INDEX "idx_materials_company_id" ON "public"."materials" USING "btree" ("company_id");



CREATE INDEX "idx_module_permissions_module_name" ON "public"."module_permissions" USING "btree" ("module_name");



CREATE INDEX "idx_module_permissions_profile_id" ON "public"."module_permissions" USING "btree" ("profile_id");



CREATE INDEX "idx_notifications_company_id" ON "public"."notifications" USING "btree" ("company_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_company" ON "public"."notifications" USING "btree" ("user_id", "company_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_partners_company_id" ON "public"."partners" USING "btree" ("company_id");



CREATE INDEX "idx_projects_company_id" ON "public"."projects" USING "btree" ("company_id");



CREATE INDEX "idx_user_companies_company_id" ON "public"."user_companies" USING "btree" ("company_id");



CREATE INDEX "idx_user_companies_user_id" ON "public"."user_companies" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "generate_company_number_trigger" BEFORE INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."generate_company_number"();



CREATE OR REPLACE TRIGGER "trigger_update_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_companies_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "update_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_cost_centers_updated_at" BEFORE UPDATE ON "public"."cost_centers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_entity_permissions_updated_at" BEFORE UPDATE ON "public"."entity_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_materials_updated_at" BEFORE UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_module_permissions_updated_at" BEFORE UPDATE ON "public"."module_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_partners_updated_at" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entity_permissions"
    ADD CONSTRAINT "entity_permissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_permissions"
    ADD CONSTRAINT "module_permissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_matriz_id_fkey" FOREIGN KEY ("matriz_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;



COMMENT ON CONSTRAINT "partners_matriz_id_fkey" ON "public"."partners" IS 'Self-reference para permitir hierarquia matriz/filial. DEFERRABLE para resolver circular dependency no dump/restore.';



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "public"."user_companies"
    ADD CONSTRAINT "user_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_companies"
    ADD CONSTRAINT "user_companies_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_companies"
    ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert companies" ON "public"."companies" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can insert users" ON "public"."users" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage companies" ON "public"."companies" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage cost centers" ON "public"."cost_centers" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage entity permissions" ON "public"."entity_permissions" USING ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Admins can manage materials" ON "public"."materials" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage module permissions" ON "public"."module_permissions" USING ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Admins can manage partners" ON "public"."partners" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage profiles" ON "public"."profiles" USING ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Admins can manage projects" ON "public"."projects" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage user companies" ON "public"."user_companies" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage user_companies" ON "public"."user_companies" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage users" ON "public"."users" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update companies" ON "public"."companies" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Everyone can view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can manage cost centers of their companies" ON "public"."cost_centers" USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can manage cost_centers of their companies" ON "public"."cost_centers" USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can manage materials of their companies" ON "public"."materials" USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can manage partners of their companies" ON "public"."partners" USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can manage projects of their companies" ON "public"."projects" USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can update their own data" ON "public"."users" FOR UPDATE USING ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true))))));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view companies" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Users can view cost centers of their companies" ON "public"."cost_centers" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view cost_centers of their companies" ON "public"."cost_centers" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view materials of their companies" ON "public"."materials" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view partners of their companies" ON "public"."partners" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view projects of their companies" ON "public"."projects" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view their companies" ON "public"."companies" FOR SELECT USING (("public"."user_has_company_access"("auth"."uid"(), "id") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can view their company associations" ON "public"."user_companies" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can view their entity permissions" ON "public"."entity_permissions" FOR SELECT USING (("profile_id" IN ( SELECT "uc"."profile_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view their module permissions" ON "public"."module_permissions" FOR SELECT USING (("profile_id" IN ( SELECT "uc"."profile_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view their own companies" ON "public"."companies" FOR SELECT USING ((("id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can view their own entity permissions" ON "public"."entity_permissions" FOR SELECT USING (("profile_id" IN ( SELECT "uc"."profile_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true))))));



CREATE POLICY "Users can view their own permissions" ON "public"."module_permissions" FOR SELECT USING (("profile_id" IN ( SELECT "uc"."profile_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view their own user company relationships" ON "public"."user_companies" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entity_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_dias_gozados"("employee_id_param" "uuid", "ano_param" integer, "dias_usados" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_dias_gozados"("employee_id_param" "uuid", "ano_param" integer, "dias_usados" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_dias_gozados"("employee_id_param" "uuid", "ano_param" integer, "dias_usados" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_approval_levels"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_approval_levels"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_approval_levels"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_compensation_approvals"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_compensation_approvals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_compensation_approvals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_compensation_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_compensation_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_compensation_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_log"("p_company_id" "uuid", "p_user_id" "uuid", "p_action" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."audit_log"("p_company_id" "uuid", "p_user_id" "uuid", "p_action" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_log"("p_company_id" "uuid", "p_user_id" "uuid", "p_action" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_dias_ferias_disponiveis"("employee_id_param" "uuid", "ano_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_dias_ferias_disponiveis"("employee_id_param" "uuid", "ano_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_dias_ferias_disponiveis"("employee_id_param" "uuid", "ano_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_medical_certificate_days"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_medical_certificate_days"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_medical_certificate_days"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_company_access"("p_user_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_access"("p_user_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_access"("p_user_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_permission"("p_module_name" "text", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_module_name" "text", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_module_name" "text", "p_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_calculation_log"("company_id_param" "uuid", "processo_id_param" "text", "tipo_processo_param" "text", "mes_referencia_param" integer, "ano_referencia_param" integer, "descricao_processo_param" "text", "usuario_id_param" "uuid", "usuario_nome_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_calculation_log"("company_id_param" "uuid", "processo_id_param" "text", "tipo_processo_param" "text", "mes_referencia_param" integer, "ano_referencia_param" integer, "descricao_processo_param" "text", "usuario_id_param" "uuid", "usuario_nome_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_calculation_log"("company_id_param" "uuid", "processo_id_param" "text", "tipo_processo_param" "text", "mes_referencia_param" integer, "ano_referencia_param" integer, "descricao_processo_param" "text", "usuario_id_param" "uuid", "usuario_nome_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_compensation_approvals"("p_compensation_request_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_compensation_approvals"("p_compensation_request_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_compensation_approvals"("p_compensation_request_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid", "matricula_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid", "matricula_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_employee"("company_id_param" "uuid", "nome_param" "text", "cpf_param" "text", "data_admissao_param" "date", "status_param" "text", "user_id_param" "uuid", "matricula_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "data_param" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "data_param" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "data_param" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_periodic_exam"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_periodic_exam"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_periodic_exam"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile"("p_nome" "text", "p_descricao" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile"("p_nome" "text", "p_descricao" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile"("p_nome" "text", "p_descricao" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."criar_periodo_aquisitivo"("employee_id_param" "uuid", "company_id_param" "uuid", "data_admissao_param" "date", "ano_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."criar_periodo_aquisitivo"("employee_id_param" "uuid", "company_id_param" "uuid", "data_admissao_param" "date", "ano_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_periodo_aquisitivo"("employee_id_param" "uuid", "company_id_param" "uuid", "data_admissao_param" "date", "ano_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_company_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_company_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_company_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_employee_matricula"("company_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_employee_matricula"("company_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_employee_matricula"("company_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_company_id" "uuid", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action" character varying, "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_company_id" "uuid", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action" character varying, "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_company_id" "uuid", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action" character varying, "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_calculation_logs"("company_id_param" "uuid", "filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_calculation_logs"("company_id_param" "uuid", "filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_calculation_logs"("company_id_param" "uuid", "filters" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_data_with_joins"("schema_name" "text", "table_name" "text", "company_id_param" "text", "joins" "jsonb", "filters" "jsonb", "limit_param" integer, "offset_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_data_with_joins"("schema_name" "text", "table_name" "text", "company_id_param" "text", "joins" "jsonb", "filters" "jsonb", "limit_param" integer, "offset_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_data_with_joins"("schema_name" "text", "table_name" "text", "company_id_param" "text", "joins" "jsonb", "filters" "jsonb", "limit_param" integer, "offset_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_permissions_by_profile"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_permissions_by_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_permissions_by_profile"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_module_permissions_by_profile"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_module_permissions_by_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_module_permissions_by_profile"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_required_approval_level"("p_company_id" "uuid", "p_hours" numeric, "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_required_approval_level"("p_company_id" "uuid", "p_hours" numeric, "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_required_approval_level"("p_company_id" "uuid", "p_hours" numeric, "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_time_records_simple"("company_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_time_records_simple"("company_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_time_records_simple"("company_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_companies"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_companies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_companies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions_simple"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions_simple"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions_simple"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_all_production"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_all_production"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_all_production"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_simple"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_simple"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_simple"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_company_context"("company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_company_context"("company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_company_context"("company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_auth_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_auth_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_auth_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_authenticated_access"("test_user_id" "uuid", "schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_authenticated_access"("test_user_id" "uuid", "schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_authenticated_access"("test_user_id" "uuid", "schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_get_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_time_bank_access"("company_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_time_bank_access"("company_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_time_bank_access"("company_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_create_compensation_approvals"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_create_compensation_approvals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_compensation_approvals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_absence_types_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_absence_types_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_absence_types_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_allowance_types_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_allowance_types_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_allowance_types_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_approval_levels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_approval_levels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_approval_levels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_audit_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_audit_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_audit_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calculation_log"("log_id_param" "uuid", "company_id_param" "uuid", "updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_calculation_log"("log_id_param" "uuid", "company_id_param" "uuid", "updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calculation_log"("log_id_param" "uuid", "company_id_param" "uuid", "updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cid_codes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cid_codes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cid_codes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_companies_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_companies_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_companies_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_compensation_approvals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_compensation_approvals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_compensation_approvals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_compensation_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_compensation_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_compensation_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_deficiency_types_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_deficiency_types_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_deficiency_types_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_delay_reasons_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_delay_reasons_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_delay_reasons_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_disciplinary_actions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_disciplinary_actions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_disciplinary_actions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employee_shifts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_employee_shifts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employee_shifts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employment_contracts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_employment_contracts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employment_contracts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid", "data_param" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid", "data_param" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entity_data"("schema_name" "text", "table_name" "text", "company_id_param" "uuid", "id_param" "uuid", "data_param" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entity_permission"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_entity_permission"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entity_permission"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entity_permission_no_auth"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_entity_permission_no_auth"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entity_permission_no_auth"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entity_permission_production"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_entity_permission_production"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entity_permission_production"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entity_permission_with_check"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_entity_permission_with_check"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entity_permission_with_check"("p_profile_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_esocial_integrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_esocial_integrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_esocial_integrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_consolidations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_consolidations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_consolidations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_fgts_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_fgts_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fgts_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_income_statements_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_income_statements_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_income_statements_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inss_brackets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inss_brackets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inss_brackets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_irrf_brackets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_irrf_brackets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_irrf_brackets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_permission"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_permission"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_permission"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_permission_no_auth"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_permission_no_auth"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_permission_no_auth"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_permission_production"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_permission_production"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_permission_production"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_permission_with_check"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_permission_with_check"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_permission_with_check"("p_profile_id" "uuid", "p_module_name" "text", "p_action" "text", "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile"("p_id" "uuid", "p_nome" "text", "p_descricao" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile"("p_id" "uuid", "p_nome" "text", "p_descricao" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile"("p_id" "uuid", "p_nome" "text", "p_descricao" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rubricas_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_rubricas_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rubricas_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_schedule_planning_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_schedule_planning_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_schedule_planning_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_shifts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_shifts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_shifts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_company_access"("user_id" "uuid", "company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_company_access"("user_id" "uuid", "company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_company_access"("user_id" "uuid", "company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_company_access_new"("p_user_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_company_access_new"("p_user_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_company_access_new"("p_user_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validar_solicitacao_ferias"("employee_id_param" "uuid", "ano_param" integer, "dias_solicitados" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."validar_solicitacao_ferias"("employee_id_param" "uuid", "ano_param" integer, "dias_solicitados" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validar_solicitacao_ferias"("employee_id_param" "uuid", "ano_param" integer, "dias_solicitados" integer) TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."company_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."company_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."company_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cost_centers" TO "anon";
GRANT ALL ON TABLE "public"."cost_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_centers" TO "service_role";



GRANT ALL ON TABLE "public"."entity_permissions" TO "anon";
GRANT ALL ON TABLE "public"."entity_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."module_permissions" TO "anon";
GRANT ALL ON TABLE "public"."module_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."module_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."partners" TO "anon";
GRANT ALL ON TABLE "public"."partners" TO "authenticated";
GRANT ALL ON TABLE "public"."partners" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."user_companies" TO "anon";
GRANT ALL ON TABLE "public"."user_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."user_companies" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






\unrestrict zUK3aT6cUu6LAD1qJQyUfVQsbMF9hAFVYBqaQSEhgtEjdyDZHN0TUbCTUthsOJ1

RESET ALL;
