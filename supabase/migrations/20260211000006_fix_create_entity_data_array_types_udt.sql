-- =====================================================
-- CORREÇÃO: create_entity_data - Tipos de array via udt_name
-- Data: 2026-02-11
-- Descrição: Corrige o tratamento de colunas array. O information_schema
--            retorna data_type='ARRAY' para todos os arrays, portanto
--            usamos udt_name para distinguir integer[], text[], uuid[] e outros.
--            Resolve: work_shifts.dias_semana (integer[]), anexos (text[]),
--            classe_financeiras (uuid[]), evitando "column is of type integer[]
--            but expression is of type text[]".
-- =====================================================

DROP FUNCTION IF EXISTS public.create_entity_data(TEXT, TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.create_entity_data(
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
  v_udt_name TEXT;
  v_array_cast TEXT;
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
  v_schema_alias := schema_name;
  v_table_alias := table_name;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = v_schema_alias
      AND t.table_name = v_table_alias
  ) THEN
    RAISE EXCEPTION 'Tabela %.% não existe', v_schema_alias, v_table_alias;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns col
    WHERE col.table_schema = v_schema_alias
      AND col.table_name = v_table_alias
      AND col.column_name = 'company_id'
  ) INTO v_has_company_id;

  IF v_has_company_id THEN
    v_columns_list := 'company_id';
    v_values_list := quote_literal(company_id_param)::TEXT;
  END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(data_param) LOOP
    IF v_key = 'company_id' AND v_has_company_id THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns col
      WHERE col.table_schema = v_schema_alias
        AND col.table_name = v_table_alias
        AND col.column_name = v_key
    ) INTO v_col_exists;

    IF NOT v_col_exists THEN
      CONTINUE;
    END IF;

    IF v_columns_list != '' THEN
      v_columns_list := v_columns_list || ', ';
      v_values_list := v_values_list || ', ';
    END IF;

    v_columns_list := v_columns_list || quote_ident(v_key);

    SELECT col.data_type, col.udt_name
    INTO v_column_type, v_udt_name
    FROM information_schema.columns col
    WHERE col.table_schema = v_schema_alias
      AND col.table_name = v_table_alias
      AND col.column_name = v_key;

    IF v_column_type IS NULL THEN
      v_column_type := 'text';
    END IF;

    v_value_type := jsonb_typeof(v_value);

    IF v_value_type = 'null' THEN
      v_values_list := v_values_list || 'NULL';

    ELSIF v_value_type = 'array' THEN
      IF v_column_type LIKE '%[]' OR v_column_type = 'ARRAY' THEN
        IF jsonb_array_length(v_value) > 0 THEN
          IF v_udt_name = '_int4' THEN
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
          ELSIF v_udt_name IN ('_text', '_varchar') THEN
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}'), ', ')
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::text[]';
          ELSIF v_udt_name = '_uuid' THEN
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}') || '::uuid', ', ')
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::uuid[]';
          ELSE
            v_array_cast := format('%I[]', trim(both '_' from v_udt_name));
            v_value_str := 'ARRAY[' || (
              SELECT string_agg(quote_literal(elem #>> '{}'), ', ')
              FROM jsonb_array_elements(v_value) AS elem
            ) || ']::' || v_array_cast;
          END IF;
        ELSE
          IF v_udt_name = '_int4' THEN
            v_value_str := 'ARRAY[]::integer[]';
          ELSIF v_udt_name = '_uuid' THEN
            v_value_str := 'ARRAY[]::uuid[]';
          ELSIF v_udt_name IS NOT NULL AND v_udt_name != '' THEN
            v_array_cast := format('%I[]', trim(both '_' from v_udt_name));
            v_value_str := 'ARRAY[]::' || v_array_cast;
          ELSE
            v_value_str := 'ARRAY[]::text[]';
          END IF;
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

  IF v_columns_list = '' THEN
    RAISE EXCEPTION 'Nenhuma coluna especificada para inserção';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = v_schema_alias
      AND t.table_name = v_table_alias
      AND t.table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION '%.% não é uma tabela (pode ser uma view)', v_schema_alias, v_table_alias;
  END IF;

  SELECT array_agg(col.column_name ORDER BY col.ordinal_position)
  INTO v_all_columns
  FROM information_schema.columns col
  INNER JOIN information_schema.tables t
    ON t.table_schema = col.table_schema
    AND t.table_name = col.table_name
  WHERE col.table_schema = v_schema_alias
    AND col.table_name = v_table_alias
    AND t.table_type = 'BASE TABLE';

  IF v_all_columns IS NULL OR array_length(v_all_columns, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhuma coluna encontrada na tabela %.%', v_schema_alias, v_table_alias;
  END IF;

  v_return_columns := array_to_string(
    array(SELECT quote_ident(unnest(v_all_columns))),
    ', '
  );

  v_jsonb_parts := ARRAY[]::TEXT[];

  FOR v_col_name IN
    SELECT unnest(v_all_columns)
  LOOP
    v_col_name_unquoted := v_col_name;
    v_jsonb_parts := v_jsonb_parts || format('%L, inserted_row.%I', v_col_name_unquoted, v_col_name_unquoted);
  END LOOP;

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

  BEGIN
    EXECUTE v_insert_sql INTO v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'create_entity_data failed. SQL: % Error: %', COALESCE(v_insert_sql, 'N/A'), SQLERRM;
  END;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'create_entity_data failed. SQL: % Error: %', COALESCE(v_insert_sql, 'N/A'), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) TO service_role;

COMMENT ON FUNCTION public.create_entity_data(TEXT, TEXT, UUID, JSONB) IS
'Função genérica para criar dados. Versão 2026-02-11: usa udt_name para tratar corretamente integer[], text[], uuid[] e outros arrays (evita erro em work_shifts.dias_semana, anexos, classe_financeiras).';
