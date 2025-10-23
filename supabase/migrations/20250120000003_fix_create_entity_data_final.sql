-- =====================================================
-- CORREÇÃO FINAL DA FUNÇÃO create_entity_data
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Versão simplificada e robusta da função create_entity_data

-- Função para criar dados em qualquer schema (versão final simplificada)
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
  param_values JSONB[];
  i INTEGER;
  key_value RECORD;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Creating entity: schema=%, table=%, company_id=%, data=%', 
    schema_name, table_name, company_id_param, data_param;
  
  -- Construir listas de colunas e placeholders
  column_names := '';
  placeholders := '';
  param_values := ARRAY[company_id_param::JSONB];
  i := 2;
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value 
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
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
    
    -- Adicionar valor ao array
    param_values := param_values || key_value.value;
    i := i + 1;
  END LOOP;
  
  -- Construir query SQL
  sql_query := format('INSERT INTO %I.%I (company_id, %s) VALUES ($1, %s) RETURNING to_jsonb(*)',
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

COMMENT ON FUNCTION create_entity_data IS 'Função simplificada para criar dados em qualquer schema sem ambiguidades';
