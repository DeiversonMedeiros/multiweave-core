-- =====================================================
-- CORREÇÃO DA FUNÇÃO update_entity_data - Erro de Window Function
-- Data: 2026-01-06
-- Descrição: Corrige o erro "aggregate function calls cannot contain window function calls"
--            A versão antiga usava row_number() OVER() dentro de string_agg()
-- =====================================================

-- Remover a função existente para recriar
DROP FUNCTION IF EXISTS public.update_entity_data(text, text, uuid, uuid, jsonb);

-- Função para atualizar dados em qualquer schema (versão corrigida)
CREATE OR REPLACE FUNCTION public.update_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  id_param UUID,
  data_param JSONB
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
  set_clauses TEXT;
  key_value RECORD;
  value_text TEXT;
  jsonb_type TEXT;
  column_type TEXT;
  array_values TEXT;
  array_base_type TEXT;
  param_index INTEGER := 1;
BEGIN
  -- Construir cláusulas SET
  set_clauses := '';
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    -- Pular campos protegidos
    IF key_value.key IN ('id', 'company_id', 'created_at') THEN
      CONTINUE;
    END IF;
    
    -- Determinar o tipo do valor JSONB
    jsonb_type := jsonb_typeof(key_value.value);
    
    -- Descobrir o tipo da coluna na tabela
    SELECT 
      CASE 
        WHEN c.data_type = 'ARRAY' THEN c.udt_name
        ELSE c.data_type
      END INTO column_type
    FROM information_schema.columns c
    WHERE c.table_schema = update_entity_data.schema_name
      AND c.table_name = update_entity_data.table_name
      AND c.column_name = key_value.key;
    
    -- Se a coluna não existir na tabela, pular este campo
    IF column_type IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Converter valor para formato SQL apropriado baseado no tipo
    IF key_value.value IS NULL OR jsonb_type = 'null' THEN
      value_text := 'NULL';
    ELSIF jsonb_type = 'boolean' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_type = 'number' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_type = 'array' THEN
      -- Tratar arrays
      IF column_type LIKE '%[]' OR column_type LIKE '_%' THEN
        IF column_type LIKE '_%' THEN
          array_base_type := SUBSTRING(column_type FROM 2);
          IF array_base_type = 'int4' THEN array_base_type := 'integer';
          ELSIF array_base_type = 'int8' THEN array_base_type := 'bigint';
          ELSIF array_base_type = 'int2' THEN array_base_type := 'smallint';
          ELSIF array_base_type = 'text' THEN array_base_type := 'text';
          ELSIF array_base_type = 'varchar' THEN array_base_type := 'character varying';
          ELSIF array_base_type = 'bool' THEN array_base_type := 'boolean';
          ELSIF array_base_type = 'numeric' THEN array_base_type := 'numeric';
          END IF;
          array_base_type := array_base_type || '[]';
        ELSE
          array_base_type := column_type;
        END IF;
        
        SELECT string_agg(
          CASE 
            WHEN array_base_type = 'integer[]' OR array_base_type LIKE 'int%[]' THEN (elem.value #>> '{}')
            WHEN array_base_type = 'text[]' OR array_base_type = 'character varying[]' THEN quote_literal(elem.value #>> '{}')
            WHEN array_base_type = 'numeric[]' OR array_base_type = 'decimal[]' THEN (elem.value #>> '{}')
            WHEN array_base_type = 'boolean[]' THEN (elem.value #>> '{}')
            WHEN array_base_type = 'uuid[]' THEN quote_literal(elem.value #>> '{}')
            ELSE quote_literal(elem.value #>> '{}')
          END, 
          ','
          ORDER BY elem.ord
        ) INTO array_values
        FROM jsonb_array_elements(key_value.value) WITH ORDINALITY AS elem(value, ord);
        
        IF array_values IS NULL THEN
          value_text := 'ARRAY[]::' || array_base_type;
        ELSE
          value_text := 'ARRAY[' || array_values || ']::' || array_base_type;
        END IF;
      ELSE
        value_text := quote_literal(key_value.value::text);
      END IF;
    ELSIF jsonb_type = 'object' THEN
      value_text := quote_literal(key_value.value::text);
    ELSIF jsonb_type = 'string' THEN
      IF column_type IN ('uuid', 'time', 'timestamp', 'date') THEN
        value_text := quote_literal(key_value.value #>> '{}');
      ELSE
        value_text := quote_literal(key_value.value #>> '{}');
      END IF;
    ELSE
      value_text := quote_literal(key_value.value #>> '{}');
    END IF;
    
    -- Adicionar cláusula SET
    IF set_clauses = '' THEN
      set_clauses := quote_ident(key_value.key) || ' = ' || value_text;
    ELSE
      set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text;
    END IF;
  END LOOP;
  
  -- Se não houver campos para atualizar, retornar erro
  IF set_clauses = '' THEN
    RAISE EXCEPTION 'Nenhum campo válido para atualizar';
  END IF;
  
  -- Adicionar updated_at automaticamente
  set_clauses := set_clauses || ', updated_at = now()';
  
  -- Construir query SQL dinâmica
  sql_query := format(
    'WITH updated AS (
      UPDATE %I.%I 
      SET %s 
      WHERE id = %L::uuid AND company_id = %L::uuid
      RETURNING *
    )
    SELECT row_to_json(updated.*)::jsonb FROM updated',
    schema_name,
    table_name,
    set_clauses,
    id_param,
    company_id_param
  );
  
  -- Executar query
  EXECUTE sql_query INTO result;
  
  -- Se não encontrou nenhum registro, retornar erro
  IF result IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão para atualizar';
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar dados: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Garantir permissões
ALTER FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) IS 
'Atualiza dados em qualquer tabela de qualquer schema. Versão corrigida sem window functions em aggregates.';

