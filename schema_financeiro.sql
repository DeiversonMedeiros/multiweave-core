
\restrict 2OcRxXd3lOeskOiJiTbHVPteBX8kZNHJttJplDFqykVjyGo3ATzp4xO6hEjkVFo


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


GRANT USAGE ON SCHEMA "financeiro" TO "anon";
GRANT USAGE ON SCHEMA "financeiro" TO "authenticated";
GRANT USAGE ON SCHEMA "financeiro" TO "service_role";



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



\unrestrict 2OcRxXd3lOeskOiJiTbHVPteBX8kZNHJttJplDFqykVjyGo3ATzp4xO6hEjkVFo

RESET ALL;
