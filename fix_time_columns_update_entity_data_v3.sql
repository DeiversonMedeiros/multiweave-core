-- =====================================================
-- CORREÇÃO V3: Versão simplificada da função update_entity_data
-- =====================================================

-- Função para atualizar dados em qualquer schema (versão simplificada)
CREATE OR REPLACE FUNCTION update_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
  set_clauses TEXT;
  key_value RECORD;
  value_text TEXT;
  param_count INTEGER := 0;
  uuid_columns TEXT[] := ARRAY['employee_id', 'liberado_por', 'user_id', 'profile_id', 'correction_id', 'changed_by', 'aprovado_por'];
  boolean_columns TEXT[] := ARRAY['liberado', 'ativo', 'is_active', 'pago', 'permitir_correcao_futura', 'exigir_justificativa', 'permitir_correcao_apos_aprovacao'];
  timestamp_columns TEXT[] := ARRAY['created_at', 'updated_at', 'liberado_em', 'data_agendamento', 'data_vencimento', 'data_realizacao', 'data_pagamento', 'aprovado_em'];
  time_columns TEXT[] := ARRAY['entrada', 'saida', 'entrada_almoco', 'saida_almoco', 'entrada_extra1', 'saida_extra1', 'entrada_extra2', 'saida_extra2', 'hora_entrada', 'hora_saida'];
BEGIN
  -- Log para debug
  RAISE NOTICE 'Updating entity: schema=%, table=%, company_id=%, id=%, data=%', 
    schema_name, table_name, company_id_param, id_param, data_param;
  
  -- Construir cláusulas SET
  set_clauses := '';
  
  -- Iterar sobre os pares chave-valor do JSONB
  FOR key_value IN 
    SELECT key, value 
    FROM jsonb_each(data_param) 
    ORDER BY key
  LOOP
    -- Pular company_id se estiver nos dados (não deve ser atualizado)
    IF key_value.key = 'company_id' THEN
      CONTINUE;
    END IF;
    
    -- Converter valor para texto apropriado
    IF key_value.value IS NULL THEN
      value_text := 'NULL';
    ELSIF jsonb_typeof(key_value.value) = 'string' THEN
      value_text := quote_literal(key_value.value #>> '{}');
    ELSIF jsonb_typeof(key_value.value) = 'boolean' THEN
      value_text := (key_value.value #>> '{}');
    ELSIF jsonb_typeof(key_value.value) = 'number' THEN
      value_text := (key_value.value #>> '{}');
    ELSE
      value_text := quote_literal(key_value.value #>> '{}');
    END IF;
    
    -- Adicionar cláusula SET com cast apropriado baseado no tipo da coluna
    IF key_value.key = ANY(uuid_columns) THEN
      IF set_clauses = '' THEN
        set_clauses := quote_ident(key_value.key) || ' = ' || value_text || '::uuid';
      ELSE
        set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text || '::uuid';
      END IF;
    ELSIF key_value.key = ANY(boolean_columns) THEN
      IF set_clauses = '' THEN
        set_clauses := quote_ident(key_value.key) || ' = ' || value_text || '::boolean';
      ELSE
        set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text || '::boolean';
      END IF;
    ELSIF key_value.key = ANY(timestamp_columns) THEN
      IF set_clauses = '' THEN
        set_clauses := quote_ident(key_value.key) || ' = ' || value_text || '::timestamp with time zone';
      ELSE
        set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text || '::timestamp with time zone';
      END IF;
    ELSIF key_value.key = ANY(time_columns) THEN
      -- NOVO: Tratamento específico para colunas TIME
      IF set_clauses = '' THEN
        set_clauses := quote_ident(key_value.key) || ' = ' || value_text || '::time without time zone';
      ELSE
        set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text || '::time without time zone';
      END IF;
    ELSE
      IF set_clauses = '' THEN
        set_clauses := quote_ident(key_value.key) || ' = ' || value_text;
      ELSE
        set_clauses := set_clauses || ', ' || quote_ident(key_value.key) || ' = ' || value_text;
      END IF;
    END IF;
  END LOOP;
  
  -- Se não há campos para atualizar, retornar erro
  IF set_clauses = '' THEN
    RAISE EXCEPTION 'Nenhum campo válido para atualizar encontrado nos dados fornecidos';
  END IF;
  
  -- Construir query SQL
  sql_query := format('UPDATE %I.%I SET %s WHERE id = %L AND company_id = %L RETURNING row_to_json(%I.*)', 
    schema_name, table_name, set_clauses, id_param, company_id_param, table_name);
  
  -- Log da query para debug
  RAISE NOTICE 'Executing query: %', sql_query;
  
  -- Executar query
  BEGIN
    EXECUTE sql_query INTO result;
    
    -- Se não encontrou nenhum registro, retornar erro
    IF result IS NULL THEN
      RAISE EXCEPTION 'Registro não encontrado ou não pertence à empresa especificada';
    END IF;
    
    RETURN result;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erro ao atualizar dados: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION update_entity_data(TEXT, TEXT, UUID, UUID, JSONB) IS 
'Atualiza dados em qualquer tabela de qualquer schema com suporte a tipos TIME, UUID, BOOLEAN e TIMESTAMP';
