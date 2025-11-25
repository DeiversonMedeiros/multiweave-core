-- =====================================================
-- FIX: create_entity_data - robust SQL build (ASCII only)
-- Date: 2025-11-10
-- Notes:
-- - Build column/value lists using arrays to avoid comma syntax issues
-- - Only include company_id when table has that column
-- - On error, include generated SQL in the exception message
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result_json JSONB;
  result_row RECORD;
  insert_sql TEXT;
  key TEXT;
  value JSONB;
  value_str TEXT;
  has_company_id BOOLEAN;
  columns_array TEXT[] := ARRAY[]::TEXT[];
  values_array TEXT[] := ARRAY[]::TEXT[];
  columns_list TEXT;
  values_list TEXT;
BEGIN
  -- Debug logs
  RAISE NOTICE 'create_entity_data: start';
  RAISE NOTICE 'schema_name=%', schema_name;
  RAISE NOTICE 'table_name=%', table_name;
  RAISE NOTICE 'company_id_param=%', company_id_param;
  RAISE NOTICE 'data_param=%', data_param;

  -- Table exists check
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = create_entity_data.schema_name
      AND t.table_name = create_entity_data.table_name
  ) THEN
    RAISE EXCEPTION 'Table %.% does not exist', schema_name, table_name;
  END IF;

  -- Detect company_id column
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = create_entity_data.schema_name
      AND c.table_name = create_entity_data.table_name
      AND c.column_name = 'company_id'
  ) INTO has_company_id;

  RAISE NOTICE 'has_company_id=%', has_company_id;

  -- Add company_id only if present on target table
  IF has_company_id AND company_id_param IS NOT NULL THEN
    columns_array := columns_array || ARRAY['company_id'];
    values_array := values_array || ARRAY[quote_literal(company_id_param)::TEXT || '::uuid'];
  END IF;

  -- Process payload keys
  FOR key, value IN SELECT * FROM jsonb_each(data_param) LOOP
    -- Skip company_id if function is already adding it
    IF key = 'company_id' AND has_company_id THEN
      CONTINUE;
    END IF;

    -- Skip invalid keys
    IF key IS NULL OR key = '' THEN
      CONTINUE;
    END IF;

    -- Append column
    columns_array := columns_array || ARRAY[quote_ident(key)];

    -- Append value based on type
    IF jsonb_typeof(value) = 'null' THEN
      values_array := values_array || ARRAY['NULL'];
    ELSE
      value_str := value::TEXT;

      -- Strip jsonb quotes for scalars
      IF value_str LIKE '\"%' AND value_str LIKE '%\"' THEN
        value_str := substring(value_str from 2 for length(value_str) - 2);
      END IF;

      -- UUID
      IF value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        values_array := values_array || ARRAY[quote_literal(value_str) || '::uuid'];
      -- boolean
      ELSIF value_str IN ('true', 'false') THEN
        values_array := values_array || ARRAY[value_str];
      -- number
      ELSIF value_str ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN
        values_array := values_array || ARRAY[value_str];
      -- text
      ELSE
        values_array := values_array || ARRAY[quote_literal(value_str)];
      END IF;
    END IF;
  END LOOP;

  -- Must have at least one column
  IF array_length(columns_array, 1) IS NULL OR array_length(columns_array, 1) = 0 THEN
    RAISE EXCEPTION 'No columns to insert';
  END IF;

  -- Build lists
  columns_list := array_to_string(columns_array, ', ');
  values_list  := array_to_string(values_array,  ', ');

  RAISE NOTICE 'columns_list=%', columns_list;
  RAISE NOTICE 'values_list=%', values_list;

  -- Build SQL (RETURNING * and convert to JSONB in PL/pgSQL)
  insert_sql := format(
    'INSERT INTO %I.%I (%s) VALUES (%s) RETURNING *',
    schema_name,
    table_name,
    columns_list,
    values_list
  );

  RAISE NOTICE 'insert_sql=%', insert_sql;

  -- Execute
  EXECUTE insert_sql INTO result_row;
  result_json := to_jsonb(result_row);

  RAISE NOTICE 'result_json=%', result_json;
  RAISE NOTICE 'create_entity_data: end';

  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'create_entity_data error=%', SQLERRM;
    RAISE EXCEPTION 'create_entity_data failed. SQL: % ; error: %', COALESCE(insert_sql, 'N/A'), SQLERRM;
END;
$function$;

-- Grants
GRANT EXECUTE ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comment
COMMENT ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) IS
'Generic insert function. Uses arrays to safely build SQL and conditionally includes company_id.';


