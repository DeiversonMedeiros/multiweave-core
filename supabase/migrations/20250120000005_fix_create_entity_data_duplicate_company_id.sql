-- =====================================================
-- CORREÇÃO FINAL DA FUNÇÃO create_entity_data - DUPLICAÇÃO COMPANY_ID
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Versão que evita duplicação da coluna company_id

-- Função para criar dados em qualquer schema (versão sem duplicação de company_id)
CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
  column_names TEXT;
  placeholders TEXT;
  param_values TEXT[];
  i INTEGER;
  key_value RECORD;
  value_text TEXT;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Creating entity: schema=%, table=%, company_id=%, data=%', 
    schema_name, table_name, company_id_param, data_param;
  
  -- Construir listas de colunas e placeholders
  column_names := '';
  placeholders := '';
  param_values := ARRAY[company_id_param::TEXT];
  i := 2;
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value 
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    -- Pular company_id se já estiver nos dados (evitar duplicação)
    IF key_value.key = 'company_id' THEN
      CONTINUE;
    END IF;
    
    -- Adicionar nome da coluna (escapado)
    IF column_names = '' THEN
      column_names := quote_ident(key_value.key);
    ELSE
      column_names := column_names || ', ' || quote_ident(key_value.key);
    END IF;
    
    -- Adicionar placeholder
    IF placeholders = '' THEN
      placeholders := '$' || i;
    ELSE
      placeholders := placeholders || ', $' || i;
    END IF;
    
    -- Converter valor para texto apropriado
    IF key_value.value IS NULL THEN
      value_text := NULL;
    ELSIF jsonb_typeof(key_value.value) = 'string' THEN
      value_text := key_value.value #>> '{}';
    ELSIF jsonb_typeof(key_value.value) = 'number' THEN
      value_text := key_value.value #>> '{}';
    ELSIF jsonb_typeof(key_value.value) = 'boolean' THEN
      value_text := key_value.value #>> '{}';
    ELSIF jsonb_typeof(key_value.value) = 'null' THEN
      value_text := NULL;
    ELSE
      -- Para outros tipos (incluindo objetos), converter para string
      value_text := key_value.value #>> '{}';
    END IF;
    
    -- Adicionar valor ao array
    param_values := param_values || value_text;
    i := i + 1;
  END LOOP;
  
  -- Construir query SQL
  sql_query := format('INSERT INTO %I.%I (company_id, %s) VALUES ($1::uuid, %s) RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    column_names,
    placeholders
  );
  
  -- Log da query construída
  RAISE NOTICE 'SQL Query: %', sql_query;
  RAISE NOTICE 'Parameters: %', param_values;
  
  -- Executar query
  EXECUTE sql_query INTO result USING param_values;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: % (Query: %)', SQLERRM, sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_entity_data IS 'Função para criar dados em qualquer schema evitando duplicação de company_id';
