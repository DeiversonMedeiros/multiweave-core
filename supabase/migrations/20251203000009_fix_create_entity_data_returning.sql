-- =====================================================
-- CORREÇÃO: create_entity_data - RETURNING clause
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Corrige a função create_entity_data para usar CTE (WITH)
--            ao invés de RETURNING * diretamente, evitando problemas
--            com colunas inexistentes ou views/triggers que referenciam
--            colunas que não existem na tabela base.

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
  
  -- Construir INSERT dinâmico tratando tipos corretamente
  columns_list := '';
  values_list := '';
  
  -- Adicionar company_id apenas se a tabela tiver essa coluna
  IF has_company_id THEN
    columns_list := 'company_id';
    values_list := quote_literal(company_id_param)::TEXT;
  END IF;
  
  -- Processar campos do data_param
  FOR key, value IN SELECT * FROM jsonb_each(data_param) LOOP
    -- Pular company_id se já estiver sendo adicionado
    IF key = 'company_id' AND has_company_id THEN
      CONTINUE;
    END IF;
    
    -- Adicionar vírgula se já houver colunas
    IF columns_list != '' THEN
      columns_list := columns_list || ', ';
      values_list := values_list || ', ';
    END IF;
    
    columns_list := columns_list || quote_ident(key);
    
    -- Obter o tipo da coluna na tabela
    SELECT c.data_type INTO column_type
    FROM information_schema.columns c
    WHERE c.table_schema = schema_name_var
      AND c.table_name = table_name_var
      AND c.column_name = key;
    
    -- Se não encontrou o tipo, usar 'text' como padrão
    IF column_type IS NULL THEN
      column_type := 'text';
    END IF;
    
    -- Obter o tipo do valor JSONB
    value_type := jsonb_typeof(value);
    
    -- Tratar diferentes tipos de valores
    IF value_type = 'null' THEN
      values_list := values_list || 'NULL';
    
    ELSIF value_type = 'array' THEN
      -- Array JSONB: converter para formato PostgreSQL
      IF column_type LIKE '%[]' OR column_type = 'ARRAY' THEN
        IF jsonb_array_length(value) > 0 THEN
          IF column_type = 'integer[]' OR column_type = 'ARRAY' THEN
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
          ELSIF column_type = 'text[]' OR column_type = 'character varying[]' THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}'), ', ')
              FROM jsonb_array_elements(value) AS elem
            ) || ']::text[]';
          ELSIF column_type = 'uuid[]' THEN
            value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}') || '::uuid', ', ')
              FROM jsonb_array_elements(value) AS elem
            ) || ']::uuid[]';
          ELSE
            value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}'), ', ')
              FROM jsonb_array_elements(value) AS elem
            ) || ']::text[]';
          END IF;
        ELSE
          value_str := 'ARRAY[]::text[]';
        END IF;
        values_list := values_list || value_str;
      ELSE
        -- Não é array, tratar como texto
        value_str := value::TEXT;
        IF value_str LIKE '"%' AND value_str LIKE '%"' THEN
          value_str := substring(value_str from 2 for length(value_str) - 2);
        END IF;
        values_list := values_list || quote_literal(value_str);
      END IF;
    
    ELSIF value_type = 'object' THEN
      -- Objeto JSONB: manter como JSONB
      IF column_type = 'jsonb' OR column_type = 'json' THEN
        value_str := value::TEXT;
        values_list := values_list || quote_literal(value_str) || '::jsonb';
      ELSE
        value_str := value::TEXT;
        values_list := values_list || quote_literal(value_str);
      END IF;
    
    ELSIF value_type = 'boolean' THEN
      -- Booleano: converter para TRUE/FALSE
      IF value::BOOLEAN THEN
        values_list := values_list || 'TRUE';
      ELSE
        values_list := values_list || 'FALSE';
      END IF;
    
    ELSIF value_type = 'number' THEN
      -- Número: usar diretamente
      value_str := value::TEXT;
      values_list := values_list || value_str;
    
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
      ELSIF column_type = 'date' THEN
        values_list := values_list || quote_literal(value_str) || '::date';
      ELSIF column_type = 'timestamp' OR column_type = 'timestamp with time zone' OR column_type = 'timestamp without time zone' THEN
        values_list := values_list || quote_literal(value_str);
      ELSE
        values_list := values_list || quote_literal(value_str);
      END IF;
    END IF;
  END LOOP;
  
  -- Verificar se há colunas para inserir
  IF columns_list = '' THEN
    RAISE EXCEPTION 'Nenhuma coluna especificada para inserção';
  END IF;
  
  -- Construir SQL de inserção usando CTE (WITH) e RETURNING * dentro do CTE
  -- Depois converter para JSONB usando row_to_json que só pega as colunas da tabela
  -- Isso evita problemas com views ou triggers que referenciam colunas inexistentes
  insert_sql := format(
    'WITH inserted AS (INSERT INTO %I.%I (%s) VALUES (%s) RETURNING *) SELECT to_jsonb(row_to_json(inserted.*)) FROM inserted',
    schema_name_var,
    table_name_var,
    columns_list,
    values_list
  );
  
  -- Executar inserção e receber o JSONB diretamente
  EXECUTE insert_sql INTO result_json;
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'create_entity_data failed. SQL: % Error: %', COALESCE(insert_sql, 'N/A'), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comentário
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados. Usa CTE (WITH) para evitar problemas com RETURNING * quando há views ou triggers que referenciam colunas inexistentes.';

