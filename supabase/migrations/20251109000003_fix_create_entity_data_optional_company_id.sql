-- =====================================================
-- CORREÇÃO: create_entity_data para tabelas sem company_id
-- Data: 2025-11-09
-- Descrição: Verifica se a tabela tem coluna company_id antes de inserir
--             Permite criar dados em tabelas de relacionamento (ex: employee_location_zones)
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
  
  -- Construir INSERT dinâmico tratando UUIDs corretamente
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
    
    -- Verificar o tipo do valor
    IF jsonb_typeof(value) = 'null' THEN
      values_list := values_list || 'NULL';
    ELSE
      value_str := value::TEXT;
      
      -- Remover aspas extras do JSONB
      IF value_str LIKE '"%' AND value_str LIKE '%"' THEN
        value_str := substring(value_str from 2 for length(value_str) - 2);
      END IF;
      
      -- Se parece UUID, tratar como tal
      IF value_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        values_list := values_list || quote_literal(value_str) || '::uuid';
      ELSE
        values_list := values_list || quote_literal(value_str);
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'columns_list: %', columns_list;
  RAISE NOTICE 'values_list: %', values_list;
  
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
  
  RAISE NOTICE 'insert_sql: %', insert_sql;
  
  -- Executar inserção
  EXECUTE insert_sql INTO result_json;
  
  RAISE NOTICE 'result_json: %', result_json;
  RAISE NOTICE '=== FIM create_entity_data ===';
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO em create_entity_data: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) TO anon;

-- Comentário
COMMENT ON FUNCTION create_entity_data(TEXT, TEXT, UUID, JSONB) IS 
'Função genérica para criar dados. Verifica se a tabela tem company_id antes de inserir. Permite criar dados em tabelas de relacionamento.';

