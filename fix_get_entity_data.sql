-- =====================================================
-- CORREÇÃO DA AMBIGUIDADE DE user_id NA FUNÇÃO get_entity_data
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_entity_data(
  schema_name text,
  table_name text,
  company_id_param text DEFAULT NULL,
  filters jsonb DEFAULT '{}',
  limit_param integer DEFAULT 100,
  offset_param integer DEFAULT 0,
  order_by text DEFAULT 'created_at',
  order_direction text DEFAULT 'DESC'
)
RETURNS TABLE(id text, data jsonb, total_count bigint)
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
