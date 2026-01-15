-- =====================================================
-- CORREÇÃO: delete_entity_data - Validação de parâmetros
-- Data: 2026-01-16
-- Descrição: Melhora validação de parâmetros e tratamento de erros
--            para evitar erros 400 ao deletar dados
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  id_param UUID
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  affected_rows INTEGER;
  sql_query TEXT;
  has_company_id_column BOOLEAN := false;
  where_clause TEXT;
  table_exists BOOLEAN := false;
BEGIN
  -- Validar parâmetros obrigatórios
  IF schema_name IS NULL OR schema_name = '' THEN
    RAISE EXCEPTION 'schema_name não pode ser NULL ou vazio';
  END IF;
  
  IF table_name IS NULL OR table_name = '' THEN
    RAISE EXCEPTION 'table_name não pode ser NULL ou vazio';
  END IF;
  
  IF id_param IS NULL THEN
    RAISE EXCEPTION 'id_param não pode ser NULL';
  END IF;
  
  -- Verificar se a tabela existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables t
    WHERE t.table_schema = delete_entity_data.schema_name
      AND t.table_name = delete_entity_data.table_name
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Tabela %.% não existe', schema_name, table_name;
  END IF;
  
  -- Verificar se a tabela tem coluna company_id
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns c
    WHERE c.table_schema = delete_entity_data.schema_name
      AND c.table_name = delete_entity_data.table_name
      AND c.column_name = 'company_id'
  ) INTO has_company_id_column;
  
  -- Construir cláusula WHERE baseada na existência da coluna company_id
  -- Usar parâmetros nomeados para evitar SQL injection
  where_clause := 'WHERE id = $1::uuid';
  
  -- Adicionar filtro de company_id apenas se:
  -- 1. A tabela tiver a coluna company_id
  -- 2. E company_id_param foi fornecido (não é NULL)
  IF has_company_id_column AND company_id_param IS NOT NULL THEN
    where_clause := where_clause || ' AND company_id = $2::uuid';
  END IF;
  
  -- Construir query SQL dinâmica usando format para nomes de schema/tabela
  -- e parâmetros nomeados para valores
  sql_query := format(
    'DELETE FROM %I.%I %s',
    schema_name,
    table_name,
    where_clause
  );
  
  -- Executar query com parâmetros
  IF has_company_id_column AND company_id_param IS NOT NULL THEN
    EXECUTE sql_query USING id_param, company_id_param;
  ELSE
    EXECUTE sql_query USING id_param;
  END IF;
  
  -- Obter número de linhas afetadas
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'ID inválido: % não é um UUID válido', id_param;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar dados de %.%: % (SQLSTATE: %)', 
      schema_name, table_name, SQLERRM, SQLSTATE;
END;
$$;

-- Garantir que a função está no schema public e tem permissões corretas
ALTER FUNCTION public.delete_entity_data(text, text, uuid, uuid) OWNER TO postgres;

-- Garantir permissões para todos os roles
GRANT EXECUTE ON FUNCTION public.delete_entity_data(text, text, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_entity_data(text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entity_data(text, text, uuid, uuid) TO service_role;

-- Comentário na função
COMMENT ON FUNCTION public.delete_entity_data(text, text, uuid, uuid) IS 
'Deleta dados em qualquer tabela de qualquer schema. Valida parâmetros obrigatórios, verifica existência da tabela e se tem coluna company_id antes de usar na cláusula WHERE. Permite deletar dados em tabelas de relacionamento que não têm company_id diretamente (ex: rh.employee_location_zones). Retorna true se pelo menos uma linha foi deletada.';
