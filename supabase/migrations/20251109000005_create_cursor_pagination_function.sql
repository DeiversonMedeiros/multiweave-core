-- =====================================================
-- FUNÇÃO RPC PARA PAGINAÇÃO BASEADA EM CURSOR
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Função genérica para paginação baseada em cursor
-- Mais eficiente que offset-based para grandes volumes de dados
CREATE OR REPLACE FUNCTION public.get_entity_data_cursor(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  last_id UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  order_by TEXT DEFAULT 'id',
  order_direction TEXT DEFAULT 'DESC',
  filters JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  id UUID,
  data JSONB,
  next_cursor UUID,
  has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_text TEXT;
  where_clause TEXT := '';
  order_clause TEXT;
  filter_key TEXT;
  filter_value TEXT;
  cursor_condition TEXT;
  result_count INTEGER;
BEGIN
  -- Construir cláusula WHERE baseada em company_id
  where_clause := 'WHERE 1=1';
  
  -- Adicionar filtro de company_id se fornecido
  IF company_id_param IS NOT NULL THEN
    where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''';
  END IF;
  
  -- Adicionar filtros dinâmicos
  IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
    LOOP
      IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
        -- Verificar se é campo de data
        IF filter_key LIKE '%_date%' OR filter_key LIKE '%date%' THEN
          where_clause := where_clause || ' AND ' || filter_key || '::date = ''' || filter_value || '''::date';
        -- Verificar se é campo booleano
        ELSIF filter_value = 'true' OR filter_value = 'false' THEN
          where_clause := where_clause || ' AND ' || filter_key || ' = ' || filter_value::boolean;
        -- Verificar se é campo numérico
        ELSIF filter_value ~ '^[0-9]+\.?[0-9]*$' THEN
          where_clause := where_clause || ' AND ' || filter_key || ' = ' || filter_value;
        -- Outros campos de texto
        ELSE
          where_clause := where_clause || ' AND ' || filter_key || ' = ''' || filter_value || '''';
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Construir condição de cursor
  IF last_id IS NOT NULL THEN
    IF order_direction = 'DESC' THEN
      cursor_condition := ' AND t.id < ''' || last_id || '''';
    ELSE
      cursor_condition := ' AND t.id > ''' || last_id || '''';
    END IF;
  ELSE
    cursor_condition := '';
  END IF;
  
  -- Construir cláusula ORDER BY
  order_clause := 'ORDER BY t.' || order_by || ' ' || order_direction || ', t.id ' || order_direction;
  
  -- Query principal para buscar dados
  -- Buscar limit_param + 1 para verificar se há próxima página
  query_text := format('
    WITH paginated_data AS (
      SELECT 
        t.id,
        to_jsonb(t.*) as data
      FROM %I.%I t 
      %s %s
      %s
      LIMIT %s
    ),
    data_count AS (
      SELECT COUNT(*) as total FROM paginated_data
    ),
    last_row AS (
      SELECT id FROM paginated_data ORDER BY id %s LIMIT 1
    ),
    next_page_check AS (
      SELECT 
        CASE 
          WHEN ''%s'' = ''DESC'' THEN
            (SELECT COUNT(*) > 0 FROM %I.%I t 
             WHERE %s %s AND t.id < (SELECT id FROM last_row))
          ELSE
            (SELECT COUNT(*) > 0 FROM %I.%I t 
             WHERE %s %s AND t.id > (SELECT id FROM last_row))
        END as has_more
    )
    SELECT 
      pd.id,
      pd.data,
      (SELECT id FROM last_row) as next_cursor,
      COALESCE(npc.has_more, false) as has_more
    FROM paginated_data pd
    CROSS JOIN data_count dc
    CROSS JOIN next_page_check npc
    WHERE dc.total > 0
    ORDER BY pd.id %s
    LIMIT %s
  ', 
    schema_name, table_name,
    where_clause, cursor_condition,
    order_clause,
    limit_param + 1, -- Buscar um a mais para verificar se há próxima página
    order_direction,
    order_direction,
    schema_name, table_name,
    where_clause, cursor_condition,
    schema_name, table_name,
    where_clause, cursor_condition,
    order_direction,
    limit_param -- Retornar apenas limit_param registros
  );
  
  -- Executar query e retornar resultados
  RETURN QUERY EXECUTE query_text;
  
  -- Se não retornou resultados, verificar se há mais dados
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  IF result_count = 0 THEN
    -- Retornar indicador de que não há mais dados
    RETURN QUERY SELECT 
      NULL::UUID as id,
      NULL::JSONB as data,
      NULL::UUID as next_cursor,
      false as has_more;
  END IF;
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.get_entity_data_cursor IS 'Função para paginação baseada em cursor (mais eficiente que offset para grandes volumes)';

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_entity_data_cursor(TEXT, TEXT, UUID, UUID, INTEGER, TEXT, TEXT, JSONB) TO authenticated;

