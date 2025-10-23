-- =====================================================
-- CORREÇÃO FINAL DA FUNÇÃO create_entity_data
-- =====================================================
-- Data: 2025-01-21
-- Descrição: Versão final e funcional da função create_entity_data

-- Remover função existente se houver
DROP FUNCTION IF EXISTS create_entity_data(TEXT, TEXT, UUID, JSONB);

-- Criar função create_entity_data corrigida
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
  placeholders TEXT[];
  i INTEGER;
BEGIN
  -- Log para debug
  RAISE NOTICE '=== INÍCIO create_entity_data ===';
  RAISE NOTICE 'schema_name: %', schema_name;
  RAISE NOTICE 'table_name: %', table_name;
  RAISE NOTICE 'company_id_param: %', company_id_param;
  RAISE NOTICE 'data_param: %', data_param;
  
  -- Extrair chaves e valores do JSON preservando tipos
  SELECT array_agg(key), array_agg(value)
  INTO keys_array, values_array
  FROM jsonb_each(data_param);
  
  RAISE NOTICE 'keys_array: %', keys_array;
  RAISE NOTICE 'values_array: %', values_array;
  
  -- Construir array de placeholders
  placeholders := ARRAY[]::TEXT[];
  
  -- Verificar se há dados para processar
  IF values_array IS NOT NULL AND array_length(values_array, 1) > 0 THEN
    FOR i IN 1..array_length(values_array, 1) LOOP
      placeholders := placeholders || ('$' || (i + 1)::TEXT);
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Nenhum dado fornecido para inserção';
  END IF;
  
  -- Construir SQL de inserção com valores diretos
  DECLARE
    values_list TEXT;
    i INTEGER;
  BEGIN
    -- Construir lista de valores
    values_list := '';
    FOR i IN 1..array_length(values_array, 1) LOOP
      IF i > 1 THEN
        values_list := values_list || ', ';
      END IF;
      values_list := values_list || quote_literal(values_array[i]);
    END LOOP;
    
    insert_sql := format(
      'INSERT INTO %I.%I (company_id, %s) VALUES (%s, %s) RETURNING to_jsonb(*)',
      schema_name,
      table_name,
      array_to_string(keys_array, ', '),
      quote_literal(company_id_param),
      values_list
    );
    
    RAISE NOTICE 'insert_sql: %', insert_sql;
    
    -- Executar inserção
    EXECUTE insert_sql INTO result_json;
  END;
  
  RAISE NOTICE 'result_json: %', result_json;
  RAISE NOTICE '=== FIM create_entity_data ===';
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO em create_entity_data: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função está acessível via RPC
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comentário para documentação
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados em qualquer schema. Parâmetros: schema_name, table_name, company_id_param, data_param';

