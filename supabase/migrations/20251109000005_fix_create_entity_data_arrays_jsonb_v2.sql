-- =====================================================
-- CORREÇÃO V2: create_entity_data para tratar arrays e JSONB
-- Data: 2025-11-09
-- Descrição: Corrige ambiguidade de colunas e tratamento de arrays/JSONB
-- =====================================================

CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result_json JSONB;
  result_record RECORD;
  insert_sql TEXT;
  key TEXT;
  value JSONB;
  value_str TEXT;
  has_company_id BOOLEAN;
  columns_list TEXT;
  values_list TEXT;
  column_type TEXT;
  value_type TEXT;
  schema_name_var TEXT;
  table_name_var TEXT;
BEGIN
  -- Copiar parâmetros para variáveis locais para evitar ambiguidade
  schema_name_var := schema_name;
  table_name_var := table_name;
  
  -- Log para debug
  RAISE NOTICE '=== INÍCIO create_entity_data ===';
  RAISE NOTICE 'schema_name: %', schema_name_var;
  RAISE NOTICE 'table_name: %', table_name_var;
  RAISE NOTICE 'company_id_param: %', company_id_param;
  RAISE NOTICE 'data_param: %', data_param;
  
  -- Verificar se a tabela existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = schema_name_var 
    AND t.table_name = table_name_var
  ) THEN
    RAISE EXCEPTION 'Tabela %.% não existe', schema_name_var, table_name_var;
  END IF;
  
  -- Verificar se a tabela tem coluna company_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = schema_name_var
    AND c.table_name = table_name_var
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
    
    -- Obter o tipo da coluna na tabela (usar variáveis locais para evitar ambiguidade)
    SELECT c.data_type INTO column_type
    FROM information_schema.columns c
    WHERE c.table_schema = schema_name_var
      AND c.table_name = table_name_var
      AND c.column_name = key;
    
    -- Se não encontrou o tipo, usar NULL (campo pode não existir)
    IF column_type IS NULL THEN
      RAISE NOTICE '⚠️ Campo % não encontrado na tabela %.%', key, schema_name_var, table_name_var;
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
        
        -- Detectar tipo base do array
        IF column_type = 'integer[]' OR column_type = 'ARRAY' THEN
          RAISE NOTICE '  → Tratando como integer[]';
          -- Converter array JSONB para ARRAY[1,2,3]::integer[]
          IF jsonb_array_length(value) > 0 THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(
                CASE 
                  WHEN jsonb_typeof(elem) = 'number' THEN elem::TEXT
                  WHEN jsonb_typeof(elem) = 'string' THEN quote_literal(elem #>> '{}')
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
                quote_literal(elem #>> '{}'),
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
                quote_literal(elem #>> '{}') || '::uuid',
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
                  quote_literal(elem #>> '{}'),
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
      RAISE NOTICE '  → É um OBJETO JSONB';
      RAISE NOTICE '  → column_type: %', column_type;
      RAISE NOTICE '  → value (JSONB): %', value;
      -- Objeto JSONB: manter como JSONB
      IF column_type = 'jsonb' OR column_type = 'json' THEN
        value_str := value::TEXT;
        values_list := values_list || quote_literal(value_str) || '::jsonb';
        RAISE NOTICE '  → value_str gerado (jsonb): %', quote_literal(value_str) || '::jsonb';
      ELSE
        -- Se a coluna não é JSONB, converter para texto
        value_str := value::TEXT;
        values_list := values_list || quote_literal(value_str);
        RAISE NOTICE '  → value_str gerado (text): %', quote_literal(value_str);
      END IF;
      RAISE NOTICE '  → values_list atualizado: %', values_list;
    
    ELSIF value_type = 'boolean' THEN
      RAISE NOTICE '  → É um BOOLEANO';
      RAISE NOTICE '  → value: %', value;
      -- Booleano: converter para TRUE/FALSE
      IF value::BOOLEAN THEN
        values_list := values_list || 'TRUE';
        RAISE NOTICE '  → Adicionado: TRUE';
      ELSE
        values_list := values_list || 'FALSE';
        RAISE NOTICE '  → Adicionado: FALSE';
      END IF;
      RAISE NOTICE '  → values_list atualizado: %', values_list;
    
    ELSIF value_type = 'number' THEN
      RAISE NOTICE '  → É um NÚMERO';
      RAISE NOTICE '  → value: %', value;
      RAISE NOTICE '  → column_type: %', column_type;
      -- Número: verificar se é inteiro ou decimal
      value_str := value::TEXT;
      RAISE NOTICE '  → value_str: %', value_str;
      IF column_type = 'integer' OR column_type = 'bigint' OR column_type = 'smallint' THEN
        values_list := values_list || value_str;
        RAISE NOTICE '  → Tratado como INTEGER: %', value_str;
      ELSIF column_type = 'numeric' OR column_type = 'decimal' OR column_type = 'real' OR column_type = 'double precision' THEN
        values_list := values_list || value_str;
        RAISE NOTICE '  → Tratado como NUMERIC: %', value_str;
      ELSE
        values_list := values_list || value_str;
        RAISE NOTICE '  → Tratado como número genérico: %', value_str;
      END IF;
      RAISE NOTICE '  → values_list atualizado: %', values_list;
    
    ELSE
      -- String ou outros tipos: tratar como texto
      RAISE NOTICE '  → É STRING ou outro tipo';
      RAISE NOTICE '  → value_type: %', value_type;
      RAISE NOTICE '  → column_type: %', column_type;
      value_str := value::TEXT;
      RAISE NOTICE '  → value_str inicial: %', value_str;
      
      -- Remover aspas extras do JSONB
      IF value_str LIKE '"%' AND value_str LIKE '%"' THEN
        value_str := substring(value_str from 2 for length(value_str) - 2);
        RAISE NOTICE '  → value_str após remover aspas: %', value_str;
      END IF;
      
      -- Se parece UUID, tratar como tal
      IF column_type = 'uuid' AND value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        values_list := values_list || quote_literal(value_str) || '::uuid';
        RAISE NOTICE '  → Tratado como UUID: %', quote_literal(value_str) || '::uuid';
      ELSIF column_type = 'time' OR column_type = 'time without time zone' THEN
        -- TIME: manter como string, será convertido pelo PostgreSQL
        values_list := values_list || quote_literal(value_str);
        RAISE NOTICE '  → Tratado como TIME: %', quote_literal(value_str);
      ELSIF column_type = 'timestamp' OR column_type = 'timestamp with time zone' OR column_type = 'timestamp without time zone' THEN
        -- TIMESTAMP: manter como string, será convertido pelo PostgreSQL
        values_list := values_list || quote_literal(value_str);
        RAISE NOTICE '  → Tratado como TIMESTAMP: %', quote_literal(value_str);
      ELSE
        values_list := values_list || quote_literal(value_str);
        RAISE NOTICE '  → Tratado como TEXT: %', quote_literal(value_str);
      END IF;
      RAISE NOTICE '  → values_list atualizado: %', values_list;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== RESUMO ANTES DE CONSTRUIR SQL ===';
  RAISE NOTICE 'columns_list: %', columns_list;
  RAISE NOTICE 'values_list: %', values_list;
  RAISE NOTICE 'schema_name_var: %', schema_name_var;
  RAISE NOTICE 'table_name_var: %', table_name_var;
  
  -- Verificar se há colunas para inserir
  IF columns_list = '' THEN
    RAISE EXCEPTION 'Nenhuma coluna especificada para inserção';
  END IF;
  
  -- Construir SQL de inserção (RETURNING * e converter para JSONB depois)
  insert_sql := format(
    'INSERT INTO %I.%I (%s) VALUES (%s) RETURNING *',
    schema_name_var,
    table_name_var,
    columns_list,
    values_list
  );
  
  RAISE NOTICE '=== SQL GERADO ===';
  RAISE NOTICE 'insert_sql: %', insert_sql;
  RAISE NOTICE 'columns_list: %', columns_list;
  RAISE NOTICE 'values_list: %', values_list;
  
  -- Executar inserção e receber o record
  EXECUTE insert_sql INTO result_record;
  
  RAISE NOTICE '=== RESULTADO DO INSERT ===';
  RAISE NOTICE 'result_record recebido: %', result_record;
  
  -- Converter record para JSONB
  result_json := to_jsonb(result_record);
  
  RAISE NOTICE '=== CONVERSÃO PARA JSONB ===';
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

