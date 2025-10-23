-- =====================================================
-- CORREÇÃO DO ERRO DE CAST UUID PARA JSONB
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Correção do erro "cannot cast type uuid to jsonb"

-- Função para criar dados em qualquer schema (versão corrigida para UUIDs)
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
      value_text := 'NULL';
    ELSIF jsonb_typeof(key_value.value) = 'string' THEN
      -- Se for string, verificar se é UUID ou timestamp
      value_text := quote_literal(key_value.value #>> '{}');
    ELSIF jsonb_typeof(key_value.value) = 'boolean' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_typeof(key_value.value) = 'number' THEN
      value_text := (key_value.value #>> '{}');
    ELSE
      value_text := quote_literal(key_value.value #>> '{}');
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
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar dados em qualquer schema (versão corrigida para UUIDs)
CREATE OR REPLACE FUNCTION update_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
  set_clauses TEXT;
  param_values TEXT[];
  i INTEGER;
  key_value RECORD;
  value_text TEXT;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Updating entity: schema=%, table=%, company_id=%, id=%, data=%', 
    schema_name, table_name, company_id_param, id_param, data_param;
  
  -- Construir cláusulas SET e array de valores
  set_clauses := '';
  param_values := ARRAY[id_param::TEXT, company_id_param::TEXT];
  i := 3;
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value 
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    -- Pular company_id se estiver nos dados (não deve ser atualizado)
    IF key_value.key = 'company_id' THEN
      CONTINUE;
    END IF;
    
    -- Adicionar cláusula SET
    IF set_clauses = '' THEN
      set_clauses := quote_ident(key_value.key) || ' = $' || i;
    ELSE
      set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = $' || i;
    END IF;
    
    -- Converter valor para texto apropriado
    IF key_value.value IS NULL THEN
      value_text := 'NULL';
    ELSIF jsonb_typeof(key_value.value) = 'string' THEN
      -- Se for string, verificar se é UUID ou timestamp
      value_text := quote_literal(key_value.value #>> '{}');
    ELSIF jsonb_typeof(key_value.value) = 'boolean' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_typeof(key_value.value) = 'number' THEN
      value_text := (key_value.value #>> '{}');
    ELSE
      value_text := quote_literal(key_value.value #>> '{}');
    END IF;
    
    -- Adicionar valor ao array
    param_values := param_values || value_text;
    i := i + 1;
  END LOOP;
  
  -- Construir query SQL
  sql_query := format('UPDATE %I.%I SET %s, updated_at = now() WHERE id = $1::uuid AND company_id = $2::uuid RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    set_clauses
  );
  
  -- Log da query construída
  RAISE NOTICE 'SQL Query: %', sql_query;
  RAISE NOTICE 'Parameters: %', param_values;
  
  -- Executar query
  EXECUTE sql_query INTO result USING param_values;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
