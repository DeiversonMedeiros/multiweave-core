
\restrict iRRWplhb2LK8BUJ5MgDoKGn36TEXc4mXHvpl5xTZzWc5cuEC9gjVyICdgIztbls


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


CREATE SCHEMA IF NOT EXISTS "financeiro";


ALTER SCHEMA "financeiro" OWNER TO "postgres";


COMMENT ON SCHEMA "financeiro" IS 'MÃ³dulo Financeiro implementado com sucesso - Contas a Pagar/Receber, Tesouraria, Fiscal e Contabilidade com sistema de aprovaÃ§Ã£o por valor, centro de custo, departamento, classe financeira e usuÃ¡rio';



CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "rh";


ALTER SCHEMA "rh" OWNER TO "postgres";


CREATE TYPE "financeiro"."payment_status" AS ENUM (
    'pendente',
    'aprovado',
    'pago',
    'cancelado'
);


ALTER TYPE "financeiro"."payment_status" OWNER TO "postgres";


CREATE TYPE "financeiro"."receivable_status" AS ENUM (
    'pendente',
    'recebido',
    'cancelado'
);


ALTER TYPE "financeiro"."receivable_status" OWNER TO "postgres";


CREATE TYPE "financeiro"."sefaz_status" AS ENUM (
    'autorizada',
    'rejeitada',
    'cancelada',
    'pendente'
);


ALTER TYPE "financeiro"."sefaz_status" OWNER TO "postgres";


CREATE TYPE "financeiro"."transaction_type" AS ENUM (
    'pagamento',
    'recebimento',
    'transferencia'
);


ALTER TYPE "financeiro"."transaction_type" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "financeiro"."calculate_dpo"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_pago DECIMAL(15,2);
    media_diaria DECIMAL(15,2);
    dias_periodo INTEGER;
    dpo DECIMAL(10,2);
BEGIN
    -- Calcular dias do perÃ­odo
    dias_periodo := p_data_fim - p_data_inicio + 1;
    
    -- Calcular total pago no perÃ­odo
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO total_pago
    FROM financeiro.contas_pagar
    WHERE company_id = p_company_id
    AND data_pagamento BETWEEN p_data_inicio AND p_data_fim
    AND is_active = true;
    
    -- Calcular mÃ©dia diÃ¡ria
    media_diaria := total_pago / dias_periodo;
    
    -- Calcular saldo pendente
    SELECT COALESCE(SUM(valor_atual), 0)
    INTO total_pago
    FROM financeiro.contas_pagar
    WHERE company_id = p_company_id
    AND status IN ('pendente', 'aprovado')
    AND is_active = true;
    
    -- Calcular DPO
    IF media_diaria > 0 THEN
        dpo := total_pago / media_diaria;
    ELSE
        dpo := 0;
    END IF;
    
    RETURN ROUND(dpo, 2);
END;
$$;


ALTER FUNCTION "financeiro"."calculate_dpo"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."calculate_dso"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_recebido DECIMAL(15,2);
    media_diaria DECIMAL(15,2);
    dias_periodo INTEGER;
    dso DECIMAL(10,2);
BEGIN
    -- Calcular dias do perÃ­odo
    dias_periodo := p_data_fim - p_data_inicio + 1;
    
    -- Calcular total recebido no perÃ­odo
    SELECT COALESCE(SUM(valor_recebido), 0)
    INTO total_recebido
    FROM financeiro.contas_receber
    WHERE company_id = p_company_id
    AND data_recebimento BETWEEN p_data_inicio AND p_data_fim
    AND is_active = true;
    
    -- Calcular mÃ©dia diÃ¡ria
    media_diaria := total_recebido / dias_periodo;
    
    -- Calcular saldo pendente
    SELECT COALESCE(SUM(valor_atual), 0)
    INTO total_recebido
    FROM financeiro.contas_receber
    WHERE company_id = p_company_id
    AND status IN ('pendente', 'confirmado')
    AND is_active = true;
    
    -- Calcular DSO
    IF media_diaria > 0 THEN
        dso := total_recebido / media_diaria;
    ELSE
        dso := 0;
    END IF;
    
    RETURN ROUND(dso, 2);
END;
$$;


ALTER FUNCTION "financeiro"."calculate_dso"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."calculate_valor_atual"("p_valor_original" numeric, "p_data_vencimento" "date", "p_data_calculo" "date" DEFAULT CURRENT_DATE, "p_taxa_juros" numeric DEFAULT 0, "p_taxa_multa" numeric DEFAULT 0) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    dias_atraso INTEGER;
    valor_juros DECIMAL;
    valor_multa DECIMAL;
    valor_atual DECIMAL;
BEGIN
    -- Calcular dias de atraso
    dias_atraso := GREATEST(0, p_data_calculo - p_data_vencimento);
    
    -- Calcular multa (aplicada uma vez)
    IF dias_atraso > 0 THEN
        valor_multa := p_valor_original * (p_taxa_multa / 100);
    ELSE
        valor_multa := 0;
    END IF;
    
    -- Calcular juros (aplicados por dia)
    IF dias_atraso > 0 THEN
        valor_juros := p_valor_original * (p_taxa_juros / 100) * (dias_atraso / 30.0);
    ELSE
        valor_juros := 0;
    END IF;
    
    -- Calcular valor atual
    valor_atual := p_valor_original + valor_multa + valor_juros;
    
    RETURN ROUND(valor_atual, 2);
END;
$$;


ALTER FUNCTION "financeiro"."calculate_valor_atual"("p_valor_original" numeric, "p_data_vencimento" "date", "p_data_calculo" "date", "p_taxa_juros" numeric, "p_taxa_multa" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."check_approval_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid" DEFAULT NULL::"uuid", "p_departamento" "text" DEFAULT NULL::"text", "p_classe_financeira" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Verificar se Ã© super admin
    IF public.is_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Obter profile_id do usuÃ¡rio
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = p_user_id
    AND uc.company_id = p_company_id
    AND uc.ativo = true
    LIMIT 1;
    
    -- Se nÃ£o encontrou perfil, retorna false
    IF user_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se tem permissÃ£o de aprovaÃ§Ã£o
    SELECT EXISTS(
        SELECT 1 FROM public.module_permissions mp
        WHERE mp.profile_id = user_profile_id
        AND mp.module_name = 'financeiro'
        AND mp.can_edit = true
    ) INTO has_permission;
    
    -- Se nÃ£o tem permissÃ£o bÃ¡sica, retorna false
    IF NOT has_permission THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar configuraÃ§Ãµes especÃ­ficas de aprovaÃ§Ã£o
    -- Por valor
    IF EXISTS(
        SELECT 1 FROM financeiro.configuracoes_aprovacao ca
        WHERE ca.company_id = p_company_id
        AND ca.tipo_aprovacao = 'conta_pagar'
        AND ca.valor_limite >= p_valor
        AND (ca.centro_custo_id IS NULL OR ca.centro_custo_id = p_centro_custo_id)
        AND (ca.departamento IS NULL OR ca.departamento = p_departamento)
        AND (ca.classe_financeira IS NULL OR ca.classe_financeira = p_classe_financeira)
        AND (ca.usuario_id IS NULL OR ca.usuario_id = p_user_id)
        AND ca.is_active = true
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "financeiro"."check_approval_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."check_financial_permission"("p_user_id" "uuid", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Verificar se Ã© super admin
    IF public.is_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permissÃ£o especÃ­fica do mÃ³dulo financeiro
    RETURN public.check_module_permission(p_user_id, 'financeiro', p_permission);
END;
$$;


ALTER FUNCTION "financeiro"."check_financial_permission"("p_user_id" "uuid", "p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."create_approvals_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    required_level INTEGER;
    current_level INTEGER := 1;
    approver_id UUID;
BEGIN
    -- Obter nÃ­vel de aprovaÃ§Ã£o necessÃ¡rio
    SELECT financeiro.get_required_approval_level(
        NEW.company_id,
        NEW.valor_original,
        NEW.centro_custo_id,
        NEW.departamento,
        NEW.classe_financeira
    ) INTO required_level;
    
    -- Criar aprovaÃ§Ãµes para cada nÃ­vel
    WHILE current_level <= required_level LOOP
        -- Buscar aprovador para o nÃ­vel atual
        SELECT ca.usuario_id INTO approver_id
        FROM financeiro.configuracoes_aprovacao ca
        WHERE ca.company_id = NEW.company_id
        AND ca.tipo_aprovacao = 'conta_pagar'
        AND ca.nivel_aprovacao = current_level
        AND ca.valor_limite >= NEW.valor_original
        AND (ca.centro_custo_id IS NULL OR ca.centro_custo_id = NEW.centro_custo_id)
        AND (ca.departamento IS NULL OR ca.departamento = NEW.departamento)
        AND (ca.classe_financeira IS NULL OR ca.classe_financeira = NEW.classe_financeira)
        AND ca.is_active = true
        LIMIT 1;
        
        -- Se encontrou aprovador, criar aprovaÃ§Ã£o
        IF approver_id IS NOT NULL THEN
            INSERT INTO financeiro.aprovacoes (
                company_id,
                entidade_tipo,
                entidade_id,
                nivel_aprovacao,
                aprovador_id,
                status
            ) VALUES (
                NEW.company_id,
                'conta_pagar',
                NEW.id,
                current_level,
                approver_id,
                'pendente'
            );
        END IF;
        
        current_level := current_level + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "financeiro"."create_approvals_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."generate_remittance_file"("p_company_id" "uuid", "p_borderos_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    remittance_data TEXT := '';
    bordero_record RECORD;
    conta_record RECORD;
BEGIN
    -- Obter dados do borderÃ´
    SELECT * INTO bordero_record
    FROM financeiro.borderos
    WHERE id = p_borderos_id
    AND company_id = p_company_id;
    
    -- Aqui seria implementada a geraÃ§Ã£o do arquivo CNAB
    -- Por enquanto, apenas um placeholder
    
    -- Exemplo de estrutura:
    -- 1. Header do arquivo
    -- 2. Registros de tÃ­tulos
    -- 3. Trailer do arquivo
    
    RETURN remittance_data;
END;
$$;


ALTER FUNCTION "financeiro"."generate_remittance_file"("p_company_id" "uuid", "p_borderos_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."generate_titulo_number"("p_company_id" "uuid", "p_tipo" character varying) RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    next_number INTEGER;
    titulo_number VARCHAR(50);
BEGIN
    -- Obter prÃ³ximo nÃºmero sequencial
    IF p_tipo = 'PAGAR' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_titulo FROM '^[0-9]+') AS INTEGER)), 0) + 1
        INTO next_number
        FROM financeiro.contas_pagar
        WHERE company_id = p_company_id
        AND numero_titulo ~ '^[0-9]+';
    ELSE
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_titulo FROM '^[0-9]+') AS INTEGER)), 0) + 1
        INTO next_number
        FROM financeiro.contas_receber
        WHERE company_id = p_company_id
        AND numero_titulo ~ '^[0-9]+';
    END IF;
    
    -- Formatar nÃºmero do tÃ­tulo
    titulo_number := LPAD(next_number::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM NOW());
    
    RETURN titulo_number;
END;
$$;


