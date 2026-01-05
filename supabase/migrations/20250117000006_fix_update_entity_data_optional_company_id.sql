-- =====================================================
-- CORREÇÃO: update_entity_data para tabelas sem company_id
-- Data: 2025-01-17
-- Descrição: Verifica se a tabela tem coluna company_id antes de usar na cláusula WHERE
--             Permite atualizar dados em tabelas de relacionamento (ex: requisicao_itens)
-- =====================================================

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
  has_company_id_column BOOLEAN := false;
  where_clause TEXT;
BEGIN
  -- Log para debug detalhado
  RAISE NOTICE 'Updating entity: schema=%, table=%, company_id=%, id=%', 
    schema_name, table_name, company_id_param, id_param;
  RAISE NOTICE 'Data param recebido: %', data_param;
  RAISE NOTICE 'Número de campos no data_param: %', (SELECT count(*) FROM jsonb_each(data_param));
  
  -- Verificar se a tabela tem coluna company_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = update_entity_data.schema_name
    AND c.table_name = update_entity_data.table_name
    AND c.column_name = 'company_id'
  ) INTO has_company_id_column;
  
  RAISE NOTICE 'Tabela tem coluna company_id: %', has_company_id_column;
  
  -- Construir cláusulas SET
  set_clauses := '';
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    RAISE NOTICE 'Processando campo: % = % (tipo: %)', 
      key_value.key, 
      key_value.value, 
      jsonb_typeof(key_value.value);
    
    -- Pular apenas campos que realmente não devem ser atualizados
    -- Não pular updated_at aqui, pois vamos atualizá-lo depois
    IF key_value.key IN ('id', 'company_id', 'created_at') THEN
      RAISE NOTICE 'Pulando campo protegido: %', key_value.key;
      CONTINUE;
    END IF;
    
    -- Determinar o tipo do valor JSONB
    jsonb_type := jsonb_typeof(key_value.value);
    
    -- Descobrir o tipo da coluna na tabela
    -- Para arrays, usar udt_name diretamente (retorna _int4 para integer[], _text para text[], etc)
    -- Para outros tipos, usar data_type
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
      RAISE NOTICE 'Pulando campo inexistente na tabela: %', key_value.key;
      CONTINUE;
    END IF;
    
    RAISE NOTICE 'Campo: %, Tipo JSONB: %, Tipo Coluna: %', 
      key_value.key, jsonb_type, COALESCE(column_type, 'DESCONHECIDO');
    
    -- Converter valor para formato SQL apropriado baseado no tipo
    IF key_value.value IS NULL THEN
      value_text := 'NULL';
    ELSIF jsonb_type = 'null' THEN
      value_text := 'NULL';
    ELSIF jsonb_type = 'boolean' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_type = 'number' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_type = 'array' THEN
      -- Tratar arrays - verificar tipo da coluna
      -- Arrays PostgreSQL têm udt_name começando com _ (ex: _int4 para integer[])
      IF column_type LIKE '%[]' OR column_type LIKE '_%' THEN
        -- É um array PostgreSQL, converter JSONB array para PostgreSQL array
        -- Determinar o tipo base do array (remover _ prefix ou [] suffix)
        IF column_type LIKE '_%' THEN
          -- É um udt_name (ex: _int4), converter para tipo legível
          array_base_type := SUBSTRING(column_type FROM 2); -- Remove o _
          -- Mapear tipos comuns
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
        
        RAISE NOTICE 'Array base type determinado: %', array_base_type;
        
        -- Extrair valores do array JSONB e converter para formato PostgreSQL
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
        
        RAISE NOTICE 'Array convertido: % -> %', key_value.value, value_text;
      ELSE
        -- Tratar como JSONB se não for array PostgreSQL
        value_text := quote_literal(key_value.value::text);
      END IF;
    ELSIF jsonb_type = 'object' THEN
      -- Para objetos JSON, verificar se a coluna é JSONB
      IF column_type = 'jsonb' THEN
        value_text := quote_literal(key_value.value::text);
      ELSE
        value_text := quote_literal(key_value.value::text);
      END IF;
    ELSIF jsonb_type = 'string' THEN
      -- Verificar se precisa de cast especial baseado no tipo da coluna
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
  
  -- Log dos campos que serão atualizados
  RAISE NOTICE 'Cláusulas SET construídas: %', set_clauses;
  RAISE NOTICE 'Número de campos a atualizar: %', array_length(string_to_array(set_clauses, ','), 1);
  
  -- Se não houver campos para atualizar, retornar erro com mais detalhes
  IF set_clauses = '' THEN
    RAISE EXCEPTION 'Nenhum campo válido para atualizar. Campos recebidos: %. Campos filtrados (id, company_id, created_at): %.', 
      (SELECT string_agg(key, ', ') FROM jsonb_each(data_param)),
      (SELECT string_agg(key, ', ') FROM jsonb_each(data_param) WHERE key IN ('id', 'company_id', 'created_at'));
  END IF;
  
  -- Adicionar updated_at automaticamente
  set_clauses := set_clauses || ', updated_at = now()';
  
  -- Construir cláusula WHERE baseada na existência da coluna company_id
  where_clause := 'WHERE id = ' || quote_literal(id_param) || '::uuid';
  
  -- Adicionar filtro de company_id apenas se a tabela tiver essa coluna E se company_id_param foi fornecido
  IF has_company_id_column AND company_id_param IS NOT NULL THEN
    where_clause := where_clause || ' AND company_id = ' || quote_literal(company_id_param) || '::uuid';
    RAISE NOTICE 'WHERE clause com company_id: %', where_clause;
  ELSIF company_id_param IS NOT NULL AND NOT has_company_id_column THEN
    RAISE NOTICE 'company_id_param fornecido mas tabela não tem coluna company_id - ignorando filtro';
  ELSIF company_id_param IS NULL AND has_company_id_column THEN
    RAISE NOTICE 'Tabela tem coluna company_id mas company_id_param é NULL - ignorando filtro';
  END IF;
  
  -- Construir query SQL dinâmica
  -- Usar uma subquery para converter o resultado para JSONB
  sql_query := format(
    'WITH updated AS (
      UPDATE %I.%I 
      SET %s 
      %s
      RETURNING *
    )
    SELECT row_to_json(updated.*)::jsonb FROM updated',
    schema_name,
    table_name,
    set_clauses,
    where_clause
  );
  
  -- Log da query construída (apenas em desenvolvimento)
  RAISE NOTICE 'SQL Query: %', sql_query;
  
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

-- Garantir que a função está no schema public e tem permissões corretas
ALTER FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) OWNER TO postgres;

-- Garantir permissões para todos os roles
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO service_role;

-- Comentário na função
COMMENT ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) IS 
'Atualiza dados em qualquer tabela de qualquer schema. Verifica se a tabela tem coluna company_id antes de usar na cláusula WHERE. Permite atualizar dados em tabelas de relacionamento que não têm company_id diretamente. Retorna o registro atualizado como JSONB.';











