-- =====================================================
-- CORREÇÃO FINAL: create_entity_data - Versão Simplificada
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Versão simplificada que evita ambiguidade e problemas com RETURNING *
--            Usa uma abordagem direta sem buscar colunas dinamicamente

DROP FUNCTION IF EXISTS create_entity_data(TEXT, TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_insert_sql TEXT;
  v_key TEXT;
  v_value JSONB;
  v_value_str TEXT;
  v_has_company_id BOOLEAN;
  v_columns_list TEXT := '';
  v_values_list TEXT := '';
  v_column_type TEXT;
  v_value_type TEXT;
  v_schema_alias TEXT;
  v_table_alias TEXT;
  v_return_columns TEXT;
  v_all_columns TEXT[];
BEGIN
  -- Usar aliases para evitar ambiguidade com parâmetros
  v_schema_alias := schema_name;
  v_table_alias := table_name;
  
  -- Verificar se a tabela existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables t
    WHERE t.table_schema = v_schema_alias 
      AND t.table_name = v_table_alias
  ) THEN
    RAISE EXCEPTION 'Tabela %.% não existe', v_schema_alias, v_table_alias;
  END IF;
  
  -- Verificar se a tabela tem coluna company_id
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns col
    WHERE col.table_schema = v_schema_alias
      AND col.table_name = v_table_alias
      AND col.column_name = 'company_id'
  ) INTO v_has_company_id;
  
  -- Construir INSERT dinâmico
  IF v_has_company_id THEN
    v_columns_list := 'company_id';
    v_values_list := quote_literal(company_id_param)::TEXT;
  END IF;
  
  -- Processar campos do data_param
  FOR v_key, v_value IN SELECT * FROM jsonb_each(data_param) LOOP
    -- Pular company_id se já estiver sendo adicionado
    IF v_key = 'company_id' AND v_has_company_id THEN
      CONTINUE;
    END IF;
    
    -- Adicionar vírgula se já houver colunas
    IF v_columns_list != '' THEN
      v_columns_list := v_columns_list || ', ';
      v_values_list := v_values_list || ', ';
    END IF;
    
    v_columns_list := v_columns_list || quote_ident(v_key);
    
    -- Obter o tipo da coluna na tabela
    SELECT col.data_type INTO v_column_type
    FROM information_schema.columns col
    WHERE col.table_schema = v_schema_alias
      AND col.table_name = v_table_alias
      AND col.column_name = v_key;
    
    -- Se não encontrou o tipo, usar 'text' como padrão
    IF v_column_type IS NULL THEN
      v_column_type := 'text';
    END IF;
    
    -- Obter o tipo do valor JSONB
    v_value_type := jsonb_typeof(v_value);
    
    -- Tratar diferentes tipos de valores
    IF v_value_type = 'null' THEN
      v_values_list := v_values_list || 'NULL';
    
    ELSIF v_value_type = 'array' THEN
      -- Array JSONB: converter para formato PostgreSQL
      IF v_column_type LIKE '%[]' OR v_column_type = 'ARRAY' THEN
        IF jsonb_array_length(v_value) > 0 THEN
          IF v_column_type = 'integer[]' OR v_column_type = 'ARRAY' THEN
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(
                CASE 
                  WHEN jsonb_typeof(elem) = 'number' THEN elem::TEXT
                  WHEN jsonb_typeof(elem) = 'string' THEN quote_literal(elem #>> '{}')
                  ELSE elem::TEXT
                END,
                ', '
              )
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::integer[]';
          ELSIF v_column_type = 'text[]' OR v_column_type = 'character varying[]' THEN
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}'), ', ')
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::text[]';
          ELSIF v_column_type = 'uuid[]' THEN
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}') || '::uuid', ', ')
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::uuid[]';
          ELSE
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}'), ', ')
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::text[]';
          END IF;
        ELSE
          v_value_str := 'ARRAY[]::text[]';
        END IF;
        v_values_list := v_values_list || v_value_str;
      ELSE
        -- Não é array, tratar como texto
        v_value_str := v_value::TEXT;
        IF v_value_str LIKE '"%' AND v_value_str LIKE '%"' THEN
          v_value_str := substring(v_value_str from 2 for length(v_value_str) - 2);
        END IF;
        v_values_list := v_values_list || quote_literal(v_value_str);
      END IF;
    
    ELSIF v_value_type = 'object' THEN
      -- Objeto JSONB: manter como JSONB
      IF v_column_type = 'jsonb' OR v_column_type = 'json' THEN
        v_value_str := v_value::TEXT;
        v_values_list := v_values_list || quote_literal(v_value_str) || '::jsonb';
      ELSE
        v_value_str := v_value::TEXT;
        v_values_list := v_values_list || quote_literal(v_value_str);
      END IF;
    
    ELSIF v_value_type = 'boolean' THEN
      -- Booleano: converter para TRUE/FALSE
      IF v_value::BOOLEAN THEN
        v_values_list := v_values_list || 'TRUE';
      ELSE
        v_values_list := v_values_list || 'FALSE';
      END IF;
    
    ELSIF v_value_type = 'number' THEN
      -- Número: usar diretamente
      v_value_str := v_value::TEXT;
      v_values_list := v_values_list || v_value_str;
    
    ELSE
      -- String ou outros tipos: tratar como texto
      v_value_str := v_value::TEXT;
      
      -- Remover aspas extras do JSONB
      IF v_value_str LIKE '"%' AND v_value_str LIKE '%"' THEN
        v_value_str := substring(v_value_str from 2 for length(v_value_str) - 2);
      END IF;
      
      -- Se parece UUID, tratar como tal
      IF v_column_type = 'uuid' AND v_value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_values_list := v_values_list || quote_literal(v_value_str) || '::uuid';
      ELSIF v_column_type = 'date' THEN
        v_values_list := v_values_list || quote_literal(v_value_str) || '::date';
      ELSIF v_column_type = 'timestamp' OR v_column_type = 'timestamp with time zone' OR v_column_type = 'timestamp without time zone' THEN
        v_values_list := v_values_list || quote_literal(v_value_str);
      ELSE
        v_values_list := v_values_list || quote_literal(v_value_str);
      END IF;
    END IF;
  END LOOP;
  
  -- Verificar se há colunas para inserir
  IF v_columns_list = '' THEN
    RAISE EXCEPTION 'Nenhuma coluna especificada para inserção';
  END IF;
  
  -- Buscar todas as colunas reais da tabela para construir RETURNING explícito
  -- Isso evita problemas com views ou triggers que referenciam colunas inexistentes
  SELECT array_agg(quote_ident(col.column_name) ORDER BY col.ordinal_position)
  INTO v_all_columns
  FROM information_schema.columns col
  WHERE col.table_schema = v_schema_alias
    AND col.table_name = v_table_alias;
  
  IF v_all_columns IS NULL OR array_length(v_all_columns, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhuma coluna encontrada na tabela %.%', v_schema_alias, v_table_alias;
  END IF;
  
  v_return_columns := array_to_string(v_all_columns, ', ');
  
  -- Construir SQL de inserção usando CTE com RETURNING explícito
  -- Isso garante que apenas as colunas da tabela sejam retornadas
  v_insert_sql := format(
    'WITH inserted_row AS (
       INSERT INTO %I.%I (%s) 
       VALUES (%s) 
       RETURNING %s
     )
     SELECT to_jsonb(row_to_json(inserted_row)) 
     FROM inserted_row',
    v_schema_alias,
    v_table_alias,
    v_columns_list,
    v_values_list,
    v_return_columns
  );
  
  -- Executar inserção e receber o JSONB diretamente
  EXECUTE v_insert_sql INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'create_entity_data failed. SQL: % Error: %', COALESCE(v_insert_sql, 'N/A'), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comentário
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados. Usa CTE com row_to_json para evitar problemas com RETURNING * quando há views ou triggers que referenciam colunas inexistentes. Versão simplificada sem ambiguidade.';

