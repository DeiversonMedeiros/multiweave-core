-- =====================================================
-- CORREÇÃO: create_entity_data para tratar arrays e JSONB
-- Data: 2025-11-09
-- Descrição: Corrige o tratamento de arrays (ex: INTEGER[]) e objetos JSONB
--             na função create_entity_data
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
  key TEXT;
  value JSONB;
  value_str TEXT;
  has_company_id BOOLEAN;
  columns_list TEXT;
  values_list TEXT;
  column_type TEXT;
  value_type TEXT;
BEGIN
  -- Log para debug
  RAISE NOTICE '=== INÍCIO create_entity_data ===';
  RAISE NOTICE 'schema_name: %', schema_name;
  RAISE NOTICE 'table_name: %', table_name;
  RAISE NOTICE 'company_id_param: %', company_id_param;
  RAISE NOTICE 'data_param: %', data_param;
  
  -- Verificar se a tabela existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = create_entity_data.schema_name 
    AND t.table_name = create_entity_data.table_name
  ) THEN
    RAISE EXCEPTION 'Tabela %.% não existe', schema_name, table_name;
  END IF;
  
  -- Verificar se a tabela tem coluna company_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = create_entity_data.schema_name
    AND c.table_name = create_entity_data.table_name
    AND c.column_name = 'company_id'
  ) INTO has_company_id;
  
  RAISE NOTICE 'has_company_id: %', has_company_id;
  
  -- Construir INSERT dinâmico tratando tipos corretamente
  columns_list := '';
  values_list := '';
  
  -- Adicionar company_id apenas se a tabela tiver essa coluna
  IF has_company_id THEN
    columns_list := 'company_id';
    values_list := quote_literal(company_id_param)::TEXT;
  END IF;
  
  -- Processar campos do data_param
  RAISE NOTICE '=== PROCESSANDO CAMPOS DO data_param ===';
  FOR key, value IN SELECT * FROM jsonb_each(data_param) LOOP
    RAISE NOTICE '--- Processando campo: % ---', key;
    
    -- Pular company_id se já estiver sendo adicionado
    IF key = 'company_id' AND has_company_id THEN
      RAISE NOTICE 'Pulando company_id (já adicionado)';
      CONTINUE;
    END IF;
    
    -- Adicionar vírgula se já houver colunas
    IF columns_list != '' THEN
      columns_list := columns_list || ', ';
      values_list := values_list || ', ';
    END IF;
    
    columns_list := columns_list || quote_ident(key);
    RAISE NOTICE 'columns_list atualizado: %', columns_list;
    
    -- Obter o tipo da coluna na tabela (usar aliases para evitar ambiguidade)
    SELECT c.data_type INTO column_type
    FROM information_schema.columns c
    WHERE c.table_schema = create_entity_data.schema_name
      AND c.table_name = create_entity_data.table_name
      AND c.column_name = key;
    
    -- Se não encontrou o tipo, usar NULL (campo pode não existir)
    IF column_type IS NULL THEN
      RAISE NOTICE '⚠️ Campo % não encontrado na tabela %.%', key, schema_name, table_name;
      column_type := 'text'; -- Tipo padrão
    END IF;
    
    -- Obter o tipo do valor JSONB
    value_type := jsonb_typeof(value);
    
    RAISE NOTICE 'Campo %: value_type=%, column_type=%', key, value_type, column_type;
    
    -- Tratar diferentes tipos de valores
    IF value_type = 'null' THEN
      values_list := values_list || 'NULL';
    
    ELSIF value_type = 'array' THEN
      RAISE NOTICE '  → É um ARRAY JSONB';
      RAISE NOTICE '  → column_type: %', column_type;
      RAISE NOTICE '  → value (JSONB): %', value;
      RAISE NOTICE '  → jsonb_array_length: %', jsonb_array_length(value);
      
      -- Array JSONB: converter para formato PostgreSQL
      -- Detectar tipo do array baseado no tipo da coluna
      IF column_type LIKE '%[]' OR column_type = 'ARRAY' THEN
        RAISE NOTICE '  → É uma coluna array no PostgreSQL';
        -- É uma coluna array no PostgreSQL
        -- Converter array JSONB para formato PostgreSQL usando ARRAY constructor
        -- Exemplo: [1,2,3] -> ARRAY[1,2,3]::integer[]
        
        -- Detectar tipo base do array
        IF column_type = 'integer[]' OR column_type = 'ARRAY' THEN
          RAISE NOTICE '  → Tratando como integer[]';
          -- Converter array JSONB para ARRAY[1,2,3]::integer[]
          IF jsonb_array_length(value) > 0 THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(
                CASE 
                  WHEN jsonb_typeof(elem) = 'number' THEN elem::TEXT
                  WHEN jsonb_typeof(elem) = 'string' THEN quote_literal(elem::TEXT)
                  ELSE elem::TEXT
                END,
                ', '
              )
              FROM jsonb_array_elements(value) AS elem
            ) || ']::integer[]';
            RAISE NOTICE '  → value_str gerado (integer[]): %', value_str;
          ELSE
            value_str := 'ARRAY[]::integer[]';
            RAISE NOTICE '  → Array vazio, usando: %', value_str;
          END IF;
          values_list := values_list || value_str;
          RAISE NOTICE '  → values_list atualizado: %', values_list;
        ELSIF column_type = 'bigint[]' THEN
          IF jsonb_array_length(value) > 0 THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(elem::TEXT, ', ')
              FROM jsonb_array_elements(value) AS elem
            ) || ']::bigint[]';
          ELSE
            value_str := 'ARRAY[]::bigint[]';
          END IF;
          values_list := values_list || value_str;
        ELSIF column_type = 'text[]' OR column_type = 'character varying[]' THEN
          IF jsonb_array_length(value) > 0 THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(
                quote_literal(
                  CASE 
                    WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
                    ELSE elem::TEXT
                  END
                ),
                ', '
              )
              FROM jsonb_array_elements(value) AS elem
            ) || ']::text[]';
          ELSE
            value_str := 'ARRAY[]::text[]';
          END IF;
          values_list := values_list || value_str;
        ELSIF column_type = 'uuid[]' THEN
          IF jsonb_array_length(value) > 0 THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(
                quote_literal(
                  CASE 
                    WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
                    ELSE elem::TEXT
                  END
                ) || '::uuid',
                ', '
              )
              FROM jsonb_array_elements(value) AS elem
            ) || ']::uuid[]';
          ELSE
            value_str := 'ARRAY[]::uuid[]';
          END IF;
          values_list := values_list || value_str;
        ELSE
          -- Tipo genérico, tentar inferir do primeiro elemento
          IF jsonb_array_length(value) > 0 THEN
            IF jsonb_typeof(value->0) = 'number' THEN
              value_str := 'ARRAY[' || (
                SELECT string_agg(elem::TEXT, ', ')
                FROM jsonb_array_elements(value) AS elem
              ) || ']::integer[]';
              values_list := values_list || value_str;
            ELSE
              value_str := 'ARRAY[' || (
                SELECT string_agg(
                  quote_literal(
                    CASE 
                      WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
                      ELSE elem::TEXT
                    END
                  ),
                  ', '
                )
                FROM jsonb_array_elements(value) AS elem
              ) || ']::text[]';
              values_list := values_list || value_str;
            END IF;
          ELSE
            -- Array vazio
            values_list := values_list || 'ARRAY[]::integer[]';
          END IF;
        END IF;
      ELSE
        -- Não é uma coluna array, tratar como texto
        value_str := value::TEXT;
        IF value_str LIKE '"%' AND value_str LIKE '%"' THEN
          value_str := substring(value_str from 2 for length(value_str) - 2);
        END IF;
        values_list := values_list || quote_literal(value_str);
      END IF;
    
    ELSIF value_type = 'object' THEN
      -- Objeto JSONB: manter como JSONB
      IF column_type = 'jsonb' OR column_type = 'json' THEN
        values_list := values_list || quote_literal(value::TEXT) || '::jsonb';
      ELSE
        -- Se a coluna não é JSONB, converter para texto
        values_list := values_list || quote_literal(value::TEXT);
      END IF;
    
    ELSIF value_type = 'boolean' THEN
      -- Booleano: converter para TRUE/FALSE
      IF value::BOOLEAN THEN
        values_list := values_list || 'TRUE';
      ELSE
        values_list := values_list || 'FALSE';
      END IF;
    
    ELSIF value_type = 'number' THEN
      -- Número: verificar se é inteiro ou decimal
      value_str := value::TEXT;
      IF column_type = 'integer' OR column_type = 'bigint' OR column_type = 'smallint' THEN
        values_list := values_list || value_str;
      ELSIF column_type = 'numeric' OR column_type = 'decimal' OR column_type = 'real' OR column_type = 'double precision' THEN
        values_list := values_list || value_str;
      ELSE
        values_list := values_list || value_str;
      END IF;
    
    ELSE
      -- String ou outros tipos: tratar como texto
      value_str := value::TEXT;
      
      -- Remover aspas extras do JSONB
      IF value_str LIKE '"%' AND value_str LIKE '%"' THEN
        value_str := substring(value_str from 2 for length(value_str) - 2);
      END IF;
      
      -- Se parece UUID, tratar como tal
      IF column_type = 'uuid' AND value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        values_list := values_list || quote_literal(value_str) || '::uuid';
      ELSIF column_type = 'time' OR column_type = 'time without time zone' THEN
        -- TIME: manter como string, será convertido pelo PostgreSQL
        values_list := values_list || quote_literal(value_str);
      ELSIF column_type = 'timestamp' OR column_type = 'timestamp with time zone' OR column_type = 'timestamp without time zone' THEN
        -- TIMESTAMP: manter como string, será convertido pelo PostgreSQL
        values_list := values_list || quote_literal(value_str);
      ELSE
        values_list := values_list || quote_literal(value_str);
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== RESUMO ANTES DE CONSTRUIR SQL ===';
  RAISE NOTICE 'columns_list: %', columns_list;
  RAISE NOTICE 'values_list: %', values_list;
  RAISE NOTICE 'schema_name: %', schema_name;
  RAISE NOTICE 'table_name: %', table_name;
  
  -- Verificar se há colunas para inserir
  IF columns_list = '' THEN
    RAISE EXCEPTION 'Nenhuma coluna especificada para inserção';
  END IF;
  
  -- Construir SQL de inserção
  insert_sql := format(
    'INSERT INTO %I.%I (%s) VALUES (%s) RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    columns_list,
    values_list
  );
  
  RAISE NOTICE '=== SQL GERADO ===';
  RAISE NOTICE 'insert_sql: %', insert_sql;
  
  -- Executar inserção
  EXECUTE insert_sql INTO result_json;
  
  RAISE NOTICE 'result_json: %', result_json;
  RAISE NOTICE '=== FIM create_entity_data ===';
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO em create_entity_data: %', SQLERRM;
    RAISE EXCEPTION 'create_entity_data failed. SQL: % Error: %', insert_sql, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comentário
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados. Trata corretamente arrays, objetos JSONB, booleanos e outros tipos. Verifica se a tabela tem company_id antes de inserir.';

