-- =====================================================
-- CORREÇÃO DA FUNÇÃO get_entity_data
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Remover a função existente
DROP FUNCTION IF EXISTS public.get_entity_data(
    schema_name text,
    table_name text,
    company_id_param text,
    filters jsonb,
    limit_param integer,
    offset_param integer,
    order_by text,
    order_direction text
);

-- Recriar a função com sintaxe corrigida
CREATE OR REPLACE FUNCTION public.get_entity_data(
    schema_name text,
    table_name text,
    company_id_param text,
    filters jsonb DEFAULT '{}',
    limit_param integer DEFAULT 100,
    offset_param integer DEFAULT 0,
    order_by text DEFAULT 'id',
    order_direction text DEFAULT 'DESC'
)
RETURNS TABLE(
    id text,
    data jsonb,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    base_field text;
    company_uuid uuid;
    filter_conditions text[] := '{}';
    condition text;
BEGIN
    -- Obter ID do usuario atual
    current_user_id := auth.uid();
    
    -- Se nao ha usuario autenticado, negar acesso
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado';
    END IF;
    
    -- Verificar se o usuario tem permissao para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Obter empresas do usuario
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
        -- Verificar se o usuario tem acesso a empresa especifica
        IF company_id_param IS NOT NULL THEN
            has_company_access := (company_id_param::uuid = ANY(user_companies));
        ELSE
            -- Se nao especificou empresa, permitir se tiver acesso a pelo menos uma
            has_company_access := (array_length(user_companies, 1) > 0);
        END IF;
    END IF;
    
    -- Se nao tem acesso a empresa, negar
    IF NOT has_company_access THEN
        RAISE EXCEPTION 'Acesso negado para empresa %', COALESCE(company_id_param, 'nao especificada');
    END IF;
    
    -- Construir clausula WHERE basica
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        -- Converter para UUID de forma segura
        BEGIN
            company_uuid := company_id_param::uuid;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION 'company_id_param invalido: %', company_id_param;
        END;
        
        where_clause := where_clause || ' AND company_id = $1';
    ELSE
        -- Se nao especificou empresa, filtrar pelas empresas do usuario
        IF NOT public.is_admin_simple(current_user_id) THEN
            where_clause := where_clause || ' AND company_id = ANY($2)';
        END IF;
    END IF;
    
    -- Adicionar filtros dinamicos do JSON de forma mais segura
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            -- Pular filtros vazios ou com valor "all"
            IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
                -- Construir condicao de forma mais segura
                condition := '';
                
                -- Tratamento especial para filtro "ano" na tabela holidays
                IF filter_key = 'ano' AND schema_name = 'rh' AND table_name = 'holidays' THEN
                    condition := 'EXTRACT(year FROM data) = ' || filter_value;
                -- Verificar se e um campo UUID (termina com _id mas nao e ano_vigencia ou mes_vigencia)
                ELSIF filter_key LIKE '%_id' AND filter_key NOT IN ('ano_vigencia', 'mes_vigencia') THEN
                    condition := filter_key || ' = ''' || filter_value || '''::uuid';
                -- Verificar se e um campo de data com comparacao >=
                ELSIF filter_key LIKE '%_gte' THEN
                    base_field := replace(filter_key, '_gte', '');
                    condition := base_field || ' >= ''' || filter_value || '''::date';
                -- Verificar se e um campo de data com comparacao <=
                ELSIF filter_key LIKE '%_lte' THEN
                    base_field := replace(filter_key, '_lte', '');
                    condition := base_field || ' <= ''' || filter_value || '''::date';
                -- Verificar se e um campo de data simples
                ELSIF filter_key LIKE '%_date' OR filter_key LIKE 'data_%' THEN
                    condition := filter_key || ' = ''' || filter_value || '''::date';
                -- Verificar se e um campo booleano
                ELSIF filter_value IN ('true', 'false') THEN
                    condition := filter_key || ' = ' || filter_value;
                -- Verificar se e um campo numerico (ano_vigencia, mes_vigencia, etc.)
                ELSIF filter_key IN ('ano_vigencia', 'mes_vigencia', 'dias_uteis_mes', 'tolerancia_atraso_minutos') THEN
                    condition := filter_key || ' = ' || filter_value;
                -- Campo de texto com busca
                ELSIF filter_key = 'search' THEN
                    condition := '(nome ILIKE ''%' || filter_value || '%'' OR matricula ILIKE ''%' || filter_value || '%'' OR cpf ILIKE ''%' || filter_value || '%'')';
                -- Outros campos de texto
                ELSE
                    condition := filter_key || ' = ''' || filter_value || '''';
                END IF;
                
                -- Adicionar condicao se foi construida
                IF condition != '' THEN
                    filter_conditions := array_append(filter_conditions, condition);
                END IF;
            END IF;
        END LOOP;
        
        -- Adicionar todas as condicoes de filtro
        IF array_length(filter_conditions, 1) > 0 THEN
            where_clause := where_clause || ' AND ' || array_to_string(filter_conditions, ' AND ');
        END IF;
    END IF;
    
    -- Construir clausula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    
    -- Executar count query com parametros seguros
    IF company_id_param IS NOT NULL THEN
        EXECUTE count_query USING company_uuid INTO total_rows;
    ELSE
        EXECUTE count_query USING user_companies INTO total_rows;
    END IF;
    
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
    
    -- Executar query principal com parametros seguros
    IF company_id_param IS NOT NULL THEN
        RETURN QUERY EXECUTE query_text USING company_uuid;
    ELSE
        RETURN QUERY EXECUTE query_text USING user_companies;
    END IF;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_entity_data IS 'Função genérica para buscar dados de qualquer entidade com filtros e paginação';