ALTER FUNCTION "financeiro"."generate_titulo_number"("p_company_id" "uuid", "p_tipo" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."get_aging_report"("p_company_id" "uuid", "p_data_corte" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("fornecedor_nome" character varying, "total_pendente" numeric, "vencido_1_30" numeric, "vencido_31_60" numeric, "vencido_61_90" numeric, "vencido_mais_90" numeric, "a_vencer_1_30" numeric, "a_vencer_31_60" numeric, "a_vencer_mais_60" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.fornecedor_nome,
        SUM(cp.valor_atual) as total_pendente,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '30 days' 
            AND cp.data_vencimento >= p_data_corte - INTERVAL '60 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_1_30,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '60 days' 
            AND cp.data_vencimento >= p_data_corte - INTERVAL '90 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_31_60,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '90 days' 
            AND cp.data_vencimento >= p_data_corte - INTERVAL '120 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_61_90,
        SUM(CASE 
            WHEN cp.data_vencimento < p_data_corte - INTERVAL '120 days'
            THEN cp.valor_atual ELSE 0 END) as vencido_mais_90,
        SUM(CASE 
            WHEN cp.data_vencimento >= p_data_corte 
            AND cp.data_vencimento <= p_data_corte + INTERVAL '30 days'
            THEN cp.valor_atual ELSE 0 END) as a_vencer_1_30,
        SUM(CASE 
            WHEN cp.data_vencimento > p_data_corte + INTERVAL '30 days' 
            AND cp.data_vencimento <= p_data_corte + INTERVAL '60 days'
            THEN cp.valor_atual ELSE 0 END) as a_vencer_31_60,
        SUM(CASE 
            WHEN cp.data_vencimento > p_data_corte + INTERVAL '60 days'
            THEN cp.valor_atual ELSE 0 END) as a_vencer_mais_60
    FROM financeiro.contas_pagar cp
    WHERE cp.company_id = p_company_id
    AND cp.status IN ('pendente', 'aprovado')
    AND cp.is_active = true
    GROUP BY cp.fornecedor_nome
    ORDER BY total_pendente DESC;
END;
$$;


ALTER FUNCTION "financeiro"."get_aging_report"("p_company_id" "uuid", "p_data_corte" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."get_required_approval_level"("p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid" DEFAULT NULL::"uuid", "p_departamento" "text" DEFAULT NULL::"text", "p_classe_financeira" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    max_level INTEGER := 0;
BEGIN
    -- Encontrar o maior nÃ­vel de aprovaÃ§Ã£o necessÃ¡rio
    SELECT COALESCE(MAX(ca.nivel_aprovacao), 1)
    INTO max_level
    FROM financeiro.configuracoes_aprovacao ca
    WHERE ca.company_id = p_company_id
    AND ca.tipo_aprovacao = 'conta_pagar'
    AND ca.valor_limite >= p_valor
    AND (ca.centro_custo_id IS NULL OR ca.centro_custo_id = p_centro_custo_id)
    AND (ca.departamento IS NULL OR ca.departamento = p_departamento)
    AND (ca.classe_financeira IS NULL OR ca.classe_financeira = p_classe_financeira)
    AND ca.is_active = true;
    
    RETURN COALESCE(max_level, 1);
END;
$$;


ALTER FUNCTION "financeiro"."get_required_approval_level"("p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."process_bank_return"("p_company_id" "uuid", "p_arquivo_retorno" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    return_record RECORD;
    conta_pagar_record RECORD;
BEGIN
    -- Aqui seria implementada a lÃ³gica de processamento do arquivo CNAB
    -- Por enquanto, apenas um placeholder
    
    -- Exemplo de processamento:
    -- 1. Parse do arquivo CNAB
    -- 2. IdentificaÃ§Ã£o dos tÃ­tulos
    -- 3. AtualizaÃ§Ã£o dos status
    -- 4. CriaÃ§Ã£o de lanÃ§amentos contÃ¡beis
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "financeiro"."process_bank_return"("p_company_id" "uuid", "p_arquivo_retorno" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."update_approval_status"("p_entidade_tipo" character varying, "p_entidade_id" "uuid", "p_aprovador_id" "uuid", "p_status" character varying, "p_observacoes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    approval_record RECORD;
    all_approved BOOLEAN := FALSE;
    entity_company_id UUID;
BEGIN
    -- Obter registro de aprovaÃ§Ã£o
    SELECT * INTO approval_record
    FROM financeiro.aprovacoes
    WHERE entidade_tipo = p_entidade_tipo
    AND entidade_id = p_entidade_id
    AND aprovador_id = p_aprovador_id
    AND status = 'pendente';
    
    -- Se nÃ£o encontrou, retorna false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status da aprovaÃ§Ã£o
    UPDATE financeiro.aprovacoes
    SET status = p_status,
        data_aprovacao = CASE WHEN p_status = 'aprovado' THEN NOW() ELSE NULL END,
        observacoes = p_observacoes,
        updated_at = NOW()
    WHERE id = approval_record.id;
    
    -- Se foi aprovado, verificar se todas as aprovaÃ§Ãµes foram concluÃ­das
    IF p_status = 'aprovado' THEN
        -- Verificar se todas as aprovaÃ§Ãµes foram aprovadas
        SELECT NOT EXISTS(
            SELECT 1 FROM financeiro.aprovacoes
            WHERE entidade_tipo = p_entidade_tipo
            AND entidade_id = p_entidade_id
            AND status = 'pendente'
        ) INTO all_approved;
        
        -- Se todas foram aprovadas, atualizar status da entidade
        IF all_approved THEN
            -- Obter company_id da entidade
            IF p_entidade_tipo = 'conta_pagar' THEN
                SELECT company_id INTO entity_company_id
                FROM financeiro.contas_pagar
                WHERE id = p_entidade_id;
                
                -- Atualizar status para aprovado
                UPDATE financeiro.contas_pagar
                SET status = 'aprovado',
                    data_aprovacao = NOW(),
                    aprovado_por = p_aprovador_id,
                    updated_at = NOW()
                WHERE id = p_entidade_id;
            END IF;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "financeiro"."update_approval_status"("p_entidade_tipo" character varying, "p_entidade_id" "uuid", "p_aprovador_id" "uuid", "p_status" character varying, "p_observacoes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "financeiro"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "financeiro"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN rh.adjust_bank_hours_balance(p_employee_id, p_company_id, p_hours_amount, p_description);
END;
$$;


ALTER FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") IS 'Wrapper para rh.adjust_bank_hours_balance - permite chamada via RPC do Supabase';



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



CREATE OR REPLACE FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_profile_id UUID;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se é super admin
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Obter profile_id do usuário
  SELECT uc.profile_id INTO user_profile_id
  FROM user_companies uc
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true
  LIMIT 1;
  
  -- Se não encontrou perfil, retorna false
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar permissão específica
  SELECT CASE p_permission
    WHEN 'read' THEN can_read
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    ELSE FALSE
  END INTO has_permission
  FROM entity_permissions
  WHERE profile_id = user_profile_id
  AND entity_name = p_entity_name;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;


ALTER FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_permission" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_profile_id UUID;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Verificar se é super admin
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Obter profile_id do usuário
  SELECT uc.profile_id INTO user_profile_id
  FROM user_companies uc
  WHERE uc.user_id = p_user_id
  AND uc.ativo = true
  LIMIT 1;
  
  -- Se não encontrou perfil, retorna false
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar permissão específica
  SELECT CASE p_permission
    WHEN 'read' THEN can_read
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    ELSE FALSE
  END INTO has_permission
  FROM module_permissions
  WHERE profile_id = user_profile_id
  AND module_name = p_module_name;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;


ALTER FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_permission" "text") OWNER TO "postgres";


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
    -- Obter ID do usuÃ¡rio atual
    current_user_id := auth.uid();
    
    -- Se nÃ£o hÃ¡ usuÃ¡rio autenticado, negar acesso
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'UsuÃ¡rio nÃ£o autenticado';
    END IF;
    
    -- Verificar se o usuÃ¡rio tem permissÃ£o para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Obter empresas do usuÃ¡rio
    SELECT ARRAY(
        SELECT uc.company_id 
        FROM public.user_companies uc 
        WHERE uc.user_id = current_user_id 
        AND uc.ativo = true
    ) INTO user_companies;
    
    -- Se for super admin, permitir acesso a todas as empresas
    IF public.is_admin(current_user_id) THEN
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
        IF NOT public.is_admin(current_user_id) THEN
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
            IF filter_value IS NOT NULL AND filter_value != 'all' THEN
                -- Verificar se Ã© um campo UUID
                IF filter_key LIKE '%_id' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::uuid';
                ELSE
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''';
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- Construir clÃ¡usula ORDER BY
    order_clause := ' ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para buscar dados
    query_text := 'SELECT t.id::text, to_jsonb(t.*) as data, COUNT(*) OVER() as total_count FROM ' || schema_name || '.' || table_name || ' t ' || where_clause || order_clause || ' LIMIT ' || limit_param || ' OFFSET ' || offset_param;
    
    -- Query para contar total
    count_query := 'SELECT COUNT(*) FROM ' || schema_name || '.' || table_name || ' t ' || where_clause;
    
    -- Executar query de contagem
    EXECUTE count_query INTO total_rows;
    
    -- Retornar dados
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION "public"."get_entity_data_simple"("schema_name" "text", "table_name" "text", "company_id_param" "text", "filters" "jsonb", "limit_param" integer, "offset_param" integer, "order_by" "text", "order_direction" "text") OWNER TO "postgres";


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
  -- Se for super admin, retorna todas as permissões
  IF is_admin(p_user_id) THEN
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
  
  -- Retorna permissões específicas do usuário
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
    WHERE uc.user_id = is_admin.user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


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
  
  -- Verificar se o usuário tem acesso à empresa
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


CREATE OR REPLACE FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance DECIMAL(6,2);
BEGIN
  -- Verificar se o colaborador tem banco de horas configurado
  IF NOT EXISTS (
    SELECT 1 FROM rh.bank_hours_config 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Colaborador nÃ£o possui banco de horas configurado';
  END IF;

  -- Registrar transaÃ§Ã£o
  INSERT INTO rh.bank_hours_transactions (
    employee_id, company_id, transaction_type, transaction_date,
    hours_amount, description, created_by, is_automatic
  ) VALUES (
    p_employee_id, p_company_id, 'adjustment', CURRENT_DATE,
    p_hours_amount, p_description, p_created_by, false
  ) RETURNING id INTO v_transaction_id;

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = current_balance + p_hours_amount,
    updated_at = NOW()
  WHERE employee_id = p_employee_id AND company_id = p_company_id
  RETURNING current_balance INTO v_new_balance;

  -- Se nÃ£o existe saldo, criar
  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (employee_id, company_id, current_balance)
    VALUES (p_employee_id, p_company_id, p_hours_amount)
    RETURNING current_balance INTO v_new_balance;
  END IF;

  RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") RETURNS TABLE("ano" integer, "dias_disponiveis" integer, "dias_gozados" integer, "dias_restantes" integer, "status" character varying, "data_vencimento" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN RETURN QUERY SELECT ve.ano_aquisitivo as ano, ve.dias_disponiveis, ve.dias_gozados, ve.dias_restantes, ve.status, ve.data_vencimento FROM rh.vacation_entitlements ve WHERE ve.employee_id = employee_id_param AND ve.status IN ('ativo', 'parcialmente_gozado') ORDER BY ve.ano_aquisitivo DESC; END;$$;


ALTER FUNCTION "rh"."buscar_anos_ferias_disponiveis"("employee_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "employee_nome" character varying, "data_inicio" "date", "data_fim" "date", "dias_solicitados" integer, "tipo" character varying, "observacoes" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN RETURN QUERY SELECT v.id, v.employee_id, e.nome as employee_nome, v.data_inicio, v.data_fim, v.dias_solicitados, v.tipo, v.observacoes, v.created_at FROM rh.vacations v JOIN rh.employees e ON e.id = v.employee_id WHERE v.company_id = p_company_id AND v.status = 'pendente' ORDER BY v.created_at DESC; END;$$;


ALTER FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE dias_disponiveis INTEGER; BEGIN SELECT dias_restantes INTO dias_disponiveis FROM rh.vacation_entitlements WHERE employee_id = p_employee_id AND ano_aquisitivo = p_ano AND status IN ('ativo', 'parcialmente_gozado'); RETURN COALESCE(dias_disponiveis, 0); END;$$;


ALTER FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("hours_accumulated" numeric, "hours_compensated" numeric, "new_balance" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_config rh.bank_hours_config%ROWTYPE;
  v_balance rh.bank_hours_balance%ROWTYPE;
  v_total_extra_hours DECIMAL(5,2) := 0;
  v_hours_to_accumulate DECIMAL(5,2) := 0;
  v_hours_to_compensate DECIMAL(5,2) := 0;
  v_new_balance DECIMAL(6,2) := 0;
  v_transaction_id UUID;
BEGIN
  -- Buscar configuraÃ§Ã£o
  SELECT * INTO v_config 
  FROM rh.bank_hours_config 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id 
    AND is_active = true;

  -- Se nÃ£o tem banco de horas configurado, retornar zeros
  IF NOT FOUND OR NOT v_config.has_bank_hours THEN
    RETURN QUERY SELECT 0.00, 0.00, 0.00;
    RETURN;
  END IF;

  -- Buscar saldo atual
  SELECT * INTO v_balance 
  FROM rh.bank_hours_balance 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  -- Calcular total de horas extras no perÃ­odo
  SELECT COALESCE(SUM(horas_extras), 0) INTO v_total_extra_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado';

  -- Determinar quanto acumular e quanto compensar
  IF v_config.auto_compensate AND v_balance.current_balance > 0 THEN
    -- Compensar horas existentes primeiro
    v_hours_to_compensate := LEAST(v_total_extra_hours, v_balance.current_balance);
    v_hours_to_accumulate := v_total_extra_hours - v_hours_to_compensate;
  ELSE
    -- Apenas acumular
    v_hours_to_accumulate := v_total_extra_hours;
  END IF;

  -- Verificar limite mÃ¡ximo de acumulaÃ§Ã£o
  IF v_hours_to_accumulate > 0 THEN
    v_hours_to_accumulate := LEAST(
      v_hours_to_accumulate, 
      v_config.max_accumulation_hours - v_balance.accumulated_hours
    );
  END IF;

  -- Atualizar saldo
  v_new_balance := v_balance.current_balance + v_hours_to_accumulate - v_hours_to_compensate;

  -- Registrar transaÃ§Ã£o de acumulaÃ§Ã£o
  IF v_hours_to_accumulate > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'accumulation', p_period_end,
      v_hours_to_accumulate, p_period_start, p_period_end,
      'AcumulaÃ§Ã£o automÃ¡tica de horas extras', true
    );
  END IF;

  -- Registrar transaÃ§Ã£o de compensaÃ§Ã£o
  IF v_hours_to_compensate > 0 THEN
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, compensation_rate, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'compensation', p_period_end,
      -v_hours_to_compensate, p_period_start, p_period_end,
      'CompensaÃ§Ã£o automÃ¡tica de banco de horas', v_config.compensation_rate, true
    );
  END IF;

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = v_new_balance,
    accumulated_hours = accumulated_hours + v_hours_to_accumulate,
    compensated_hours = compensated_hours + v_hours_to_compensate,
    last_calculation_date = p_period_end,
    updated_at = NOW()
  WHERE employee_id = p_employee_id AND company_id = p_company_id;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$;


ALTER FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        id,
        user_id,
        company_id,
        type,
        title,
        message,
        data,
        is_read,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_company_id,
        p_notification_type,
        p_title,
        p_message,
        jsonb_build_object('exam_id', p_exam_id),
        false,
        NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") IS 'Cria uma notificaÃ§Ã£o para um exame especÃ­fico';



CREATE OR REPLACE FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_type_record RECORD;
BEGIN
    -- Create notification rules for all default types
    FOR notification_type_record IN
        SELECT id, tipo FROM rh.training_notification_types
        WHERE company_id = p_company_id
        AND is_active = true
    LOOP
        INSERT INTO rh.training_notification_rules (
            company_id, training_id, notification_type_id, target_audience, dias_antecedencia
        ) VALUES (
            p_company_id,
            p_training_id,
            notification_type_record.id,
            CASE 
                WHEN notification_type_record.tipo IN ('inscricao_aberta', 'lembrete_inscricao') THEN 'todos_funcionarios'
                ELSE 'inscritos'
            END,
            (SELECT dias_antecedencia FROM rh.training_notification_types WHERE id = notification_type_record.id)
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("current_balance" numeric, "accumulated_hours" numeric, "compensated_hours" numeric, "expired_hours" numeric, "last_calculation_date" "date", "has_bank_hours" boolean, "max_accumulation_hours" numeric, "accumulation_period_months" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(b.current_balance, 0),
    COALESCE(b.accumulated_hours, 0),
    COALESCE(b.compensated_hours, 0),
    COALESCE(b.expired_hours, 0),
    COALESCE(b.last_calculation_date, CURRENT_DATE),
    COALESCE(c.has_bank_hours, false),
    COALESCE(c.max_accumulation_hours, 0),
    COALESCE(c.accumulation_period_months, 0)
  FROM rh.bank_hours_balance b
  FULL OUTER JOIN rh.bank_hours_config c ON b.employee_id = c.employee_id AND b.company_id = c.company_id
  WHERE (b.employee_id = p_employee_id OR c.employee_id = p_employee_id)
    AND (b.company_id = p_company_id OR c.company_id = p_company_id);
END;
$$;


ALTER FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer DEFAULT 30) RETURNS TABLE("exam_id" "uuid", "employee_id" "uuid", "employee_name" character varying, "exam_type" character varying, "scheduled_date" "date", "days_until_exam" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.id as exam_id,
        pe.employee_id,
        e.nome as employee_name,
        pe.tipo_exame as exam_type,
        pe.data_agendamento as scheduled_date,
        (pe.data_agendamento - CURRENT_DATE)::INTEGER as days_until_exam
    FROM rh.periodic_exams pe
    JOIN rh.employees e ON pe.employee_id = e.id
    WHERE pe.company_id = p_company_id
    AND pe.status = 'agendado'
    AND pe.data_agendamento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
    ORDER BY pe.data_agendamento ASC;
END;
$$;


ALTER FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) IS 'Busca exames que precisam de notificaÃ§Ã£o baseado nos dias de antecedÃªncia';



CREATE OR REPLACE FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") RETURNS TABLE("exam_id" "uuid", "employee_id" "uuid", "employee_name" character varying, "exam_type" character varying, "scheduled_date" "date", "days_overdue" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.id as exam_id,
        pe.employee_id,
        e.nome as employee_name,
        pe.tipo_exame as exam_type,
        pe.data_agendamento as scheduled_date,
        (CURRENT_DATE - pe.data_agendamento)::INTEGER as days_overdue
    FROM rh.periodic_exams pe
    JOIN rh.employees e ON pe.employee_id = e.id
    WHERE pe.company_id = p_company_id
    AND pe.status = 'agendado'
    AND pe.data_agendamento < CURRENT_DATE
    ORDER BY pe.data_agendamento ASC;
END;
$$;


ALTER FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") IS 'Busca exames que estÃ£o vencidos (data de agendamento no passado)';



CREATE OR REPLACE FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "training_id" "uuid", "training_name" character varying, "titulo" "text", "mensagem" "text", "data_envio" timestamp with time zone, "status" character varying, "tipo" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tnh.id,
        tnh.training_id,
        t.nome as training_name,
        tnh.titulo,
        tnh.mensagem,
        tnh.data_envio,
        tnh.status,
        tnt.tipo
    FROM rh.training_notification_history tnh
    JOIN rh.training_notification_types tnt ON tnt.id = tnh.notification_type_id
    LEFT JOIN rh.trainings t ON t.id = tnh.training_id
    WHERE tnh.user_id = p_user_id
    AND tnh.company_id = p_company_id
    ORDER BY tnh.data_envio DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "company_id" "uuid", "notification_enabled" boolean, "email_notifications" boolean, "push_notifications" boolean, "reminder_days_before" integer, "reminder_days_after" integer, "auto_enrollment" boolean, "require_approval" boolean, "max_participants" integer, "min_attendance_percentage" integer, "certificate_auto_generate" boolean, "certificate_validity_days" integer, "training_duration_default" numeric, "evaluation_required" boolean, "feedback_required" boolean, "auto_archive_days" integer, "allow_self_enrollment" boolean, "allow_cancellation" boolean, "cancellation_deadline_hours" integer, "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.company_id,
        ts.notification_enabled,
        ts.email_notifications,
        ts.push_notifications,
        ts.reminder_days_before,
        ts.reminder_days_after,
        ts.auto_enrollment,
        ts.require_approval,
        ts.max_participants,
        ts.min_attendance_percentage,
        ts.certificate_auto_generate,
        ts.certificate_validity_days,
        ts.training_duration_default,
        ts.evaluation_required,
        ts.feedback_required,
        ts.auto_archive_days,
        ts.allow_self_enrollment,
        ts.allow_cancellation,
        ts.cancellation_deadline_hours,
        ts.is_active,
        ts.created_at,
        ts.updated_at
    FROM rh.training_settings ts
    WHERE ts.company_id = p_company_id
    AND ts.is_active = true
    ORDER BY ts.updated_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean DEFAULT true, "p_accumulation_period_months" integer DEFAULT 12, "p_max_accumulation_hours" numeric DEFAULT 40.00, "p_compensation_rate" numeric DEFAULT 1.00) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_config_id UUID;
  v_balance_id UUID;
BEGIN
  -- Inserir ou atualizar configuraÃ§Ã£o
  INSERT INTO rh.bank_hours_config (
    employee_id, company_id, has_bank_hours, 
    accumulation_period_months, max_accumulation_hours, compensation_rate
  ) VALUES (
    p_employee_id, p_company_id, p_has_bank_hours,
    p_accumulation_period_months, p_max_accumulation_hours, p_compensation_rate
  )
  ON CONFLICT (employee_id, company_id) 
  DO UPDATE SET
    has_bank_hours = EXCLUDED.has_bank_hours,
    accumulation_period_months = EXCLUDED.accumulation_period_months,
    max_accumulation_hours = EXCLUDED.max_accumulation_hours,
    compensation_rate = EXCLUDED.compensation_rate,
    updated_at = NOW()
  RETURNING id INTO v_config_id;

  -- Inicializar saldo se nÃ£o existir
  INSERT INTO rh.bank_hours_balance (employee_id, company_id)
  VALUES (p_employee_id, p_company_id)
  ON CONFLICT (employee_id, company_id) DO NOTHING
  RETURNING id INTO v_balance_id;

  RETURN v_config_id;
END;
$$;


ALTER FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean, "p_accumulation_period_months" integer, "p_max_accumulation_hours" numeric, "p_compensation_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("employees_processed" integer, "hours_expired" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_employee_record RECORD;
  v_hours_to_expire DECIMAL(5,2);
  v_total_employees INTEGER := 0;
  v_total_hours_expired DECIMAL(8,2) := 0;
BEGIN
  -- Processar cada colaborador com banco de horas
  FOR v_employee_record IN
    SELECT 
      b.employee_id,
      b.company_id,
      b.current_balance,
      c.expires_after_months,
      c.accumulation_period_months
    FROM rh.bank_hours_balance b
    JOIN rh.bank_hours_config c ON b.employee_id = c.employee_id AND b.company_id = c.company_id
    WHERE b.company_id = p_company_id
      AND c.is_active = true
      AND c.has_bank_hours = true
      AND b.current_balance > 0
  LOOP
    -- Calcular horas que devem expirar
    v_hours_to_expire := 0;
    
    -- LÃ³gica de expiraÃ§Ã£o baseada no perÃ­odo de acumulaÃ§Ã£o
    -- Por simplicidade, vamos expirar horas antigas baseado na data de cÃ¡lculo
    IF v_employee_record.current_balance > 0 THEN
      -- Verificar se hÃ¡ horas que devem expirar
      -- Esta Ã© uma implementaÃ§Ã£o simplificada - pode ser refinada conforme necessÃ¡rio
      v_hours_to_expire := LEAST(
        v_employee_record.current_balance,
        v_employee_record.current_balance * 0.1 -- Expirar 10% das horas por mÃªs
      );
    END IF;

    -- Registrar expiraÃ§Ã£o se houver horas para expirar
    IF v_hours_to_expire > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, description, is_automatic
      ) VALUES (
        v_employee_record.employee_id, v_employee_record.company_id, 'expiration', p_expiration_date,
        -v_hours_to_expire, 'ExpiraÃ§Ã£o automÃ¡tica de horas do banco', true
      );

      -- Atualizar saldo
      UPDATE rh.bank_hours_balance SET
        current_balance = current_balance - v_hours_to_expire,
        expired_hours = expired_hours + v_hours_to_expire,
        updated_at = NOW()
      WHERE employee_id = v_employee_record.employee_id 
        AND company_id = v_employee_record.company_id;

      v_total_hours_expired := v_total_hours_expired + v_hours_to_expire;
    END IF;

    v_total_employees := v_total_employees + 1;
  END LOOP;

  RETURN QUERY SELECT v_total_employees, v_total_hours_expired;
END;
$$;


ALTER FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."process_notification_queue"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Process pending notifications
    FOR notification_record IN
        SELECT * FROM rh.training_notification_queue
        WHERE status = 'pendente'
        AND data_agendamento <= NOW()
        AND tentativas < max_tentativas
        ORDER BY data_agendamento ASC
        LIMIT 100
    LOOP
        BEGIN
            -- Insert into public notifications table
            INSERT INTO public.notifications (
                user_id, company_id, title, message, type, is_read, created_at
            ) VALUES (
                notification_record.user_id,
                notification_record.company_id,
                notification_record.titulo,
                notification_record.mensagem,
                'training',
                false,
                NOW()
            );

            -- Update queue status
            UPDATE rh.training_notification_queue
            SET status = 'enviada',
                data_envio = NOW(),
                tentativas = tentativas + 1
            WHERE id = notification_record.id;

            -- Insert into history
            INSERT INTO rh.training_notification_history (
                company_id, training_id, notification_type_id, user_id, employee_id,
                titulo, mensagem, data_envio, status, metodo_envio
            ) VALUES (
                notification_record.company_id,
                notification_record.training_id,
                notification_record.notification_type_id,
                notification_record.user_id,
                notification_record.employee_id,
                notification_record.titulo,
                notification_record.mensagem,
                NOW(),
                'enviada',
                'sistema'
            );

            success_count := success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Update queue with error
            UPDATE rh.training_notification_queue
            SET status = CASE 
                WHEN tentativas + 1 >= max_tentativas THEN 'falhou'
                ELSE 'pendente'
            END,
            tentativas = tentativas + 1,
            erro_mensagem = SQLERRM
            WHERE id = notification_record.id;

            error_count := error_count + 1;
        END;
    END LOOP;

    -- Log processing results
    RAISE NOTICE 'Processed % notifications successfully, % failed', success_count, error_count;
END;
$$;


ALTER FUNCTION "rh"."process_notification_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_calculation_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_employee_record RECORD;
  v_result RECORD;
  v_total_accumulated DECIMAL(8,2) := 0;
  v_total_compensated DECIMAL(8,2) := 0;
  v_total_expired DECIMAL(8,2) := 0;
  v_employees_processed INTEGER := 0;
BEGIN
  -- Criar registro de cÃ¡lculo
  INSERT INTO rh.bank_hours_calculations (
    company_id, calculation_date, period_start, period_end, status
  ) VALUES (
    p_company_id, p_calculation_date, 
    p_calculation_date - INTERVAL '1 month', p_calculation_date,
    'running'
  ) RETURNING id INTO v_calculation_id;

  -- Definir perÃ­odo de cÃ¡lculo (Ãºltimo mÃªs)
  v_period_start := p_calculation_date - INTERVAL '1 month';
  v_period_end := p_calculation_date;

  -- Processar cada colaborador com banco de horas ativo
  FOR v_employee_record IN
    SELECT employee_id, company_id
    FROM rh.bank_hours_config
    WHERE company_id = p_company_id
      AND is_active = true
      AND has_bank_hours = true
  LOOP
    -- Calcular e acumular horas para este colaborador
    SELECT * INTO v_result
    FROM rh.calculate_and_accumulate_bank_hours(
      v_employee_record.employee_id,
      v_employee_record.company_id,
      v_period_start,
      v_period_end
    );

    v_total_accumulated := v_total_accumulated + v_result.hours_accumulated;
    v_total_compensated := v_total_compensated + v_result.hours_compensated;
    v_employees_processed := v_employees_processed + 1;
  END LOOP;

  -- Processar expiraÃ§Ã£o de horas
  SELECT * INTO v_result
  FROM rh.process_bank_hours_expiration(p_company_id, p_calculation_date);
  
  v_total_expired := v_result.hours_expired;

  -- Atualizar registro de cÃ¡lculo
  UPDATE rh.bank_hours_calculations SET
    employees_processed = v_employees_processed,
    hours_accumulated = v_total_accumulated,
    hours_compensated = v_total_compensated,
    hours_expired = v_total_expired,
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_calculation_id;

  RETURN v_calculation_id;
END;
$$;


ALTER FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_notifications_created INTEGER := 0;
    v_exam RECORD;
    v_user_id UUID;
    v_title VARCHAR;
    v_message TEXT;
BEGIN
    -- Buscar exames que precisam de notificaÃ§Ã£o (30 dias antes)
    FOR v_exam IN 
        SELECT * FROM rh.get_exams_needing_notification(p_company_id, 30)
    LOOP
        -- Buscar user_id do funcionÃ¡rio
        SELECT user_id INTO v_user_id 
        FROM rh.employees 
        WHERE id = v_exam.employee_id;
        
        -- SÃ³ criar notificaÃ§Ã£o se o funcionÃ¡rio tiver user_id
        IF v_user_id IS NOT NULL THEN
            -- Definir tÃ­tulo e mensagem baseado nos dias restantes
            IF v_exam.days_until_exam = 0 THEN
                v_title := 'Exame Agendado para Hoje';
                v_message := 'VocÃª tem um exame ' || v_exam.exam_type || ' agendado para hoje.';
            ELSIF v_exam.days_until_exam <= 7 THEN
                v_title := 'Exame PrÃ³ximo';
                v_message := 'VocÃª tem um exame ' || v_exam.exam_type || ' agendado para ' || 
                           v_exam.days_until_exam || ' dias.';
            ELSIF v_exam.days_until_exam <= 30 THEN
                v_title := 'Lembrete de Exame';
                v_message := 'VocÃª tem um exame ' || v_exam.exam_type || ' agendado para ' || 
                           v_exam.days_until_exam || ' dias.';
            END IF;
            
            -- Criar notificaÃ§Ã£o
            PERFORM rh.create_exam_notification(
                v_user_id,
                p_company_id,
                v_exam.exam_id,
                'exam_reminder',
                v_title,
                v_message
            );
            
            v_notifications_created := v_notifications_created + 1;
        END IF;
    END LOOP;
    
    -- Buscar exames vencidos
    FOR v_exam IN 
        SELECT * FROM rh.get_expired_exams(p_company_id)
    LOOP
        -- Buscar user_id do funcionÃ¡rio
        SELECT user_id INTO v_user_id 
        FROM rh.employees 
        WHERE id = v_exam.employee_id;
        
        -- SÃ³ criar notificaÃ§Ã£o se o funcionÃ¡rio tiver user_id
        IF v_user_id IS NOT NULL THEN
            v_title := 'Exame Vencido';
            v_message := 'Seu exame ' || v_exam.exam_type || ' estava agendado para ' || 
                        v_exam.scheduled_date || ' e estÃ¡ ' || v_exam.days_overdue || ' dias atrasado.';
            
            -- Criar notificaÃ§Ã£o
            PERFORM rh.create_exam_notification(
                v_user_id,
                p_company_id,
                v_exam.exam_id,
                'exam_overdue',
                v_title,
                v_message
            );
            
            v_notifications_created := v_notifications_created + 1;
        END IF;
    END LOOP;
    
    RETURN v_notifications_created;
END;
$$;


ALTER FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") IS 'Agenda notificaÃ§Ãµes automÃ¡ticas para exames (30 dias antes e vencidos)';



CREATE OR REPLACE FUNCTION "rh"."schedule_training_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    training_record RECORD;
    notification_type_record RECORD;
    employee_record RECORD;
    user_record RECORD;
    scheduled_date TIMESTAMP WITH TIME ZONE;
    template_titulo TEXT;
    template_mensagem TEXT;
BEGIN
    -- Process each active training
    FOR training_record IN 
        SELECT t.*, nt.dias_antecedencia, nt.template_titulo, nt.template_mensagem, nt.tipo
        FROM rh.trainings t
        JOIN rh.training_notification_rules tnr ON tnr.training_id = t.id
        JOIN rh.training_notification_types nt ON nt.id = tnr.notification_type_id
        WHERE t.is_active = true 
        AND tnr.is_enabled = true
        AND t.status IN ('inscricoes_abertas', 'em_andamento', 'concluido')
    LOOP
        -- Calculate scheduled date based on training date and days_antecedencia
        CASE training_record.tipo
            WHEN 'inscricao_aberta' THEN
                scheduled_date := training_record.data_limite_inscricao - INTERVAL '0 days';
            WHEN 'lembrete_inscricao' THEN
                scheduled_date := training_record.data_limite_inscricao - INTERVAL '3 days';
            WHEN 'inicio_treinamento' THEN
                scheduled_date := training_record.data_inicio;
            WHEN 'fim_treinamento' THEN
                scheduled_date := training_record.data_fim;
            WHEN 'certificado_disponivel' THEN
                scheduled_date := training_record.data_fim + INTERVAL '1 day';
            WHEN 'presenca_obrigatoria' THEN
                scheduled_date := training_record.data_inicio - INTERVAL '1 day';
            ELSE
                scheduled_date := NOW() + INTERVAL '1 hour';
        END CASE;

        -- Get target audience
        FOR employee_record IN
            SELECT DISTINCT e.*, u.id as user_id
            FROM rh.employees e
            LEFT JOIN public.users u ON u.id = e.user_id
            WHERE e.company_id = training_record.company_id
            AND e.status = 'ativo'
            AND (
                training_record.tipo IN ('inscricao_aberta', 'lembrete_inscricao') OR
                EXISTS (
                    SELECT 1 FROM rh.training_enrollments te 
                    WHERE te.training_id = training_record.id 
                    AND te.employee_id = e.id
                    AND te.status IN ('inscrito', 'confirmado', 'presente')
                )
            )
        LOOP
            -- Replace template variables
            template_titulo := training_record.template_titulo;
            template_mensagem := training_record.template_mensagem;
            
            template_titulo := REPLACE(template_titulo, '{training_name}', training_record.nome);
            template_titulo := REPLACE(template_titulo, '{training_date}', training_record.data_inicio::text);
            template_titulo := REPLACE(template_titulo, '{training_time}', '08:00');
            template_titulo := REPLACE(template_titulo, '{training_location}', COALESCE(training_record.local, 'A definir'));
            template_titulo := REPLACE(template_titulo, '{available_slots}', COALESCE(training_record.vagas_disponiveis::text, 'Ilimitadas'));
            template_titulo := REPLACE(template_titulo, '{deadline_date}', COALESCE(training_record.data_limite_inscricao::text, 'Não definido'));
            
            template_mensagem := REPLACE(template_mensagem, '{training_name}', training_record.nome);
            template_mensagem := REPLACE(template_mensagem, '{training_date}', training_record.data_inicio::text);
            template_mensagem := REPLACE(template_mensagem, '{training_time}', '08:00');
            template_mensagem := REPLACE(template_mensagem, '{training_location}', COALESCE(training_record.local, 'A definir'));
            template_mensagem := REPLACE(template_mensagem, '{available_slots}', COALESCE(training_record.vagas_disponiveis::text, 'Ilimitadas'));
            template_mensagem := REPLACE(template_mensagem, '{deadline_date}', COALESCE(training_record.data_limite_inscricao::text, 'Não definido'));
            template_mensagem := REPLACE(template_mensagem, '{new_date}', training_record.data_inicio::text);

            -- Insert notification into queue
            INSERT INTO rh.training_notification_queue (
                company_id, training_id, notification_type_id, user_id, employee_id,
                titulo, mensagem, data_agendamento, status
            ) VALUES (
                training_record.company_id,
                training_record.id,
                (SELECT id FROM rh.training_notification_types WHERE tipo = training_record.tipo AND company_id = training_record.company_id LIMIT 1),
                employee_record.user_id,
                employee_record.id,
                template_titulo,
                template_mensagem,
                scheduled_date,
                'pendente'
            );
        END LOOP;
    END LOOP;
END;
$$;


ALTER FUNCTION "rh"."schedule_training_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."trigger_create_training_notification_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM rh.create_training_notification_rules(NEW.id, NEW.company_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."trigger_create_training_notification_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_training_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_training_settings_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "financeiro"."aprovacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "entidade_tipo" character varying(50) NOT NULL,
    "entidade_id" "uuid" NOT NULL,
    "nivel_aprovacao" integer NOT NULL,
    "aprovador_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "aprovacoes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."aprovacoes" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."aprovacoes" IS 'HistÃ³rico de aprovaÃ§Ãµes';



CREATE TABLE IF NOT EXISTS "financeiro"."borderos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "numero_borderos" character varying(50) NOT NULL,
    "data_geracao" "date" NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "valor_total" numeric(15,2) NOT NULL,
    "quantidade_titulos" integer NOT NULL,
    "status" character varying(20) DEFAULT 'gerado'::character varying,
    "banco_codigo" character varying(10),
    "arquivo_remessa" "text",
    "arquivo_retorno" "text",
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "borderos_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['gerado'::character varying, 'enviado'::character varying, 'processado'::character varying, 'retornado'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."borderos" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."borderos" IS 'BorderÃ´s de cobranÃ§a';



CREATE TABLE IF NOT EXISTS "financeiro"."conciliacoes_bancarias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "conta_bancaria_id" "uuid" NOT NULL,
    "data_conciliacao" "date" NOT NULL,
    "saldo_banco" numeric(15,2) NOT NULL,
    "saldo_sistema" numeric(15,2) NOT NULL,
    "diferenca" numeric(15,2) NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conciliacoes_bancarias_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'conciliada'::character varying, 'divergente'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."conciliacoes_bancarias" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."conciliacoes_bancarias" IS 'ConciliaÃ§Ãµes bancÃ¡rias';



CREATE TABLE IF NOT EXISTS "financeiro"."configuracoes_aprovacao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_aprovacao" character varying(50) NOT NULL,
    "valor_limite" numeric(15,2) NOT NULL,
    "centro_custo_id" "uuid",
    "departamento" character varying(100),
    "classe_financeira" character varying(100),
    "usuario_id" "uuid",
    "nivel_aprovacao" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "financeiro"."configuracoes_aprovacao" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."configuracoes_aprovacao" IS 'ConfiguraÃ§Ãµes de aprovaÃ§Ã£o por valor/centro de custo/departamento/classe/usuÃ¡rio';



CREATE TABLE IF NOT EXISTS "financeiro"."contas_bancarias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "banco_codigo" character varying(10) NOT NULL,
    "banco_nome" character varying(100) NOT NULL,
    "agencia" character varying(10) NOT NULL,
    "conta" character varying(20) NOT NULL,
    "tipo_conta" character varying(20) NOT NULL,
    "moeda" character varying(3) DEFAULT 'BRL'::character varying,
    "saldo_atual" numeric(15,2) DEFAULT 0,
    "saldo_disponivel" numeric(15,2) DEFAULT 0,
    "limite_credito" numeric(15,2) DEFAULT 0,
    "data_saldo" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "observacoes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contas_bancarias_tipo_conta_check" CHECK ((("tipo_conta")::"text" = ANY ((ARRAY['corrente'::character varying, 'poupanca'::character varying, 'investimento'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."contas_bancarias" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."contas_bancarias" IS 'Contas bancÃ¡rias da empresa';



CREATE TABLE IF NOT EXISTS "financeiro"."contas_pagar" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "numero_titulo" character varying(50) NOT NULL,
    "fornecedor_id" "uuid",
    "fornecedor_nome" character varying(255),
    "fornecedor_cnpj" character varying(18),
    "descricao" "text" NOT NULL,
    "valor_original" numeric(15,2) NOT NULL,
    "valor_atual" numeric(15,2) NOT NULL,
    "data_emissao" "date" NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "data_pagamento" "date",
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "departamento" character varying(100),
    "classe_financeira" character varying(100),
    "categoria" character varying(100),
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "forma_pagamento" character varying(50),
    "conta_bancaria_id" "uuid",
    "observacoes" "text",
    "anexos" "text"[],
    "valor_desconto" numeric(15,2) DEFAULT 0,
    "valor_juros" numeric(15,2) DEFAULT 0,
    "valor_multa" numeric(15,2) DEFAULT 0,
    "valor_pago" numeric(15,2) DEFAULT 0,
    "data_aprovacao" timestamp with time zone,
    "aprovado_por" "uuid",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contas_pagar_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'pago'::character varying, 'vencido'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."contas_pagar" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."contas_pagar" IS 'Contas a pagar da empresa';



CREATE TABLE IF NOT EXISTS "financeiro"."contas_receber" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "numero_titulo" character varying(50) NOT NULL,
    "cliente_id" "uuid",
    "cliente_nome" character varying(255),
    "cliente_cnpj" character varying(18),
    "descricao" "text" NOT NULL,
    "valor_original" numeric(15,2) NOT NULL,
    "valor_atual" numeric(15,2) NOT NULL,
    "data_emissao" "date" NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "data_recebimento" "date",
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "departamento" character varying(100),
    "classe_financeira" character varying(100),
    "categoria" character varying(100),
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "forma_recebimento" character varying(50),
    "conta_bancaria_id" "uuid",
    "observacoes" "text",
    "anexos" "text"[],
    "valor_desconto" numeric(15,2) DEFAULT 0,
    "valor_juros" numeric(15,2) DEFAULT 0,
    "valor_multa" numeric(15,2) DEFAULT 0,
    "valor_recebido" numeric(15,2) DEFAULT 0,
    "data_confirmacao" timestamp with time zone,
    "confirmado_por" "uuid",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contas_receber_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'confirmado'::character varying, 'recebido'::character varying, 'vencido'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."contas_receber" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."contas_receber" IS 'Contas a receber da empresa';



CREATE TABLE IF NOT EXISTS "financeiro"."fluxo_caixa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_projecao" "date" NOT NULL,
    "tipo_movimento" character varying(20) NOT NULL,
    "categoria" character varying(100) NOT NULL,
    "descricao" "text" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "conta_bancaria_id" "uuid",
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "status" character varying(20) DEFAULT 'previsto'::character varying,
    "data_confirmacao" "date",
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fluxo_caixa_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['previsto'::character varying, 'confirmado'::character varying, 'realizado'::character varying])::"text"[]))),
    CONSTRAINT "fluxo_caixa_tipo_movimento_check" CHECK ((("tipo_movimento")::"text" = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."fluxo_caixa" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."fluxo_caixa" IS 'Fluxo de caixa e projeÃ§Ãµes';



CREATE TABLE IF NOT EXISTS "financeiro"."lancamentos_contabeis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_lancamento" "date" NOT NULL,
    "conta_debito_id" "uuid" NOT NULL,
    "conta_credito_id" "uuid" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "historico" "text" NOT NULL,
    "documento" character varying(50),
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "tipo_lancamento" character varying(20) DEFAULT 'manual'::character varying,
    "origem_id" "uuid",
    "origem_tipo" character varying(50),
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lancamentos_contabeis_tipo_lancamento_check" CHECK ((("tipo_lancamento")::"text" = ANY ((ARRAY['manual'::character varying, 'automatico'::character varying, 'importado'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."lancamentos_contabeis" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."lancamentos_contabeis" IS 'LanÃ§amentos contÃ¡beis';



CREATE TABLE IF NOT EXISTS "financeiro"."nfe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "chave_acesso" character varying(44) NOT NULL,
    "numero_nfe" character varying(20) NOT NULL,
    "serie" character varying(5) NOT NULL,
    "data_emissao" "date" NOT NULL,
    "data_saida" "date",
    "valor_total" numeric(15,2) NOT NULL,
    "valor_icms" numeric(15,2) DEFAULT 0,
    "valor_ipi" numeric(15,2) DEFAULT 0,
    "valor_pis" numeric(15,2) DEFAULT 0,
    "valor_cofins" numeric(15,2) DEFAULT 0,
    "status_sefaz" character varying(20) DEFAULT 'pendente'::character varying,
    "xml_nfe" "text",
    "danfe_url" "text",
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nfe_status_sefaz_check" CHECK ((("status_sefaz")::"text" = ANY ((ARRAY['pendente'::character varying, 'autorizada'::character varying, 'rejeitada'::character varying, 'cancelada'::character varying, 'inutilizada'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."nfe" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."nfe" IS 'Notas Fiscais EletrÃ´nicas';



CREATE TABLE IF NOT EXISTS "financeiro"."nfse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "numero_nfse" character varying(20) NOT NULL,
    "codigo_verificacao" character varying(50),
    "data_emissao" "date" NOT NULL,
    "data_competencia" "date" NOT NULL,
    "valor_servico" numeric(15,2) NOT NULL,
    "valor_iss" numeric(15,2) DEFAULT 0,
    "valor_pis" numeric(15,2) DEFAULT 0,
    "valor_cofins" numeric(15,2) DEFAULT 0,
    "valor_csll" numeric(15,2) DEFAULT 0,
    "valor_ir" numeric(15,2) DEFAULT 0,
    "status_sefaz" character varying(20) DEFAULT 'pendente'::character varying,
    "xml_nfse" "text",
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nfse_status_sefaz_check" CHECK ((("status_sefaz")::"text" = ANY ((ARRAY['pendente'::character varying, 'autorizada'::character varying, 'rejeitada'::character varying, 'cancelada'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."nfse" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."nfse" IS 'Notas Fiscais de ServiÃ§os EletrÃ´nicas';



CREATE TABLE IF NOT EXISTS "financeiro"."plano_contas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "tipo_conta" character varying(20) NOT NULL,
    "nivel" integer DEFAULT 1 NOT NULL,
    "conta_pai_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "observacoes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plano_contas_tipo_conta_check" CHECK ((("tipo_conta")::"text" = ANY ((ARRAY['ativo'::character varying, 'passivo'::character varying, 'patrimonio'::character varying, 'receita'::character varying, 'despesa'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."plano_contas" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."plano_contas" IS 'Plano de contas contÃ¡bil';



CREATE TABLE IF NOT EXISTS "financeiro"."remessas_bancarias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "borderos_id" "uuid",
    "numero_remessa" character varying(50) NOT NULL,
    "data_remessa" "date" NOT NULL,
    "banco_codigo" character varying(10) NOT NULL,
    "agencia" character varying(10),
    "conta" character varying(20),
    "arquivo_cnab" "text",
    "status" character varying(20) DEFAULT 'enviada'::character varying,
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "remessas_bancarias_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['enviada'::character varying, 'processada'::character varying, 'retornada'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."remessas_bancarias" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."remessas_bancarias" IS 'Remessas bancÃ¡rias (CNAB)';



CREATE TABLE IF NOT EXISTS "financeiro"."retornos_bancarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "remessa_id" "uuid",
    "numero_retorno" character varying(50) NOT NULL,
    "data_retorno" "date" NOT NULL,
    "banco_codigo" character varying(10) NOT NULL,
    "arquivo_retorno" "text",
    "status" character varying(20) DEFAULT 'processado'::character varying,
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "retornos_bancarios_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['processado'::character varying, 'erro'::character varying, 'pendente'::character varying])::"text"[])))
);


ALTER TABLE "financeiro"."retornos_bancarios" OWNER TO "postgres";


COMMENT ON TABLE "financeiro"."retornos_bancarios" IS 'Retornos bancÃ¡rios (CNAB)';



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


CREATE TABLE IF NOT EXISTS "rh"."absence_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "maximo_dias" integer,
    "remunerado" boolean DEFAULT false,
    "desconta_salario" boolean DEFAULT false,
    "desconta_ferias" boolean DEFAULT false,
    "desconta_13_salario" boolean DEFAULT false,
    "requer_anexo" boolean DEFAULT false,
    "requer_aprovacao" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "absence_types_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ferias'::character varying, 'licenca_medica'::character varying, 'licenca_maternidade'::character varying, 'licenca_paternidade'::character varying, 'licenca_casamento'::character varying, 'licenca_luto'::character varying, 'afastamento_medico'::character varying, 'suspensao'::character varying, 'afastamento_sem_vencimento'::character varying])::"text"[]))),
    CONSTRAINT "check_absence_type_maximo_dias" CHECK ((("maximo_dias" IS NULL) OR ("maximo_dias" > 0)))
);


ALTER TABLE "rh"."absence_types" OWNER TO "postgres";


COMMENT ON TABLE "rh"."absence_types" IS 'Tabela de tipos de afastamento e licen??as';



COMMENT ON COLUMN "rh"."absence_types"."tipo" IS 'Tipo do afastamento: ferias, licenca_medica, licenca_maternidade, etc.';



COMMENT ON COLUMN "rh"."absence_types"."maximo_dias" IS 'N??mero m??ximo de dias permitidos para este tipo de afastamento';



COMMENT ON COLUMN "rh"."absence_types"."remunerado" IS 'Se o afastamento ?? remunerado';



COMMENT ON COLUMN "rh"."absence_types"."desconta_salario" IS 'Se desconta do sal??rio mensal';



COMMENT ON COLUMN "rh"."absence_types"."desconta_ferias" IS 'Se desconta do per??odo de f??rias';



COMMENT ON COLUMN "rh"."absence_types"."requer_aprovacao" IS 'Se requer aprova????o pr??via';



CREATE TABLE IF NOT EXISTS "rh"."allowance_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "codigo" character varying(50),
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "calculo_automatico" boolean DEFAULT false,
    "percentual_base" numeric(5,4),
    "valor_fixo" numeric(10,2),
    "incidencia_ferias" boolean DEFAULT true,
    "incidencia_13_salario" boolean DEFAULT true,
    "incidencia_aviso_previo" boolean DEFAULT true,
    "incidencia_fgts" boolean DEFAULT true,
    "incidencia_inss" boolean DEFAULT true,
    "incidencia_ir" boolean DEFAULT true,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "allowance_types_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['adicional'::character varying, 'bonus'::character varying, 'comissao'::character varying, 'gratificacao'::character varying, 'horas_extras'::character varying, 'adicional_noturno'::character varying, 'adicional_periculosidade'::character varying, 'adicional_insalubridade'::character varying])::"text"[]))),
    CONSTRAINT "check_allowance_type_valor_percentual" CHECK (((("percentual_base" IS NOT NULL) AND ("valor_fixo" IS NULL)) OR (("percentual_base" IS NULL) AND ("valor_fixo" IS NOT NULL)) OR (("percentual_base" IS NULL) AND ("valor_fixo" IS NULL))))
);


ALTER TABLE "rh"."allowance_types" OWNER TO "postgres";


COMMENT ON TABLE "rh"."allowance_types" IS 'Tabela de tipos de adicionais salariais';



COMMENT ON COLUMN "rh"."allowance_types"."tipo" IS 'Tipo do adicional: adicional, bonus, comissao, gratificacao, horas_extras, etc.';



COMMENT ON COLUMN "rh"."allowance_types"."percentual_base" IS 'Percentual sobre a base de c??lculo';



COMMENT ON COLUMN "rh"."allowance_types"."incidencia_ferias" IS 'Se o adicional incide no c??lculo de f??rias';



COMMENT ON COLUMN "rh"."allowance_types"."incidencia_13_salario" IS 'Se o adicional incide no 13?? sal??rio';



CREATE TABLE IF NOT EXISTS "rh"."approval_level_approvers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "approval_level_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."approval_level_approvers" OWNER TO "postgres";


COMMENT ON TABLE "rh"."approval_level_approvers" IS 'Aprovadores por nÃ­vel de aprovaÃ§Ã£o';



CREATE TABLE IF NOT EXISTS "rh"."approval_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "level_order" integer NOT NULL,
    "required_approvals" integer DEFAULT 1,
    "max_amount" numeric(10,2),
    "max_hours" numeric(5,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."approval_levels" OWNER TO "postgres";


COMMENT ON TABLE "rh"."approval_levels" IS 'NÃ­veis de aprovaÃ§Ã£o hierÃ¡rquica para compensaÃ§Ãµes';



CREATE TABLE IF NOT EXISTS "rh"."attendance_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_original" "date" NOT NULL,
    "entrada_original" time without time zone,
    "saida_original" time without time zone,
    "entrada_corrigida" time without time zone,
    "saida_corrigida" time without time zone,
    "justificativa" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "solicitado_por" "uuid",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attendance_corrections_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."attendance_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."audit_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "log_level" character varying(20) DEFAULT 'all'::character varying,
    "retention_days" integer DEFAULT 2555,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_config_log_level_check" CHECK ((("log_level")::"text" = ANY ((ARRAY['all'::character varying, 'changes'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "rh"."audit_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."audit_config" IS 'ConfiguraÃ§Ãµes de auditoria por empresa e entidade';



CREATE TABLE IF NOT EXISTS "rh"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "rh"."audit_logs" IS 'Log de auditoria para todas as aÃ§Ãµes do sistema';



CREATE TABLE IF NOT EXISTS "rh"."bank_hours_balance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "current_balance" numeric(6,2) DEFAULT 0.00,
    "accumulated_hours" numeric(6,2) DEFAULT 0.00,
    "compensated_hours" numeric(6,2) DEFAULT 0.00,
    "expired_hours" numeric(6,2) DEFAULT 0.00,
    "last_calculation_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "next_expiration_date" "date",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."bank_hours_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_calculations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "calculation_date" "date" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "employees_processed" integer DEFAULT 0,
    "hours_accumulated" numeric(8,2) DEFAULT 0.00,
    "hours_compensated" numeric(8,2) DEFAULT 0.00,
    "hours_expired" numeric(8,2) DEFAULT 0.00,
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "bank_hours_calculations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_calculations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "has_bank_hours" boolean DEFAULT false NOT NULL,
    "accumulation_period_months" integer DEFAULT 12 NOT NULL,
    "max_accumulation_hours" numeric(5,2) DEFAULT 40.00,
    "compensation_rate" numeric(4,2) DEFAULT 1.00,
    "auto_compensate" boolean DEFAULT false,
    "compensation_priority" character varying(20) DEFAULT 'fifo'::character varying,
    "expires_after_months" integer DEFAULT 12,
    "allow_negative_balance" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bank_hours_config_compensation_priority_check" CHECK ((("compensation_priority")::"text" = ANY ((ARRAY['fifo'::character varying, 'lifo'::character varying, 'manual'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "transaction_type" character varying(20) NOT NULL,
    "transaction_date" "date" NOT NULL,
    "hours_amount" numeric(5,2) NOT NULL,
    "time_record_id" "uuid",
    "reference_period_start" "date",
    "reference_period_end" "date",
    "description" "text",
    "compensation_rate" numeric(4,2) DEFAULT 1.00,
    "is_automatic" boolean DEFAULT false,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bank_hours_transactions_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY ((ARRAY['accumulation'::character varying, 'compensation'::character varying, 'expiration'::character varying, 'adjustment'::character varying, 'transfer'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."benefit_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "benefit_type" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "calculation_type" character varying(50) NOT NULL,
    "base_value" numeric(10,2),
    "percentage_value" numeric(5,2),
    "min_value" numeric(10,2),
    "max_value" numeric(10,2),
    "daily_calculation_base" integer DEFAULT 30,
    "requires_approval" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "benefit_configurations_benefit_type_check" CHECK ((("benefit_type")::"text" = ANY ((ARRAY['vr_va'::character varying, 'transporte'::character varying, 'equipment_rental'::character varying, 'premiacao'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "benefit_configurations_calculation_type_check" CHECK ((("calculation_type")::"text" = ANY ((ARRAY['fixed_value'::character varying, 'daily_value'::character varying, 'percentage'::character varying, 'work_days'::character varying])::"text"[])))
);


ALTER TABLE "rh"."benefit_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."calculation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "processo_id" "uuid" NOT NULL,
    "tipo_processo" character varying(50) NOT NULL,
    "descricao_processo" character varying(255),
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "status" character varying(20) DEFAULT 'iniciado'::character varying NOT NULL,
    "progresso" integer DEFAULT 0,
    "total_funcionarios" integer DEFAULT 0,
    "funcionarios_processados" integer DEFAULT 0,
    "eventos_calculados" integer DEFAULT 0,
    "erros_encontrados" integer DEFAULT 0,
    "inicio_processamento" timestamp with time zone,
    "fim_processamento" timestamp with time zone,
    "tempo_execucao_segundos" integer,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "logs_execucao" "jsonb",
    "erros_execucao" "jsonb",
    "resumo_calculos" "jsonb",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calculation_logs_ano_referencia_check" CHECK ((("ano_referencia" >= 2000) AND ("ano_referencia" <= 2100))),
    CONSTRAINT "calculation_logs_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "calculation_logs_progresso_check" CHECK ((("progresso" >= 0) AND ("progresso" <= 100))),
    CONSTRAINT "calculation_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['iniciado'::character varying, 'processando'::character varying, 'concluido'::character varying, 'erro'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."calculation_logs" OWNER TO "postgres";


COMMENT ON TABLE "rh"."calculation_logs" IS 'Logs de execuÃ§Ã£o do motor de cÃ¡lculo de folha';



COMMENT ON COLUMN "rh"."calculation_logs"."processo_id" IS 'ID Ãºnico do processo de cÃ¡lculo';



COMMENT ON COLUMN "rh"."calculation_logs"."tipo_processo" IS 'Tipo: folha_mensal, recalculo, ajuste, simulacao';



COMMENT ON COLUMN "rh"."calculation_logs"."status" IS 'Status: iniciado, processando, concluido, erro, cancelado';



COMMENT ON COLUMN "rh"."calculation_logs"."progresso" IS 'Progresso em percentual (0-100)';



COMMENT ON COLUMN "rh"."calculation_logs"."logs_execucao" IS 'Logs detalhados da execuÃ§Ã£o em JSON';



COMMENT ON COLUMN "rh"."calculation_logs"."erros_execucao" IS 'Erros encontrados durante a execuÃ§Ã£o';



COMMENT ON COLUMN "rh"."calculation_logs"."resumo_calculos" IS 'Resumo dos cÃ¡lculos realizados';



CREATE TABLE IF NOT EXISTS "rh"."candidate_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_path" character varying(500) NOT NULL,
    "file_size" integer,
    "mime_type" character varying(100),
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "candidate_documents_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['curriculo'::character varying, 'carteira_identidade'::character varying, 'cpf'::character varying, 'comprovante_residencia'::character varying, 'certificado'::character varying, 'outro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."candidate_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "cpf" character varying(14),
    "birth_date" "date",
    "address" "text",
    "city" character varying(100),
    "state" character varying(2),
    "zip_code" character varying(10),
    "linkedin_url" character varying(500),
    "portfolio_url" character varying(500),
    "source" character varying(20) DEFAULT 'site'::character varying,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "candidates_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['site'::character varying, 'linkedin'::character varying, 'indicacao'::character varying, 'agencia'::character varying, 'outro'::character varying])::"text"[]))),
    CONSTRAINT "candidates_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'contratado'::character varying, 'descartado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."cid_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(10) NOT NULL,
    "descricao" character varying(500) NOT NULL,
    "categoria" character varying(100),
    "subcategoria" character varying(100),
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_cid_code_format" CHECK ((("codigo")::"text" ~ '^[A-Z][0-9]{2}(\.[0-9])?$'::"text"))
);


ALTER TABLE "rh"."cid_codes" OWNER TO "postgres";


COMMENT ON TABLE "rh"."cid_codes" IS 'Tabela de c??digos CID (Classifica????o Internacional de Doen??as)';



COMMENT ON COLUMN "rh"."cid_codes"."codigo" IS 'C??digo CID (ex: F32.1, G43.9, etc.)';



COMMENT ON COLUMN "rh"."cid_codes"."descricao" IS 'Descri????o da doen??a/condi????o m??dica';



COMMENT ON COLUMN "rh"."cid_codes"."categoria" IS 'Categoria da doen??a (ex: Mental, Neurol??gica, etc.)';



COMMENT ON COLUMN "rh"."cid_codes"."subcategoria" IS 'Subcategoria da doen??a';



CREATE TABLE IF NOT EXISTS "rh"."collective_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "tipo_documento" character varying(50) NOT NULL,
    "numero_documento" character varying(100),
    "titulo" character varying(255) NOT NULL,
    "descricao" "text",
    "data_assinatura" "date" NOT NULL,
    "data_vigencia_inicio" "date" NOT NULL,
    "data_vigencia_fim" "date",
    "status" character varying(20) DEFAULT 'vigente'::character varying NOT NULL,
    "valor_beneficios" numeric(10,2),
    "percentual_reajuste" numeric(5,2),
    "clausulas" "text",
    "arquivo_url" character varying(500),
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collective_agreements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['vigente'::character varying, 'vencido'::character varying, 'suspenso'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "collective_agreements_tipo_documento_check" CHECK ((("tipo_documento")::"text" = ANY ((ARRAY['convencao_coletiva'::character varying, 'acordo_coletivo'::character varying, 'acordo_individual'::character varying, 'dissidio'::character varying, 'norma_regulamentar'::character varying])::"text"[])))
);


ALTER TABLE "rh"."collective_agreements" OWNER TO "postgres";


COMMENT ON TABLE "rh"."collective_agreements" IS 'Convenções coletivas e acordos sindicais';



COMMENT ON COLUMN "rh"."collective_agreements"."tipo_documento" IS 'Tipo: convencao_coletiva, acordo_coletivo, acordo_individual, dissidio, norma_regulamentar';



CREATE TABLE IF NOT EXISTS "rh"."compensation_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "compensation_request_id" "uuid" NOT NULL,
    "approval_level_id" "uuid" NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "status" character varying(20) NOT NULL,
    "comments" "text",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "compensation_approvals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "rh"."compensation_approvals" OWNER TO "postgres";


COMMENT ON TABLE "rh"."compensation_approvals" IS 'HistÃ³rico de aprovaÃ§Ãµes de compensaÃ§Ãµes';



CREATE TABLE IF NOT EXISTS "rh"."compensation_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "data_solicitacao" timestamp with time zone DEFAULT "now"(),
    "data_inicio" "date" NOT NULL,
    "quantidade_horas" numeric(5,2) NOT NULL,
    "descricao" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "data_fim" "date",
    "valor_hora" numeric(10,2),
    "valor_total" numeric(10,2),
    "motivo_rejeicao" "text",
    "anexos" "text"[],
    CONSTRAINT "compensation_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'realizado'::character varying])::"text"[]))),
    CONSTRAINT "compensation_requests_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['horas_extras'::character varying, 'banco_horas'::character varying, 'adicional_noturno'::character varying, 'adicional_periculosidade'::character varying, 'adicional_insalubridade'::character varying, 'dsr'::character varying, 'feriado'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."compensation_requests" OWNER TO "postgres";


COMMENT ON TABLE "rh"."compensation_requests" IS 'Tabela de solicitaÃ§Ãµes de compensaÃ§Ã£o de horas - ESTRUTURA PADRONIZADA';



COMMENT ON COLUMN "rh"."compensation_requests"."employee_id" IS 'ID do funcionÃ¡rio que solicitou a compensaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."tipo" IS 'Tipo de compensaÃ§Ã£o: horas_extras, banco_horas, adicional_noturno, etc.';



COMMENT ON COLUMN "rh"."compensation_requests"."data_inicio" IS 'Data de inÃ­cio da compensaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."quantidade_horas" IS 'Quantidade de horas solicitadas para compensaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."descricao" IS 'DescriÃ§Ã£o/justificativa da solicitaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."status" IS 'Status: pendente, aprovado, rejeitado, realizado';



COMMENT ON COLUMN "rh"."compensation_requests"."aprovado_por" IS 'UsuÃ¡rio que aprovou/rejeitou a solicitaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."data_fim" IS 'Data de fim da compensaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."valor_hora" IS 'Valor da hora (opcional)';



COMMENT ON COLUMN "rh"."compensation_requests"."valor_total" IS 'Valor total calculado (opcional)';



COMMENT ON COLUMN "rh"."compensation_requests"."motivo_rejeicao" IS 'Motivo da rejeiÃ§Ã£o (quando aplicÃ¡vel)';



COMMENT ON COLUMN "rh"."compensation_requests"."anexos" IS 'Array de URLs dos anexos';



CREATE TABLE IF NOT EXISTS "rh"."deficiency_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "grau" character varying(50),
    "beneficios_lei_8213" boolean DEFAULT false,
    "beneficios_lei_13146" boolean DEFAULT false,
    "isento_contribuicao_sindical" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deficiency_types_grau_check" CHECK ((("grau")::"text" = ANY ((ARRAY['leve'::character varying, 'moderada'::character varying, 'severa'::character varying, 'profunda'::character varying])::"text"[]))),
    CONSTRAINT "deficiency_types_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['fisica'::character varying, 'visual'::character varying, 'auditiva'::character varying, 'intelectual'::character varying, 'mental'::character varying, 'multipla'::character varying, 'outra'::character varying])::"text"[])))
);


ALTER TABLE "rh"."deficiency_types" OWNER TO "postgres";


COMMENT ON TABLE "rh"."deficiency_types" IS 'Tabela de tipos de defici??ncia para PCDs';



COMMENT ON COLUMN "rh"."deficiency_types"."tipo" IS 'Tipo da defici??ncia: fisica, visual, auditiva, intelectual, mental, multipla, outra';



COMMENT ON COLUMN "rh"."deficiency_types"."grau" IS 'Grau da defici??ncia: leve, moderada, severa, profunda';



COMMENT ON COLUMN "rh"."deficiency_types"."beneficios_lei_8213" IS 'Se tem benef??cios da Lei 8.213/91';



COMMENT ON COLUMN "rh"."deficiency_types"."beneficios_lei_13146" IS 'Se tem benef??cios da Lei 13.146/2015 (LBI)';



COMMENT ON COLUMN "rh"."deficiency_types"."isento_contribuicao_sindical" IS 'Se est?? isento de contribui????o sindical';



CREATE TABLE IF NOT EXISTS "rh"."delay_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "desconta_salario" boolean DEFAULT false,
    "desconta_horas" boolean DEFAULT false,
    "requer_justificativa" boolean DEFAULT false,
    "requer_anexo" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "delay_reasons_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['atraso'::character varying, 'falta'::character varying, 'saida_antecipada'::character varying, 'justificado'::character varying, 'injustificado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."delay_reasons" OWNER TO "postgres";


COMMENT ON TABLE "rh"."delay_reasons" IS 'Tabela de motivos de atraso e faltas';



COMMENT ON COLUMN "rh"."delay_reasons"."tipo" IS 'Tipo do motivo: atraso, falta, saida_antecipada, justificado, injustificado';



COMMENT ON COLUMN "rh"."delay_reasons"."desconta_salario" IS 'Se o motivo desconta do sal??rio';



COMMENT ON COLUMN "rh"."delay_reasons"."desconta_horas" IS 'Se o motivo desconta horas trabalhadas';



COMMENT ON COLUMN "rh"."delay_reasons"."requer_justificativa" IS 'Se requer justificativa do funcion??rio';



COMMENT ON COLUMN "rh"."delay_reasons"."requer_anexo" IS 'Se requer anexo/documento comprobat??rio';



CREATE TABLE IF NOT EXISTS "rh"."dependents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cpf" character varying(14),
    "rg" character varying(20),
    "data_nascimento" "date",
    "parentesco" character varying(50) NOT NULL,
    "sexo" character varying(10),
    "estado_civil" character varying(50),
    "nacionalidade" character varying(100),
    "naturalidade" character varying(100),
    "nome_mae" character varying(255),
    "nome_pai" character varying(255),
    "cpf_mae" character varying(14),
    "cpf_pai" character varying(14),
    "telefone" character varying(20),
    "email" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(10),
    "data_casamento" "date",
    "data_uniao_estavel" "date",
    "data_separacao" "date",
    "data_obito" "date",
    "data_nascimento_mae" "date",
    "escolaridade" character varying(50),
    "instituicao_ensino" character varying(255),
    "possui_deficiencia" boolean DEFAULT false,
    "tipo_deficiencia" character varying(100),
    "grau_deficiencia" character varying(50),
    "necessita_cuidados_especiais" boolean DEFAULT false,
    "certidao_nascimento" character varying(100),
    "certidao_casamento" character varying(100),
    "certidao_uniao_estavel" character varying(100),
    "comprovante_residencia" character varying(100),
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_inclusao" "date" DEFAULT CURRENT_DATE,
    "data_exclusao" "date",
    "motivo_exclusao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "dependents_parentesco_check" CHECK ((("parentesco")::"text" = ANY ((ARRAY['conjuge'::character varying, 'companheiro'::character varying, 'filho'::character varying, 'filha'::character varying, 'pai'::character varying, 'mae'::character varying, 'sogro'::character varying, 'sogra'::character varying, 'neto'::character varying, 'neta'::character varying, 'irmao'::character varying, 'irma'::character varying, 'tio'::character varying, 'tia'::character varying, 'sobrinho'::character varying, 'sobrinha'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "dependents_sexo_check" CHECK ((("sexo")::"text" = ANY ((ARRAY['masculino'::character varying, 'feminino'::character varying, 'outro'::character varying])::"text"[]))),
    CONSTRAINT "dependents_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'suspenso'::character varying, 'excluido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."dependents" OWNER TO "postgres";


COMMENT ON TABLE "rh"."dependents" IS 'Tabela para cadastro de dependentes dos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."dependents"."parentesco" IS 'Tipo de parentesco com o funcionÃ¡rio';



COMMENT ON COLUMN "rh"."dependents"."data_casamento" IS 'Data do casamento (para cÃ´njuge)';



COMMENT ON COLUMN "rh"."dependents"."data_uniao_estavel" IS 'Data da uniÃ£o estÃ¡vel (para companheiro)';



COMMENT ON COLUMN "rh"."dependents"."data_separacao" IS 'Data da separaÃ§Ã£o (para ex-cÃ´njuge)';



COMMENT ON COLUMN "rh"."dependents"."data_obito" IS 'Data do Ã³bito (para falecidos)';



COMMENT ON COLUMN "rh"."dependents"."escolaridade" IS 'NÃ­vel de escolaridade do dependente';



COMMENT ON COLUMN "rh"."dependents"."instituicao_ensino" IS 'InstituiÃ§Ã£o de ensino onde estuda';



COMMENT ON COLUMN "rh"."dependents"."possui_deficiencia" IS 'Indica se o dependente possui deficiÃªncia';



COMMENT ON COLUMN "rh"."dependents"."tipo_deficiencia" IS 'Tipo de deficiÃªncia (fÃ­sica, visual, auditiva, etc.)';



COMMENT ON COLUMN "rh"."dependents"."grau_deficiencia" IS 'Grau da deficiÃªncia (leve, moderada, severa, profunda)';



COMMENT ON COLUMN "rh"."dependents"."necessita_cuidados_especiais" IS 'Indica se necessita de cuidados especiais';



COMMENT ON COLUMN "rh"."dependents"."certidao_nascimento" IS 'NÃºmero da certidÃ£o de nascimento';



COMMENT ON COLUMN "rh"."dependents"."certidao_casamento" IS 'NÃºmero da certidÃ£o de casamento';



COMMENT ON COLUMN "rh"."dependents"."certidao_uniao_estavel" IS 'NÃºmero da certidÃ£o de uniÃ£o estÃ¡vel';



COMMENT ON COLUMN "rh"."dependents"."comprovante_residencia" IS 'NÃºmero do comprovante de residÃªncia';



COMMENT ON COLUMN "rh"."dependents"."data_inclusao" IS 'Data de inclusÃ£o como dependente';



COMMENT ON COLUMN "rh"."dependents"."data_exclusao" IS 'Data de exclusÃ£o como dependente';



COMMENT ON COLUMN "rh"."dependents"."motivo_exclusao" IS 'Motivo da exclusÃ£o como dependente';



CREATE TABLE IF NOT EXISTS "rh"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "matricula" character varying(50),
    "cpf" character varying(14) NOT NULL,
    "rg" character varying(20),
    "data_nascimento" "date",
    "data_admissao" "date" NOT NULL,
    "data_demissao" "date",
    "cargo_id" "uuid",
    "departamento_id" "uuid",
    "salario_base" numeric(10,2),
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "telefone" character varying(20),
    "email" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "gestor_imediato_id" "uuid",
    CONSTRAINT "employees_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'afastado'::character varying, 'demitido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employees" OWNER TO "postgres";


CREATE OR REPLACE VIEW "rh"."dependents_with_employee" AS
 SELECT "d"."id",
    "d"."company_id",
    "d"."employee_id",
    "d"."nome",
    "d"."cpf",
    "d"."rg",
    "d"."data_nascimento",
    "d"."parentesco",
    "d"."sexo",
    "d"."estado_civil",
    "d"."nacionalidade",
    "d"."naturalidade",
    "d"."nome_mae",
    "d"."nome_pai",
    "d"."cpf_mae",
    "d"."cpf_pai",
    "d"."telefone",
    "d"."email",
    "d"."endereco",
    "d"."cidade",
    "d"."estado",
    "d"."cep",
    "d"."data_casamento",
    "d"."data_uniao_estavel",
    "d"."data_separacao",
    "d"."data_obito",
    "d"."data_nascimento_mae",
    "d"."escolaridade",
    "d"."instituicao_ensino",
    "d"."possui_deficiencia",
    "d"."tipo_deficiencia",
    "d"."grau_deficiencia",
    "d"."necessita_cuidados_especiais",
    "d"."certidao_nascimento",
    "d"."certidao_casamento",
    "d"."certidao_uniao_estavel",
    "d"."comprovante_residencia",
    "d"."status",
    "d"."data_inclusao",
    "d"."data_exclusao",
    "d"."motivo_exclusao",
    "d"."observacoes",
    "d"."created_at",
    "d"."updated_at",
    "d"."created_by",
    "d"."updated_by",
    "e"."nome" AS "funcionario_nome",
    "e"."matricula" AS "funcionario_matricula",
    "e"."cpf" AS "funcionario_cpf"
   FROM ("rh"."dependents" "d"
     JOIN "rh"."employees" "e" ON (("d"."employee_id" = "e"."id")))
  WHERE (("d"."status")::"text" = 'ativo'::"text");


ALTER VIEW "rh"."dependents_with_employee" OWNER TO "postgres";


COMMENT ON VIEW "rh"."dependents_with_employee" IS 'View para consultar dependentes ativos com informaÃ§Ãµes do funcionÃ¡rio';



CREATE TABLE IF NOT EXISTS "rh"."disciplinary_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo_acao" character varying(30) NOT NULL,
    "data_ocorrencia" "date" NOT NULL,
    "data_aplicacao" "date" NOT NULL,
    "gravidade" character varying(20) NOT NULL,
    "motivo" "text" NOT NULL,
    "descricao_ocorrencia" "text" NOT NULL,
    "medidas_corretivas" "text",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "aplicado_por" "uuid",
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "anexos" "text"[],
    "data_arquivamento" timestamp with time zone,
    "motivo_arquivamento" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "duration_days" integer,
    "start_date" "date",
    "end_date" "date",
    "documents" "jsonb",
    "is_active" boolean DEFAULT true,
    CONSTRAINT "disciplinary_actions_gravidade_check" CHECK ((("gravidade")::"text" = ANY ((ARRAY['leve'::character varying, 'moderada'::character varying, 'grave'::character varying, 'gravissima'::character varying])::"text"[]))),
    CONSTRAINT "disciplinary_actions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "disciplinary_actions_tipo_acao_check" CHECK ((("tipo_acao")::"text" = ANY ((ARRAY['advertencia_verbal'::character varying, 'advertencia_escrita'::character varying, 'suspensao'::character varying, 'demissao_justa_causa'::character varying])::"text"[])))
);


ALTER TABLE "rh"."disciplinary_actions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."disciplinary_actions" IS 'Ações disciplinares aplicadas aos funcionários - Estrutura atualizada conforme documentação';



COMMENT ON COLUMN "rh"."disciplinary_actions"."tipo_acao" IS 'Tipo: advertencia, suspensao, demissao_justa_causa, transferencia, outros';



COMMENT ON COLUMN "rh"."disciplinary_actions"."gravidade" IS 'Gravidade: leve, moderada, grave, gravissima';



COMMENT ON COLUMN "rh"."disciplinary_actions"."status" IS 'Status: ativo, suspenso, cancelado, arquivado';



COMMENT ON COLUMN "rh"."disciplinary_actions"."aplicado_por" IS 'UsuÃ¡rio que aplicou a aÃ§Ã£o disciplinar';



COMMENT ON COLUMN "rh"."disciplinary_actions"."aprovado_por" IS 'UsuÃ¡rio que aprovou a aÃ§Ã£o disciplinar';



COMMENT ON COLUMN "rh"."disciplinary_actions"."anexos" IS 'Array de URLs dos arquivos anexados (evidÃªncias, testemunhos, etc.)';



COMMENT ON COLUMN "rh"."disciplinary_actions"."duration_days" IS 'Duração em dias para suspensões';



COMMENT ON COLUMN "rh"."disciplinary_actions"."start_date" IS 'Data de início da suspensão';



COMMENT ON COLUMN "rh"."disciplinary_actions"."end_date" IS 'Data de fim da suspensão';



COMMENT ON COLUMN "rh"."disciplinary_actions"."documents" IS 'Documentos anexados (evidências, testemunhos, etc.)';



COMMENT ON COLUMN "rh"."disciplinary_actions"."is_active" IS 'Indica se a ação está ativa';



CREATE TABLE IF NOT EXISTS "rh"."employee_benefit_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "benefit_config_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "custom_value" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."employee_benefit_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."employee_medical_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "valor_mensal" numeric(10,2) NOT NULL,
    "desconto_aplicado" numeric(5,2) DEFAULT 0,
    "motivo_suspensao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_medical_plans_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'cancelado'::character varying, 'transferido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_medical_plans" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_medical_plans" IS 'Adesões dos funcionários aos planos médicos/odontológicos';



COMMENT ON COLUMN "rh"."employee_medical_plans"."status" IS 'Status: ativo, suspenso, cancelado, transferido';



CREATE TABLE IF NOT EXISTS "rh"."employee_plan_dependents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_plan_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cpf" character varying(11),
    "data_nascimento" "date",
    "parentesco" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "valor_mensal" numeric(10,2) NOT NULL,
    "data_inclusao" "date" NOT NULL,
    "data_exclusao" "date",
    "motivo_exclusao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_plan_dependents_parentesco_check" CHECK ((("parentesco")::"text" = ANY ((ARRAY['conjuge'::character varying, 'filho'::character varying, 'filha'::character varying, 'pai'::character varying, 'mae'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "employee_plan_dependents_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_plan_dependents" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_plan_dependents" IS 'Dependentes dos funcionários nos planos médicos/odontológicos';



COMMENT ON COLUMN "rh"."employee_plan_dependents"."parentesco" IS 'Parentesco: conjuge, filho, filha, pai, mae, outros';



COMMENT ON COLUMN "rh"."employee_plan_dependents"."status" IS 'Status: ativo, suspenso, cancelado';



CREATE TABLE IF NOT EXISTS "rh"."employee_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."employee_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."employee_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "funcionario_id" "uuid" NOT NULL,
    "turno_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "ativo" boolean DEFAULT true,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_employee_shifts_data_fim" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio")))
);


ALTER TABLE "rh"."employee_shifts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_shifts" IS 'Tabela de turnos atribuÃ­dos aos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."employee_shifts"."data_inicio" IS 'Data de inÃ­cio do turno para o funcionÃ¡rio';



COMMENT ON COLUMN "rh"."employee_shifts"."data_fim" IS 'Data de fim do turno (NULL se ainda ativo)';



COMMENT ON COLUMN "rh"."employee_shifts"."ativo" IS 'Se o turno estÃ¡ ativo para o funcionÃ¡rio';



CREATE TABLE IF NOT EXISTS "rh"."employee_union_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "data_filiacao" "date" NOT NULL,
    "data_desfiliacao" "date",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "numero_carteira" character varying(50),
    "categoria_filiacao" character varying(100),
    "valor_mensalidade" numeric(10,2),
    "desconto_folha" boolean DEFAULT false,
    "motivo_desfiliacao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_union_memberships_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'desfiliado'::character varying, 'transferido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_union_memberships" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_union_memberships" IS 'Filiações dos funcionários aos sindicatos';



COMMENT ON COLUMN "rh"."employee_union_memberships"."status" IS 'Status: ativo, suspenso, desfiliado, transferido';



CREATE TABLE IF NOT EXISTS "rh"."employment_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "numero_contrato" character varying(100) NOT NULL,
    "tipo_contrato" character varying(50) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "periodo_experiencia" integer DEFAULT 90,
    "salario_base" numeric(10,2) NOT NULL,
    "carga_horaria_semanal" integer DEFAULT 40,
    "regime_trabalho" character varying(50) DEFAULT 'tempo_integral'::character varying,
    "tipo_jornada" character varying(50) DEFAULT 'normal'::character varying,
    "beneficios" "jsonb" DEFAULT '{}'::"jsonb",
    "clausulas_especiais" "text",
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_rescisao" "date",
    "motivo_rescisao" character varying(255),
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_employment_contracts_carga_horaria" CHECK ((("carga_horaria_semanal" > 0) AND ("carga_horaria_semanal" <= 168))),
    CONSTRAINT "check_employment_contracts_data_fim" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio"))),
    CONSTRAINT "check_employment_contracts_salario" CHECK (("salario_base" > (0)::numeric)),
    CONSTRAINT "employment_contracts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'encerrado'::character varying, 'rescisao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employment_contracts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employment_contracts" IS 'Tabela de contratos de trabalho';



COMMENT ON COLUMN "rh"."employment_contracts"."tipo_contrato" IS 'Tipo do contrato: CLT, PJ, Estagi??rio, Terceirizado, etc.';



COMMENT ON COLUMN "rh"."employment_contracts"."regime_trabalho" IS 'Regime de trabalho: tempo_integral, meio_periodo, etc.';



COMMENT ON COLUMN "rh"."employment_contracts"."beneficios" IS 'JSON com benef??cios do contrato';



CREATE TABLE IF NOT EXISTS "rh"."equipment_rental_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_equipamento" character varying(100) NOT NULL,
    "valor_mensal" numeric(10,2) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "justificativa" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "equipment_rental_approvals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'ativo'::character varying, 'finalizado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."equipment_rental_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."esocial_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "batch_number" character varying(50) NOT NULL,
    "period" character varying(7) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "total_events" integer DEFAULT 0 NOT NULL,
    "sent_events" integer DEFAULT 0 NOT NULL,
    "accepted_events" integer DEFAULT 0 NOT NULL,
    "rejected_events" integer DEFAULT 0 NOT NULL,
    "error_events" integer DEFAULT 0 NOT NULL,
    "xml_content" "text",
    "xml_response" "text",
    "protocol_number" character varying(100),
    "sent_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "esocial_batches_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sending'::character varying, 'sent'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."esocial_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "ambiente" character varying(10) DEFAULT 'homologacao'::character varying NOT NULL,
    "tp_amb" character varying(1) DEFAULT '2'::character varying NOT NULL,
    "cnpj_empregador" character varying(14) NOT NULL,
    "cpf_empregador" character varying(11),
    "razao_social" character varying(255) NOT NULL,
    "codigo_empregador" character varying(20),
    "codigo_esocial" character varying(20),
    "versao_lote" character varying(10) DEFAULT '2.5.00'::character varying,
    "versao_evento" character varying(10) DEFAULT '2.5.00'::character varying,
    "url_consulta" character varying(255),
    "url_envio" character varying(255),
    "certificado_digital" "text",
    "senha_certificado" character varying(255),
    "proxy_host" character varying(255),
    "proxy_port" integer,
    "proxy_user" character varying(255),
    "proxy_pass" character varying(255),
    "timeout" integer DEFAULT 300,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "esocial_config_ambiente_check" CHECK ((("ambiente")::"text" = ANY ((ARRAY['homologacao'::character varying, 'producao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_config" IS 'ConfiguraÃ§Ãµes de integraÃ§Ã£o com eSocial';



COMMENT ON COLUMN "rh"."esocial_config"."ambiente" IS 'Ambiente: homologacao ou producao';



COMMENT ON COLUMN "rh"."esocial_config"."tp_amb" IS 'Tipo ambiente: 1=ProduÃ§Ã£o, 2=HomologaÃ§Ã£o';



COMMENT ON COLUMN "rh"."esocial_config"."versao_lote" IS 'VersÃ£o do lote eSocial';



COMMENT ON COLUMN "rh"."esocial_config"."versao_evento" IS 'VersÃ£o do evento eSocial';



COMMENT ON COLUMN "rh"."esocial_config"."certificado_digital" IS 'Certificado digital em Base64';



CREATE TABLE IF NOT EXISTS "rh"."esocial_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid",
    "tipo_evento" character varying(50) NOT NULL,
    "numero_recibo" character varying(50),
    "data_envio" timestamp with time zone,
    "data_recebimento" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "xml_content" "text",
    "xml_response" "text",
    "observacoes" "text",
    "tentativas_envio" integer DEFAULT 0,
    "ultimo_erro" "text",
    "data_proximo_envio" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "batch_id" "uuid",
    CONSTRAINT "esocial_events_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'enviado'::character varying, 'processado'::character varying, 'rejeitado'::character varying, 'erro'::character varying])::"text"[]))),
    CONSTRAINT "esocial_events_tipo_evento_check" CHECK ((("tipo_evento")::"text" = ANY ((ARRAY['S1000'::character varying, 'S1005'::character varying, 'S1010'::character varying, 'S1020'::character varying, 'S1030'::character varying, 'S1035'::character varying, 'S1040'::character varying, 'S1050'::character varying, 'S1060'::character varying, 'S1070'::character varying, 'S1080'::character varying, 'S1200'::character varying, 'S1202'::character varying, 'S1207'::character varying, 'S1210'::character varying, 'S1220'::character varying, 'S1250'::character varying, 'S1260'::character varying, 'S1270'::character varying, 'S1280'::character varying, 'S1295'::character varying, 'S1298'::character varying, 'S1299'::character varying, 'S1300'::character varying, 'S2190'::character varying, 'S2200'::character varying, 'S2205'::character varying, 'S2206'::character varying, 'S2210'::character varying, 'S2220'::character varying, 'S2221'::character varying, 'S2230'::character varying, 'S2231'::character varying, 'S2240'::character varying, 'S2241'::character varying, 'S2245'::character varying, 'S2250'::character varying, 'S2260'::character varying, 'S2298'::character varying, 'S2299'::character varying, 'S2300'::character varying, 'S2306'::character varying, 'S2399'::character varying, 'S2400'::character varying, 'S2405'::character varying, 'S2410'::character varying, 'S2416'::character varying, 'S2418'::character varying, 'S2420'::character varying, 'S3000'::character varying, 'S5001'::character varying, 'S5002'::character varying, 'S5003'::character varying, 'S5011'::character varying, 'S5012'::character varying, 'S5013'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_events" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_events" IS 'Eventos eSocial a serem enviados para o governo';



COMMENT ON COLUMN "rh"."esocial_events"."tipo_evento" IS 'Tipo do evento eSocial (S1000, S2200, S1200, etc.)';



COMMENT ON COLUMN "rh"."esocial_events"."numero_recibo" IS 'NÃºmero do recibo de entrega do eSocial';



COMMENT ON COLUMN "rh"."esocial_events"."status" IS 'Status: pendente, enviado, processado, rejeitado, erro';



COMMENT ON COLUMN "rh"."esocial_events"."xml_content" IS 'ConteÃºdo XML do evento';



COMMENT ON COLUMN "rh"."esocial_events"."xml_response" IS 'Resposta XML do governo';



CREATE TABLE IF NOT EXISTS "rh"."esocial_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_evento" character varying(50) NOT NULL,
    "codigo_evento" character varying(20) NOT NULL,
    "descricao" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "data_envio" timestamp with time zone,
    "data_processamento" timestamp with time zone,
    "protocolo" character varying(100),
    "funcionario_id" "uuid",
    "observacoes" "text",
    "arquivo_retorno" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "esocial_integrations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'enviado'::character varying, 'processado'::character varying, 'erro'::character varying, 'rejeitado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_integrations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_integrations" IS 'Tabela de integraÃ§Ã£o com eSocial';



COMMENT ON COLUMN "rh"."esocial_integrations"."tipo_evento" IS 'Tipo do evento eSocial (ex: S-1000, S-1010)';



COMMENT ON COLUMN "rh"."esocial_integrations"."codigo_evento" IS 'CÃ³digo especÃ­fico do evento';



COMMENT ON COLUMN "rh"."esocial_integrations"."status" IS 'Status da integraÃ§Ã£o: pendente, enviado, processado, erro, rejeitado';



COMMENT ON COLUMN "rh"."esocial_integrations"."protocolo" IS 'Protocolo de envio para eSocial';



COMMENT ON COLUMN "rh"."esocial_integrations"."arquivo_retorno" IS 'URL do arquivo de retorno do eSocial';



CREATE TABLE IF NOT EXISTS "rh"."esocial_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "tipo_operacao" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "mensagem" "text",
    "detalhes" "jsonb",
    "tempo_execucao" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "esocial_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['sucesso'::character varying, 'erro'::character varying, 'aviso'::character varying])::"text"[]))),
    CONSTRAINT "esocial_logs_tipo_operacao_check" CHECK ((("tipo_operacao")::"text" = ANY ((ARRAY['envio'::character varying, 'consulta'::character varying, 'download'::character varying, 'erro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_logs" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_logs" IS 'Logs de operaÃ§Ãµes eSocial';



CREATE TABLE IF NOT EXISTS "rh"."event_consolidations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "periodo" character varying(7) NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "total_eventos" integer DEFAULT 0,
    "eventos_processados" integer DEFAULT 0,
    "data_inicio" timestamp with time zone,
    "data_fim" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_consolidations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'processando'::character varying, 'concluido'::character varying, 'erro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."event_consolidations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."event_consolidations" IS 'Tabela de consolidaÃ§Ã£o de eventos da folha de pagamento';



COMMENT ON COLUMN "rh"."event_consolidations"."periodo" IS 'PerÃ­odo da consolidaÃ§Ã£o no formato YYYY/MM';



COMMENT ON COLUMN "rh"."event_consolidations"."status" IS 'Status da consolidaÃ§Ã£o: pendente, processando, concluido, erro';



COMMENT ON COLUMN "rh"."event_consolidations"."total_eventos" IS 'Total de eventos a serem processados';



COMMENT ON COLUMN "rh"."event_consolidations"."eventos_processados" IS 'Quantidade de eventos jÃ¡ processados';



CREATE TABLE IF NOT EXISTS "rh"."fgts_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "aliquota_fgts" numeric(5,4) NOT NULL,
    "aliquota_multa" numeric(5,4) DEFAULT 0,
    "aliquota_juros" numeric(5,4) DEFAULT 0,
    "teto_salario" numeric(12,2),
    "valor_minimo_contribuicao" numeric(10,2) DEFAULT 0,
    "multa_rescisao" numeric(5,4) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_fgts_config_aliquota_fgts" CHECK ((("aliquota_fgts" >= (0)::numeric) AND ("aliquota_fgts" <= (1)::numeric))),
    CONSTRAINT "check_fgts_config_aliquota_juros" CHECK ((("aliquota_juros" >= (0)::numeric) AND ("aliquota_juros" <= (1)::numeric))),
    CONSTRAINT "check_fgts_config_aliquota_multa" CHECK ((("aliquota_multa" >= (0)::numeric) AND ("aliquota_multa" <= (1)::numeric))),
    CONSTRAINT "check_fgts_config_ano" CHECK ((("ano_vigencia" >= 2020) AND ("ano_vigencia" <= 2030))),
    CONSTRAINT "check_fgts_config_mes" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "check_fgts_config_multa_rescisao" CHECK ((("multa_rescisao" >= (0)::numeric) AND ("multa_rescisao" <= (1)::numeric)))
);


ALTER TABLE "rh"."fgts_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."fgts_config" IS 'Tabela de configura????es do FGTS para c??lculo de fundo de garantia';



COMMENT ON COLUMN "rh"."fgts_config"."ano_vigencia" IS 'Ano de vig??ncia da configura????o FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."mes_vigencia" IS 'M??s de vig??ncia da configura????o FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."aliquota_fgts" IS 'Al??quota do FGTS (0.08 = 8%)';



COMMENT ON COLUMN "rh"."fgts_config"."aliquota_multa" IS 'Al??quota de multa sobre FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."aliquota_juros" IS 'Al??quota de juros sobre FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."teto_salario" IS 'Teto salarial para incid??ncia do FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."multa_rescisao" IS 'Multa de rescis??o (0.4 = 40%)';



CREATE TABLE IF NOT EXISTS "rh"."gestor_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "gestor_id" "uuid" NOT NULL,
    "tipo_notificacao" character varying(50) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "mensagem" "text" NOT NULL,
    "dados_extras" "jsonb",
    "lida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gestor_notifications_tipo_notificacao_check" CHECK ((("tipo_notificacao")::"text" = ANY ((ARRAY['aprovacao_pendente'::character varying, 'aprovacao_realizada'::character varying, 'solicitacao_nova'::character varying, 'alerta_vencimento'::character varying])::"text"[])))
);


ALTER TABLE "rh"."gestor_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "data" "date" NOT NULL,
    "tipo" character varying(30) NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "holidays_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['nacional'::character varying, 'estadual'::character varying, 'municipal'::character varying, 'pontos_facultativos'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."holidays" OWNER TO "postgres";


COMMENT ON TABLE "rh"."holidays" IS 'Feriados e pontos facultativos para cÃ¡lculos de folha';



COMMENT ON COLUMN "rh"."holidays"."nome" IS 'Nome do feriado';



COMMENT ON COLUMN "rh"."holidays"."data" IS 'Data do feriado';



COMMENT ON COLUMN "rh"."holidays"."tipo" IS 'Tipo: nacional, estadual, municipal, pontos_facultativos, outros';



COMMENT ON COLUMN "rh"."holidays"."ativo" IS 'Se o feriado estÃ¡ ativo para cÃ¡lculos';



CREATE TABLE IF NOT EXISTS "rh"."inss_brackets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "valor_minimo" numeric(12,2) NOT NULL,
    "valor_maximo" numeric(12,2),
    "aliquota" numeric(5,4) NOT NULL,
    "valor_deducao" numeric(12,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_inss_bracket_aliquota" CHECK ((("aliquota" >= (0)::numeric) AND ("aliquota" <= (1)::numeric))),
    CONSTRAINT "check_inss_bracket_ano" CHECK ((("ano_vigencia" >= 2020) AND ("ano_vigencia" <= 2030))),
    CONSTRAINT "check_inss_bracket_mes" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "check_inss_bracket_valores" CHECK ((("valor_maximo" IS NULL) OR ("valor_minimo" <= "valor_maximo")))
);


ALTER TABLE "rh"."inss_brackets" OWNER TO "postgres";


COMMENT ON TABLE "rh"."inss_brackets" IS 'Tabela de faixas do INSS para c??lculo de contribui????o previdenci??ria';



COMMENT ON COLUMN "rh"."inss_brackets"."ano_vigencia" IS 'Ano de vig??ncia da faixa INSS';



COMMENT ON COLUMN "rh"."inss_brackets"."mes_vigencia" IS 'M??s de vig??ncia da faixa INSS';



COMMENT ON COLUMN "rh"."inss_brackets"."valor_minimo" IS 'Valor m??nimo da faixa salarial';



COMMENT ON COLUMN "rh"."inss_brackets"."valor_maximo" IS 'Valor m??ximo da faixa salarial (NULL = sem limite)';



COMMENT ON COLUMN "rh"."inss_brackets"."aliquota" IS 'Al??quota do INSS (0.075 = 7,5%)';



COMMENT ON COLUMN "rh"."inss_brackets"."valor_deducao" IS 'Valor a ser deduzido do c??lculo';



CREATE TABLE IF NOT EXISTS "rh"."irrf_brackets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "valor_minimo" numeric(12,2) NOT NULL,
    "valor_maximo" numeric(12,2),
    "aliquota" numeric(5,4) NOT NULL,
    "valor_deducao" numeric(12,2) DEFAULT 0,
    "numero_dependentes" integer DEFAULT 0,
    "valor_por_dependente" numeric(10,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_irrf_bracket_aliquota" CHECK ((("aliquota" >= (0)::numeric) AND ("aliquota" <= (1)::numeric))),
    CONSTRAINT "check_irrf_bracket_ano" CHECK ((("ano_vigencia" >= 2020) AND ("ano_vigencia" <= 2030))),
    CONSTRAINT "check_irrf_bracket_dependentes" CHECK (("numero_dependentes" >= 0)),
    CONSTRAINT "check_irrf_bracket_mes" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "check_irrf_bracket_valor_dependente" CHECK (("valor_por_dependente" >= (0)::numeric)),
    CONSTRAINT "check_irrf_bracket_valores" CHECK ((("valor_maximo" IS NULL) OR ("valor_minimo" <= "valor_maximo")))
);


ALTER TABLE "rh"."irrf_brackets" OWNER TO "postgres";


COMMENT ON TABLE "rh"."irrf_brackets" IS 'Tabela de faixas do IRRF para c??lculo de imposto de renda';



COMMENT ON COLUMN "rh"."irrf_brackets"."ano_vigencia" IS 'Ano de vig??ncia da faixa IRRF';



COMMENT ON COLUMN "rh"."irrf_brackets"."mes_vigencia" IS 'M??s de vig??ncia da faixa IRRF';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_minimo" IS 'Valor m??nimo da faixa salarial';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_maximo" IS 'Valor m??ximo da faixa salarial (NULL = sem limite)';



COMMENT ON COLUMN "rh"."irrf_brackets"."aliquota" IS 'Al??quota do IRRF (0.075 = 7,5%)';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_deducao" IS 'Valor a ser deduzido do c??lculo';



COMMENT ON COLUMN "rh"."irrf_brackets"."numero_dependentes" IS 'N??mero de dependentes considerados na faixa';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_por_dependente" IS 'Valor de dedu????o por dependente';



CREATE TABLE IF NOT EXISTS "rh"."job_openings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "job_request_id" "uuid",
    "position_name" character varying(255) NOT NULL,
    "department_name" character varying(255),
    "job_description" "text" NOT NULL,
    "requirements" "text",
    "benefits" "text",
    "salary_range" character varying(100),
    "status" character varying(20) DEFAULT 'aberta'::character varying,
    "created_by" "uuid" NOT NULL,
    "published_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_openings_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['aberta'::character varying, 'pausada'::character varying, 'fechada'::character varying, 'preenchida'::character varying])::"text"[])))
);


ALTER TABLE "rh"."job_openings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."job_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "position_name" character varying(255) NOT NULL,
    "department_name" character varying(255),
    "job_description" "text" NOT NULL,
    "requirements" "text",
    "benefits" "text",
    "salary_range" character varying(100),
    "urgency_level" character varying(20) DEFAULT 'media'::character varying,
    "status" character varying(20) DEFAULT 'solicitado'::character varying,
    "requested_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "expected_start_date" "date",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['solicitado'::character varying, 'em_analise'::character varying, 'aprovado'::character varying, 'reprovado'::character varying])::"text"[]))),
    CONSTRAINT "job_requests_urgency_level_check" CHECK ((("urgency_level")::"text" = ANY ((ARRAY['baixa'::character varying, 'media'::character varying, 'alta'::character varying, 'critica'::character varying])::"text"[])))
);


ALTER TABLE "rh"."job_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."medical_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "cnpj" character varying(14),
    "razao_social" character varying(255),
    "telefone" character varying(20),
    "email" character varying(255),
    "site" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(8),
    "contato_responsavel" character varying(255),
    "telefone_contato" character varying(20),
    "email_contato" character varying(255),
    "observacoes" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_agreements_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['medico'::character varying, 'odontologico'::character varying, 'ambos'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_agreements" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_agreements" IS 'Convênios médicos e odontológicos disponíveis para os funcionários';



COMMENT ON COLUMN "rh"."medical_agreements"."tipo" IS 'Tipo: medico, odontologico, ambos';



CREATE TABLE IF NOT EXISTS "rh"."medical_certificate_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "certificate_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" character varying(50),
    "file_size" integer,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."medical_certificate_attachments" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_certificate_attachments" IS 'Anexos dos atestados mÃ©dicos';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."certificate_id" IS 'ID do atestado mÃ©dico';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_name" IS 'Nome do arquivo anexado';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_url" IS 'URL do arquivo no storage';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_type" IS 'Tipo do arquivo (PDF, JPG, etc.)';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_size" IS 'Tamanho do arquivo em bytes';



CREATE TABLE IF NOT EXISTS "rh"."medical_certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "numero_atestado" character varying(100),
    "data_emissao" "date" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "dias_afastamento" integer NOT NULL,
    "cid_codigo" character varying(10),
    "cid_descricao" "text",
    "observacoes" "text",
    "anexo_url" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "medico_nome" character varying(255),
    "crm_crmo" character varying(50),
    "especialidade" character varying(255),
    "tipo_atestado" character varying(50) DEFAULT 'medico'::character varying,
    "valor_beneficio" numeric(10,2) DEFAULT 0,
    "data_aprovacao" timestamp with time zone,
    CONSTRAINT "medical_certificates_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying])::"text"[]))),
    CONSTRAINT "medical_certificates_tipo_atestado_check" CHECK ((("tipo_atestado")::"text" = ANY ((ARRAY['medico'::character varying, 'odontologico'::character varying, 'psicologico'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_certificates" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_certificates" IS 'Tabela de atestados mÃ©dicos dos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."medical_certificates"."medico_nome" IS 'Nome do mÃ©dico que emitiu o atestado';



COMMENT ON COLUMN "rh"."medical_certificates"."crm_crmo" IS 'CRM/CRMO do mÃ©dico';



COMMENT ON COLUMN "rh"."medical_certificates"."especialidade" IS 'Especialidade mÃ©dica';



COMMENT ON COLUMN "rh"."medical_certificates"."tipo_atestado" IS 'Tipo do atestado: medico, odontologico, psicologico';



COMMENT ON COLUMN "rh"."medical_certificates"."valor_beneficio" IS 'Valor do benefÃ­cio a ser pago';



COMMENT ON COLUMN "rh"."medical_certificates"."data_aprovacao" IS 'Data de aprovaÃ§Ã£o do atestado';



CREATE TABLE IF NOT EXISTS "rh"."medical_plan_pricing_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "data_vigencia" "date" NOT NULL,
    "valor_titular_anterior" numeric(10,2),
    "valor_titular_novo" numeric(10,2) NOT NULL,
    "valor_dependente_anterior" numeric(10,2),
    "valor_dependente_novo" numeric(10,2) NOT NULL,
    "valor_familia_anterior" numeric(10,2),
    "valor_familia_novo" numeric(10,2),
    "percentual_reajuste" numeric(5,2),
    "motivo_reajuste" "text",
    "aprovado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."medical_plan_pricing_history" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_plan_pricing_history" IS 'Histórico de reajustes de preços dos planos';



CREATE TABLE IF NOT EXISTS "rh"."medical_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "agreement_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "categoria" character varying(50) NOT NULL,
    "cobertura" "text",
    "carencia_dias" integer DEFAULT 0,
    "faixa_etaria_min" integer DEFAULT 0,
    "faixa_etaria_max" integer DEFAULT 99,
    "limite_dependentes" integer DEFAULT 0,
    "valor_titular" numeric(10,2) NOT NULL,
    "valor_dependente" numeric(10,2) NOT NULL,
    "valor_familia" numeric(10,2),
    "desconto_funcionario" numeric(5,2) DEFAULT 0,
    "desconto_dependente" numeric(5,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "data_inicio_vigencia" "date",
    "data_fim_vigencia" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_plans_categoria_check" CHECK ((("categoria")::"text" = ANY ((ARRAY['basico'::character varying, 'intermediario'::character varying, 'premium'::character varying, 'executivo'::character varying, 'familia'::character varying, 'individual'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_plans" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_plans" IS 'Planos oferecidos por cada convênio médico/odontológico';



COMMENT ON COLUMN "rh"."medical_plans"."categoria" IS 'Categoria: basico, intermediario, premium, executivo, familia, individual';



CREATE TABLE IF NOT EXISTS "rh"."monthly_benefit_processing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "benefit_config_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "month_reference" integer NOT NULL,
    "year_reference" integer NOT NULL,
    "base_value" numeric(10,2),
    "work_days" integer,
    "absence_days" integer,
    "discount_value" numeric(10,2) DEFAULT 0,
    "final_value" numeric(10,2),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "processed_at" timestamp with time zone,
    "validated_at" timestamp with time zone,
    "processed_by" "uuid",
    "validated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "monthly_benefit_processing_month_reference_check" CHECK ((("month_reference" >= 1) AND ("month_reference" <= 12))),
    CONSTRAINT "monthly_benefit_processing_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'validated'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "rh"."monthly_benefit_processing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."payroll" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "salario_base" numeric(10,2) NOT NULL,
    "horas_trabalhadas" numeric(4,2) DEFAULT 0,
    "horas_extras" numeric(4,2) DEFAULT 0,
    "valor_horas_extras" numeric(10,2) DEFAULT 0,
    "total_vencimentos" numeric(10,2) DEFAULT 0,
    "total_descontos" numeric(10,2) DEFAULT 0,
    "salario_liquido" numeric(10,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "data_pagamento" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "payroll_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'processado'::character varying, 'pago'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."payroll_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ativo" boolean DEFAULT true,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "dias_uteis_mes" integer DEFAULT 22,
    "horas_dia_trabalho" numeric(4,2) DEFAULT 8.00,
    "percentual_hora_extra" numeric(5,4) DEFAULT 0.5000,
    "percentual_hora_noturna" numeric(5,4) DEFAULT 0.2000,
    "percentual_dsr" numeric(5,4) DEFAULT 0.0455,
    "aplicar_inss" boolean DEFAULT true,
    "aplicar_irrf" boolean DEFAULT true,
    "aplicar_fgts" boolean DEFAULT true,
    "aplicar_vale_transporte" boolean DEFAULT true,
    "percentual_vale_transporte" numeric(5,4) DEFAULT 0.0600,
    "aplicar_adicional_noturno" boolean DEFAULT true,
    "percentual_adicional_noturno" numeric(5,4) DEFAULT 0.2000,
    "aplicar_periculosidade" boolean DEFAULT false,
    "percentual_periculosidade" numeric(5,4) DEFAULT 0.3000,
    "aplicar_insalubridade" boolean DEFAULT false,
    "grau_insalubridade" character varying(20) DEFAULT 'medio'::character varying,
    "aplicar_ferias_proporcionais" boolean DEFAULT true,
    "aplicar_terco_ferias" boolean DEFAULT true,
    "aplicar_13_salario" boolean DEFAULT true,
    "desconto_faltas" boolean DEFAULT true,
    "desconto_atrasos" boolean DEFAULT true,
    "tolerancia_atraso_minutos" integer DEFAULT 5,
    "arredondar_centavos" boolean DEFAULT true,
    "tipo_arredondamento" character varying(20) DEFAULT 'matematico'::character varying,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_config_ano_vigencia_check" CHECK ((("ano_vigencia" >= 2000) AND ("ano_vigencia" <= 2100))),
    CONSTRAINT "payroll_config_grau_insalubridade_check" CHECK ((("grau_insalubridade")::"text" = ANY ((ARRAY['minimo'::character varying, 'medio'::character varying, 'maximo'::character varying])::"text"[]))),
    CONSTRAINT "payroll_config_mes_vigencia_check" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "payroll_config_tipo_arredondamento_check" CHECK ((("tipo_arredondamento")::"text" = ANY ((ARRAY['matematico'::character varying, 'para_cima'::character varying, 'para_baixo'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."payroll_config" IS 'ConfiguraÃ§Ãµes especÃ­ficas para cÃ¡lculo de folha de pagamento';



COMMENT ON COLUMN "rh"."payroll_config"."dias_uteis_mes" IS 'NÃºmero de dias Ãºteis no mÃªs (padrÃ£o 22)';



COMMENT ON COLUMN "rh"."payroll_config"."horas_dia_trabalho" IS 'Horas de trabalho por dia (padrÃ£o 8h)';



COMMENT ON COLUMN "rh"."payroll_config"."percentual_hora_extra" IS 'Percentual de hora extra (padrÃ£o 50%)';



COMMENT ON COLUMN "rh"."payroll_config"."percentual_hora_noturna" IS 'Percentual de hora noturna (padrÃ£o 20%)';



COMMENT ON COLUMN "rh"."payroll_config"."percentual_dsr" IS 'Percentual de DSR (1/22 = 4.55%)';



COMMENT ON COLUMN "rh"."payroll_config"."grau_insalubridade" IS 'Grau de insalubridade: minimo, medio, maximo';



COMMENT ON COLUMN "rh"."payroll_config"."tolerancia_atraso_minutos" IS 'TolerÃ¢ncia para atrasos em minutos';



COMMENT ON COLUMN "rh"."payroll_config"."tipo_arredondamento" IS 'Tipo de arredondamento: matematico, para_cima, para_baixo';



CREATE TABLE IF NOT EXISTS "rh"."payroll_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payroll_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "rubrica_id" "uuid" NOT NULL,
    "codigo_rubrica" character varying(20) NOT NULL,
    "descricao_rubrica" character varying(255) NOT NULL,
    "tipo_rubrica" character varying(20) NOT NULL,
    "quantidade" numeric(10,4) DEFAULT 1.0,
    "valor_unitario" numeric(10,2) DEFAULT 0.00,
    "valor_total" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "percentual" numeric(5,4) DEFAULT 0.0000,
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "calculado_automaticamente" boolean DEFAULT true,
    "origem_evento" character varying(50) DEFAULT 'sistema'::character varying,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_events_ano_referencia_check" CHECK ((("ano_referencia" >= 2000) AND ("ano_referencia" <= 2100))),
    CONSTRAINT "payroll_events_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "payroll_events_tipo_rubrica_check" CHECK ((("tipo_rubrica")::"text" = ANY ((ARRAY['provento'::character varying, 'desconto'::character varying, 'base_calculo'::character varying, 'informacao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll_events" OWNER TO "postgres";


COMMENT ON TABLE "rh"."payroll_events" IS 'Eventos individuais de cada funcionÃ¡rio por perÃ­odo de folha';



COMMENT ON COLUMN "rh"."payroll_events"."payroll_id" IS 'ReferÃªncia Ã  folha de pagamento';



COMMENT ON COLUMN "rh"."payroll_events"."rubrica_id" IS 'Rubrica que originou o evento';



COMMENT ON COLUMN "rh"."payroll_events"."tipo_rubrica" IS 'Tipo da rubrica: provento, desconto, base_calculo, informacao';



COMMENT ON COLUMN "rh"."payroll_events"."quantidade" IS 'Quantidade para cÃ¡lculo (horas, dias, etc.)';



COMMENT ON COLUMN "rh"."payroll_events"."valor_unitario" IS 'Valor por unidade';



COMMENT ON COLUMN "rh"."payroll_events"."valor_total" IS 'Valor total calculado';



COMMENT ON COLUMN "rh"."payroll_events"."percentual" IS 'Percentual aplicado (para rubricas percentuais)';



COMMENT ON COLUMN "rh"."payroll_events"."calculado_automaticamente" IS 'Se o evento foi calculado automaticamente pelo sistema';



COMMENT ON COLUMN "rh"."payroll_events"."origem_evento" IS 'Origem do evento: sistema, manual, importado';



CREATE TABLE IF NOT EXISTS "rh"."periodic_exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo_exame" character varying(30) NOT NULL,
    "data_agendamento" "date" NOT NULL,
    "data_realizacao" "date",
    "data_vencimento" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'agendado'::character varying NOT NULL,
    "medico_responsavel" character varying(255),
    "clinica_local" character varying(255),
    "observacoes" "text",
    "resultado" character varying(20),
    "restricoes" "text",
    "anexos" "text"[],
    "custo" numeric(10,2),
    "pago" boolean DEFAULT false,
    "data_pagamento" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "periodic_exams_resultado_check" CHECK ((("resultado")::"text" = ANY ((ARRAY['apto'::character varying, 'inapto'::character varying, 'apto_com_restricoes'::character varying, 'pendente'::character varying])::"text"[]))),
    CONSTRAINT "periodic_exams_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['agendado'::character varying, 'realizado'::character varying, 'vencido'::character varying, 'cancelado'::character varying, 'reagendado'::character varying])::"text"[]))),
    CONSTRAINT "periodic_exams_tipo_exame_check" CHECK ((("tipo_exame")::"text" = ANY ((ARRAY['admissional'::character varying, 'periodico'::character varying, 'demissional'::character varying, 'retorno_trabalho'::character varying, 'mudanca_funcao'::character varying, 'ambiental'::character varying])::"text"[])))
);


ALTER TABLE "rh"."periodic_exams" OWNER TO "postgres";


COMMENT ON TABLE "rh"."periodic_exams" IS 'Dados de exemplo inseridos para teste do sistema de exames periÃ³dicos';



COMMENT ON COLUMN "rh"."periodic_exams"."tipo_exame" IS 'Tipo: admissional, periodico, demissional, retorno_trabalho, mudanca_funcao, ambiental';



COMMENT ON COLUMN "rh"."periodic_exams"."status" IS 'Status: agendado, realizado, vencido, cancelado, reagendado';



COMMENT ON COLUMN "rh"."periodic_exams"."resultado" IS 'Resultado: apto, inapto, apto_com_restricoes, pendente';



COMMENT ON COLUMN "rh"."periodic_exams"."anexos" IS 'Array de URLs dos arquivos anexados (laudos, atestados, etc.)';



COMMENT ON COLUMN "rh"."periodic_exams"."custo" IS 'Custo do exame para controle financeiro';



CREATE TABLE IF NOT EXISTS "rh"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "nivel_hierarquico" integer DEFAULT 1,
    "salario_minimo" numeric(10,2),
    "salario_maximo" numeric(10,2),
    "carga_horaria" integer DEFAULT 40,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."reimbursement_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_despesa" character varying(50) NOT NULL,
    "valor_solicitado" numeric(10,2) NOT NULL,
    "data_despesa" "date" NOT NULL,
    "descricao" "text" NOT NULL,
    "comprovante_url" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "solicitado_por" "uuid",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reimbursement_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::"text"[]))),
    CONSTRAINT "reimbursement_requests_tipo_despesa_check" CHECK ((("tipo_despesa")::"text" = ANY ((ARRAY['alimentacao'::character varying, 'transporte'::character varying, 'hospedagem'::character varying, 'combustivel'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."reimbursement_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "periodo" character varying(20),
    "status" character varying(20) DEFAULT 'gerado'::character varying NOT NULL,
    "data_geracao" timestamp with time zone DEFAULT "now"(),
    "arquivo_url" "text",
    "parametros" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reports_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['gerado'::character varying, 'processando'::character varying, 'erro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."reports" OWNER TO "postgres";


COMMENT ON TABLE "rh"."reports" IS 'Tabela de relatÃ³rios gerados';



COMMENT ON COLUMN "rh"."reports"."tipo" IS 'Tipo do relatÃ³rio (ex: funcionarios, folha, horas, ferias)';



COMMENT ON COLUMN "rh"."reports"."periodo" IS 'PerÃ­odo do relatÃ³rio (ex: 2024/01)';



COMMENT ON COLUMN "rh"."reports"."status" IS 'Status do relatÃ³rio: gerado, processando, erro';



COMMENT ON COLUMN "rh"."reports"."arquivo_url" IS 'URL do arquivo do relatÃ³rio gerado';



COMMENT ON COLUMN "rh"."reports"."parametros" IS 'ParÃ¢metros utilizados para gerar o relatÃ³rio (JSON)';



CREATE TABLE IF NOT EXISTS "rh"."rubricas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "categoria" character varying(100),
    "natureza" character varying(50) DEFAULT 'normal'::character varying,
    "calculo_automatico" boolean DEFAULT false,
    "formula_calculo" "text",
    "valor_fixo" numeric(12,2),
    "percentual" numeric(5,4),
    "base_calculo" character varying(50) DEFAULT 'salario_base'::character varying,
    "incidencia_ir" boolean DEFAULT false,
    "incidencia_inss" boolean DEFAULT false,
    "incidencia_fgts" boolean DEFAULT false,
    "incidencia_contribuicao_sindical" boolean DEFAULT false,
    "ordem_exibicao" integer DEFAULT 0,
    "obrigatorio" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_rubrica_percentual" CHECK ((("percentual" IS NULL) OR (("percentual" >= (0)::numeric) AND ("percentual" <= (100)::numeric)))),
    CONSTRAINT "check_rubrica_valor_formula" CHECK (((("valor_fixo" IS NOT NULL) AND ("formula_calculo" IS NULL)) OR (("valor_fixo" IS NULL) AND ("formula_calculo" IS NOT NULL)) OR (("valor_fixo" IS NULL) AND ("formula_calculo" IS NULL)))),
    CONSTRAINT "rubricas_natureza_check" CHECK ((("natureza")::"text" = ANY ((ARRAY['normal'::character varying, 'eventual'::character varying, 'fixo'::character varying, 'variavel'::character varying])::"text"[]))),
    CONSTRAINT "rubricas_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['provento'::character varying, 'desconto'::character varying, 'base_calculo'::character varying, 'informacao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."rubricas" OWNER TO "postgres";


COMMENT ON TABLE "rh"."rubricas" IS 'Tabela de rubricas para folha de pagamento';



COMMENT ON COLUMN "rh"."rubricas"."tipo" IS 'Tipo da rubrica: provento, desconto, base_calculo, informacao';



COMMENT ON COLUMN "rh"."rubricas"."natureza" IS 'Natureza da rubrica: normal, eventual, fixo, variavel';



COMMENT ON COLUMN "rh"."rubricas"."formula_calculo" IS 'F??rmula para c??lculo autom??tico da rubrica';



COMMENT ON COLUMN "rh"."rubricas"."base_calculo" IS 'Base para c??lculo: salario_base, salario_familia, etc.';



COMMENT ON COLUMN "rh"."rubricas"."incidencia_ir" IS 'Se a rubrica incide no c??lculo do IR';



COMMENT ON COLUMN "rh"."rubricas"."incidencia_inss" IS 'Se a rubrica incide no c??lculo do INSS';



COMMENT ON COLUMN "rh"."rubricas"."incidencia_fgts" IS 'Se a rubrica incide no c??lculo do FGTS';



CREATE TABLE IF NOT EXISTS "rh"."schedule_planning" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "periodo_inicio" "date" NOT NULL,
    "periodo_fim" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'rascunho'::character varying NOT NULL,
    "total_funcionarios" integer DEFAULT 0,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_schedule_planning_periodo" CHECK (("periodo_fim" >= "periodo_inicio")),
    CONSTRAINT "schedule_planning_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['rascunho'::character varying, 'aprovado'::character varying, 'ativo'::character varying, 'finalizado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."schedule_planning" OWNER TO "postgres";


COMMENT ON TABLE "rh"."schedule_planning" IS 'Tabela de programaÃ§Ã£o de escalas de trabalho';



COMMENT ON COLUMN "rh"."schedule_planning"."nome" IS 'Nome da programaÃ§Ã£o de escala';



COMMENT ON COLUMN "rh"."schedule_planning"."periodo_inicio" IS 'Data de inÃ­cio do perÃ­odo da escala';



COMMENT ON COLUMN "rh"."schedule_planning"."periodo_fim" IS 'Data de fim do perÃ­odo da escala';



COMMENT ON COLUMN "rh"."schedule_planning"."status" IS 'Status da programaÃ§Ã£o: rascunho, aprovado, ativo, finalizado';



COMMENT ON COLUMN "rh"."schedule_planning"."total_funcionarios" IS 'Total de funcionÃ¡rios incluÃ­dos na programaÃ§Ã£o';



CREATE TABLE IF NOT EXISTS "rh"."selection_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "job_opening_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "current_stage" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "selection_processes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'pausado'::character varying, 'finalizado'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."selection_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."selection_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "selection_process_id" "uuid" NOT NULL,
    "stage_name" character varying(100) NOT NULL,
    "stage_type" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "interviewer_id" "uuid",
    "score" numeric(3,1),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "selection_stages_stage_type_check" CHECK ((("stage_type")::"text" = ANY ((ARRAY['triagem'::character varying, 'entrevista_telefonica'::character varying, 'entrevista_presencial'::character varying, 'teste_tecnico'::character varying, 'entrevista_final'::character varying, 'aprovacao'::character varying])::"text"[]))),
    CONSTRAINT "selection_stages_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'em_andamento'::character varying, 'aprovado'::character varying, 'reprovado'::character varying, 'desistiu'::character varying])::"text"[])))
);


ALTER TABLE "rh"."selection_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."talent_pool" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "category" character varying(50) NOT NULL,
    "skills" "text"[],
    "experience_level" character varying(20),
    "availability" character varying(20) DEFAULT 'disponivel'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "talent_pool_availability_check" CHECK ((("availability")::"text" = ANY ((ARRAY['disponivel'::character varying, 'interessado'::character varying, 'indisponivel'::character varying])::"text"[]))),
    CONSTRAINT "talent_pool_experience_level_check" CHECK ((("experience_level")::"text" = ANY ((ARRAY['junior'::character varying, 'pleno'::character varying, 'senior'::character varying, 'especialista'::character varying])::"text"[])))
);


ALTER TABLE "rh"."talent_pool" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."time_bank" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_registro" "date" NOT NULL,
    "tipo_hora" character varying(20) NOT NULL,
    "quantidade_horas" numeric(5,2) NOT NULL,
    "motivo" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "data_expiracao" "date",
    "utilizado_em" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_bank_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'negado'::character varying, 'utilizado'::character varying, 'expirado'::character varying])::"text"[]))),
    CONSTRAINT "time_bank_tipo_hora_check" CHECK ((("tipo_hora")::"text" = ANY ((ARRAY['extra'::character varying, 'compensatoria'::character varying, 'sobreaviso'::character varying, 'adicional_noturno'::character varying])::"text"[])))
);


ALTER TABLE "rh"."time_bank" OWNER TO "postgres";


COMMENT ON TABLE "rh"."time_bank" IS 'Banco de horas dos funcionÃ¡rios - controle de horas extras e compensatÃ³rias';



COMMENT ON COLUMN "rh"."time_bank"."tipo_hora" IS 'Tipo da hora: extra, compensatoria, sobreaviso, adicional_noturno';



COMMENT ON COLUMN "rh"."time_bank"."quantidade_horas" IS 'Quantidade de horas em formato decimal (ex: 2.5 = 2h30min)';



COMMENT ON COLUMN "rh"."time_bank"."status" IS 'Status: pendente, aprovado, negado, utilizado, expirado';



COMMENT ON COLUMN "rh"."time_bank"."data_expiracao" IS 'Data limite para utilizaÃ§Ã£o das horas';



COMMENT ON COLUMN "rh"."time_bank"."utilizado_em" IS 'Data em que as horas foram utilizadas';



CREATE TABLE IF NOT EXISTS "rh"."time_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_registro" "date" NOT NULL,
    "entrada" time without time zone,
    "saida" time without time zone,
    "entrada_almoco" time without time zone,
    "saida_almoco" time without time zone,
    "horas_trabalhadas" numeric(4,2) DEFAULT 0,
    "horas_extras" numeric(4,2) DEFAULT 0,
    "horas_faltas" numeric(4,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "observacoes" "text",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entrada_extra1" time without time zone,
    "saida_extra1" time without time zone,
    CONSTRAINT "time_records_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'corrigido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."time_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_treinamento" "date" NOT NULL,
    "hora_entrada" time without time zone,
    "hora_saida" time without time zone,
    "presenca" character varying(50) DEFAULT 'ausente'::character varying NOT NULL,
    "percentual_presenca" numeric(5,2) DEFAULT 0,
    "observacoes" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "numero_certificado" character varying(100) NOT NULL,
    "data_emissao" "date" DEFAULT CURRENT_DATE NOT NULL,
    "data_validade" "date",
    "status" character varying(50) DEFAULT 'valido'::character varying NOT NULL,
    "nota_final" numeric(5,2),
    "percentual_presenca_final" numeric(5,2),
    "aprovado" boolean DEFAULT false NOT NULL,
    "observacoes" "text",
    "template_certificado" "text",
    "arquivo_certificado" "text",
    "emitido_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_inscricao" timestamp with time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'inscrito'::character varying NOT NULL,
    "justificativa_cancelamento" "text",
    "observacoes" "text",
    "inscrito_por" "uuid",
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "nota_instrutor" numeric(3,1),
    "nota_conteudo" numeric(3,1),
    "nota_metodologia" numeric(3,1),
    "nota_recursos" numeric(3,1),
    "nota_geral" numeric(3,1),
    "comentarios" "text",
    "sugestoes" "text",
    "recomendaria" boolean,
    "data_avaliacao" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "training_evaluations_nota_conteudo_check" CHECK ((("nota_conteudo" >= (0)::numeric) AND ("nota_conteudo" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_geral_check" CHECK ((("nota_geral" >= (0)::numeric) AND ("nota_geral" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_instrutor_check" CHECK ((("nota_instrutor" >= (0)::numeric) AND ("nota_instrutor" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_metodologia_check" CHECK ((("nota_metodologia" >= (0)::numeric) AND ("nota_metodologia" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_recursos_check" CHECK ((("nota_recursos" >= (0)::numeric) AND ("nota_recursos" <= (10)::numeric)))
);


ALTER TABLE "rh"."training_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid",
    "notification_type_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "employee_id" "uuid",
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "data_envio" timestamp with time zone NOT NULL,
    "status" character varying(50) NOT NULL,
    "metodo_envio" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid",
    "notification_type_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "employee_id" "uuid",
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "data_agendamento" timestamp with time zone NOT NULL,
    "status" character varying(50) DEFAULT 'pendente'::character varying NOT NULL,
    "tentativas" integer DEFAULT 0,
    "max_tentativas" integer DEFAULT 3,
    "data_envio" timestamp with time zone,
    "erro_mensagem" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid",
    "notification_type_id" "uuid" NOT NULL,
    "target_audience" character varying(50) DEFAULT 'inscritos'::character varying NOT NULL,
    "dias_antecedencia" integer DEFAULT 0 NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo" character varying(100) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "template_titulo" "text" NOT NULL,
    "template_mensagem" "text" NOT NULL,
    "dias_antecedencia" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "notification_enabled" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT false,
    "reminder_days_before" integer DEFAULT 3,
    "reminder_days_after" integer DEFAULT 1,
    "auto_enrollment" boolean DEFAULT false,
    "require_approval" boolean DEFAULT true,
    "max_participants" integer DEFAULT 50,
    "min_attendance_percentage" integer DEFAULT 80,
    "certificate_auto_generate" boolean DEFAULT true,
    "certificate_validity_days" integer DEFAULT 365,
    "training_duration_default" numeric(4,2) DEFAULT 8.0,
    "evaluation_required" boolean DEFAULT true,
    "feedback_required" boolean DEFAULT true,
    "auto_archive_days" integer DEFAULT 90,
    "allow_self_enrollment" boolean DEFAULT true,
    "allow_cancellation" boolean DEFAULT true,
    "cancellation_deadline_hours" integer DEFAULT 24,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo_treinamento" character varying(100) NOT NULL,
    "categoria" character varying(100),
    "carga_horaria" integer NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "data_limite_inscricao" "date",
    "vagas_totais" integer,
    "vagas_disponiveis" integer,
    "local" character varying(255),
    "modalidade" character varying(50) DEFAULT 'presencial'::character varying NOT NULL,
    "instrutor" character varying(255),
    "instrutor_email" character varying(255),
    "instrutor_telefone" character varying(20),
    "custo_por_participante" numeric(10,2) DEFAULT 0,
    "requisitos" "text",
    "objetivos" "text",
    "conteudo_programatico" "text",
    "metodologia" "text",
    "recursos_necessarios" "text",
    "status" character varying(50) DEFAULT 'planejado'::character varying NOT NULL,
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "anexos" "text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."union_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "tipo_contribuicao" character varying(50) NOT NULL,
    "mes_referencia" character varying(7) NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "desconto_folha" boolean DEFAULT false,
    "data_vencimento" "date",
    "data_pagamento" "date",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "union_contributions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'pago'::character varying, 'atrasado'::character varying, 'isento'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "union_contributions_tipo_contribuicao_check" CHECK ((("tipo_contribuicao")::"text" = ANY ((ARRAY['mensalidade'::character varying, 'contribuicao_assistencial'::character varying, 'contribuicao_confederativa'::character varying, 'taxa_negociacao'::character varying, 'outras'::character varying])::"text"[])))
);


ALTER TABLE "rh"."union_contributions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."union_contributions" IS 'Contribuições e mensalidades sindicais';



COMMENT ON COLUMN "rh"."union_contributions"."tipo_contribuicao" IS 'Tipo: mensalidade, contribuicao_assistencial, contribuicao_confederativa, taxa_negociacao, outras';



CREATE TABLE IF NOT EXISTS "rh"."union_negotiations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "tipo_negociacao" character varying(50) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "descricao" "text",
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'em_andamento'::character varying NOT NULL,
    "responsavel_empresa" character varying(255),
    "responsavel_sindicato" character varying(255),
    "resultado" "text",
    "valor_proposto" numeric(10,2),
    "valor_aceito" numeric(10,2),
    "percentual_proposto" numeric(5,2),
    "percentual_aceito" numeric(5,2),
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "union_negotiations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['agendada'::character varying, 'em_andamento'::character varying, 'concluida'::character varying, 'suspensa'::character varying, 'cancelada'::character varying])::"text"[]))),
    CONSTRAINT "union_negotiations_tipo_negociacao_check" CHECK ((("tipo_negociacao")::"text" = ANY ((ARRAY['salarial'::character varying, 'beneficios'::character varying, 'condicoes_trabalho'::character varying, 'seguranca'::character varying, 'outras'::character varying])::"text"[])))
);


ALTER TABLE "rh"."union_negotiations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."union_negotiations" IS 'Negociações e reuniões sindicais';



COMMENT ON COLUMN "rh"."union_negotiations"."tipo_negociacao" IS 'Tipo: salarial, beneficios, condicoes_trabalho, seguranca, outras';



CREATE TABLE IF NOT EXISTS "rh"."union_representatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "cargo" character varying(100) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "union_representatives_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'suspenso'::character varying])::"text"[])))
);


ALTER TABLE "rh"."union_representatives" OWNER TO "postgres";


COMMENT ON TABLE "rh"."union_representatives" IS 'Representantes sindicais na empresa';



CREATE TABLE IF NOT EXISTS "rh"."unions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "sigla" character varying(50),
    "tipo" character varying(50) NOT NULL,
    "categoria" character varying(100),
    "cnpj" character varying(14),
    "inscricao_municipal" character varying(50),
    "inscricao_estadual" character varying(50),
    "razao_social" character varying(255),
    "telefone" character varying(20),
    "email" character varying(255),
    "site" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(8),
    "presidente" character varying(255),
    "telefone_presidente" character varying(20),
    "email_presidente" character varying(255),
    "data_fundacao" "date",
    "numero_registro" character varying(50),
    "observacoes" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "unions_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['patronal'::character varying, 'trabalhadores'::character varying, 'categoria'::character varying, 'profissional'::character varying, 'misto'::character varying])::"text"[])))
);


ALTER TABLE "rh"."unions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."unions" IS 'Sindicatos patronais e de trabalhadores';



COMMENT ON COLUMN "rh"."unions"."tipo" IS 'Tipo: patronal, trabalhadores, categoria, profissional, misto';



CREATE TABLE IF NOT EXISTS "rh"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "codigo" character varying(20),
    "responsavel_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."vacation_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "ano_aquisitivo" integer NOT NULL,
    "data_inicio_periodo" "date" NOT NULL,
    "data_fim_periodo" "date" NOT NULL,
    "dias_disponiveis" integer DEFAULT 30 NOT NULL,
    "dias_gozados" integer DEFAULT 0,
    "dias_restantes" integer GENERATED ALWAYS AS (("dias_disponiveis" - "dias_gozados")) STORED,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_vencimento" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_entitlement_days_gozados" CHECK (("dias_gozados" <= "dias_disponiveis")),
    CONSTRAINT "check_entitlement_period_dates" CHECK (("data_fim_periodo" >= "data_inicio_periodo")),
    CONSTRAINT "vacation_entitlements_ano_aquisitivo_check" CHECK ((("ano_aquisitivo" >= 2000) AND ("ano_aquisitivo" <= 2100))),
    CONSTRAINT "vacation_entitlements_dias_disponiveis_check" CHECK ((("dias_disponiveis" >= 0) AND ("dias_disponiveis" <= 30))),
    CONSTRAINT "vacation_entitlements_dias_gozados_check" CHECK (("dias_gozados" >= 0)),
    CONSTRAINT "vacation_entitlements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'vencido'::character varying, 'gozado'::character varying, 'parcialmente_gozado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."vacation_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."vacation_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vacation_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "dias_ferias" integer NOT NULL,
    "dias_abono" integer DEFAULT 0,
    "periodo_numero" integer NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_vacation_period_dates" CHECK (("data_fim" >= "data_inicio")),
    CONSTRAINT "check_vacation_period_days" CHECK (("dias_ferias" = (("data_fim" - "data_inicio") + 1))),
    CONSTRAINT "vacation_periods_dias_abono_check" CHECK ((("dias_abono" >= 0) AND ("dias_abono" <= 10))),
    CONSTRAINT "vacation_periods_dias_ferias_check" CHECK (("dias_ferias" > 0)),
    CONSTRAINT "vacation_periods_periodo_numero_check" CHECK ((("periodo_numero" >= 1) AND ("periodo_numero" <= 3)))
);


ALTER TABLE "rh"."vacation_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."vacations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "dias_solicitados" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "observacoes" "text",
    "anexos" "text"[],
    "solicitado_por" "uuid",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "vacations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying])::"text"[]))),
    CONSTRAINT "vacations_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ferias'::character varying, 'licenca_medica'::character varying, 'licenca_maternidade'::character varying, 'licenca_paternidade'::character varying, 'afastamento'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."vacations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."work_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "carga_horaria_semanal" integer DEFAULT 40,
    "dias_trabalho" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5],
    "horario_inicio" time without time zone DEFAULT '08:00:00'::time without time zone,
    "horario_fim" time without time zone DEFAULT '17:00:00'::time without time zone,
    "intervalo_almoco" integer DEFAULT 60,
    "tolerancia_entrada" integer DEFAULT 15,
    "tolerancia_saida" integer DEFAULT 15,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."work_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."work_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "codigo" character varying(50),
    "descricao" "text",
    "hora_inicio" time without time zone NOT NULL,
    "hora_fim" time without time zone NOT NULL,
    "intervalo_inicio" time without time zone,
    "intervalo_fim" time without time zone,
    "horas_diarias" numeric(4,2) DEFAULT 8.0 NOT NULL,
    "dias_semana" integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    "tipo_turno" character varying(50) DEFAULT 'normal'::character varying,
    "tolerancia_entrada" integer DEFAULT 0,
    "tolerancia_saida" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_escala" character varying(50) DEFAULT 'fixa'::character varying,
    "dias_trabalho" integer DEFAULT 5,
    "dias_folga" integer DEFAULT 2,
    "ciclo_dias" integer DEFAULT 7,
    "regras_clt" "jsonb" DEFAULT '{}'::"jsonb",
    "template_escala" boolean DEFAULT false,
    CONSTRAINT "work_shifts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::"text"[])))
);


ALTER TABLE "rh"."work_shifts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."work_shifts" IS 'Tabela de turnos de trabalho';



COMMENT ON COLUMN "rh"."work_shifts"."dias_semana" IS 'Array com dias da semana: 1=Segunda, 2=Ter??a, 3=Quarta, 4=Quinta, 5=Sexta, 6=S??bado, 7=Domingo';



COMMENT ON COLUMN "rh"."work_shifts"."tolerancia_entrada" IS 'Toler??ncia em minutos para entrada';



COMMENT ON COLUMN "rh"."work_shifts"."tolerancia_saida" IS 'Toler??ncia em minutos para sa??da';



ALTER TABLE ONLY "financeiro"."aprovacoes"
    ADD CONSTRAINT "aprovacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."borderos"
    ADD CONSTRAINT "borderos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."conciliacoes_bancarias"
    ADD CONSTRAINT "conciliacoes_bancarias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."configuracoes_aprovacao"
    ADD CONSTRAINT "configuracoes_aprovacao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."contas_bancarias"
    ADD CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."fluxo_caixa"
    ADD CONSTRAINT "fluxo_caixa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."nfe"
    ADD CONSTRAINT "nfe_chave_acesso_key" UNIQUE ("chave_acesso");



ALTER TABLE ONLY "financeiro"."nfe"
    ADD CONSTRAINT "nfe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."nfse"
    ADD CONSTRAINT "nfse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."plano_contas"
    ADD CONSTRAINT "plano_contas_company_id_codigo_key" UNIQUE ("company_id", "codigo");



ALTER TABLE ONLY "financeiro"."plano_contas"
    ADD CONSTRAINT "plano_contas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."remessas_bancarias"
    ADD CONSTRAINT "remessas_bancarias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "financeiro"."retornos_bancarios"
    ADD CONSTRAINT "retornos_bancarios_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "rh"."absence_types"
    ADD CONSTRAINT "absence_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "allowance_types_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "allowance_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."approval_level_approvers"
    ADD CONSTRAINT "approval_level_approvers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."approval_levels"
    ADD CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."audit_config"
    ADD CONSTRAINT "audit_config_company_id_entity_type_key" UNIQUE ("company_id", "entity_type");



ALTER TABLE ONLY "rh"."audit_config"
    ADD CONSTRAINT "audit_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_employee_id_company_id_key" UNIQUE ("employee_id", "company_id");



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_calculations"
    ADD CONSTRAINT "bank_hours_calculations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_employee_id_company_id_key" UNIQUE ("employee_id", "company_id");



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."benefit_configurations"
    ADD CONSTRAINT "benefit_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."calculation_logs"
    ADD CONSTRAINT "calculation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."cid_codes"
    ADD CONSTRAINT "cid_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."collective_agreements"
    ADD CONSTRAINT "collective_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."deficiency_types"
    ADD CONSTRAINT "deficiency_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."delay_reasons"
    ADD CONSTRAINT "delay_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_employee_id_plan_id_data_inicio_key" UNIQUE ("employee_id", "plan_id", "data_inicio");



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_plan_dependents"
    ADD CONSTRAINT "employee_plan_dependents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_employee_id_union_id_data_filiac_key" UNIQUE ("employee_id", "union_id", "data_filiacao");



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_config"
    ADD CONSTRAINT "esocial_config_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."esocial_config"
    ADD CONSTRAINT "esocial_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_integrations"
    ADD CONSTRAINT "esocial_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_logs"
    ADD CONSTRAINT "esocial_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."event_consolidations"
    ADD CONSTRAINT "event_consolidations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."fgts_config"
    ADD CONSTRAINT "fgts_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."gestor_notifications"
    ADD CONSTRAINT "gestor_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."holidays"
    ADD CONSTRAINT "holidays_company_id_data_nome_key" UNIQUE ("company_id", "data", "nome");



ALTER TABLE ONLY "rh"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."inss_brackets"
    ADD CONSTRAINT "inss_brackets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."irrf_brackets"
    ADD CONSTRAINT "irrf_brackets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_agreements"
    ADD CONSTRAINT "medical_agreements_company_id_nome_key" UNIQUE ("company_id", "nome");



ALTER TABLE ONLY "rh"."medical_agreements"
    ADD CONSTRAINT "medical_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "medical_certificate_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_agreement_id_nome_key" UNIQUE ("agreement_id", "nome");



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_employee_id_benefit_config_id_mo_key" UNIQUE ("employee_id", "benefit_config_id", "month_reference", "year_reference");



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll_config"
    ADD CONSTRAINT "payroll_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll_config"
    ADD CONSTRAINT "payroll_config_unique_company_period" UNIQUE ("company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_employee_id_mes_referencia_ano_referencia_key" UNIQUE ("employee_id", "mes_referencia", "ano_referencia");



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."periodic_exams"
    ADD CONSTRAINT "periodic_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."rubricas"
    ADD CONSTRAINT "rubricas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."schedule_planning"
    ADD CONSTRAINT "schedule_planning_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."talent_pool"
    ADD CONSTRAINT "talent_pool_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_employee_id_data_registro_key" UNIQUE ("employee_id", "data_registro");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_training_id_employee_id_data_treinament_key" UNIQUE ("training_id", "employee_id", "data_treinamento");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_numero_certificado_key" UNIQUE ("numero_certificado");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_types"
    ADD CONSTRAINT "training_notification_types_company_id_tipo_key" UNIQUE ("company_id", "tipo");



ALTER TABLE ONLY "rh"."training_notification_types"
    ADD CONSTRAINT "training_notification_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_settings"
    ADD CONSTRAINT "training_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."union_negotiations"
    ADD CONSTRAINT "union_negotiations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."unions"
    ADD CONSTRAINT "unions_company_id_nome_key" UNIQUE ("company_id", "nome");



ALTER TABLE ONLY "rh"."unions"
    ADD CONSTRAINT "unions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."absence_types"
    ADD CONSTRAINT "unique_absence_type_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "unique_allowance_type_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."cid_codes"
    ADD CONSTRAINT "unique_cid_code_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."deficiency_types"
    ADD CONSTRAINT "unique_deficiency_type_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."delay_reasons"
    ADD CONSTRAINT "unique_delay_reason_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "unique_employee_year_entitlement" UNIQUE ("employee_id", "ano_aquisitivo");



ALTER TABLE ONLY "rh"."event_consolidations"
    ADD CONSTRAINT "unique_event_consolidation_periodo_company" UNIQUE ("periodo", "company_id");



ALTER TABLE ONLY "rh"."fgts_config"
    ADD CONSTRAINT "unique_fgts_config_company_ano_mes_codigo" UNIQUE ("codigo", "company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."inss_brackets"
    ADD CONSTRAINT "unique_inss_bracket_company_ano_mes_codigo" UNIQUE ("codigo", "company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."irrf_brackets"
    ADD CONSTRAINT "unique_irrf_bracket_company_ano_mes_codigo" UNIQUE ("codigo", "company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."rubricas"
    ADD CONSTRAINT "unique_rubrica_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "vacation_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."vacation_periods"
    ADD CONSTRAINT "vacation_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."work_schedules"
    ADD CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."work_shifts"
    ADD CONSTRAINT "work_shifts_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "rh"."work_shifts"
    ADD CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_aprovacoes_aprovador" ON "financeiro"."aprovacoes" USING "btree" ("aprovador_id");



CREATE INDEX "idx_aprovacoes_company_id" ON "financeiro"."aprovacoes" USING "btree" ("company_id");



CREATE INDEX "idx_aprovacoes_entidade" ON "financeiro"."aprovacoes" USING "btree" ("entidade_tipo", "entidade_id");



CREATE INDEX "idx_contas_bancarias_company_id" ON "financeiro"."contas_bancarias" USING "btree" ("company_id");



CREATE INDEX "idx_contas_pagar_centro_custo" ON "financeiro"."contas_pagar" USING "btree" ("centro_custo_id");



CREATE INDEX "idx_contas_pagar_company_id" ON "financeiro"."contas_pagar" USING "btree" ("company_id");



CREATE INDEX "idx_contas_pagar_fornecedor" ON "financeiro"."contas_pagar" USING "btree" ("fornecedor_id");



CREATE INDEX "idx_contas_pagar_status" ON "financeiro"."contas_pagar" USING "btree" ("status");



CREATE INDEX "idx_contas_pagar_vencimento" ON "financeiro"."contas_pagar" USING "btree" ("data_vencimento");



CREATE INDEX "idx_contas_receber_centro_custo" ON "financeiro"."contas_receber" USING "btree" ("centro_custo_id");



CREATE INDEX "idx_contas_receber_cliente" ON "financeiro"."contas_receber" USING "btree" ("cliente_id");



CREATE INDEX "idx_contas_receber_company_id" ON "financeiro"."contas_receber" USING "btree" ("company_id");



CREATE INDEX "idx_contas_receber_status" ON "financeiro"."contas_receber" USING "btree" ("status");



CREATE INDEX "idx_contas_receber_vencimento" ON "financeiro"."contas_receber" USING "btree" ("data_vencimento");



CREATE INDEX "idx_fluxo_caixa_company_id" ON "financeiro"."fluxo_caixa" USING "btree" ("company_id");



CREATE INDEX "idx_fluxo_caixa_data" ON "financeiro"."fluxo_caixa" USING "btree" ("data_projecao");



CREATE INDEX "idx_lancamentos_company_id" ON "financeiro"."lancamentos_contabeis" USING "btree" ("company_id");



CREATE INDEX "idx_lancamentos_data" ON "financeiro"."lancamentos_contabeis" USING "btree" ("data_lancamento");



CREATE INDEX "idx_nfe_chave" ON "financeiro"."nfe" USING "btree" ("chave_acesso");



CREATE INDEX "idx_nfe_company_id" ON "financeiro"."nfe" USING "btree" ("company_id");



CREATE INDEX "idx_nfse_company_id" ON "financeiro"."nfse" USING "btree" ("company_id");



CREATE INDEX "idx_plano_contas_company_id" ON "financeiro"."plano_contas" USING "btree" ("company_id");



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



CREATE INDEX "idx_absence_types_ativo" ON "rh"."absence_types" USING "btree" ("ativo");



CREATE INDEX "idx_absence_types_codigo" ON "rh"."absence_types" USING "btree" ("codigo");



CREATE INDEX "idx_absence_types_company_id" ON "rh"."absence_types" USING "btree" ("company_id");



CREATE INDEX "idx_absence_types_tipo" ON "rh"."absence_types" USING "btree" ("tipo");



CREATE INDEX "idx_allowance_types_ativo" ON "rh"."allowance_types" USING "btree" ("ativo");



CREATE INDEX "idx_allowance_types_codigo" ON "rh"."allowance_types" USING "btree" ("codigo");



CREATE INDEX "idx_allowance_types_company_id" ON "rh"."allowance_types" USING "btree" ("company_id");



CREATE INDEX "idx_allowance_types_tipo" ON "rh"."allowance_types" USING "btree" ("tipo");



CREATE INDEX "idx_approval_level_approvers_level_id" ON "rh"."approval_level_approvers" USING "btree" ("approval_level_id");



CREATE INDEX "idx_approval_level_approvers_user_id" ON "rh"."approval_level_approvers" USING "btree" ("user_id");



CREATE INDEX "idx_approval_levels_company_id" ON "rh"."approval_levels" USING "btree" ("company_id");



CREATE INDEX "idx_approval_levels_order" ON "rh"."approval_levels" USING "btree" ("company_id", "level_order");



CREATE INDEX "idx_audit_logs_action" ON "rh"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_company_entity" ON "rh"."audit_logs" USING "btree" ("company_id", "entity_type");



CREATE INDEX "idx_audit_logs_company_id" ON "rh"."audit_logs" USING "btree" ("company_id");



CREATE INDEX "idx_audit_logs_created_at" ON "rh"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity" ON "rh"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_user_id" ON "rh"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_bank_hours_balance_calculation_date" ON "rh"."bank_hours_balance" USING "btree" ("last_calculation_date");



CREATE INDEX "idx_bank_hours_balance_company" ON "rh"."bank_hours_balance" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_balance_employee" ON "rh"."bank_hours_balance" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_calculations_company" ON "rh"."bank_hours_calculations" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_calculations_date" ON "rh"."bank_hours_calculations" USING "btree" ("calculation_date");



CREATE INDEX "idx_bank_hours_calculations_status" ON "rh"."bank_hours_calculations" USING "btree" ("status");



CREATE INDEX "idx_bank_hours_config_active" ON "rh"."bank_hours_config" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_bank_hours_config_company" ON "rh"."bank_hours_config" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_config_employee" ON "rh"."bank_hours_config" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_transactions_company" ON "rh"."bank_hours_transactions" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_transactions_date" ON "rh"."bank_hours_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_bank_hours_transactions_employee" ON "rh"."bank_hours_transactions" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_transactions_time_record" ON "rh"."bank_hours_transactions" USING "btree" ("time_record_id");



CREATE INDEX "idx_bank_hours_transactions_type" ON "rh"."bank_hours_transactions" USING "btree" ("transaction_type");



CREATE INDEX "idx_benefit_processing_company_id" ON "rh"."monthly_benefit_processing" USING "btree" ("company_id");



CREATE INDEX "idx_benefit_processing_employee_id" ON "rh"."monthly_benefit_processing" USING "btree" ("employee_id");



CREATE INDEX "idx_benefit_processing_reference" ON "rh"."monthly_benefit_processing" USING "btree" ("month_reference", "year_reference");



CREATE INDEX "idx_calculation_logs_company_id" ON "rh"."calculation_logs" USING "btree" ("company_id");



CREATE INDEX "idx_calculation_logs_created_at" ON "rh"."calculation_logs" USING "btree" ("created_at");



CREATE INDEX "idx_calculation_logs_periodo" ON "rh"."calculation_logs" USING "btree" ("ano_referencia", "mes_referencia");



CREATE INDEX "idx_calculation_logs_processo_id" ON "rh"."calculation_logs" USING "btree" ("processo_id");



CREATE INDEX "idx_calculation_logs_status" ON "rh"."calculation_logs" USING "btree" ("status");



CREATE INDEX "idx_calculation_logs_tipo" ON "rh"."calculation_logs" USING "btree" ("tipo_processo");



CREATE INDEX "idx_cid_codes_ativo" ON "rh"."cid_codes" USING "btree" ("ativo");



CREATE INDEX "idx_cid_codes_categoria" ON "rh"."cid_codes" USING "btree" ("categoria");



CREATE INDEX "idx_cid_codes_codigo" ON "rh"."cid_codes" USING "btree" ("codigo");



CREATE INDEX "idx_cid_codes_company_id" ON "rh"."cid_codes" USING "btree" ("company_id");



CREATE INDEX "idx_cid_codes_descricao" ON "rh"."cid_codes" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", ("descricao")::"text"));



CREATE INDEX "idx_collective_agreements_company_id" ON "rh"."collective_agreements" USING "btree" ("company_id");



CREATE INDEX "idx_collective_agreements_data_vigencia_inicio" ON "rh"."collective_agreements" USING "btree" ("data_vigencia_inicio");



CREATE INDEX "idx_collective_agreements_status" ON "rh"."collective_agreements" USING "btree" ("status");



CREATE INDEX "idx_collective_agreements_tipo_documento" ON "rh"."collective_agreements" USING "btree" ("tipo_documento");



CREATE INDEX "idx_collective_agreements_union_id" ON "rh"."collective_agreements" USING "btree" ("union_id");



CREATE INDEX "idx_compensation_approvals_approver_id" ON "rh"."compensation_approvals" USING "btree" ("approver_id");



CREATE INDEX "idx_compensation_approvals_request_id" ON "rh"."compensation_approvals" USING "btree" ("compensation_request_id");



CREATE INDEX "idx_compensation_requests_aprovado_por" ON "rh"."compensation_requests" USING "btree" ("aprovado_por");



CREATE INDEX "idx_compensation_requests_company_id" ON "rh"."compensation_requests" USING "btree" ("company_id");



CREATE INDEX "idx_compensation_requests_data_compensacao" ON "rh"."compensation_requests" USING "btree" ("data_inicio");



CREATE INDEX "idx_compensation_requests_data_fim" ON "rh"."compensation_requests" USING "btree" ("data_fim");



CREATE INDEX "idx_compensation_requests_data_inicio" ON "rh"."compensation_requests" USING "btree" ("data_inicio");



CREATE INDEX "idx_compensation_requests_employee_id" ON "rh"."compensation_requests" USING "btree" ("employee_id");



CREATE INDEX "idx_compensation_requests_funcionario_id" ON "rh"."compensation_requests" USING "btree" ("employee_id");



CREATE INDEX "idx_compensation_requests_status" ON "rh"."compensation_requests" USING "btree" ("status");



CREATE INDEX "idx_deficiency_types_ativo" ON "rh"."deficiency_types" USING "btree" ("ativo");



CREATE INDEX "idx_deficiency_types_codigo" ON "rh"."deficiency_types" USING "btree" ("codigo");



CREATE INDEX "idx_deficiency_types_company_id" ON "rh"."deficiency_types" USING "btree" ("company_id");



CREATE INDEX "idx_deficiency_types_grau" ON "rh"."deficiency_types" USING "btree" ("grau");



CREATE INDEX "idx_deficiency_types_tipo" ON "rh"."deficiency_types" USING "btree" ("tipo");



CREATE INDEX "idx_delay_reasons_ativo" ON "rh"."delay_reasons" USING "btree" ("ativo");



CREATE INDEX "idx_delay_reasons_codigo" ON "rh"."delay_reasons" USING "btree" ("codigo");



CREATE INDEX "idx_delay_reasons_company_id" ON "rh"."delay_reasons" USING "btree" ("company_id");



CREATE INDEX "idx_delay_reasons_tipo" ON "rh"."delay_reasons" USING "btree" ("tipo");



CREATE INDEX "idx_dependents_company_id" ON "rh"."dependents" USING "btree" ("company_id");



CREATE INDEX "idx_dependents_cpf" ON "rh"."dependents" USING "btree" ("cpf");



CREATE INDEX "idx_dependents_data_nascimento" ON "rh"."dependents" USING "btree" ("data_nascimento");



CREATE INDEX "idx_dependents_employee_id" ON "rh"."dependents" USING "btree" ("employee_id");



CREATE INDEX "idx_dependents_parentesco" ON "rh"."dependents" USING "btree" ("parentesco");



CREATE INDEX "idx_dependents_status" ON "rh"."dependents" USING "btree" ("status");



CREATE INDEX "idx_disciplinary_actions_company_id" ON "rh"."disciplinary_actions" USING "btree" ("company_id");



CREATE INDEX "idx_disciplinary_actions_data_aplicacao" ON "rh"."disciplinary_actions" USING "btree" ("data_aplicacao");



CREATE INDEX "idx_disciplinary_actions_data_ocorrencia" ON "rh"."disciplinary_actions" USING "btree" ("data_ocorrencia");



CREATE INDEX "idx_disciplinary_actions_duration_days" ON "rh"."disciplinary_actions" USING "btree" ("duration_days");



CREATE INDEX "idx_disciplinary_actions_employee_id" ON "rh"."disciplinary_actions" USING "btree" ("employee_id");



CREATE INDEX "idx_disciplinary_actions_end_date" ON "rh"."disciplinary_actions" USING "btree" ("end_date");



CREATE INDEX "idx_disciplinary_actions_gravidade" ON "rh"."disciplinary_actions" USING "btree" ("gravidade");



CREATE INDEX "idx_disciplinary_actions_is_active" ON "rh"."disciplinary_actions" USING "btree" ("is_active");



CREATE INDEX "idx_disciplinary_actions_start_date" ON "rh"."disciplinary_actions" USING "btree" ("start_date");



CREATE INDEX "idx_disciplinary_actions_status" ON "rh"."disciplinary_actions" USING "btree" ("status");



CREATE INDEX "idx_disciplinary_actions_tipo_acao" ON "rh"."disciplinary_actions" USING "btree" ("tipo_acao");



CREATE INDEX "idx_employee_medical_plans_company_id" ON "rh"."employee_medical_plans" USING "btree" ("company_id");



CREATE INDEX "idx_employee_medical_plans_employee_id" ON "rh"."employee_medical_plans" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_medical_plans_plan_id" ON "rh"."employee_medical_plans" USING "btree" ("plan_id");



CREATE INDEX "idx_employee_medical_plans_status" ON "rh"."employee_medical_plans" USING "btree" ("status");



CREATE INDEX "idx_employee_plan_dependents_company_id" ON "rh"."employee_plan_dependents" USING "btree" ("company_id");



CREATE INDEX "idx_employee_plan_dependents_employee_plan_id" ON "rh"."employee_plan_dependents" USING "btree" ("employee_plan_id");



CREATE INDEX "idx_employee_plan_dependents_status" ON "rh"."employee_plan_dependents" USING "btree" ("status");



CREATE INDEX "idx_employee_shifts_ativo" ON "rh"."employee_shifts" USING "btree" ("ativo");



CREATE INDEX "idx_employee_shifts_company_id" ON "rh"."employee_shifts" USING "btree" ("company_id");



CREATE INDEX "idx_employee_shifts_data_inicio" ON "rh"."employee_shifts" USING "btree" ("data_inicio");



CREATE INDEX "idx_employee_shifts_funcionario_id" ON "rh"."employee_shifts" USING "btree" ("funcionario_id");



CREATE INDEX "idx_employee_shifts_turno_id" ON "rh"."employee_shifts" USING "btree" ("turno_id");



CREATE INDEX "idx_employee_union_memberships_company_id" ON "rh"."employee_union_memberships" USING "btree" ("company_id");



CREATE INDEX "idx_employee_union_memberships_employee_id" ON "rh"."employee_union_memberships" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_union_memberships_status" ON "rh"."employee_union_memberships" USING "btree" ("status");



CREATE INDEX "idx_employee_union_memberships_union_id" ON "rh"."employee_union_memberships" USING "btree" ("union_id");



CREATE INDEX "idx_employees_cargo_id" ON "rh"."employees" USING "btree" ("cargo_id");



CREATE INDEX "idx_employees_company_id" ON "rh"."employees" USING "btree" ("company_id");



CREATE INDEX "idx_employees_cpf" ON "rh"."employees" USING "btree" ("cpf");



CREATE INDEX "idx_employees_status" ON "rh"."employees" USING "btree" ("status");



CREATE INDEX "idx_employees_user_id" ON "rh"."employees" USING "btree" ("user_id");



CREATE INDEX "idx_employment_contracts_company_id" ON "rh"."employment_contracts" USING "btree" ("company_id");



CREATE INDEX "idx_employment_contracts_data_inicio" ON "rh"."employment_contracts" USING "btree" ("data_inicio");



CREATE INDEX "idx_employment_contracts_employee_id" ON "rh"."employment_contracts" USING "btree" ("employee_id");



CREATE INDEX "idx_employment_contracts_numero" ON "rh"."employment_contracts" USING "btree" ("numero_contrato");



CREATE INDEX "idx_employment_contracts_status" ON "rh"."employment_contracts" USING "btree" ("status");



CREATE INDEX "idx_employment_contracts_tipo" ON "rh"."employment_contracts" USING "btree" ("tipo_contrato");



CREATE INDEX "idx_esocial_batches_batch_number" ON "rh"."esocial_batches" USING "btree" ("batch_number");



CREATE INDEX "idx_esocial_batches_company_id" ON "rh"."esocial_batches" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_batches_period" ON "rh"."esocial_batches" USING "btree" ("period");



CREATE INDEX "idx_esocial_batches_status" ON "rh"."esocial_batches" USING "btree" ("status");



CREATE INDEX "idx_esocial_config_ambiente" ON "rh"."esocial_config" USING "btree" ("ambiente");



CREATE INDEX "idx_esocial_config_ativo" ON "rh"."esocial_config" USING "btree" ("ativo");



CREATE INDEX "idx_esocial_config_company_id" ON "rh"."esocial_config" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_events_company_id" ON "rh"."esocial_events" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_events_data_envio" ON "rh"."esocial_events" USING "btree" ("data_envio");



CREATE INDEX "idx_esocial_events_employee_id" ON "rh"."esocial_events" USING "btree" ("employee_id");



CREATE INDEX "idx_esocial_events_numero_recibo" ON "rh"."esocial_events" USING "btree" ("numero_recibo");



CREATE INDEX "idx_esocial_events_status" ON "rh"."esocial_events" USING "btree" ("status");



CREATE INDEX "idx_esocial_events_tipo_evento" ON "rh"."esocial_events" USING "btree" ("tipo_evento");



CREATE INDEX "idx_esocial_integrations_company_id" ON "rh"."esocial_integrations" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_integrations_funcionario_id" ON "rh"."esocial_integrations" USING "btree" ("funcionario_id");



CREATE INDEX "idx_esocial_integrations_protocolo" ON "rh"."esocial_integrations" USING "btree" ("protocolo");



CREATE INDEX "idx_esocial_integrations_status" ON "rh"."esocial_integrations" USING "btree" ("status");



CREATE INDEX "idx_esocial_integrations_tipo_evento" ON "rh"."esocial_integrations" USING "btree" ("tipo_evento");



CREATE INDEX "idx_esocial_logs_company_id" ON "rh"."esocial_logs" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_logs_created_at" ON "rh"."esocial_logs" USING "btree" ("created_at");



CREATE INDEX "idx_esocial_logs_event_id" ON "rh"."esocial_logs" USING "btree" ("event_id");



CREATE INDEX "idx_esocial_logs_status" ON "rh"."esocial_logs" USING "btree" ("status");



CREATE INDEX "idx_esocial_logs_tipo_operacao" ON "rh"."esocial_logs" USING "btree" ("tipo_operacao");



CREATE INDEX "idx_event_consolidations_company_id" ON "rh"."event_consolidations" USING "btree" ("company_id");



CREATE INDEX "idx_event_consolidations_periodo" ON "rh"."event_consolidations" USING "btree" ("periodo");



CREATE INDEX "idx_event_consolidations_status" ON "rh"."event_consolidations" USING "btree" ("status");



CREATE INDEX "idx_fgts_config_ano_mes" ON "rh"."fgts_config" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_fgts_config_ativo" ON "rh"."fgts_config" USING "btree" ("ativo");



CREATE INDEX "idx_fgts_config_codigo" ON "rh"."fgts_config" USING "btree" ("codigo");



CREATE INDEX "idx_fgts_config_company_id" ON "rh"."fgts_config" USING "btree" ("company_id");



CREATE INDEX "idx_fgts_config_vigencia" ON "rh"."fgts_config" USING "btree" ("ano_vigencia", "mes_vigencia", "ativo");



CREATE INDEX "idx_holidays_ano" ON "rh"."holidays" USING "btree" (EXTRACT(year FROM "data"));



CREATE INDEX "idx_holidays_ativo" ON "rh"."holidays" USING "btree" ("ativo");



CREATE INDEX "idx_holidays_company_id" ON "rh"."holidays" USING "btree" ("company_id");



CREATE INDEX "idx_holidays_data" ON "rh"."holidays" USING "btree" ("data");



CREATE INDEX "idx_holidays_tipo" ON "rh"."holidays" USING "btree" ("tipo");



CREATE INDEX "idx_inss_brackets_ano_mes" ON "rh"."inss_brackets" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_inss_brackets_ativo" ON "rh"."inss_brackets" USING "btree" ("ativo");



CREATE INDEX "idx_inss_brackets_codigo" ON "rh"."inss_brackets" USING "btree" ("codigo");



CREATE INDEX "idx_inss_brackets_company_id" ON "rh"."inss_brackets" USING "btree" ("company_id");



CREATE INDEX "idx_inss_brackets_vigencia" ON "rh"."inss_brackets" USING "btree" ("ano_vigencia", "mes_vigencia", "ativo");



CREATE INDEX "idx_irrf_brackets_ano_mes" ON "rh"."irrf_brackets" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_irrf_brackets_ativo" ON "rh"."irrf_brackets" USING "btree" ("ativo");



CREATE INDEX "idx_irrf_brackets_codigo" ON "rh"."irrf_brackets" USING "btree" ("codigo");



CREATE INDEX "idx_irrf_brackets_company_id" ON "rh"."irrf_brackets" USING "btree" ("company_id");



CREATE INDEX "idx_irrf_brackets_vigencia" ON "rh"."irrf_brackets" USING "btree" ("ano_vigencia", "mes_vigencia", "ativo");



CREATE INDEX "idx_medical_agreements_ativo" ON "rh"."medical_agreements" USING "btree" ("ativo");



CREATE INDEX "idx_medical_agreements_company_id" ON "rh"."medical_agreements" USING "btree" ("company_id");



CREATE INDEX "idx_medical_agreements_tipo" ON "rh"."medical_agreements" USING "btree" ("tipo");



CREATE INDEX "idx_medical_certificate_attachments_certificate_id" ON "rh"."medical_certificate_attachments" USING "btree" ("certificate_id");



CREATE INDEX "idx_medical_certificates_company_id" ON "rh"."medical_certificates" USING "btree" ("company_id");



CREATE INDEX "idx_medical_certificates_data_inicio" ON "rh"."medical_certificates" USING "btree" ("data_inicio");



CREATE INDEX "idx_medical_certificates_employee_id" ON "rh"."medical_certificates" USING "btree" ("employee_id");



CREATE INDEX "idx_medical_certificates_status" ON "rh"."medical_certificates" USING "btree" ("status");



CREATE INDEX "idx_medical_certificates_tipo_atestado" ON "rh"."medical_certificates" USING "btree" ("tipo_atestado");



CREATE INDEX "idx_medical_plan_pricing_history_company_id" ON "rh"."medical_plan_pricing_history" USING "btree" ("company_id");



CREATE INDEX "idx_medical_plan_pricing_history_data_vigencia" ON "rh"."medical_plan_pricing_history" USING "btree" ("data_vigencia");



CREATE INDEX "idx_medical_plan_pricing_history_plan_id" ON "rh"."medical_plan_pricing_history" USING "btree" ("plan_id");



CREATE INDEX "idx_medical_plans_agreement_id" ON "rh"."medical_plans" USING "btree" ("agreement_id");



CREATE INDEX "idx_medical_plans_ativo" ON "rh"."medical_plans" USING "btree" ("ativo");



CREATE INDEX "idx_medical_plans_categoria" ON "rh"."medical_plans" USING "btree" ("categoria");



CREATE INDEX "idx_medical_plans_company_id" ON "rh"."medical_plans" USING "btree" ("company_id");



CREATE INDEX "idx_payroll_config_ativo" ON "rh"."payroll_config" USING "btree" ("ativo");



CREATE INDEX "idx_payroll_config_company_id" ON "rh"."payroll_config" USING "btree" ("company_id");



CREATE INDEX "idx_payroll_config_periodo" ON "rh"."payroll_config" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_payroll_events_company_id" ON "rh"."payroll_events" USING "btree" ("company_id");



CREATE INDEX "idx_payroll_events_employee_id" ON "rh"."payroll_events" USING "btree" ("employee_id");



CREATE INDEX "idx_payroll_events_payroll_id" ON "rh"."payroll_events" USING "btree" ("payroll_id");



CREATE INDEX "idx_payroll_events_periodo" ON "rh"."payroll_events" USING "btree" ("ano_referencia", "mes_referencia");



CREATE INDEX "idx_payroll_events_rubrica" ON "rh"."payroll_events" USING "btree" ("rubrica_id");



CREATE INDEX "idx_payroll_events_tipo" ON "rh"."payroll_events" USING "btree" ("tipo_rubrica");



CREATE INDEX "idx_periodic_exams_company_id" ON "rh"."periodic_exams" USING "btree" ("company_id");



CREATE INDEX "idx_periodic_exams_data_agendamento" ON "rh"."periodic_exams" USING "btree" ("data_agendamento");



CREATE INDEX "idx_periodic_exams_data_vencimento" ON "rh"."periodic_exams" USING "btree" ("data_vencimento");



CREATE INDEX "idx_periodic_exams_employee_id" ON "rh"."periodic_exams" USING "btree" ("employee_id");



CREATE INDEX "idx_periodic_exams_resultado" ON "rh"."periodic_exams" USING "btree" ("resultado");



CREATE INDEX "idx_periodic_exams_status" ON "rh"."periodic_exams" USING "btree" ("status");



CREATE INDEX "idx_periodic_exams_tipo_exame" ON "rh"."periodic_exams" USING "btree" ("tipo_exame");



CREATE INDEX "idx_reports_company_id" ON "rh"."reports" USING "btree" ("company_id");



CREATE INDEX "idx_reports_data_geracao" ON "rh"."reports" USING "btree" ("data_geracao");



CREATE INDEX "idx_reports_status" ON "rh"."reports" USING "btree" ("status");



CREATE INDEX "idx_reports_tipo" ON "rh"."reports" USING "btree" ("tipo");



CREATE INDEX "idx_rubricas_ativo" ON "rh"."rubricas" USING "btree" ("ativo");



CREATE INDEX "idx_rubricas_categoria" ON "rh"."rubricas" USING "btree" ("categoria");



CREATE INDEX "idx_rubricas_codigo" ON "rh"."rubricas" USING "btree" ("codigo");



CREATE INDEX "idx_rubricas_company_id" ON "rh"."rubricas" USING "btree" ("company_id");



CREATE INDEX "idx_rubricas_ordem" ON "rh"."rubricas" USING "btree" ("ordem_exibicao");



CREATE INDEX "idx_rubricas_tipo" ON "rh"."rubricas" USING "btree" ("tipo");



CREATE INDEX "idx_schedule_planning_company_id" ON "rh"."schedule_planning" USING "btree" ("company_id");



CREATE INDEX "idx_schedule_planning_periodo_fim" ON "rh"."schedule_planning" USING "btree" ("periodo_fim");



CREATE INDEX "idx_schedule_planning_periodo_inicio" ON "rh"."schedule_planning" USING "btree" ("periodo_inicio");



CREATE INDEX "idx_schedule_planning_status" ON "rh"."schedule_planning" USING "btree" ("status");



CREATE INDEX "idx_time_bank_company_id" ON "rh"."time_bank" USING "btree" ("company_id");



CREATE INDEX "idx_time_bank_data_registro" ON "rh"."time_bank" USING "btree" ("data_registro");



CREATE INDEX "idx_time_bank_employee_id" ON "rh"."time_bank" USING "btree" ("employee_id");



CREATE INDEX "idx_time_bank_status" ON "rh"."time_bank" USING "btree" ("status");



CREATE INDEX "idx_time_bank_tipo_hora" ON "rh"."time_bank" USING "btree" ("tipo_hora");



CREATE INDEX "idx_time_records_company_id" ON "rh"."time_records" USING "btree" ("company_id");



CREATE INDEX "idx_time_records_data_registro" ON "rh"."time_records" USING "btree" ("data_registro");



CREATE INDEX "idx_time_records_employee_id" ON "rh"."time_records" USING "btree" ("employee_id");



CREATE INDEX "idx_time_records_status" ON "rh"."time_records" USING "btree" ("status");



CREATE INDEX "idx_training_notification_history_employee_id" ON "rh"."training_notification_history" USING "btree" ("employee_id");



CREATE INDEX "idx_training_notification_history_training_id" ON "rh"."training_notification_history" USING "btree" ("training_id");



CREATE INDEX "idx_training_notification_queue_company_id" ON "rh"."training_notification_queue" USING "btree" ("company_id");



CREATE INDEX "idx_training_notification_queue_data_agendamento" ON "rh"."training_notification_queue" USING "btree" ("data_agendamento");



CREATE INDEX "idx_training_notification_queue_status" ON "rh"."training_notification_queue" USING "btree" ("status");



CREATE INDEX "idx_training_settings_active" ON "rh"."training_settings" USING "btree" ("is_active");



CREATE INDEX "idx_training_settings_company_id" ON "rh"."training_settings" USING "btree" ("company_id");



CREATE UNIQUE INDEX "idx_training_settings_company_unique" ON "rh"."training_settings" USING "btree" ("company_id") WHERE ("is_active" = true);



CREATE INDEX "idx_trainings_company_id" ON "rh"."trainings" USING "btree" ("company_id");



CREATE INDEX "idx_trainings_data_fim" ON "rh"."trainings" USING "btree" ("data_fim");



CREATE INDEX "idx_trainings_data_inicio" ON "rh"."trainings" USING "btree" ("data_inicio");



CREATE INDEX "idx_trainings_status" ON "rh"."trainings" USING "btree" ("status");



CREATE INDEX "idx_trainings_tipo" ON "rh"."trainings" USING "btree" ("tipo_treinamento");



CREATE INDEX "idx_union_contributions_company_id" ON "rh"."union_contributions" USING "btree" ("company_id");



CREATE INDEX "idx_union_contributions_employee_id" ON "rh"."union_contributions" USING "btree" ("employee_id");



CREATE INDEX "idx_union_contributions_mes_referencia" ON "rh"."union_contributions" USING "btree" ("mes_referencia");



CREATE INDEX "idx_union_contributions_status" ON "rh"."union_contributions" USING "btree" ("status");



CREATE INDEX "idx_union_contributions_union_id" ON "rh"."union_contributions" USING "btree" ("union_id");



CREATE INDEX "idx_union_negotiations_company_id" ON "rh"."union_negotiations" USING "btree" ("company_id");



CREATE INDEX "idx_union_negotiations_status" ON "rh"."union_negotiations" USING "btree" ("status");



CREATE INDEX "idx_union_negotiations_tipo_negociacao" ON "rh"."union_negotiations" USING "btree" ("tipo_negociacao");



CREATE INDEX "idx_union_negotiations_union_id" ON "rh"."union_negotiations" USING "btree" ("union_id");



CREATE INDEX "idx_union_representatives_company_id" ON "rh"."union_representatives" USING "btree" ("company_id");



CREATE INDEX "idx_union_representatives_employee_id" ON "rh"."union_representatives" USING "btree" ("employee_id");



CREATE INDEX "idx_union_representatives_status" ON "rh"."union_representatives" USING "btree" ("status");



CREATE INDEX "idx_union_representatives_union_id" ON "rh"."union_representatives" USING "btree" ("union_id");



CREATE INDEX "idx_unions_ativo" ON "rh"."unions" USING "btree" ("ativo");



CREATE INDEX "idx_unions_categoria" ON "rh"."unions" USING "btree" ("categoria");



CREATE INDEX "idx_unions_company_id" ON "rh"."unions" USING "btree" ("company_id");



CREATE INDEX "idx_unions_tipo" ON "rh"."unions" USING "btree" ("tipo");



CREATE INDEX "idx_work_shifts_codigo" ON "rh"."work_shifts" USING "btree" ("codigo");



CREATE INDEX "idx_work_shifts_company_id" ON "rh"."work_shifts" USING "btree" ("company_id");



CREATE INDEX "idx_work_shifts_status" ON "rh"."work_shifts" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "trigger_create_contas_pagar_approvals" AFTER INSERT ON "financeiro"."contas_pagar" FOR EACH ROW EXECUTE FUNCTION "financeiro"."create_approvals_trigger"();



CREATE OR REPLACE TRIGGER "update_aprovacoes_updated_at" BEFORE UPDATE ON "financeiro"."aprovacoes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_borderos_updated_at" BEFORE UPDATE ON "financeiro"."borderos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_conciliacoes_bancarias_updated_at" BEFORE UPDATE ON "financeiro"."conciliacoes_bancarias" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_configuracoes_aprovacao_updated_at" BEFORE UPDATE ON "financeiro"."configuracoes_aprovacao" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_contas_bancarias_updated_at" BEFORE UPDATE ON "financeiro"."contas_bancarias" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_contas_pagar_updated_at" BEFORE UPDATE ON "financeiro"."contas_pagar" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_contas_receber_updated_at" BEFORE UPDATE ON "financeiro"."contas_receber" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_fluxo_caixa_updated_at" BEFORE UPDATE ON "financeiro"."fluxo_caixa" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_lancamentos_contabeis_updated_at" BEFORE UPDATE ON "financeiro"."lancamentos_contabeis" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_nfe_updated_at" BEFORE UPDATE ON "financeiro"."nfe" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_nfse_updated_at" BEFORE UPDATE ON "financeiro"."nfse" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_plano_contas_updated_at" BEFORE UPDATE ON "financeiro"."plano_contas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_remessas_bancarias_updated_at" BEFORE UPDATE ON "financeiro"."remessas_bancarias" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_retornos_bancarios_updated_at" BEFORE UPDATE ON "financeiro"."retornos_bancarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



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



CREATE OR REPLACE TRIGGER "trigger_audit_approval_levels" AFTER INSERT OR DELETE OR UPDATE ON "rh"."approval_levels" FOR EACH ROW EXECUTE FUNCTION "public"."audit_approval_levels"();



CREATE OR REPLACE TRIGGER "trigger_audit_compensation_approvals" AFTER INSERT OR UPDATE ON "rh"."compensation_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."audit_compensation_approvals"();



CREATE OR REPLACE TRIGGER "trigger_audit_compensation_requests" AFTER INSERT OR DELETE OR UPDATE ON "rh"."compensation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_compensation_requests"();



CREATE OR REPLACE TRIGGER "trigger_calculate_medical_certificate_days" BEFORE INSERT OR UPDATE ON "rh"."medical_certificates" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_medical_certificate_days"();



CREATE OR REPLACE TRIGGER "trigger_create_compensation_approvals" AFTER INSERT ON "rh"."compensation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_compensation_approvals"();



CREATE OR REPLACE TRIGGER "trigger_create_training_notification_rules" AFTER INSERT ON "rh"."trainings" FOR EACH ROW EXECUTE FUNCTION "rh"."trigger_create_training_notification_rules"();



CREATE OR REPLACE TRIGGER "trigger_update_absence_types_updated_at" BEFORE UPDATE ON "rh"."absence_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_absence_types_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_allowance_types_updated_at" BEFORE UPDATE ON "rh"."allowance_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_allowance_types_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_approval_levels_updated_at" BEFORE UPDATE ON "rh"."approval_levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_approval_levels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_audit_config_updated_at" BEFORE UPDATE ON "rh"."audit_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_audit_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_cid_codes_updated_at" BEFORE UPDATE ON "rh"."cid_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_cid_codes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_compensation_approvals_updated_at" BEFORE UPDATE ON "rh"."compensation_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."update_compensation_approvals_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_compensation_requests_updated_at" BEFORE UPDATE ON "rh"."compensation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_compensation_requests_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_deficiency_types_updated_at" BEFORE UPDATE ON "rh"."deficiency_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_deficiency_types_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_delay_reasons_updated_at" BEFORE UPDATE ON "rh"."delay_reasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_delay_reasons_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_disciplinary_actions_updated_at" BEFORE UPDATE ON "rh"."disciplinary_actions" FOR EACH ROW EXECUTE FUNCTION "public"."update_disciplinary_actions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_employee_shifts_updated_at" BEFORE UPDATE ON "rh"."employee_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_employee_shifts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_employment_contracts_updated_at" BEFORE UPDATE ON "rh"."employment_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_employment_contracts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_esocial_integrations_updated_at" BEFORE UPDATE ON "rh"."esocial_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_esocial_integrations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_event_consolidations_updated_at" BEFORE UPDATE ON "rh"."event_consolidations" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_consolidations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_fgts_config_updated_at" BEFORE UPDATE ON "rh"."fgts_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_fgts_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_inss_brackets_updated_at" BEFORE UPDATE ON "rh"."inss_brackets" FOR EACH ROW EXECUTE FUNCTION "public"."update_inss_brackets_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_irrf_brackets_updated_at" BEFORE UPDATE ON "rh"."irrf_brackets" FOR EACH ROW EXECUTE FUNCTION "public"."update_irrf_brackets_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_reports_updated_at" BEFORE UPDATE ON "rh"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_reports_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_rubricas_updated_at" BEFORE UPDATE ON "rh"."rubricas" FOR EACH ROW EXECUTE FUNCTION "public"."update_rubricas_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_schedule_planning_updated_at" BEFORE UPDATE ON "rh"."schedule_planning" FOR EACH ROW EXECUTE FUNCTION "public"."update_schedule_planning_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_work_shifts_updated_at" BEFORE UPDATE ON "rh"."work_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_shifts_updated_at"();



CREATE OR REPLACE TRIGGER "update_bank_hours_balance_updated_at" BEFORE UPDATE ON "rh"."bank_hours_balance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_hours_config_updated_at" BEFORE UPDATE ON "rh"."bank_hours_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_hours_transactions_updated_at" BEFORE UPDATE ON "rh"."bank_hours_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_collective_agreements_updated_at" BEFORE UPDATE ON "rh"."collective_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dependents_updated_at" BEFORE UPDATE ON "rh"."dependents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_medical_plans_updated_at" BEFORE UPDATE ON "rh"."employee_medical_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_plan_dependents_updated_at" BEFORE UPDATE ON "rh"."employee_plan_dependents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_union_memberships_updated_at" BEFORE UPDATE ON "rh"."employee_union_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_agreements_updated_at" BEFORE UPDATE ON "rh"."medical_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_plans_updated_at" BEFORE UPDATE ON "rh"."medical_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_settings_updated_at" BEFORE UPDATE ON "rh"."training_settings" FOR EACH ROW EXECUTE FUNCTION "rh"."update_training_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_union_contributions_updated_at" BEFORE UPDATE ON "rh"."union_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_union_negotiations_updated_at" BEFORE UPDATE ON "rh"."union_negotiations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_union_representatives_updated_at" BEFORE UPDATE ON "rh"."union_representatives" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_unions_updated_at" BEFORE UPDATE ON "rh"."unions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "financeiro"."aprovacoes"
    ADD CONSTRAINT "aprovacoes_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."aprovacoes"
    ADD CONSTRAINT "aprovacoes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."borderos"
    ADD CONSTRAINT "borderos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."borderos"
    ADD CONSTRAINT "borderos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."conciliacoes_bancarias"
    ADD CONSTRAINT "conciliacoes_bancarias_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."conciliacoes_bancarias"
    ADD CONSTRAINT "conciliacoes_bancarias_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "financeiro"."contas_bancarias"("id");



ALTER TABLE ONLY "financeiro"."conciliacoes_bancarias"
    ADD CONSTRAINT "conciliacoes_bancarias_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."configuracoes_aprovacao"
    ADD CONSTRAINT "configuracoes_aprovacao_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "financeiro"."configuracoes_aprovacao"
    ADD CONSTRAINT "configuracoes_aprovacao_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."configuracoes_aprovacao"
    ADD CONSTRAINT "configuracoes_aprovacao_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."configuracoes_aprovacao"
    ADD CONSTRAINT "configuracoes_aprovacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."contas_bancarias"
    ADD CONSTRAINT "contas_bancarias_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."contas_bancarias"
    ADD CONSTRAINT "contas_bancarias_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "financeiro"."contas_pagar"
    ADD CONSTRAINT "contas_pagar_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."contas_receber"
    ADD CONSTRAINT "contas_receber_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "financeiro"."fluxo_caixa"
    ADD CONSTRAINT "fluxo_caixa_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "financeiro"."fluxo_caixa"
    ADD CONSTRAINT "fluxo_caixa_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."fluxo_caixa"
    ADD CONSTRAINT "fluxo_caixa_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "financeiro"."contas_bancarias"("id");



ALTER TABLE ONLY "financeiro"."fluxo_caixa"
    ADD CONSTRAINT "fluxo_caixa_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."fluxo_caixa"
    ADD CONSTRAINT "fluxo_caixa_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_conta_credito_id_fkey" FOREIGN KEY ("conta_credito_id") REFERENCES "financeiro"."plano_contas"("id");



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_conta_debito_id_fkey" FOREIGN KEY ("conta_debito_id") REFERENCES "financeiro"."plano_contas"("id");



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "financeiro"."nfe"
    ADD CONSTRAINT "nfe_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."nfe"
    ADD CONSTRAINT "nfe_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."nfse"
    ADD CONSTRAINT "nfse_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."nfse"
    ADD CONSTRAINT "nfse_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."plano_contas"
    ADD CONSTRAINT "plano_contas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."plano_contas"
    ADD CONSTRAINT "plano_contas_conta_pai_id_fkey" FOREIGN KEY ("conta_pai_id") REFERENCES "financeiro"."plano_contas"("id");



ALTER TABLE ONLY "financeiro"."plano_contas"
    ADD CONSTRAINT "plano_contas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."remessas_bancarias"
    ADD CONSTRAINT "remessas_bancarias_borderos_id_fkey" FOREIGN KEY ("borderos_id") REFERENCES "financeiro"."borderos"("id");



ALTER TABLE ONLY "financeiro"."remessas_bancarias"
    ADD CONSTRAINT "remessas_bancarias_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."remessas_bancarias"
    ADD CONSTRAINT "remessas_bancarias_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."retornos_bancarios"
    ADD CONSTRAINT "retornos_bancarios_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "financeiro"."retornos_bancarios"
    ADD CONSTRAINT "retornos_bancarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "financeiro"."retornos_bancarios"
    ADD CONSTRAINT "retornos_bancarios_remessa_id_fkey" FOREIGN KEY ("remessa_id") REFERENCES "financeiro"."remessas_bancarias"("id");



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
    ADD CONSTRAINT "partners_matriz_id_fkey" FOREIGN KEY ("matriz_id") REFERENCES "public"."partners"("id");



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



ALTER TABLE ONLY "rh"."absence_types"
    ADD CONSTRAINT "absence_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "allowance_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."approval_level_approvers"
    ADD CONSTRAINT "approval_level_approvers_approval_level_id_fkey" FOREIGN KEY ("approval_level_id") REFERENCES "rh"."approval_levels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."approval_level_approvers"
    ADD CONSTRAINT "approval_level_approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."approval_levels"
    ADD CONSTRAINT "approval_levels_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."audit_config"
    ADD CONSTRAINT "audit_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_calculations"
    ADD CONSTRAINT "bank_hours_calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_time_record_id_fkey" FOREIGN KEY ("time_record_id") REFERENCES "rh"."time_records"("id");



ALTER TABLE ONLY "rh"."benefit_configurations"
    ADD CONSTRAINT "benefit_configurations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."calculation_logs"
    ADD CONSTRAINT "calculation_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "rh"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."candidates"
    ADD CONSTRAINT "candidates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."cid_codes"
    ADD CONSTRAINT "cid_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."collective_agreements"
    ADD CONSTRAINT "collective_agreements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."collective_agreements"
    ADD CONSTRAINT "collective_agreements_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_approval_level_id_fkey" FOREIGN KEY ("approval_level_id") REFERENCES "rh"."approval_levels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_compensation_request_id_fkey" FOREIGN KEY ("compensation_request_id") REFERENCES "rh"."compensation_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_funcionario_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."deficiency_types"
    ADD CONSTRAINT "deficiency_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."delay_reasons"
    ADD CONSTRAINT "delay_reasons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_aplicado_por_fkey" FOREIGN KEY ("aplicado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_benefit_config_id_fkey" FOREIGN KEY ("benefit_config_id") REFERENCES "rh"."benefit_configurations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rh"."medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_plan_dependents"
    ADD CONSTRAINT "employee_plan_dependents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_plan_dependents"
    ADD CONSTRAINT "employee_plan_dependents_employee_plan_id_fkey" FOREIGN KEY ("employee_plan_id") REFERENCES "rh"."employee_medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "rh"."work_schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "rh"."work_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_gestor_imediato_id_fkey" FOREIGN KEY ("gestor_imediato_id") REFERENCES "rh"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "employment_contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "employment_contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."esocial_config"
    ADD CONSTRAINT "esocial_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "rh"."esocial_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."esocial_integrations"
    ADD CONSTRAINT "esocial_integrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_integrations"
    ADD CONSTRAINT "esocial_integrations_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "rh"."employees"("id");



ALTER TABLE ONLY "rh"."esocial_logs"
    ADD CONSTRAINT "esocial_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_logs"
    ADD CONSTRAINT "esocial_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "rh"."esocial_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."event_consolidations"
    ADD CONSTRAINT "event_consolidations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."fgts_config"
    ADD CONSTRAINT "fgts_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "fk_employees_cargo_id" FOREIGN KEY ("cargo_id") REFERENCES "rh"."positions"("id");



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "fk_employees_departamento_id" FOREIGN KEY ("departamento_id") REFERENCES "rh"."units"("id");



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "fk_employment_contracts_employee_id" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."gestor_notifications"
    ADD CONSTRAINT "gestor_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."gestor_notifications"
    ADD CONSTRAINT "gestor_notifications_gestor_id_fkey" FOREIGN KEY ("gestor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."holidays"
    ADD CONSTRAINT "holidays_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."inss_brackets"
    ADD CONSTRAINT "inss_brackets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."irrf_brackets"
    ADD CONSTRAINT "irrf_brackets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "rh"."job_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."medical_agreements"
    ADD CONSTRAINT "medical_agreements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "medical_certificate_attachments_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "rh"."medical_certificates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "medical_certificate_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rh"."medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "rh"."medical_agreements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_benefit_config_id_fkey" FOREIGN KEY ("benefit_config_id") REFERENCES "rh"."benefit_configurations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_config"
    ADD CONSTRAINT "payroll_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "rh"."payroll"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_rubrica_id_fkey" FOREIGN KEY ("rubrica_id") REFERENCES "rh"."rubricas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "rh"."periodic_exams"
    ADD CONSTRAINT "periodic_exams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."periodic_exams"
    ADD CONSTRAINT "periodic_exams_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."positions"
    ADD CONSTRAINT "positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."reports"
    ADD CONSTRAINT "reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."rubricas"
    ADD CONSTRAINT "rubricas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."schedule_planning"
    ADD CONSTRAINT "schedule_planning_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "rh"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "rh"."job_openings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_selection_process_id_fkey" FOREIGN KEY ("selection_process_id") REFERENCES "rh"."selection_processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."talent_pool"
    ADD CONSTRAINT "talent_pool_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "rh"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."talent_pool"
    ADD CONSTRAINT "talent_pool_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_emitido_por_fkey" FOREIGN KEY ("emitido_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_inscrito_por_fkey" FOREIGN KEY ("inscrito_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "rh"."training_notification_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "rh"."training_notification_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "rh"."training_notification_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_types"
    ADD CONSTRAINT "training_notification_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_settings"
    ADD CONSTRAINT "training_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."trainings"
    ADD CONSTRAINT "trainings_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."trainings"
    ADD CONSTRAINT "trainings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_negotiations"
    ADD CONSTRAINT "union_negotiations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_negotiations"
    ADD CONSTRAINT "union_negotiations_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."unions"
    ADD CONSTRAINT "unions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "rh"."employees"("id");



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "vacation_entitlements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "vacation_entitlements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacation_periods"
    ADD CONSTRAINT "vacation_periods_vacation_id_fkey" FOREIGN KEY ("vacation_id") REFERENCES "rh"."vacations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."work_schedules"
    ADD CONSTRAINT "work_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."work_shifts"
    ADD CONSTRAINT "work_shifts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create contas_pagar in their companies" ON "financeiro"."contas_pagar" FOR INSERT WITH CHECK ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'create'::"text")));



CREATE POLICY "Users can create contas_receber in their companies" ON "financeiro"."contas_receber" FOR INSERT WITH CHECK ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'create'::"text")));



CREATE POLICY "Users can delete contas_pagar in their companies" ON "financeiro"."contas_pagar" FOR DELETE USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'delete'::"text")));



CREATE POLICY "Users can delete contas_receber in their companies" ON "financeiro"."contas_receber" FOR DELETE USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'delete'::"text")));



CREATE POLICY "Users can manage aprovacoes in their companies" ON "financeiro"."aprovacoes" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage borderos in their companies" ON "financeiro"."borderos" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage conciliacoes_bancarias in their companies" ON "financeiro"."conciliacoes_bancarias" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage configuracoes_aprovacao in their companies" ON "financeiro"."configuracoes_aprovacao" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage contas_bancarias in their companies" ON "financeiro"."contas_bancarias" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage fluxo_caixa in their companies" ON "financeiro"."fluxo_caixa" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage lancamentos_contabeis in their companies" ON "financeiro"."lancamentos_contabeis" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage nfe in their companies" ON "financeiro"."nfe" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage nfse in their companies" ON "financeiro"."nfse" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage plano_contas in their companies" ON "financeiro"."plano_contas" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage remessas_bancarias in their companies" ON "financeiro"."remessas_bancarias" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can manage retornos_bancarios in their companies" ON "financeiro"."retornos_bancarios" USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can update contas_pagar in their companies" ON "financeiro"."contas_pagar" FOR UPDATE USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can update contas_receber in their companies" ON "financeiro"."contas_receber" FOR UPDATE USING ((("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))) AND "financeiro"."check_financial_permission"("auth"."uid"(), 'edit'::"text")));



CREATE POLICY "Users can view aprovacoes of their companies" ON "financeiro"."aprovacoes" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view borderos of their companies" ON "financeiro"."borderos" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view conciliacoes_bancarias of their companies" ON "financeiro"."conciliacoes_bancarias" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view configuracoes_aprovacao of their companies" ON "financeiro"."configuracoes_aprovacao" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view contas_bancarias of their companies" ON "financeiro"."contas_bancarias" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view contas_pagar of their companies" ON "financeiro"."contas_pagar" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view contas_receber of their companies" ON "financeiro"."contas_receber" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view fluxo_caixa of their companies" ON "financeiro"."fluxo_caixa" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view lancamentos_contabeis of their companies" ON "financeiro"."lancamentos_contabeis" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view nfe of their companies" ON "financeiro"."nfe" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view nfse of their companies" ON "financeiro"."nfse" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view plano_contas of their companies" ON "financeiro"."plano_contas" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view remessas_bancarias of their companies" ON "financeiro"."remessas_bancarias" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users can view retornos_bancarios of their companies" ON "financeiro"."retornos_bancarios" FOR SELECT USING (("company_id" IN ( SELECT "uc"."company_id"
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



ALTER TABLE "financeiro"."aprovacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."borderos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."conciliacoes_bancarias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."configuracoes_aprovacao" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."contas_bancarias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."contas_pagar" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."contas_receber" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."fluxo_caixa" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."lancamentos_contabeis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."nfe" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."nfse" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."plano_contas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."remessas_bancarias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "financeiro"."retornos_bancarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can insert companies" ON "public"."companies" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can insert users" ON "public"."users" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage companies" ON "public"."companies" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage cost centers" ON "public"."cost_centers" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage entity permissions" ON "public"."entity_permissions" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage materials" ON "public"."materials" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage module permissions" ON "public"."module_permissions" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage partners" ON "public"."partners" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage profiles" ON "public"."profiles" USING ("public"."is_admin"("auth"."uid"()));



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


CREATE POLICY "Admins can manage approval levels" ON "rh"."approval_levels" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text"))))))));



CREATE POLICY "Admins can manage approvers" ON "rh"."approval_level_approvers" USING (("approval_level_id" IN ( SELECT "approval_levels"."id"
   FROM "rh"."approval_levels"
  WHERE ("approval_levels"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
                   FROM "public"."profiles"
                  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text"))))))))));



CREATE POLICY "Admins can manage audit config" ON "rh"."audit_config" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text"))))))));



CREATE POLICY "Approvers can manage their approvals" ON "rh"."compensation_approvals" USING ((("approver_id" = "auth"."uid"()) OR ("compensation_request_id" IN ( SELECT "compensation_requests"."id"
   FROM "rh"."compensation_requests"
  WHERE ("compensation_requests"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
                   FROM "public"."profiles"
                  WHERE (("profiles"."id" = "auth"."uid"()) AND ((("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text") OR (("profiles"."permissoes" ->> 'manager'::"text") = 'true'::"text"))))))))))));



CREATE POLICY "Employees can view their own periodic exams" ON "rh"."periodic_exams" FOR SELECT USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Employees can view their own periodic exams" ON "rh"."periodic_exams" IS 'Permite que colaboradores visualizem apenas seus prÃ³prios exames periÃ³dicos';



CREATE POLICY "System can insert audit logs" ON "rh"."audit_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage notification queue" ON "rh"."training_notification_queue" USING (true);



CREATE POLICY "Users can delete absence_types from their company" ON "rh"."absence_types" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete allowance_types from their company" ON "rh"."allowance_types" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete cid_codes from their company" ON "rh"."cid_codes" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete compensation_requests from their company" ON "rh"."compensation_requests" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete deficiency_types from their company" ON "rh"."deficiency_types" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete delay_reasons from their company" ON "rh"."delay_reasons" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete dependents from their company" ON "rh"."dependents" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can delete dependents from their company" ON "rh"."dependents" IS 'Permite excluir dependentes da empresa do usuÃ¡rio';



CREATE POLICY "Users can delete disciplinary actions from their company" ON "rh"."disciplinary_actions" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'delete'::"text")));



COMMENT ON POLICY "Users can delete disciplinary actions from their company" ON "rh"."disciplinary_actions" IS 'Permite excluir ações disciplinares da empresa do usuário';



CREATE POLICY "Users can delete employee_shifts from their company" ON "rh"."employee_shifts" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete employees from their company" ON "rh"."employees" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete employment_contracts from their company" ON "rh"."employment_contracts" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete esocial_integrations from their company" ON "rh"."esocial_integrations" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete event_consolidations from their company" ON "rh"."event_consolidations" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'event_consolidations'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete fgts_config from their company" ON "rh"."fgts_config" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete inss_brackets from their company" ON "rh"."inss_brackets" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete irrf_brackets from their company" ON "rh"."irrf_brackets" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete medical certificate attachments from their com" ON "rh"."medical_certificate_attachments" FOR DELETE USING (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can delete periodic exams from their company" ON "rh"."periodic_exams" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can delete periodic exams from their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios deletem exames periÃ³dicos da sua empresa';



CREATE POLICY "Users can delete positions from their company" ON "rh"."positions" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete reports from their company" ON "rh"."reports" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete rubricas from their company" ON "rh"."rubricas" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete schedule_planning from their company" ON "rh"."schedule_planning" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'schedule_planning'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete training settings for their company" ON "rh"."training_settings" FOR DELETE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete units from their company" ON "rh"."units" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete work_shifts from their company" ON "rh"."work_shifts" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'delete'::"text")));



CREATE POLICY "Users can insert absence_types in their company" ON "rh"."absence_types" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'create'::"text")));



CREATE POLICY "Users can insert allowance_types in their company" ON "rh"."allowance_types" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'create'::"text")));



CREATE POLICY "Users can insert cid_codes in their company" ON "rh"."cid_codes" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'create'::"text")));



CREATE POLICY "Users can insert compensation_requests in their company" ON "rh"."compensation_requests" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'create'::"text")));



CREATE POLICY "Users can insert deficiency_types in their company" ON "rh"."deficiency_types" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'create'::"text")));



CREATE POLICY "Users can insert delay_reasons in their company" ON "rh"."delay_reasons" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'create'::"text")));



CREATE POLICY "Users can insert dependents in their company" ON "rh"."dependents" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can insert dependents in their company" ON "rh"."dependents" IS 'Permite inserir dependentes na empresa do usuÃ¡rio';



CREATE POLICY "Users can insert disciplinary actions in their company" ON "rh"."disciplinary_actions" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'create'::"text")));



COMMENT ON POLICY "Users can insert disciplinary actions in their company" ON "rh"."disciplinary_actions" IS 'Permite criar ações disciplinares na empresa do usuário';



CREATE POLICY "Users can insert employee_shifts in their company" ON "rh"."employee_shifts" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'create'::"text")));



CREATE POLICY "Users can insert employees in their company" ON "rh"."employees" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert employment_contracts in their company" ON "rh"."employment_contracts" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'create'::"text")));



CREATE POLICY "Users can insert esocial_integrations in their company" ON "rh"."esocial_integrations" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'create'::"text")));



CREATE POLICY "Users can insert event_consolidations in their company" ON "rh"."event_consolidations" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'event_consolidations'::"text", 'create'::"text")));



CREATE POLICY "Users can insert fgts_config in their company" ON "rh"."fgts_config" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'create'::"text")));



CREATE POLICY "Users can insert inss_brackets in their company" ON "rh"."inss_brackets" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'create'::"text")));



CREATE POLICY "Users can insert irrf_brackets in their company" ON "rh"."irrf_brackets" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'create'::"text")));



CREATE POLICY "Users can insert medical certificate attachments in their compa" ON "rh"."medical_certificate_attachments" FOR INSERT WITH CHECK (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can insert periodic exams in their company" ON "rh"."periodic_exams" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can insert periodic exams in their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios insiram exames periÃ³dicos na sua empresa';



CREATE POLICY "Users can insert positions in their company" ON "rh"."positions" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert reports in their company" ON "rh"."reports" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'create'::"text")));



CREATE POLICY "Users can insert rubricas in their company" ON "rh"."rubricas" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'create'::"text")));



CREATE POLICY "Users can insert schedule_planning in their company" ON "rh"."schedule_planning" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'schedule_planning'::"text", 'create'::"text")));



CREATE POLICY "Users can insert training settings for their company" ON "rh"."training_settings" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert units in their company" ON "rh"."units" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert work_shifts in their company" ON "rh"."work_shifts" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'create'::"text")));



CREATE POLICY "Users can manage bank hours balance for their companies" ON "rh"."bank_hours_balance" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours calculations for their companies" ON "rh"."bank_hours_calculations" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours config for their companies" ON "rh"."bank_hours_config" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours transactions for their companies" ON "rh"."bank_hours_transactions" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage notification rules of their company" ON "rh"."training_notification_rules" USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'training_notification_rules'::"text", 'manage'::"text")));



CREATE POLICY "Users can manage notification types of their company" ON "rh"."training_notification_types" USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'training_notification_types'::"text", 'manage'::"text")));



CREATE POLICY "Users can update absence_types from their company" ON "rh"."absence_types" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'edit'::"text")));



CREATE POLICY "Users can update allowance_types from their company" ON "rh"."allowance_types" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'edit'::"text")));



CREATE POLICY "Users can update cid_codes from their company" ON "rh"."cid_codes" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'edit'::"text")));



CREATE POLICY "Users can update compensation_requests from their company" ON "rh"."compensation_requests" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'edit'::"text")));



CREATE POLICY "Users can update deficiency_types from their company" ON "rh"."deficiency_types" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'edit'::"text")));



CREATE POLICY "Users can update delay_reasons from their company" ON "rh"."delay_reasons" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'edit'::"text")));



CREATE POLICY "Users can update dependents from their company" ON "rh"."dependents" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can update dependents from their company" ON "rh"."dependents" IS 'Permite atualizar dependentes da empresa do usuÃ¡rio';



CREATE POLICY "Users can update disciplinary actions from their company" ON "rh"."disciplinary_actions" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'edit'::"text")));



COMMENT ON POLICY "Users can update disciplinary actions from their company" ON "rh"."disciplinary_actions" IS 'Permite editar ações disciplinares da empresa do usuário';



CREATE POLICY "Users can update employee_shifts from their company" ON "rh"."employee_shifts" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'edit'::"text")));



CREATE POLICY "Users can update employees from their company" ON "rh"."employees" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update employment_contracts from their company" ON "rh"."employment_contracts" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'edit'::"text")));



CREATE POLICY "Users can update esocial_integrations from their company" ON "rh"."esocial_integrations" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'edit'::"text")));



CREATE POLICY "Users can update event_consolidations from their company" ON "rh"."event_consolidations" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'event_consolidations'::"text", 'edit'::"text")));



CREATE POLICY "Users can update fgts_config from their company" ON "rh"."fgts_config" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'edit'::"text")));



CREATE POLICY "Users can update inss_brackets from their company" ON "rh"."inss_brackets" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'edit'::"text")));



CREATE POLICY "Users can update irrf_brackets from their company" ON "rh"."irrf_brackets" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'edit'::"text")));



CREATE POLICY "Users can update medical certificate attachments from their com" ON "rh"."medical_certificate_attachments" FOR UPDATE USING (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can update periodic exams from their company" ON "rh"."periodic_exams" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can update periodic exams from their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios atualizem exames periÃ³dicos da sua empresa';



CREATE POLICY "Users can update positions from their company" ON "rh"."positions" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update reports from their company" ON "rh"."reports" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'edit'::"text")));



CREATE POLICY "Users can update rubricas from their company" ON "rh"."rubricas" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'edit'::"text")));



CREATE POLICY "Users can update schedule_planning from their company" ON "rh"."schedule_planning" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'schedule_planning'::"text", 'edit'::"text")));



CREATE POLICY "Users can update training settings for their company" ON "rh"."training_settings" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update units from their company" ON "rh"."units" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update work_shifts from their company" ON "rh"."work_shifts" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'edit'::"text")));



CREATE POLICY "Users can view absence_types from their company" ON "rh"."absence_types" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'read'::"text")));



CREATE POLICY "Users can view allowance_types from their company" ON "rh"."allowance_types" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'read'::"text")));



CREATE POLICY "Users can view approval levels of their company" ON "rh"."approval_levels" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view approvals of their company" ON "rh"."compensation_approvals" FOR SELECT USING (("compensation_request_id" IN ( SELECT "compensation_requests"."id"
   FROM "rh"."compensation_requests"
  WHERE ("compensation_requests"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))))));



CREATE POLICY "Users can view approvers of their company" ON "rh"."approval_level_approvers" FOR SELECT USING (("approval_level_id" IN ( SELECT "approval_levels"."id"
   FROM "rh"."approval_levels"
  WHERE ("approval_levels"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))))));



CREATE POLICY "Users can view audit logs of their company" ON "rh"."audit_logs" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours balance for their companies" ON "rh"."bank_hours_balance" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours calculations for their companies" ON "rh"."bank_hours_calculations" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours config for their companies" ON "rh"."bank_hours_config" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours transactions for their companies" ON "rh"."bank_hours_transactions" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view cid_codes from their company" ON "rh"."cid_codes" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'read'::"text")));



CREATE POLICY "Users can view compensation_requests from their company" ON "rh"."compensation_requests" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'read'::"text")));



CREATE POLICY "Users can view deficiency_types from their company" ON "rh"."deficiency_types" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'read'::"text")));



CREATE POLICY "Users can view delay_reasons from their company" ON "rh"."delay_reasons" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'read'::"text")));



CREATE POLICY "Users can view dependents from their company" ON "rh"."dependents" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can view dependents from their company" ON "rh"."dependents" IS 'Permite visualizar dependentes da empresa do usuÃ¡rio';



CREATE POLICY "Users can view disciplinary actions from their company" ON "rh"."disciplinary_actions" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'read'::"text")));



COMMENT ON POLICY "Users can view disciplinary actions from their company" ON "rh"."disciplinary_actions" IS 'Permite visualizar ações disciplinares da empresa do usuário';



CREATE POLICY "Users can view employee_shifts from their company" ON "rh"."employee_shifts" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'read'::"text")));



CREATE POLICY "Users can view employees from their company" ON "rh"."employees" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view employment_contracts from their company" ON "rh"."employment_contracts" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'read'::"text")));



CREATE POLICY "Users can view esocial_integrations from their company" ON "rh"."esocial_integrations" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'read'::"text")));



CREATE POLICY "Users can view event_consolidations from their company" ON "rh"."event_consolidations" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'event_consolidations'::"text", 'read'::"text")));



CREATE POLICY "Users can view fgts_config from their company" ON "rh"."fgts_config" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'read'::"text")));



CREATE POLICY "Users can view inss_brackets from their company" ON "rh"."inss_brackets" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'read'::"text")));



CREATE POLICY "Users can view irrf_brackets from their company" ON "rh"."irrf_brackets" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'read'::"text")));



CREATE POLICY "Users can view medical certificate attachments from their compa" ON "rh"."medical_certificate_attachments" FOR SELECT USING (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can view notification history of their company" ON "rh"."training_notification_history" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'training_notification_history'::"text", 'read'::"text")));



CREATE POLICY "Users can view notification queue of their company" ON "rh"."training_notification_queue" FOR SELECT USING (("company_id" = ANY ("public"."get_user_companies"())));



CREATE POLICY "Users can view notification rules of their company" ON "rh"."training_notification_rules" FOR SELECT USING (("company_id" = ANY ("public"."get_user_companies"())));



CREATE POLICY "Users can view notification types of their company" ON "rh"."training_notification_types" FOR SELECT USING (("company_id" = ANY ("public"."get_user_companies"())));



CREATE POLICY "Users can view periodic exams from their company" ON "rh"."periodic_exams" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can view periodic exams from their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios visualizem exames periÃ³dicos da sua empresa';



CREATE POLICY "Users can view positions from their company" ON "rh"."positions" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view reports from their company" ON "rh"."reports" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'read'::"text")));



CREATE POLICY "Users can view rubricas from their company" ON "rh"."rubricas" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'read'::"text")));



CREATE POLICY "Users can view schedule_planning from their company" ON "rh"."schedule_planning" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'schedule_planning'::"text", 'read'::"text")));



CREATE POLICY "Users can view their own notification history" ON "rh"."training_notification_history" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("company_id" = ANY ("public"."get_user_companies"()))));



CREATE POLICY "Users can view training settings for their company" ON "rh"."training_settings" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view units from their company" ON "rh"."units" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view work_shifts from their company" ON "rh"."work_shifts" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'read'::"text")));



ALTER TABLE "rh"."absence_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."allowance_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."approval_level_approvers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."approval_levels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_delete_policy" ON "rh"."training_attendance" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "attendance_insert_policy" ON "rh"."training_attendance" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "attendance_update_policy" ON "rh"."training_attendance" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "attendance_view_policy" ON "rh"."training_attendance" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."audit_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_balance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_calculations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."benefit_configurations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificate_delete_policy" ON "rh"."training_certificates" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "certificate_insert_policy" ON "rh"."training_certificates" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "certificate_update_policy" ON "rh"."training_certificates" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "certificate_view_policy" ON "rh"."training_certificates" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."cid_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."compensation_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."compensation_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."deficiency_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."delay_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."dependents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."disciplinary_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_benefit_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employment_contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollment_delete_policy" ON "rh"."training_enrollments" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "enrollment_insert_policy" ON "rh"."training_enrollments" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "enrollment_update_policy" ON "rh"."training_enrollments" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "enrollment_view_policy" ON "rh"."training_enrollments" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."esocial_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "esocial_batches_delete" ON "rh"."esocial_batches" FOR DELETE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "esocial_batches_insert" ON "rh"."esocial_batches" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "esocial_batches_select" ON "rh"."esocial_batches" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "esocial_batches_update" ON "rh"."esocial_batches" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



ALTER TABLE "rh"."esocial_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_delete_policy" ON "rh"."training_evaluations" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "evaluation_insert_policy" ON "rh"."training_evaluations" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "evaluation_update_policy" ON "rh"."training_evaluations" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "evaluation_view_policy" ON "rh"."training_evaluations" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."event_consolidations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."fgts_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."inss_brackets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."irrf_brackets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."medical_certificate_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."medical_certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."monthly_benefit_processing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."payroll" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."periodic_exams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rh_benefit_configurations_delete_policy" ON "rh"."benefit_configurations" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'delete'::"text")));



CREATE POLICY "rh_benefit_configurations_insert_policy" ON "rh"."benefit_configurations" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'create'::"text")));



CREATE POLICY "rh_benefit_configurations_select_policy" ON "rh"."benefit_configurations" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'read'::"text")));



CREATE POLICY "rh_benefit_configurations_update_policy" ON "rh"."benefit_configurations" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'edit'::"text")));



CREATE POLICY "rh_employees_delete_policy" ON "rh"."employees" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'delete'::"text")));



CREATE POLICY "rh_employees_insert_policy" ON "rh"."employees" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'create'::"text")));



CREATE POLICY "rh_employees_select_policy" ON "rh"."employees" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'read'::"text")));



CREATE POLICY "rh_employees_update_policy" ON "rh"."employees" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'edit'::"text")));



CREATE POLICY "rh_positions_delete_policy" ON "rh"."positions" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'delete'::"text")));



CREATE POLICY "rh_positions_insert_policy" ON "rh"."positions" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'create'::"text")));



CREATE POLICY "rh_positions_select_policy" ON "rh"."positions" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'read'::"text")));



CREATE POLICY "rh_positions_update_policy" ON "rh"."positions" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'edit'::"text")));



CREATE POLICY "rh_units_delete_policy" ON "rh"."units" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'delete'::"text")));



CREATE POLICY "rh_units_insert_policy" ON "rh"."units" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'create'::"text")));



CREATE POLICY "rh_units_select_policy" ON "rh"."units" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'read'::"text")));



CREATE POLICY "rh_units_update_policy" ON "rh"."units" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'edit'::"text")));



ALTER TABLE "rh"."rubricas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."schedule_planning" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_certificates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_delete_policy" ON "rh"."trainings" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."training_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_evaluations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_insert_policy" ON "rh"."trainings" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."training_notification_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_notification_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_notification_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_notification_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_update_policy" ON "rh"."trainings" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "training_view_policy" ON "rh"."trainings" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."trainings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."vacations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."work_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."work_shifts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "financeiro" TO "anon";
GRANT USAGE ON SCHEMA "financeiro" TO "authenticated";
GRANT USAGE ON SCHEMA "financeiro" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."calculate_dpo"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."calculate_dpo"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."calculate_dpo"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."calculate_dso"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."calculate_dso"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."calculate_dso"("p_company_id" "uuid", "p_data_inicio" "date", "p_data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."calculate_valor_atual"("p_valor_original" numeric, "p_data_vencimento" "date", "p_data_calculo" "date", "p_taxa_juros" numeric, "p_taxa_multa" numeric) TO "anon";
GRANT ALL ON FUNCTION "financeiro"."calculate_valor_atual"("p_valor_original" numeric, "p_data_vencimento" "date", "p_data_calculo" "date", "p_taxa_juros" numeric, "p_taxa_multa" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."calculate_valor_atual"("p_valor_original" numeric, "p_data_vencimento" "date", "p_data_calculo" "date", "p_taxa_juros" numeric, "p_taxa_multa" numeric) TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."check_approval_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."check_approval_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."check_approval_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."check_financial_permission"("p_user_id" "uuid", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."check_financial_permission"("p_user_id" "uuid", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."check_financial_permission"("p_user_id" "uuid", "p_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."generate_remittance_file"("p_company_id" "uuid", "p_borderos_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."generate_remittance_file"("p_company_id" "uuid", "p_borderos_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."generate_remittance_file"("p_company_id" "uuid", "p_borderos_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."generate_titulo_number"("p_company_id" "uuid", "p_tipo" character varying) TO "anon";
GRANT ALL ON FUNCTION "financeiro"."generate_titulo_number"("p_company_id" "uuid", "p_tipo" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."generate_titulo_number"("p_company_id" "uuid", "p_tipo" character varying) TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."get_aging_report"("p_company_id" "uuid", "p_data_corte" "date") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."get_aging_report"("p_company_id" "uuid", "p_data_corte" "date") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."get_aging_report"("p_company_id" "uuid", "p_data_corte" "date") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."get_required_approval_level"("p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."get_required_approval_level"("p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."get_required_approval_level"("p_company_id" "uuid", "p_valor" numeric, "p_centro_custo_id" "uuid", "p_departamento" "text", "p_classe_financeira" "text") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."process_bank_return"("p_company_id" "uuid", "p_arquivo_retorno" "text") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."process_bank_return"("p_company_id" "uuid", "p_arquivo_retorno" "text") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."process_bank_return"("p_company_id" "uuid", "p_arquivo_retorno" "text") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."update_approval_status"("p_entidade_tipo" character varying, "p_entidade_id" "uuid", "p_aprovador_id" "uuid", "p_status" character varying, "p_observacoes" "text") TO "anon";
GRANT ALL ON FUNCTION "financeiro"."update_approval_status"("p_entidade_tipo" character varying, "p_entidade_id" "uuid", "p_aprovador_id" "uuid", "p_status" character varying, "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."update_approval_status"("p_entidade_tipo" character varying, "p_entidade_id" "uuid", "p_aprovador_id" "uuid", "p_status" character varying, "p_observacoes" "text") TO "service_role";



GRANT ALL ON FUNCTION "financeiro"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "financeiro"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "financeiro"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."calculate_medical_certificate_days"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_medical_certificate_days"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_medical_certificate_days"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_access_permission"("schema_name" "text", "table_name" "text", "action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_compensation_approval_status"("p_compensation_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("p_user_id" "uuid", "p_entity_name" "text", "p_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_entity_permission"("user_id" "uuid", "schema_name" "text", "table_name" "text", "action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_module_permission"("p_user_id" "uuid", "p_module_name" "text", "p_permission" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_user_profile"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_periodic_exams"("p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_status" character varying, "p_resultado" character varying, "p_data_inicio" "date", "p_data_fim" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_esocial_integrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_esocial_integrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_esocial_integrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_consolidations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_consolidations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_consolidations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_fgts_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_fgts_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fgts_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inss_brackets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inss_brackets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inss_brackets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_irrf_brackets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_irrf_brackets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_irrf_brackets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_periodic_exam"("p_exam_id" "uuid", "p_company_id" "uuid", "p_employee_id" "uuid", "p_tipo_exame" character varying, "p_data_agendamento" "date", "p_data_realizacao" "date", "p_data_vencimento" "date", "p_status" character varying, "p_medico_responsavel" character varying, "p_clinica_local" character varying, "p_observacoes" "text", "p_resultado" character varying, "p_restricoes" "text", "p_anexos" "text"[], "p_custo" numeric, "p_pago" boolean, "p_data_pagamento" "date") TO "service_role";



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



GRANT ALL ON FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "rh"."process_notification_queue"() TO "anon";
GRANT ALL ON FUNCTION "rh"."process_notification_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_notification_queue"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."schedule_training_notifications"() TO "anon";
GRANT ALL ON FUNCTION "rh"."schedule_training_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."schedule_training_notifications"() TO "service_role";



GRANT ALL ON TABLE "financeiro"."aprovacoes" TO "anon";
GRANT ALL ON TABLE "financeiro"."aprovacoes" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."aprovacoes" TO "service_role";



GRANT ALL ON TABLE "financeiro"."borderos" TO "anon";
GRANT ALL ON TABLE "financeiro"."borderos" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."borderos" TO "service_role";



GRANT ALL ON TABLE "financeiro"."conciliacoes_bancarias" TO "anon";
GRANT ALL ON TABLE "financeiro"."conciliacoes_bancarias" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."conciliacoes_bancarias" TO "service_role";



GRANT ALL ON TABLE "financeiro"."configuracoes_aprovacao" TO "anon";
GRANT ALL ON TABLE "financeiro"."configuracoes_aprovacao" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."configuracoes_aprovacao" TO "service_role";



GRANT ALL ON TABLE "financeiro"."contas_bancarias" TO "anon";
GRANT ALL ON TABLE "financeiro"."contas_bancarias" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."contas_bancarias" TO "service_role";



GRANT ALL ON TABLE "financeiro"."contas_pagar" TO "anon";
GRANT ALL ON TABLE "financeiro"."contas_pagar" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."contas_pagar" TO "service_role";



GRANT ALL ON TABLE "financeiro"."contas_receber" TO "anon";
GRANT ALL ON TABLE "financeiro"."contas_receber" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."contas_receber" TO "service_role";



GRANT ALL ON TABLE "financeiro"."fluxo_caixa" TO "anon";
GRANT ALL ON TABLE "financeiro"."fluxo_caixa" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."fluxo_caixa" TO "service_role";



GRANT ALL ON TABLE "financeiro"."lancamentos_contabeis" TO "anon";
GRANT ALL ON TABLE "financeiro"."lancamentos_contabeis" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."lancamentos_contabeis" TO "service_role";



GRANT ALL ON TABLE "financeiro"."nfe" TO "anon";
GRANT ALL ON TABLE "financeiro"."nfe" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."nfe" TO "service_role";



GRANT ALL ON TABLE "financeiro"."nfse" TO "anon";
GRANT ALL ON TABLE "financeiro"."nfse" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."nfse" TO "service_role";



GRANT ALL ON TABLE "financeiro"."plano_contas" TO "anon";
GRANT ALL ON TABLE "financeiro"."plano_contas" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."plano_contas" TO "service_role";



GRANT ALL ON TABLE "financeiro"."remessas_bancarias" TO "anon";
GRANT ALL ON TABLE "financeiro"."remessas_bancarias" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."remessas_bancarias" TO "service_role";



GRANT ALL ON TABLE "financeiro"."retornos_bancarios" TO "anon";
GRANT ALL ON TABLE "financeiro"."retornos_bancarios" TO "authenticated";
GRANT ALL ON TABLE "financeiro"."retornos_bancarios" TO "service_role";



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



GRANT ALL ON TABLE "rh"."training_notification_history" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_history" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_history" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_queue" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_queue" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_queue" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_rules" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_rules" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_rules" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_types" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_types" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_types" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "rh"."training_settings" TO "authenticated";



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






\unrestrict iRRWplhb2LK8BUJ5MgDoKGn36TEXc4mXHvpl5xTZzWc5cuEC9gjVyICdgIztbls

RESET ALL;
