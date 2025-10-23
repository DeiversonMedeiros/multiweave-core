-- Fix create_entity_data function - resolve key ambiguity and add detailed logging
CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result_record record;
  result_json jsonb;
  insert_sql text;
  values_sql text;
  keys_array text[];
  values_array jsonb[];
  key_name text;
  value_data jsonb;
  i integer;
BEGIN
  RAISE NOTICE '=== INÍCIO create_entity_data ===';
  RAISE NOTICE 'schema_name: %', schema_name;
  RAISE NOTICE 'table_name: %', table_name;
  RAISE NOTICE 'company_id_param: %', company_id_param;
  RAISE NOTICE 'data_param: %', data_param;
  
  -- Extract keys and values preserving types
  SELECT array_agg(key), array_agg(value)
  INTO keys_array, values_array
  FROM jsonb_each(data_param);
  
  RAISE NOTICE 'keys_array: %', keys_array;
  RAISE NOTICE 'values_array: %', values_array;
  
  -- Build SQL with typed placeholders
  insert_sql := format(
    'INSERT INTO %I.%I (company_id, %s) VALUES ($1, %s) RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    array_to_string(keys_array, ', '),
    array_to_string(
      array(
        SELECT '$' || (series_val + 1)::text
        FROM generate_series(1, array_length(values_array, 1)) AS series_val
      ), 
      ', '
    )
  );
  
  RAISE NOTICE 'insert_sql: %', insert_sql;
  RAISE NOTICE 'Parâmetros: company_id_param=%, values_array=%', company_id_param, values_array;
  
  -- Execute with typed parameters
  EXECUTE insert_sql INTO result_json USING company_id_param, values_array;
  
  RAISE NOTICE 'result_json: %', result_json;
  RAISE NOTICE '=== FIM create_entity_data ===';
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO em create_entity_data: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
