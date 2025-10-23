-- =====================================================
-- FUNÇÃO SIMPLIFICADA PARA TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_entity_data_simple(
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
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            IF filter_value IS NOT NULL AND filter_value != 'all' THEN
                -- Verificar se é um campo UUID
                IF filter_key LIKE '%_id' THEN
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''::uuid';
                ELSE
                    where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''';
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- Construir cláusula ORDER BY
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
