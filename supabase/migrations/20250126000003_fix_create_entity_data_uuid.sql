-- =====================================================
-- CORREÇÃO: create_entity_data para tratar UUIDs corretamente
-- Data: 2025-01-26
-- Descrição: Trata campos UUID corretamente sem quote_literal
-- =====================================================

CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result_json JSONB;
  insert_sql TEXT;
  keys_array TEXT[];
  values_array JSONB[];
  i INTEGER;
  key TEXT;
  value JSONB;
  value_str TEXT;
  column_type TEXT;
BEGIN
  -- Log para debug
  RAISE NOTICE '=== INÍCIO create_entity_data ===';
  RAISE NOTICE 'schema_name: %', schema_name;
  RAISE NOTICE 'table_name: %', table_name;
  RAISE NOTICE 'company_id_param: %', company_id_param;
  RAISE NOTICE 'data_param: %', data_param;
  
  -- Verificar se a tabela existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name 
    AND table_name = table_name
  ) THEN
    RAISE EXCEPTION 'Tabela %.% não existe', schema_name, table_name;
  END IF;
  
  -- Construir INSERT dinâmico tratando UUIDs corretamente
  DECLARE
    columns_list TEXT := 'company_id';
    values_list TEXT := quote_literal(company_id_param)::TEXT;
    pair JSONB;
  BEGIN
    FOR key, value IN SELECT * FROM jsonb_each(data_param) LOOP
      columns_list := columns_list || ', ' || quote_ident(key);
      
      -- Verificar o tipo do valor
      IF jsonb_typeof(value) = 'null' THEN
        values_list := values_list || ', NULL';
      ELSE
        value_str := value::TEXT;
        
        -- Remover aspas extras do JSONB
        IF value_str LIKE '"%' AND value_str LIKE '%"' THEN
          value_str := substring(value_str from 2 for length(value_str) - 2);
        END IF;
        
        -- Se parece UUID, tratar como tal
        IF value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          values_list := values_list || ', ''' || value_str || '''::uuid';
        ELSE
          values_list := values_list || ', ' || quote_literal(value_str);
        END IF;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'columns_list: %', columns_list;
    RAISE NOTICE 'values_list: %', values_list;
    
    -- Construir SQL de inserção
    insert_sql := format(
      'INSERT INTO %I.%I (%s) VALUES (%s) RETURNING to_jsonb(*)',
      schema_name,
      table_name,
      columns_list,
      values_list
    );
    
    RAISE NOTICE 'insert_sql: %', insert_sql;
    
    -- Executar inserção
    EXECUTE insert_sql INTO result_json;
    
    RAISE NOTICE 'result_json: %', result_json;
    RAISE NOTICE '=== FIM create_entity_data ===';
    
    RETURN result_json;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO em create_entity_data: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comentário
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados tratando UUIDs corretamente';

