
\restrict blhIpHHyX30fd3kCM8tpkWHrCo2uuRSnNFc2thcg52A3akmX1W9iHt6ByBFmilc


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


CREATE SCHEMA IF NOT EXISTS "almoxarifado";


ALTER SCHEMA "almoxarifado" OWNER TO "postgres";


COMMENT ON SCHEMA "almoxarifado" IS 'Schema para controle de almoxarifado e estoque';



CREATE OR REPLACE FUNCTION "almoxarifado"."audit_trigger_function"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    operation_type TEXT;
BEGIN
    -- Determinar tipo de operaÃ§Ã£o
    IF TG_OP = 'DELETE' THEN
        operation_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation_type := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Inserir log de auditoria
    INSERT INTO rh.audit_logs (
        table_name,
        operation_type,
        old_data,
        new_data,
        user_id,
        company_id,
        created_at
    ) VALUES (
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        operation_type,
        old_data,
        new_data,
        auth.uid(),
        COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        ),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "almoxarifado"."audit_trigger_function"() OWNER TO "postgres";


COMMENT ON FUNCTION "almoxarifado"."audit_trigger_function"() IS 'FunÃ§Ã£o de trigger para auditoria de operaÃ§Ãµes no mÃ³dulo almoxarifado';



CREATE OR REPLACE FUNCTION "almoxarifado"."can_create_entity"("entity_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Obter perfil do usuÃ¡rio na empresa atual
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = COALESCE(
        current_setting('app.current_company_id', true)::uuid,
        (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
    )
    AND uc.ativo = true
    LIMIT 1;

    IF user_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar permissÃ£o na entidade especÃ­fica
    SELECT ep.can_create INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$;


ALTER FUNCTION "almoxarifado"."can_create_entity"("entity_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "almoxarifado"."can_create_entity"("entity_name" "text") IS 'Verifica se o usuÃ¡rio pode criar registros na entidade especificada';



CREATE OR REPLACE FUNCTION "almoxarifado"."can_delete_entity"("entity_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Obter perfil do usuÃ¡rio na empresa atual
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = COALESCE(
        current_setting('app.current_company_id', true)::uuid,
        (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
    )
    AND uc.ativo = true
    LIMIT 1;

    IF user_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar permissÃ£o na entidade especÃ­fica
    SELECT ep.can_delete INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$;


ALTER FUNCTION "almoxarifado"."can_delete_entity"("entity_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "almoxarifado"."can_delete_entity"("entity_name" "text") IS 'Verifica se o usuÃ¡rio pode excluir registros da entidade especificada';



CREATE OR REPLACE FUNCTION "almoxarifado"."can_edit_entity"("entity_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Obter perfil do usuÃ¡rio na empresa atual
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = COALESCE(
        current_setting('app.current_company_id', true)::uuid,
        (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
    )
    AND uc.ativo = true
    LIMIT 1;

    IF user_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar permissÃ£o na entidade especÃ­fica
    SELECT ep.can_edit INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$;


ALTER FUNCTION "almoxarifado"."can_edit_entity"("entity_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "almoxarifado"."can_edit_entity"("entity_name" "text") IS 'Verifica se o usuÃ¡rio pode editar registros na entidade especificada';



CREATE OR REPLACE FUNCTION "almoxarifado"."can_read_entity"("entity_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Obter perfil do usuÃ¡rio na empresa atual
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = COALESCE(
        current_setting('app.current_company_id', true)::uuid,
        (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
    )
    AND uc.ativo = true
    LIMIT 1;

    IF user_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar permissÃ£o na entidade especÃ­fica
    SELECT ep.can_read INTO has_permission
    FROM public.entity_permissions ep
    WHERE ep.profile_id = user_profile_id
    AND ep.entity_name = entity_name;

    RETURN COALESCE(has_permission, false);
END;
$$;


ALTER FUNCTION "almoxarifado"."can_read_entity"("entity_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "almoxarifado"."can_read_entity"("entity_name" "text") IS 'Verifica se o usuÃ¡rio pode ler a entidade especificada';



CREATE OR REPLACE FUNCTION "almoxarifado"."check_module_permission"("permission_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile_id UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Obter perfil do usuÃ¡rio na empresa atual
    SELECT uc.profile_id INTO user_profile_id
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = COALESCE(
        current_setting('app.current_company_id', true)::uuid,
        (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
    )
    AND uc.ativo = true
    LIMIT 1;

    IF user_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar permissÃ£o no mÃ³dulo almoxarifado
    SELECT 
        CASE permission_type
            WHEN 'read' THEN mp.can_read
            WHEN 'create' THEN mp.can_create
            WHEN 'edit' THEN mp.can_edit
            WHEN 'delete' THEN mp.can_delete
            ELSE false
        END INTO has_permission
    FROM public.module_permissions mp
    WHERE mp.profile_id = user_profile_id
    AND mp.module_name = 'almoxarifado'
    AND mp.can_read = true;

    RETURN COALESCE(has_permission, false);
END;
$$;


ALTER FUNCTION "almoxarifado"."check_module_permission"("permission_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "almoxarifado"."check_module_permission"("permission_type" "text") IS 'Verifica permissÃµes do usuÃ¡rio no mÃ³dulo almoxarifado';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "almoxarifado"."almoxarifados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "codigo" character varying(50) NOT NULL,
    "endereco" "text",
    "responsavel_id" "uuid",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "almoxarifado"."almoxarifados" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."almoxarifados" IS 'Cadastro de almoxarifados/locais de estoque';



CREATE TABLE IF NOT EXISTS "almoxarifado"."checklist_recebimento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrada_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "criterio" character varying(255) NOT NULL,
    "aprovado" boolean NOT NULL,
    "observacoes" "text",
    "usuario_id" "uuid" NOT NULL,
    "data_verificacao" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "almoxarifado"."checklist_recebimento" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."checklist_recebimento" IS 'Checklist de inspeÃ§Ã£o de recebimento';



COMMENT ON COLUMN "almoxarifado"."checklist_recebimento"."company_id" IS 'ID da empresa para isolamento multi-tenant';



CREATE TABLE IF NOT EXISTS "almoxarifado"."entrada_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrada_id" "uuid" NOT NULL,
    "material_equipamento_id" "uuid" NOT NULL,
    "quantidade_recebida" integer NOT NULL,
    "quantidade_aprovada" integer DEFAULT 0,
    "valor_unitario" numeric(15,2),
    "valor_total" numeric(15,2),
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "lote" character varying(100),
    "validade" "date",
    "observacoes" "text",
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "check_quantidade_entrada" CHECK ((("quantidade_recebida" > 0) AND ("quantidade_aprovada" >= 0)))
);


ALTER TABLE "almoxarifado"."entrada_itens" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."entrada_itens" IS 'Itens especÃ­ficos de cada entrada';



COMMENT ON COLUMN "almoxarifado"."entrada_itens"."company_id" IS 'ID da empresa para isolamento multi-tenant';



CREATE TABLE IF NOT EXISTS "almoxarifado"."entradas_materiais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nfe_id" "uuid",
    "fornecedor_id" "uuid",
    "numero_nota" character varying(50),
    "data_entrada" "date" NOT NULL,
    "valor_total" numeric(15,2),
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "checklist_aprovado" boolean DEFAULT false,
    "usuario_recebimento_id" "uuid",
    "usuario_aprovacao_id" "uuid",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "entradas_materiais_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'inspecao'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::"text"[])))
);


ALTER TABLE "almoxarifado"."entradas_materiais" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."entradas_materiais" IS 'Entradas de materiais via NF-e ou manual';



CREATE TABLE IF NOT EXISTS "almoxarifado"."estoque_atual" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_equipamento_id" "uuid" NOT NULL,
    "almoxarifado_id" "uuid" NOT NULL,
    "quantidade_atual" integer DEFAULT 0 NOT NULL,
    "quantidade_reservada" integer DEFAULT 0,
    "quantidade_disponivel" integer GENERATED ALWAYS AS (("quantidade_atual" - "quantidade_reservada")) STORED,
    "valor_total" numeric(15,2),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "check_quantidade_positiva" CHECK ((("quantidade_atual" >= 0) AND ("quantidade_reservada" >= 0)))
);


ALTER TABLE "almoxarifado"."estoque_atual" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."estoque_atual" IS 'Controle de estoque atual por material e almoxarifado';



COMMENT ON COLUMN "almoxarifado"."estoque_atual"."company_id" IS 'ID da empresa para isolamento multi-tenant';



CREATE TABLE IF NOT EXISTS "almoxarifado"."inventario_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventario_id" "uuid" NOT NULL,
    "material_equipamento_id" "uuid" NOT NULL,
    "quantidade_sistema" integer NOT NULL,
    "quantidade_contada" integer,
    "divergencia" integer GENERATED ALWAYS AS ((COALESCE("quantidade_contada", 0) - "quantidade_sistema")) STORED,
    "observacoes" "text",
    "contador_id" "uuid",
    "data_contagem" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "almoxarifado"."inventario_itens" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."inventario_itens" IS 'Itens contados em cada inventÃ¡rio';



COMMENT ON COLUMN "almoxarifado"."inventario_itens"."company_id" IS 'ID da empresa para isolamento multi-tenant';



CREATE TABLE IF NOT EXISTS "almoxarifado"."inventarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "almoxarifado_id" "uuid" NOT NULL,
    "tipo" character varying(20) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'aberto'::character varying,
    "responsavel_id" "uuid" NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_data_inventario" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio"))),
    CONSTRAINT "inventarios_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['aberto'::character varying, 'em_andamento'::character varying, 'validado'::character varying, 'fechado'::character varying])::"text"[]))),
    CONSTRAINT "inventarios_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['geral'::character varying, 'ciclico'::character varying, 'rotativo'::character varying])::"text"[])))
);


ALTER TABLE "almoxarifado"."inventarios" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."inventarios" IS 'Controle de inventÃ¡rios fÃ­sicos';



CREATE TABLE IF NOT EXISTS "almoxarifado"."localizacoes_fisicas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "almoxarifado_id" "uuid" NOT NULL,
    "rua" character varying(10),
    "nivel" character varying(10),
    "posicao" character varying(10),
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "almoxarifado"."localizacoes_fisicas" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."localizacoes_fisicas" IS 'LocalizaÃ§Ãµes fÃ­sicas dentro dos almoxarifados';



COMMENT ON COLUMN "almoxarifado"."localizacoes_fisicas"."company_id" IS 'ID da empresa para isolamento multi-tenant';



CREATE TABLE IF NOT EXISTS "almoxarifado"."materiais_equipamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "material_id" "uuid",
    "codigo_interno" character varying(100) NOT NULL,
    "descricao" "text" NOT NULL,
    "tipo" character varying(20) NOT NULL,
    "classe" character varying(100),
    "unidade_medida" character varying(20) NOT NULL,
    "imagem_url" "text",
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "equipamento_proprio" boolean DEFAULT true,
    "localizacao_id" "uuid",
    "estoque_minimo" integer DEFAULT 0,
    "estoque_maximo" integer,
    "valor_unitario" numeric(15,2),
    "validade_dias" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_estoque_min_max" CHECK (("estoque_minimo" <= COALESCE("estoque_maximo", 999999))),
    CONSTRAINT "materiais_equipamentos_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::"text"[]))),
    CONSTRAINT "materiais_equipamentos_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['material'::character varying, 'equipamento'::character varying])::"text"[])))
);


ALTER TABLE "almoxarifado"."materiais_equipamentos" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."materiais_equipamentos" IS 'Materiais e equipamentos do almoxarifado';



CREATE TABLE IF NOT EXISTS "almoxarifado"."movimentacoes_estoque" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "material_equipamento_id" "uuid" NOT NULL,
    "almoxarifado_origem_id" "uuid",
    "almoxarifado_destino_id" "uuid",
    "tipo_movimentacao" character varying(20) NOT NULL,
    "quantidade" integer NOT NULL,
    "valor_unitario" numeric(15,2),
    "valor_total" numeric(15,2),
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "nfe_id" "uuid",
    "observacoes" "text",
    "usuario_id" "uuid" NOT NULL,
    "data_movimentacao" timestamp with time zone DEFAULT "now"(),
    "status" character varying(20) DEFAULT 'confirmado'::character varying,
    CONSTRAINT "check_almoxarifado_origem_destino" CHECK ((((("tipo_movimentacao")::"text" = 'entrada'::"text") AND ("almoxarifado_origem_id" IS NULL) AND ("almoxarifado_destino_id" IS NOT NULL)) OR ((("tipo_movimentacao")::"text" = 'saida'::"text") AND ("almoxarifado_origem_id" IS NOT NULL) AND ("almoxarifado_destino_id" IS NULL)) OR ((("tipo_movimentacao")::"text" = 'transferencia'::"text") AND ("almoxarifado_origem_id" IS NOT NULL) AND ("almoxarifado_destino_id" IS NOT NULL)) OR ((("tipo_movimentacao")::"text" = ANY ((ARRAY['ajuste'::character varying, 'inventario'::character varying])::"text"[])) AND ("almoxarifado_origem_id" IS NOT NULL) AND ("almoxarifado_destino_id" IS NULL)))),
    CONSTRAINT "check_quantidade_movimentacao" CHECK (("quantidade" <> 0)),
    CONSTRAINT "movimentacoes_estoque_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'confirmado'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "movimentacoes_estoque_tipo_movimentacao_check" CHECK ((("tipo_movimentacao")::"text" = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying, 'transferencia'::character varying, 'ajuste'::character varying, 'inventario'::character varying])::"text"[])))
);


ALTER TABLE "almoxarifado"."movimentacoes_estoque" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."movimentacoes_estoque" IS 'HistÃ³rico de todas as movimentaÃ§Ãµes de estoque';



CREATE TABLE IF NOT EXISTS "almoxarifado"."solicitacoes_compra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "material_equipamento_id" "uuid" NOT NULL,
    "almoxarifado_id" "uuid" NOT NULL,
    "quantidade_solicitada" integer NOT NULL,
    "quantidade_minima" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "prioridade" character varying(20) DEFAULT 'normal'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "atendido_at" timestamp with time zone,
    CONSTRAINT "check_quantidade_solicitacao" CHECK ((("quantidade_solicitada" > 0) AND ("quantidade_minima" > 0))),
    CONSTRAINT "solicitacoes_compra_prioridade_check" CHECK ((("prioridade")::"text" = ANY ((ARRAY['baixa'::character varying, 'normal'::character varying, 'alta'::character varying, 'urgente'::character varying])::"text"[]))),
    CONSTRAINT "solicitacoes_compra_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'atendido'::character varying])::"text"[])))
);


ALTER TABLE "almoxarifado"."solicitacoes_compra" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."solicitacoes_compra" IS 'SolicitaÃ§Ãµes automÃ¡ticas de compra por estoque mÃ­nimo';



CREATE TABLE IF NOT EXISTS "almoxarifado"."transferencia_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transferencia_id" "uuid" NOT NULL,
    "material_equipamento_id" "uuid" NOT NULL,
    "quantidade_solicitada" integer NOT NULL,
    "quantidade_aprovada" integer DEFAULT 0,
    "centro_custo_id" "uuid",
    "projeto_id" "uuid",
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "check_quantidade_transferencia" CHECK ((("quantidade_solicitada" > 0) AND ("quantidade_aprovada" >= 0)))
);


ALTER TABLE "almoxarifado"."transferencia_itens" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."transferencia_itens" IS 'Itens especÃ­ficos de cada transferÃªncia';



COMMENT ON COLUMN "almoxarifado"."transferencia_itens"."company_id" IS 'ID da empresa para isolamento multi-tenant';



CREATE TABLE IF NOT EXISTS "almoxarifado"."transferencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "almoxarifado_origem_id" "uuid" NOT NULL,
    "almoxarifado_destino_id" "uuid" NOT NULL,
    "solicitante_id" "uuid" NOT NULL,
    "aprovador_id" "uuid",
    "data_solicitacao" timestamp with time zone DEFAULT "now"(),
    "data_aprovacao" timestamp with time zone,
    "data_transferencia" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "observacoes" "text",
    CONSTRAINT "check_almoxarifado_diferentes" CHECK (("almoxarifado_origem_id" <> "almoxarifado_destino_id")),
    CONSTRAINT "transferencias_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'transferido'::character varying])::"text"[])))
);


ALTER TABLE "almoxarifado"."transferencias" OWNER TO "postgres";


COMMENT ON TABLE "almoxarifado"."transferencias" IS 'TransferÃªncias entre almoxarifados';



ALTER TABLE ONLY "almoxarifado"."almoxarifados"
    ADD CONSTRAINT "almoxarifados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."checklist_recebimento"
    ADD CONSTRAINT "checklist_recebimento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."entrada_itens"
    ADD CONSTRAINT "entrada_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."entradas_materiais"
    ADD CONSTRAINT "entradas_materiais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."estoque_atual"
    ADD CONSTRAINT "estoque_atual_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."inventario_itens"
    ADD CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."inventarios"
    ADD CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."localizacoes_fisicas"
    ADD CONSTRAINT "localizacoes_fisicas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."materiais_equipamentos"
    ADD CONSTRAINT "materiais_equipamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."transferencia_itens"
    ADD CONSTRAINT "transferencia_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."transferencias"
    ADD CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "almoxarifado"."almoxarifados"
    ADD CONSTRAINT "unique_almoxarifado_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "almoxarifado"."materiais_equipamentos"
    ADD CONSTRAINT "unique_codigo_interno_company" UNIQUE ("codigo_interno", "company_id");



ALTER TABLE ONLY "almoxarifado"."estoque_atual"
    ADD CONSTRAINT "unique_estoque_material_almoxarifado" UNIQUE ("material_equipamento_id", "almoxarifado_id");



ALTER TABLE ONLY "almoxarifado"."inventario_itens"
    ADD CONSTRAINT "unique_inventario_item" UNIQUE ("inventario_id", "material_equipamento_id");



ALTER TABLE ONLY "almoxarifado"."localizacoes_fisicas"
    ADD CONSTRAINT "unique_localizacao" UNIQUE ("almoxarifado_id", "rua", "nivel", "posicao");



CREATE INDEX "idx_almoxarifados_ativo" ON "almoxarifado"."almoxarifados" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_almoxarifados_company_id" ON "almoxarifado"."almoxarifados" USING "btree" ("company_id");



CREATE INDEX "idx_checklist_recebimento_company_id" ON "almoxarifado"."checklist_recebimento" USING "btree" ("company_id");



CREATE INDEX "idx_entrada_itens_company_id" ON "almoxarifado"."entrada_itens" USING "btree" ("company_id");



CREATE INDEX "idx_entradas_company_id" ON "almoxarifado"."entradas_materiais" USING "btree" ("company_id");



CREATE INDEX "idx_entradas_data" ON "almoxarifado"."entradas_materiais" USING "btree" ("data_entrada");



CREATE INDEX "idx_entradas_status" ON "almoxarifado"."entradas_materiais" USING "btree" ("status");



CREATE INDEX "idx_estoque_atual_almoxarifado" ON "almoxarifado"."estoque_atual" USING "btree" ("almoxarifado_id");



CREATE INDEX "idx_estoque_atual_company_id" ON "almoxarifado"."estoque_atual" USING "btree" ("company_id");



CREATE INDEX "idx_estoque_atual_material" ON "almoxarifado"."estoque_atual" USING "btree" ("material_equipamento_id");



CREATE INDEX "idx_inventario_itens_company_id" ON "almoxarifado"."inventario_itens" USING "btree" ("company_id");



CREATE INDEX "idx_inventarios_company_id" ON "almoxarifado"."inventarios" USING "btree" ("company_id");



CREATE INDEX "idx_inventarios_status" ON "almoxarifado"."inventarios" USING "btree" ("status");



CREATE INDEX "idx_inventarios_tipo" ON "almoxarifado"."inventarios" USING "btree" ("tipo");



CREATE INDEX "idx_localizacoes_fisicas_company_id" ON "almoxarifado"."localizacoes_fisicas" USING "btree" ("company_id");



CREATE INDEX "idx_materiais_equipamentos_codigo" ON "almoxarifado"."materiais_equipamentos" USING "btree" ("codigo_interno");



CREATE INDEX "idx_materiais_equipamentos_company_id" ON "almoxarifado"."materiais_equipamentos" USING "btree" ("company_id");



CREATE INDEX "idx_materiais_equipamentos_status" ON "almoxarifado"."materiais_equipamentos" USING "btree" ("status");



CREATE INDEX "idx_materiais_equipamentos_tipo" ON "almoxarifado"."materiais_equipamentos" USING "btree" ("tipo");



CREATE INDEX "idx_movimentacoes_company_id" ON "almoxarifado"."movimentacoes_estoque" USING "btree" ("company_id");



CREATE INDEX "idx_movimentacoes_data" ON "almoxarifado"."movimentacoes_estoque" USING "btree" ("data_movimentacao");



CREATE INDEX "idx_movimentacoes_material" ON "almoxarifado"."movimentacoes_estoque" USING "btree" ("material_equipamento_id");



CREATE INDEX "idx_movimentacoes_tipo" ON "almoxarifado"."movimentacoes_estoque" USING "btree" ("tipo_movimentacao");



CREATE INDEX "idx_solicitacoes_company_id" ON "almoxarifado"."solicitacoes_compra" USING "btree" ("company_id");



CREATE INDEX "idx_solicitacoes_prioridade" ON "almoxarifado"."solicitacoes_compra" USING "btree" ("prioridade");



CREATE INDEX "idx_solicitacoes_status" ON "almoxarifado"."solicitacoes_compra" USING "btree" ("status");



CREATE INDEX "idx_transferencia_itens_company_id" ON "almoxarifado"."transferencia_itens" USING "btree" ("company_id");



CREATE INDEX "idx_transferencias_company_id" ON "almoxarifado"."transferencias" USING "btree" ("company_id");



CREATE INDEX "idx_transferencias_solicitante" ON "almoxarifado"."transferencias" USING "btree" ("solicitante_id");



CREATE INDEX "idx_transferencias_status" ON "almoxarifado"."transferencias" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "audit_almoxarifados_trigger" AFTER INSERT OR DELETE OR UPDATE ON "almoxarifado"."almoxarifados" FOR EACH ROW EXECUTE FUNCTION "almoxarifado"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_entradas_materiais_trigger" AFTER INSERT OR DELETE OR UPDATE ON "almoxarifado"."entradas_materiais" FOR EACH ROW EXECUTE FUNCTION "almoxarifado"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_inventarios_trigger" AFTER INSERT OR DELETE OR UPDATE ON "almoxarifado"."inventarios" FOR EACH ROW EXECUTE FUNCTION "almoxarifado"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_materiais_equipamentos_trigger" AFTER INSERT OR DELETE OR UPDATE ON "almoxarifado"."materiais_equipamentos" FOR EACH ROW EXECUTE FUNCTION "almoxarifado"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_movimentacoes_estoque_trigger" AFTER INSERT OR DELETE OR UPDATE ON "almoxarifado"."movimentacoes_estoque" FOR EACH ROW EXECUTE FUNCTION "almoxarifado"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_transferencias_trigger" AFTER INSERT OR DELETE OR UPDATE ON "almoxarifado"."transferencias" FOR EACH ROW EXECUTE FUNCTION "almoxarifado"."audit_trigger_function"();



ALTER TABLE ONLY "almoxarifado"."almoxarifados"
    ADD CONSTRAINT "almoxarifados_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."almoxarifados"
    ADD CONSTRAINT "almoxarifados_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."checklist_recebimento"
    ADD CONSTRAINT "checklist_recebimento_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."checklist_recebimento"
    ADD CONSTRAINT "checklist_recebimento_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "almoxarifado"."entradas_materiais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."checklist_recebimento"
    ADD CONSTRAINT "checklist_recebimento_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "almoxarifado"."entrada_itens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."checklist_recebimento"
    ADD CONSTRAINT "checklist_recebimento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."entrada_itens"
    ADD CONSTRAINT "entrada_itens_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "almoxarifado"."entrada_itens"
    ADD CONSTRAINT "entrada_itens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."entrada_itens"
    ADD CONSTRAINT "entrada_itens_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "almoxarifado"."entradas_materiais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."entrada_itens"
    ADD CONSTRAINT "entrada_itens_material_equipamento_id_fkey" FOREIGN KEY ("material_equipamento_id") REFERENCES "almoxarifado"."materiais_equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."entrada_itens"
    ADD CONSTRAINT "entrada_itens_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "almoxarifado"."entradas_materiais"
    ADD CONSTRAINT "entradas_materiais_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."entradas_materiais"
    ADD CONSTRAINT "entradas_materiais_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "almoxarifado"."entradas_materiais"
    ADD CONSTRAINT "entradas_materiais_nfe_id_fkey" FOREIGN KEY ("nfe_id") REFERENCES "financeiro"."nfe"("id");



ALTER TABLE ONLY "almoxarifado"."entradas_materiais"
    ADD CONSTRAINT "entradas_materiais_usuario_aprovacao_id_fkey" FOREIGN KEY ("usuario_aprovacao_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."entradas_materiais"
    ADD CONSTRAINT "entradas_materiais_usuario_recebimento_id_fkey" FOREIGN KEY ("usuario_recebimento_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."estoque_atual"
    ADD CONSTRAINT "estoque_atual_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifado"."almoxarifados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."estoque_atual"
    ADD CONSTRAINT "estoque_atual_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."estoque_atual"
    ADD CONSTRAINT "estoque_atual_material_equipamento_id_fkey" FOREIGN KEY ("material_equipamento_id") REFERENCES "almoxarifado"."materiais_equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."inventario_itens"
    ADD CONSTRAINT "inventario_itens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."inventario_itens"
    ADD CONSTRAINT "inventario_itens_contador_id_fkey" FOREIGN KEY ("contador_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."inventario_itens"
    ADD CONSTRAINT "inventario_itens_inventario_id_fkey" FOREIGN KEY ("inventario_id") REFERENCES "almoxarifado"."inventarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."inventario_itens"
    ADD CONSTRAINT "inventario_itens_material_equipamento_id_fkey" FOREIGN KEY ("material_equipamento_id") REFERENCES "almoxarifado"."materiais_equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."inventarios"
    ADD CONSTRAINT "inventarios_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifado"."almoxarifados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."inventarios"
    ADD CONSTRAINT "inventarios_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."inventarios"
    ADD CONSTRAINT "inventarios_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."localizacoes_fisicas"
    ADD CONSTRAINT "localizacoes_fisicas_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifado"."almoxarifados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."localizacoes_fisicas"
    ADD CONSTRAINT "localizacoes_fisicas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."materiais_equipamentos"
    ADD CONSTRAINT "materiais_equipamentos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."materiais_equipamentos"
    ADD CONSTRAINT "materiais_equipamentos_localizacao_id_fkey" FOREIGN KEY ("localizacao_id") REFERENCES "almoxarifado"."localizacoes_fisicas"("id");



ALTER TABLE ONLY "almoxarifado"."materiais_equipamentos"
    ADD CONSTRAINT "materiais_equipamentos_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_almoxarifado_destino_id_fkey" FOREIGN KEY ("almoxarifado_destino_id") REFERENCES "almoxarifado"."almoxarifados"("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_almoxarifado_origem_id_fkey" FOREIGN KEY ("almoxarifado_origem_id") REFERENCES "almoxarifado"."almoxarifados"("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_material_equipamento_id_fkey" FOREIGN KEY ("material_equipamento_id") REFERENCES "almoxarifado"."materiais_equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_nfe_id_fkey" FOREIGN KEY ("nfe_id") REFERENCES "financeiro"."nfe"("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "almoxarifado"."movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifado"."almoxarifados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "almoxarifado"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_material_equipamento_id_fkey" FOREIGN KEY ("material_equipamento_id") REFERENCES "almoxarifado"."materiais_equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "almoxarifado"."transferencia_itens"
    ADD CONSTRAINT "transferencia_itens_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "almoxarifado"."transferencia_itens"
    ADD CONSTRAINT "transferencia_itens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."transferencia_itens"
    ADD CONSTRAINT "transferencia_itens_material_equipamento_id_fkey" FOREIGN KEY ("material_equipamento_id") REFERENCES "almoxarifado"."materiais_equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."transferencia_itens"
    ADD CONSTRAINT "transferencia_itens_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "almoxarifado"."transferencia_itens"
    ADD CONSTRAINT "transferencia_itens_transferencia_id_fkey" FOREIGN KEY ("transferencia_id") REFERENCES "almoxarifado"."transferencias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."transferencias"
    ADD CONSTRAINT "transferencias_almoxarifado_destino_id_fkey" FOREIGN KEY ("almoxarifado_destino_id") REFERENCES "almoxarifado"."almoxarifados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."transferencias"
    ADD CONSTRAINT "transferencias_almoxarifado_origem_id_fkey" FOREIGN KEY ("almoxarifado_origem_id") REFERENCES "almoxarifado"."almoxarifados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."transferencias"
    ADD CONSTRAINT "transferencias_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "almoxarifado"."transferencias"
    ADD CONSTRAINT "transferencias_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "almoxarifado"."transferencias"
    ADD CONSTRAINT "transferencias_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "public"."users"("id");



ALTER TABLE "almoxarifado"."almoxarifados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "almoxarifados_company_isolation" ON "almoxarifado"."almoxarifados" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



COMMENT ON POLICY "almoxarifados_company_isolation" ON "almoxarifado"."almoxarifados" IS 'Isolamento de dados por empresa';



CREATE POLICY "almoxarifados_delete_policy" ON "almoxarifado"."almoxarifados" FOR DELETE USING ("almoxarifado"."check_module_permission"('delete'::"text"));



CREATE POLICY "almoxarifados_insert_policy" ON "almoxarifado"."almoxarifados" FOR INSERT WITH CHECK ("almoxarifado"."check_module_permission"('create'::"text"));



CREATE POLICY "almoxarifados_select_policy" ON "almoxarifado"."almoxarifados" FOR SELECT USING ("almoxarifado"."check_module_permission"('read'::"text"));



CREATE POLICY "almoxarifados_update_policy" ON "almoxarifado"."almoxarifados" FOR UPDATE USING ("almoxarifado"."check_module_permission"('edit'::"text"));



ALTER TABLE "almoxarifado"."checklist_recebimento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_recebimento_company_isolation" ON "almoxarifado"."checklist_recebimento" USING (("entrada_id" IN ( SELECT "entradas_materiais"."id"
   FROM "almoxarifado"."entradas_materiais"
  WHERE ("entradas_materiais"."company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "almoxarifado"."entrada_itens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entrada_itens_company_isolation" ON "almoxarifado"."entrada_itens" USING (("entrada_id" IN ( SELECT "entradas_materiais"."id"
   FROM "almoxarifado"."entradas_materiais"
  WHERE ("entradas_materiais"."company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "almoxarifado"."entradas_materiais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entradas_materiais_company_isolation" ON "almoxarifado"."entradas_materiais" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



ALTER TABLE "almoxarifado"."estoque_atual" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estoque_atual_company_isolation" ON "almoxarifado"."estoque_atual" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



CREATE POLICY "estoque_atual_select_policy" ON "almoxarifado"."estoque_atual" FOR SELECT USING ("almoxarifado"."check_module_permission"('read'::"text"));



CREATE POLICY "estoque_atual_update_policy" ON "almoxarifado"."estoque_atual" FOR UPDATE USING ("almoxarifado"."check_module_permission"('edit'::"text"));



ALTER TABLE "almoxarifado"."inventario_itens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventario_itens_company_isolation" ON "almoxarifado"."inventario_itens" USING (("inventario_id" IN ( SELECT "inventarios"."id"
   FROM "almoxarifado"."inventarios"
  WHERE ("inventarios"."company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "almoxarifado"."inventarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventarios_company_isolation" ON "almoxarifado"."inventarios" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



ALTER TABLE "almoxarifado"."localizacoes_fisicas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "localizacoes_fisicas_company_isolation" ON "almoxarifado"."localizacoes_fisicas" USING (("almoxarifado_id" IN ( SELECT "almoxarifados"."id"
   FROM "almoxarifado"."almoxarifados"
  WHERE ("almoxarifados"."company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "almoxarifado"."materiais_equipamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "materiais_equipamentos_company_isolation" ON "almoxarifado"."materiais_equipamentos" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



COMMENT ON POLICY "materiais_equipamentos_company_isolation" ON "almoxarifado"."materiais_equipamentos" IS 'Isolamento de materiais por empresa';



CREATE POLICY "materiais_equipamentos_delete_policy" ON "almoxarifado"."materiais_equipamentos" FOR DELETE USING ("almoxarifado"."check_module_permission"('delete'::"text"));



CREATE POLICY "materiais_equipamentos_insert_policy" ON "almoxarifado"."materiais_equipamentos" FOR INSERT WITH CHECK ("almoxarifado"."check_module_permission"('create'::"text"));



CREATE POLICY "materiais_equipamentos_select_policy" ON "almoxarifado"."materiais_equipamentos" FOR SELECT USING ("almoxarifado"."check_module_permission"('read'::"text"));



CREATE POLICY "materiais_equipamentos_update_policy" ON "almoxarifado"."materiais_equipamentos" FOR UPDATE USING ("almoxarifado"."check_module_permission"('edit'::"text"));



ALTER TABLE "almoxarifado"."movimentacoes_estoque" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movimentacoes_estoque_company_isolation" ON "almoxarifado"."movimentacoes_estoque" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



COMMENT ON POLICY "movimentacoes_estoque_company_isolation" ON "almoxarifado"."movimentacoes_estoque" IS 'Isolamento de movimentaÃ§Ãµes por empresa';



CREATE POLICY "movimentacoes_estoque_insert_policy" ON "almoxarifado"."movimentacoes_estoque" FOR INSERT WITH CHECK ("almoxarifado"."check_module_permission"('create'::"text"));



CREATE POLICY "movimentacoes_estoque_select_policy" ON "almoxarifado"."movimentacoes_estoque" FOR SELECT USING ("almoxarifado"."check_module_permission"('read'::"text"));



ALTER TABLE "almoxarifado"."solicitacoes_compra" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "solicitacoes_compra_company_isolation" ON "almoxarifado"."solicitacoes_compra" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



ALTER TABLE "almoxarifado"."transferencia_itens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transferencia_itens_company_isolation" ON "almoxarifado"."transferencia_itens" USING (("transferencia_id" IN ( SELECT "transferencias"."id"
   FROM "almoxarifado"."transferencias"
  WHERE ("transferencias"."company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "almoxarifado"."transferencias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transferencias_company_isolation" ON "almoxarifado"."transferencias" USING (("company_id" = COALESCE(("current_setting"('app.current_company_id'::"text", true))::"uuid", ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"())
 LIMIT 1))));



GRANT USAGE ON SCHEMA "almoxarifado" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."almoxarifados" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."checklist_recebimento" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."entrada_itens" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."entradas_materiais" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."estoque_atual" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."inventario_itens" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."inventarios" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."localizacoes_fisicas" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."materiais_equipamentos" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."movimentacoes_estoque" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."solicitacoes_compra" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."transferencia_itens" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "almoxarifado"."transferencias" TO "authenticated";



\unrestrict blhIpHHyX30fd3kCM8tpkWHrCo2uuRSnNFc2thcg52A3akmX1W9iHt6ByBFmilc

RESET ALL;
