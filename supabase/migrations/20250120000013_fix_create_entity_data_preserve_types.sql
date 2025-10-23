-- =====================================================
-- CORREÇÃO DA FUNÇÃO create_entity_data - PRESERVAR TIPOS
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Corrigir função para preservar tipos de dados (integer, boolean, etc.)

-- Função para criar dados em qualquer schema (versão que preserva tipos)
CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result_record record;
  result_json jsonb;
  insert_sql text;
  values_sql text;
  keys_array text[];
  values_array jsonb[];
  key text;
  value jsonb;
  i integer;
BEGIN
  -- Extrair chaves e valores do JSON preservando tipos
  SELECT array_agg(key), array_agg(value)
  INTO keys_array, values_array
  FROM jsonb_each(data_param);
  
  -- Construir SQL de inserção com placeholders
  insert_sql := format(
    'INSERT INTO %I.%I (company_id, %s) VALUES ($1, %s) RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    array_to_string(keys_array, ', '),
    array_to_string(
      array(
        SELECT '$' || (i + 1)::text
        FROM generate_series(1, array_length(values_array, 1)) AS i
      ), 
      ', '
    )
  );
  
  -- Executar inserção com parâmetros tipados
  EXECUTE insert_sql INTO result_json USING company_id_param, values_array;
  
  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
