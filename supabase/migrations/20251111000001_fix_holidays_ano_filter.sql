-- =====================================================
-- CORREÇÃO DO FILTRO "ano" PARA TABELA HOLIDAYS
-- Data: 2025-11-11
-- Descrição: Adiciona tratamento especial para filtro "ano" na tabela rh.holidays
--            convertendo para EXTRACT(year FROM data)
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
    base_field text;
    condition text;
BEGIN
    -- Log de entrada
    RAISE NOTICE 'get_entity_data: INICIO - schema_name=%, table_name=%, company_id_param=%, filters=%', 
        schema_name, table_name, company_id_param, filters;
    
    -- Obter ID do usuario atual
    current_user_id := auth.uid();
    RAISE NOTICE 'get_entity_data: current_user_id=%', current_user_id;
    
    -- Se nao ha usuario autenticado, negar acesso
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'get_entity_data: ERRO - Usuario nao autenticado';
        RAISE EXCEPTION 'Usuario nao autenticado';
    END IF;
    
    -- Verificar se o usuario tem permissao para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE NOTICE 'get_entity_data: ERRO - Acesso negado para %:%.%', schema_name, table_name, 'read';
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Obter empresas do usuario
    SELECT ARRAY(
        SELECT uc.company_id 
        FROM public.user_companies uc 
        WHERE uc.user_id = current_user_id 
        AND uc.ativo = true
    ) INTO user_companies;
    
    RAISE NOTICE 'get_entity_data: user_companies=%', user_companies;
    
    -- Se for super admin, permitir acesso a todas as empresas
    IF public.is_admin_simple(current_user_id) THEN
        has_company_access := true;
        RAISE NOTICE 'get_entity_data: Usuario e super admin';
    ELSE
        -- Verificar se o usuario tem acesso a empresa especifica
        IF company_id_param IS NOT NULL THEN
            has_company_access := (company_id_param::uuid = ANY(user_companies));
            RAISE NOTICE 'get_entity_data: Verificando acesso a empresa especifica: %', has_company_access;
        ELSE
            -- Se nao especificou empresa, permitir se tiver acesso a pelo menos uma
            has_company_access := (array_length(user_companies, 1) > 0);
            RAISE NOTICE 'get_entity_data: Verificando acesso geral: %', has_company_access;
        END IF;
    END IF;
    
    -- Se nao tem acesso a empresa, negar
    IF NOT has_company_access THEN
        RAISE NOTICE 'get_entity_data: ERRO - Acesso negado para empresa %', COALESCE(company_id_param, 'nao especificada');
        RAISE EXCEPTION 'Acesso negado para empresa %', COALESCE(company_id_param, 'nao especificada');
    END IF;
    
    -- Construir clausula WHERE basica
    where_clause := 'WHERE 1=1';
    RAISE NOTICE 'get_entity_data: where_clause inicial=%', where_clause;
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
        RAISE NOTICE 'get_entity_data: where_clause com company_id=%', where_clause;
    END IF;
    
    -- Adicionar filtros dinamicos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        RAISE NOTICE 'get_entity_data: Processando filtros JSON=%', filters;
        
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            RAISE NOTICE 'get_entity_data: Processando filtro - key=%, value=%', filter_key, filter_value;
            
            -- Pular filtros vazios ou com valor "all"
            IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
                -- Construir condicao de forma segura
                condition := '';
                
                -- Tratamento especial para filtro "ano" na tabela holidays
                -- A tabela rh.holidays não tem coluna "ano", mas tem "data" (DATE)
                -- Precisamos extrair o ano da coluna "data"
                IF filter_key = 'ano' AND schema_name = 'rh' AND table_name = 'holidays' THEN
                    condition := 'EXTRACT(YEAR FROM data) = ' || filter_value;
                    RAISE NOTICE 'get_entity_data: Aplicando filtro especial para ano em holidays: %', condition;
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
                -- Outros campos de texto
                ELSE
                    condition := filter_key || ' = ''' || filter_value || '''';
                END IF;
                
                -- Adicionar condicao se foi construida
                IF condition != '' THEN
                    where_clause := where_clause || ' AND ' || condition;
                    RAISE NOTICE 'get_entity_data: Condicao adicionada: %', condition;
                END IF;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'get_entity_data: where_clause final=%', where_clause;
    END IF;
    
    -- Construir clausula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    RAISE NOTICE 'get_entity_data: order_clause=%', order_clause;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    RAISE NOTICE 'get_entity_data: count_query=%', count_query;
    
    -- Executar count query
    EXECUTE count_query INTO total_rows;
    
    RAISE NOTICE 'get_entity_data: total_rows=%', total_rows;
    
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
    
    RAISE NOTICE 'get_entity_data: query_text=%', query_text;
    
    -- Executar query principal
    RETURN QUERY EXECUTE query_text;
    
    RAISE NOTICE 'get_entity_data: FIM - Query executada com sucesso';
END;
$$;

