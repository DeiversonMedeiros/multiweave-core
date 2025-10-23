-- =====================================================
-- CORREÇÃO DA FUNÇÃO get_entity_data
-- =====================================================

-- Corrigir o tipo de retorno da função get_entity_data
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
BEGIN
    -- Verificar se o usuário tem permissão para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Verificar se a empresa pertence ao usuário
    IF company_id_param IS NOT NULL THEN
        IF NOT (company_id_param::uuid = ANY(public.get_user_companies())) THEN
            RAISE EXCEPTION 'Acesso negado para empresa %', company_id_param;
        END IF;
    END IF;
    
    -- Construir cláusula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Adicionar filtros dinâmicos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        -- Adicionar filtros de texto (LIKE)
        IF filters ? 'search' AND filters->>'search' != '' THEN
            where_clause := where_clause || ' AND (nome ILIKE ''%' || (filters->>'search') || '%'' OR matricula ILIKE ''%' || (filters->>'search') || '%'')';
        END IF;
        
        -- Adicionar filtros de status
        IF filters ? 'status' AND filters->>'status' != '' THEN
            where_clause := where_clause || ' AND status = ''' || (filters->>'status') || '''';
        END IF;
        
        -- Adicionar filtros de data
        IF filters ? 'start_date' AND filters->>'start_date' != '' THEN
            where_clause := where_clause || ' AND created_at >= ''' || (filters->>'start_date') || '''::date';
        END IF;
        
        IF filters ? 'end_date' AND filters->>'end_date' != '' THEN
            where_clause := where_clause || ' AND created_at <= ''' || (filters->>'end_date') || '''::date';
        END IF;
        
        -- Adicionar filtros de boolean
        IF filters ? 'is_active' THEN
            where_clause := where_clause || ' AND is_active = ' || (filters->>'is_active')::boolean;
        END IF;
    END IF;
    
    -- Construir cláusula ORDER BY
    order_clause := 'ORDER BY ' || order_by || ' ' || order_direction;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I %s', schema_name, table_name, where_clause);
    EXECUTE count_query INTO total_rows;
    
    -- Query principal para buscar dados - CORREÇÃO: usar ::bigint
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
