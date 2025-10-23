-- Migração para corrigir definitivamente a duplicação de company_id
-- Versão 2: Abordagem mais robusta

CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
  column_names TEXT := '';
  placeholders TEXT := '';
  param_values TEXT[] := ARRAY[company_id_param::TEXT];
  i INTEGER := 2;
  key_value RECORD;
  value_text TEXT;
  has_company_id_in_data BOOLEAN := false;
BEGIN
  RAISE NOTICE 'DEBUG: create_entity_data called for schema=%, table=%, company_id=%, data=%', schema_name, table_name, company_id_param, data_param;

  -- Verificar se company_id já existe nos dados
  has_company_id_in_data := (data_param ? 'company_id');
  RAISE NOTICE 'DEBUG: has_company_id_in_data = %', has_company_id_in_data;

  -- Iterar sobre data_param keys e values
  FOR key_value IN 
    SELECT key, value 
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    -- Pular company_id se já estiver nos dados (evitar duplicação)
    IF key_value.key = 'company_id' THEN
      RAISE NOTICE 'DEBUG: Skipping company_id from data_param to avoid duplication';
      CONTINUE;
    END IF;

    -- Append column name
    IF column_names = '' THEN
      column_names := quote_ident(key_value.key);
    ELSE
      column_names := column_names || ', ' || quote_ident(key_value.key);
    END IF;

    -- Append placeholder
    IF placeholders = '' THEN
      placeholders := '$' || i;
    ELSE
      placeholders := placeholders || ', $' || i;
    END IF;

    -- Determinar representação textual do valor baseado no tipo JSONB
    IF key_value.value IS NULL OR jsonb_typeof(key_value.value) = 'null' THEN
      value_text := NULL;
    ELSIF jsonb_typeof(key_value.value) = 'string' THEN
      value_text := key_value.value #>> '{}';
    ELSIF jsonb_typeof(key_value.value) = 'number' THEN
      value_text := key_value.value #>> '{}';
    ELSIF jsonb_typeof(key_value.value) = 'boolean' THEN
      value_text := key_value.value #>> '{}';
    ELSE
      -- Para outros tipos (ex: objetos/arrays JSONB), manter como representação textual
      value_text := key_value.value #>> '{}';
    END IF;

    param_values := param_values || value_text;
    i := i + 1;
  END LOOP;

  -- Construir query SQL dinâmica
  -- Se não há colunas adicionais, usar apenas company_id
  IF column_names = '' THEN
    sql_query := format('INSERT INTO %I.%I (company_id) VALUES ($1::uuid) RETURNING to_jsonb(*)',
      schema_name,
      table_name
    );
  ELSE
    sql_query := format('INSERT INTO %I.%I (company_id, %s) VALUES ($1::uuid, %s) RETURNING to_jsonb(*)',
      schema_name,
      table_name,
      column_names,
      placeholders
    );
  END IF;
  
  RAISE NOTICE 'DEBUG: SQL Query: %', sql_query;
  RAISE NOTICE 'DEBUG: Param Values: %', param_values;

  -- Executar query
  EXECUTE sql_query INTO result USING param_values;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: % (Query: %, Params: %)', SQLERRM, sql_query, param_values;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
