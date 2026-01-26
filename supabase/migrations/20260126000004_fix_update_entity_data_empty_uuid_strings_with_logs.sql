-- =====================================================
-- CORREÇÃO: Tratamento de strings vazias em campos UUID com logs detalhados
-- Data: 2026-01-26
-- Descrição: Corrige o tratamento de strings vazias em campos UUID na função update_entity_data
--            Adiciona logs detalhados para debug
-- =====================================================

-- Remover a função existente para recriar
DROP FUNCTION IF EXISTS public.update_entity_data(text, text, uuid, uuid, jsonb);

-- Função para atualizar dados em qualquer schema (versão corrigida com tratamento de strings vazias em UUID e logs)
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
  udt_name TEXT;
  array_values TEXT;
  array_base_type TEXT;
  string_value TEXT;
BEGIN
  -- Log inicial
  RAISE NOTICE '[update_entity_data] Iniciando atualização: schema=%, table=%, company_id=%, id=%', 
    schema_name, table_name, company_id_param, id_param;
  RAISE NOTICE '[update_entity_data] Data recebido: %', data_param;
  RAISE NOTICE '[update_entity_data] Número de campos: %', (SELECT count(*) FROM jsonb_each(data_param));
  
  -- Construir cláusulas SET
  set_clauses := '';
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    RAISE NOTICE '[update_entity_data] Processando campo: % = % (tipo JSONB: %)', 
      key_value.key, key_value.value, jsonb_typeof(key_value.value);
    
    -- Pular campos protegidos
    IF key_value.key IN ('id', 'company_id', 'created_at') THEN
      RAISE NOTICE '[update_entity_data] Pulando campo protegido: %', key_value.key;
      CONTINUE;
    END IF;
    
    -- Determinar o tipo do valor JSONB
    jsonb_type := jsonb_typeof(key_value.value);
    
    -- Descobrir o tipo da coluna na tabela (incluindo udt_name para UUID)
    SELECT 
      CASE 
        WHEN c.data_type = 'ARRAY' THEN c.udt_name
        ELSE c.data_type
      END,
      c.udt_name
    INTO column_type, udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = update_entity_data.schema_name
      AND c.table_name = update_entity_data.table_name
      AND c.column_name = key_value.key;
    
    RAISE NOTICE '[update_entity_data] Campo: %, Tipo JSONB: %, Tipo Coluna: %, UDT: %', 
      key_value.key, jsonb_type, COALESCE(column_type, 'NÃO ENCONTRADO'), COALESCE(udt_name, 'NÃO ENCONTRADO');
    
    -- Se a coluna não existir na tabela, pular este campo
    IF column_type IS NULL THEN
      RAISE NOTICE '[update_entity_data] Coluna não encontrada na tabela, pulando: %', key_value.key;
      CONTINUE;
    END IF;
    
    -- Converter valor para formato SQL apropriado baseado no tipo
    IF key_value.value IS NULL OR jsonb_type = 'null' THEN
      value_text := 'NULL';
      RAISE NOTICE '[update_entity_data] Valor NULL detectado para campo: %', key_value.key;
    ELSIF jsonb_type = 'boolean' THEN
      value_text := (key_value.value #>> '{}');
      RAISE NOTICE '[update_entity_data] Boolean: % -> %', key_value.key, value_text;
    ELSIF jsonb_type = 'number' THEN
      value_text := (key_value.value #>> '{}');
      RAISE NOTICE '[update_entity_data] Number: % -> %', key_value.key, value_text;
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
          ELSIF array_base_type = 'uuid' THEN array_base_type := 'uuid';
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
        RAISE NOTICE '[update_entity_data] Array: % -> %', key_value.key, value_text;
      ELSE
        value_text := quote_literal(key_value.value::text);
      END IF;
    ELSIF jsonb_type = 'object' THEN
      value_text := quote_literal(key_value.value::text);
      RAISE NOTICE '[update_entity_data] Object: % -> %', key_value.key, value_text;
    ELSIF jsonb_type = 'string' THEN
      -- Extrair o valor da string
      string_value := key_value.value #>> '{}';
      RAISE NOTICE '[update_entity_data] String extraída: % = "%" (length: %)', 
        key_value.key, string_value, COALESCE(length(string_value), 0);
      
      -- Verificar se é um campo UUID usando udt_name (mais confiável)
      IF udt_name = 'uuid' OR column_type = 'uuid' THEN
        RAISE NOTICE '[update_entity_data] Campo UUID detectado: %', key_value.key;
        
        -- Se a string estiver vazia, null ou apenas espaços, usar NULL
        IF string_value IS NULL OR string_value = '' OR trim(string_value) = '' THEN
          value_text := 'NULL';
          RAISE NOTICE '[update_entity_data] String vazia/null detectada em campo UUID, usando NULL: %', key_value.key;
        ELSE
          -- Validar se é um UUID válido antes de fazer o cast
          BEGIN
            -- Tentar fazer parse do UUID para validar
            PERFORM string_value::uuid;
            value_text := quote_literal(string_value) || '::uuid';
            RAISE NOTICE '[update_entity_data] UUID válido, adicionando cast: % = %', key_value.key, value_text;
          EXCEPTION
            WHEN OTHERS THEN
              RAISE EXCEPTION '[update_entity_data] Valor inválido para campo UUID %: "%" (erro: %)', 
                key_value.key, string_value, SQLERRM;
          END;
        END IF;
      ELSIF column_type IN ('time', 'timestamp', 'date', 'timestamp with time zone', 'timestamp without time zone') THEN
        value_text := quote_literal(string_value);
        RAISE NOTICE '[update_entity_data] Timestamp: % -> %', key_value.key, value_text;
      ELSE
        value_text := quote_literal(string_value);
        RAISE NOTICE '[update_entity_data] String normal: % -> %', key_value.key, value_text;
      END IF;
    ELSE
      value_text := quote_literal(key_value.value #>> '{}');
      RAISE NOTICE '[update_entity_data] Outro tipo: % -> %', key_value.key, value_text;
    END IF;
    
    -- Adicionar cláusula SET
    IF set_clauses = '' THEN
      set_clauses := quote_ident(key_value.key) || ' = ' || value_text;
    ELSE
      set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text;
    END IF;
    
    RAISE NOTICE '[update_entity_data] Cláusula SET adicionada: % = %', key_value.key, value_text;
  END LOOP;
  
  RAISE NOTICE '[update_entity_data] Cláusulas SET finais: %', set_clauses;
  
  -- Se não houver campos para atualizar, retornar erro
  IF set_clauses = '' THEN
    RAISE EXCEPTION '[update_entity_data] Nenhum campo válido para atualizar';
  END IF;
  
  -- Adicionar updated_at automaticamente
  set_clauses := set_clauses || ', updated_at = now()';
  
  -- Construir query SQL dinâmica
  -- Se company_id_param for NULL, não incluir na cláusula WHERE (para tabelas sem company_id)
  IF company_id_param IS NULL THEN
    sql_query := format(
      'WITH updated AS (
        UPDATE %I.%I 
        SET %s 
        WHERE id = %L::uuid
        RETURNING *
      )
      SELECT row_to_json(updated.*)::jsonb FROM updated',
      schema_name,
      table_name,
      set_clauses,
      id_param
    );
    RAISE NOTICE '[update_entity_data] Query SQL final (sem company_id): %', sql_query;
  ELSE
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
    RAISE NOTICE '[update_entity_data] Query SQL final (com company_id): %', sql_query;
  END IF;
  
  -- Executar query
  EXECUTE sql_query INTO result;
  
  -- Se não encontrou nenhum registro, retornar erro
  IF result IS NULL THEN
    RAISE EXCEPTION '[update_entity_data] Registro não encontrado ou sem permissão para atualizar';
  END IF;
  
  RAISE NOTICE '[update_entity_data] Atualização concluída com sucesso';
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '[update_entity_data] Erro ao atualizar dados: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Garantir permissões
ALTER FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.update_entity_data(text, text, uuid, uuid, jsonb) IS 
'Atualiza dados em qualquer tabela de qualquer schema. Versão corrigida com tratamento de strings vazias em campos UUID e logs detalhados para debug.';
