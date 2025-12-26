-- =====================================================
-- CORREÇÃO: delete_entity_data para employee_location_zones
-- Data: 2025-12-20
-- Descrição: Garante que a função delete_entity_data funciona corretamente
--            para tabelas sem coluna company_id (tabelas de relacionamento)
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
BEGIN
  -- Verificar se a tabela tem coluna company_id
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns c
    WHERE c.table_schema = delete_entity_data.schema_name
      AND c.table_name = delete_entity_data.table_name
      AND c.column_name = 'company_id'
  ) INTO has_company_id_column;
  
  -- Construir cláusula WHERE baseada na existência da coluna company_id
  where_clause := 'WHERE id = ' || quote_literal(id_param) || '::uuid';
  
  -- Adicionar filtro de company_id apenas se:
  -- 1. A tabela tiver a coluna company_id
  -- 2. E company_id_param foi fornecido (não é NULL)
  IF has_company_id_column AND company_id_param IS NOT NULL THEN
    where_clause := where_clause || ' AND company_id = ' || quote_literal(company_id_param) || '::uuid';
  END IF;
  
  -- Construir query SQL dinâmica
  sql_query := format(
    'DELETE FROM %I.%I %s',
    schema_name,
    table_name,
    where_clause
  );
  
  -- Executar query
  EXECUTE sql_query;
  
  -- Obter número de linhas afetadas
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar dados: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
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
'Deleta dados em qualquer tabela de qualquer schema. Verifica se a tabela tem coluna company_id antes de usar na cláusula WHERE. Permite deletar dados em tabelas de relacionamento que não têm company_id diretamente (ex: rh.employee_location_zones). Retorna true se pelo menos uma linha foi deletada.';


