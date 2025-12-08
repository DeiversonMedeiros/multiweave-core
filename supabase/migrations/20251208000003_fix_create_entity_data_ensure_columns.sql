-- =====================================================
-- CORREÇÃO DEFINITIVA: create_entity_data - Garantir apenas colunas existentes
-- =====================================================
-- Data: 2025-12-08
-- Descrição: Versão melhorada que garante que apenas colunas que realmente existem
--            sejam usadas no RETURNING e no jsonb_build_object
--            Isso resolve definitivamente o problema de colunas inexistentes (como valor_total)

-- Remover função existente
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
  v_jsonb_parts TEXT[];
  v_col_name TEXT;
  v_col_exists BOOLEAN;
BEGIN
  -- Usar aliases para evitar ambiguidade
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
    
    -- VERIFICAR SE A COLUNA EXISTE NA TABELA ANTES DE ADICIONAR
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns col
      WHERE col.table_schema = v_schema_alias
        AND col.table_name = v_table_alias
        AND col.column_name = v_key
    ) INTO v_col_exists;
    
    -- Se a coluna não existe, pular este campo
    IF NOT v_col_exists THEN
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
    
    -- Tratar diferentes tipos de valores (mesma lógica da função anterior)
    IF v_value_type = 'null' THEN
      v_values_list := v_values_list || 'NULL';
    
    ELSIF v_value_type = 'array' THEN
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
        v_value_str := v_value::TEXT;
        IF v_value_str LIKE '"%' AND v_value_str LIKE '%"' THEN
          v_value_str := substring(v_value_str from 2 for length(v_value_str) - 2);
        END IF;
        v_values_list := v_values_list || quote_literal(v_value_str);
      END IF;
    
    ELSIF v_value_type = 'object' THEN
      IF v_column_type = 'jsonb' OR v_column_type = 'json' THEN
        v_value_str := v_value::TEXT;
        v_values_list := v_values_list || quote_literal(v_value_str) || '::jsonb';
      ELSE
        v_value_str := v_value::TEXT;
        v_values_list := v_values_list || quote_literal(v_value_str);
      END IF;
    
    ELSIF v_value_type = 'boolean' THEN
      IF v_value::BOOLEAN THEN
        v_values_list := v_values_list || 'TRUE';
      ELSE
        v_values_list := v_values_list || 'FALSE';
      END IF;
    
    ELSIF v_value_type = 'number' THEN
      v_value_str := v_value::TEXT;
      v_values_list := v_values_list || v_value_str;
    
    ELSE
      v_value_str := v_value::TEXT;
      IF v_value_str LIKE '"%' AND v_value_str LIKE '%"' THEN
        v_value_str := substring(v_value_str from 2 for length(v_value_str) - 2);
      END IF;
      
      IF v_column_type = 'uuid' AND v_value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_values_list := v_values_list || quote_literal(v_value_str) || '::uuid';
      ELSIF v_column_type = 'date' THEN
        IF v_value_str IS NULL OR v_value_str = '' OR trim(v_value_str) = '' THEN
          v_values_list := v_values_list || 'NULL';
        ELSE
          v_values_list := v_values_list || quote_literal(v_value_str) || '::date';
        END IF;
      ELSIF v_column_type = 'timestamp' OR v_column_type = 'timestamp with time zone' OR v_column_type = 'timestamp without time zone' THEN
        IF v_value_str IS NULL OR v_value_str = '' OR trim(v_value_str) = '' THEN
          v_values_list := v_values_list || 'NULL';
        ELSE
          v_values_list := v_values_list || quote_literal(v_value_str);
        END IF;
      ELSE
        IF v_value_str IS NULL OR v_value_str = '' THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = v_schema_alias
            AND col.table_name = v_table_alias
            AND col.column_name = v_key
            AND col.is_nullable = 'YES'
          ) THEN
            v_values_list := v_values_list || 'NULL';
          ELSE
            v_values_list := v_values_list || quote_literal(v_value_str);
          END IF;
        ELSE
          v_values_list := v_values_list || quote_literal(v_value_str);
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Verificar se há colunas para inserir
  IF v_columns_list = '' THEN
    RAISE EXCEPTION 'Nenhuma coluna especificada para inserção';
  END IF;
  
  -- Buscar todas as colunas reais da tabela para construir RETURNING explícito
  -- CRÍTICO: Isso evita problemas com views ou triggers que referenciam colunas inexistentes
  SELECT array_agg(quote_ident(col.column_name) ORDER BY col.ordinal_position)
  INTO v_all_columns
  FROM information_schema.columns col
  WHERE col.table_schema = v_schema_alias
    AND col.table_name = v_table_alias;
  
  IF v_all_columns IS NULL OR array_length(v_all_columns, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhuma coluna encontrada na tabela %.%', v_schema_alias, v_table_alias;
  END IF;
  
  v_return_columns := array_to_string(v_all_columns, ', ');
  
  -- Construir array de partes do jsonb_build_object
  -- IMPORTANTE: Usar apenas colunas que realmente existem
  v_jsonb_parts := ARRAY[]::TEXT[];
  
  FOR v_col_name IN 
    SELECT unnest(v_all_columns)
  LOOP
    -- Remover quotes do nome da coluna para usar no jsonb_build_object
    v_col_name := trim(both '"' from v_col_name);
    -- Construir par chave-valor: 'nome_coluna', inserted_row.nome_coluna
    v_jsonb_parts := v_jsonb_parts || format('%L, inserted_row.%I', v_col_name, v_col_name);
  END LOOP;
  
  -- Construir SQL de inserção usando CTE com RETURNING explícito
  -- IMPORTANTE: Usar colunas explícitas no RETURNING, não *
  -- Construir JSONB diretamente usando jsonb_build_object para evitar problemas com row_to_json
  v_insert_sql := format(
    'WITH inserted_row AS (
       INSERT INTO %I.%I (%s) 
       VALUES (%s) 
       RETURNING %s
     )
     SELECT jsonb_build_object(%s) 
     FROM inserted_row',
    v_schema_alias,
    v_table_alias,
    v_columns_list,
    v_values_list,
    v_return_columns,
    array_to_string(v_jsonb_parts, ', ')
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
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO service_role;

-- Comentário
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados. Versão melhorada que:
1. Verifica se cada coluna existe antes de adicionar ao INSERT
2. Usa RETURNING com colunas explícitas (não *) para evitar problemas com views ou triggers
3. Constrói jsonb_build_object apenas com colunas que realmente existem na tabela
Isso resolve definitivamente o problema de colunas inexistentes (como valor_total).';

