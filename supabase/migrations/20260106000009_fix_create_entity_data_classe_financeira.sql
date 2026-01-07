-- =====================================================
-- CORREÇÃO: create_entity_data - Corrigir problema com classe_financeira
-- Data: 2026-01-06
-- Descrição: Corrige o problema onde a função tenta retornar classe_financeira
--            mas o erro diz que a coluna não existe. O problema está na forma
--            como as colunas são construídas no RETURNING.
-- =====================================================

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
  v_col_name_unquoted TEXT;
BEGIN
  -- Log inicial
  RAISE NOTICE '=== create_entity_data INÍCIO ===';
  RAISE NOTICE 'schema_name: %, table_name: %, company_id_param: %', schema_name, table_name, company_id_param;
  RAISE NOTICE 'data_param keys: %', (SELECT array_agg(key) FROM jsonb_object_keys(data_param) AS key);
  
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
  
  RAISE NOTICE 'Tabela existe: TRUE, has_company_id: %', v_has_company_id;
  
  -- Construir INSERT dinâmico
  IF v_has_company_id THEN
    v_columns_list := 'company_id';
    v_values_list := quote_literal(company_id_param)::TEXT;
  END IF;
  
  -- Processar campos do data_param
  RAISE NOTICE '=== Processando campos do data_param ===';
  FOR v_key, v_value IN SELECT * FROM jsonb_each(data_param) LOOP
    RAISE NOTICE 'Processando campo: % (tipo: %)', v_key, jsonb_typeof(v_value);
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
      RAISE NOTICE '⚠️ IGNORANDO campo % - coluna não existe na tabela %.%', 
        v_key, v_schema_alias, v_table_alias;
      CONTINUE;
    END IF;
    
    RAISE NOTICE '✅ ACEITANDO campo %', v_key;
    
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
  
  RAISE NOTICE '=== Colunas para INSERT ===';
  RAISE NOTICE 'columns_list: %', v_columns_list;
  RAISE NOTICE 'values_list (primeiros 200 chars): %', substring(v_values_list, 1, 200);
  
  -- Buscar todas as colunas reais da TABELA (não views) para construir RETURNING explícito
  -- IMPORTANTE: Verificar que é uma tabela, não uma view
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables t
    WHERE t.table_schema = v_schema_alias 
      AND t.table_name = v_table_alias
      AND t.table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION '%.% não é uma tabela (pode ser uma view)', v_schema_alias, v_table_alias;
  END IF;
  
  -- Buscar colunas apenas da tabela (não de views)
  -- CORREÇÃO: Usar column_name diretamente, sem quote_ident, para evitar problemas
  SELECT array_agg(col.column_name ORDER BY col.ordinal_position)
  INTO v_all_columns
  FROM information_schema.columns col
  INNER JOIN information_schema.tables t 
    ON t.table_schema = col.table_schema 
    AND t.table_name = col.table_name
  WHERE col.table_schema = v_schema_alias
    AND col.table_name = v_table_alias
    AND t.table_type = 'BASE TABLE';  -- Garantir que é uma tabela, não view
  
  IF v_all_columns IS NULL OR array_length(v_all_columns, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhuma coluna encontrada na tabela %.%', v_schema_alias, v_table_alias;
  END IF;
  
  RAISE NOTICE '=== Colunas para RETURNING ===';
  RAISE NOTICE 'Total de colunas na tabela: %', array_length(v_all_columns, 1);
  RAISE NOTICE 'Colunas: %', array_to_string(v_all_columns, ', ');
  
  -- Construir lista de colunas para RETURNING usando quote_ident apenas uma vez
  v_return_columns := array_to_string(
    array(SELECT quote_ident(unnest(v_all_columns))),
    ', '
  );
  
  -- Construir array de partes do jsonb_build_object
  v_jsonb_parts := ARRAY[]::TEXT[];
  
  FOR v_col_name IN 
    SELECT unnest(v_all_columns)
  LOOP
    -- Usar o nome da coluna diretamente (sem quotes) para a chave do JSON
    -- e com quote_ident para referenciar no inserted_row
    v_col_name_unquoted := v_col_name;
    v_jsonb_parts := v_jsonb_parts || format('%L, inserted_row.%I', v_col_name_unquoted, v_col_name_unquoted);
  END LOOP;
  
  -- Construir SQL de inserção usando CTE com RETURNING explícito
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
  
  RAISE NOTICE '=== SQL gerado (primeiros 500 chars) ===';
  RAISE NOTICE '%', substring(v_insert_sql, 1, 500);
  
  -- Executar inserção e receber o JSONB diretamente
  RAISE NOTICE '=== Executando INSERT ===';
  BEGIN
    EXECUTE v_insert_sql INTO v_result;
    RAISE NOTICE '✅ INSERT executado com sucesso';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ ERRO ao executar INSERT: %', SQLERRM;
      RAISE NOTICE 'SQL completo: %', v_insert_sql;
      RAISE;
  END;
  
  RAISE NOTICE '=== create_entity_data FIM (sucesso) ===';
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
'Função genérica para criar dados. Versão corrigida que:
1. Verifica se cada coluna existe antes de adicionar ao INSERT (resolve erro de colunas inexistentes como usuario_id)
2. Usa RETURNING com colunas explícitas (não *) para evitar problemas com views ou triggers
3. Constrói jsonb_build_object apenas com colunas que realmente existem na tabela
4. CORREÇÃO: Usa column_name diretamente do information_schema, sem quote_ident duplo, para evitar problemas com classe_financeira
Correção aplicada em 2026-01-06 para resolver erro ao criar contas a pagar com classe_financeira.';

