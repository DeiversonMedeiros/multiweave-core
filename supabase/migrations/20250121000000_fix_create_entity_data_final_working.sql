-- Final working version of create_entity_data function
-- This version uses literal values instead of parameterized queries
-- to avoid issues with EXECUTE USING and array parameters

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
  keys_array text[];
  values_array jsonb[];
  i integer;
  param_count integer;
  param_list text;
  value_list text;
BEGIN
  -- Extract keys and values preserving types
  SELECT array_agg(key), array_agg(value)
  INTO keys_array, values_array
  FROM jsonb_each(data_param);
  
  -- Count parameters
  param_count := array_length(values_array, 1);
  
  -- Build parameter list and value list
  param_list := array_to_string(keys_array, ', ');
  value_list := '';
  
  -- Add company_id as first parameter
  value_list := value_list || quote_literal(company_id_param);
  
  -- Add data parameters with proper type handling
  FOR i IN 1..param_count LOOP
    value_list := value_list || ', ';
    IF values_array[i] IS NULL THEN
      value_list := value_list || 'NULL';
    ELSIF jsonb_typeof(values_array[i]) = 'string' THEN
      value_list := value_list || quote_literal(values_array[i] #>> '{}');
    ELSIF jsonb_typeof(values_array[i]) = 'number' THEN
      value_list := value_list || (values_array[i] #>> '{}');
    ELSIF jsonb_typeof(values_array[i]) = 'boolean' THEN
      value_list := value_list || (values_array[i] #>> '{}');
    ELSE
      value_list := value_list || quote_literal(values_array[i] #>> '{}');
    END IF;
  END LOOP;
  
  -- Build SQL with literal values and return the entire row
  insert_sql := format(
    'INSERT INTO %I.%I (company_id, %s) VALUES (%s) RETURNING *',
    schema_name,
    table_name,
    param_list,
    value_list
  );
  
  -- Execute and convert to JSONB
  EXECUTE insert_sql INTO result_record;
  result_json := to_jsonb(result_record);
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

