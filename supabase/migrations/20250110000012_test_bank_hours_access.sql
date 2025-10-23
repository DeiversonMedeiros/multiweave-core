-- =====================================================
-- FUNÇÃO DE TESTE PARA BANCO DE HORAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.test_time_bank_access(
  company_id_param text
)
RETURNS TABLE(id text, data jsonb, total_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    total_rows bigint;
BEGIN
    -- Construir cláusula WHERE
    where_clause := 'WHERE 1=1';
    
    -- Adicionar filtro de company_id se fornecido
    IF company_id_param IS NOT NULL THEN
        where_clause := where_clause || ' AND company_id = ''' || company_id_param || '''::uuid';
    END IF;
    
    -- Query para buscar dados
    query_text := 'SELECT id::text, to_jsonb(t.*) as data, COUNT(*) OVER() as total_count FROM rh.time_bank t ' || where_clause || ' ORDER BY created_at DESC LIMIT 100';
    
    -- Query para contar total
    count_query := 'SELECT COUNT(*) FROM rh.time_bank t ' || where_clause;
    
    -- Executar query de contagem
    EXECUTE count_query INTO total_rows;
    
    -- Retornar dados
    RETURN QUERY EXECUTE query_text;
END;
$$;

-- Testar a função
SELECT * FROM public.test_time_bank_access('a9784891-9d58-4cc4-8404-18032105c335');
