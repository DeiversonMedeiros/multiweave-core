-- =====================================================
-- CORREÇÃO DA FUNÇÃO create_entity_data
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Corrige ambiguidade da coluna "key" na função create_entity_data

-- Função para criar dados em qualquer schema (versão corrigida)
CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
  keys_list TEXT;
  values_list TEXT;
  values_array JSONB[];
BEGIN
  -- Extrair chaves e valores de forma mais segura
  SELECT 
    string_agg(quote_ident(k.key), ', '),
    string_agg('$' || (k.ordinality + 1)::text, ', '),
    array_agg(v.value ORDER BY k.ordinality)
  INTO keys_list, values_list, values_array
  FROM jsonb_each(data_param) WITH ORDINALITY AS k(key, ordinality)
  JOIN jsonb_each(data_param) WITH ORDINALITY AS v(value, ordinality) ON k.ordinality = v.ordinality;
  
  -- Construir query dinâmica
  sql_query := format('INSERT INTO %I.%I (company_id, %s) VALUES ($1, %s) RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    keys_list,
    values_list
  );
  
  -- Executar query
  EXECUTE sql_query INTO result USING company_id_param, values_array;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_entity_data IS 'Função para criar dados em qualquer schema com correção de ambiguidade de colunas';
