-- =====================================================
-- FUNÇÃO SIMPLIFICADA PARA TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.test_get_entity_data(
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
BEGIN
    -- Construir cláusula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Adicionar filtros dinâmicos do JSON
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        
        -- Filtros específicos conhecidos
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
        
        -- Filtros dinâmicos para campos específicos conhecidos
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
