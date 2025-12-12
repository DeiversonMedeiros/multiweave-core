-- =====================================================
-- CORREÇÃO: get_entity_data - Verificar company_id antes de filtrar
-- Data: 2025-12-12
-- Descrição: Restaura a verificação de company_id e adiciona suporte
--            para tabelas que se relacionam com company_id via outras tabelas
--            (ex: compras.cotacoes via requisicao_id -> requisicoes_compra.company_id)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_entity_data(
  schema_name text,
  table_name text,
  company_id_param text DEFAULT NULL,
  filters jsonb DEFAULT '{}',
  limit_param integer DEFAULT 100,
  offset_param integer DEFAULT 0,
  order_by text DEFAULT 'created_at',
  order_direction text DEFAULT 'DESC'
)
RETURNS TABLE(id text, data jsonb, total_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_text text;
    count_query text;
    where_clause text := '';
    order_clause text;
    total_rows bigint;
    filter_key text;
    filter_value text;
    current_user_id uuid;
    user_companies uuid[];
    has_company_access boolean := false;
    base_field text;
    condition text;
    search_value text;
    search_condition text;
    search_columns text[];
    has_company_id_column boolean := false;
    join_clause text := '';
    company_filter_condition text := '';
BEGIN
    -- Log de entrada
    RAISE NOTICE 'get_entity_data: INICIO - schema_name=%, table_name=%, company_id_param=%, filters=%', 
        schema_name, table_name, company_id_param, filters;
    
    -- Obter ID do usuario atual
    current_user_id := auth.uid();
    RAISE NOTICE 'get_entity_data: current_user_id=%', current_user_id;
    
    -- Se nao ha usuario autenticado, negar acesso
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'get_entity_data: ERRO - Usuario nao autenticado';
        RAISE EXCEPTION 'Usuario nao autenticado';
    END IF;
    
    -- Verificar se o usuario tem permissao para acessar esta entidade
    IF NOT public.check_access_permission(schema_name, table_name, 'read') THEN
        RAISE NOTICE 'get_entity_data: ERRO - Acesso negado para %:%.%', schema_name, table_name, 'read';
        RAISE EXCEPTION 'Acesso negado para %:%.%', schema_name, table_name, 'read';
    END IF;
    
    -- Verificar se a tabela tem coluna company_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = schema_name
        AND c.table_name = get_entity_data.table_name
        AND c.column_name = 'company_id'
    ) INTO has_company_id_column;
    
    RAISE NOTICE 'get_entity_data: has_company_id_column=%', has_company_id_column;
    
    -- Obter empresas do usuario
    SELECT ARRAY(
        SELECT uc.company_id 
        FROM public.user_companies uc 
        WHERE uc.user_id = current_user_id 
        AND uc.ativo = true
    ) INTO user_companies;
    
    RAISE NOTICE 'get_entity_data: user_companies=%', user_companies;
    
    -- Se for super admin, permitir acesso a todas as empresas
    IF public.is_admin_simple(current_user_id) THEN
        has_company_access := true;
        RAISE NOTICE 'get_entity_data: Usuario e super admin';
    ELSE
        -- Verificar se o usuario tem acesso a empresa especifica
        IF company_id_param IS NOT NULL THEN
            has_company_access := (company_id_param::uuid = ANY(user_companies));
            RAISE NOTICE 'get_entity_data: Verificando acesso a empresa especifica: %', has_company_access;
        ELSE
            -- Se nao especificou empresa, permitir se tiver acesso a pelo menos uma
            has_company_access := (array_length(user_companies, 1) > 0);
            RAISE NOTICE 'get_entity_data: Verificando acesso geral: %', has_company_access;
        END IF;
    END IF;
    
    -- Se nao tem acesso a empresa, negar
    IF NOT has_company_access THEN
        RAISE NOTICE 'get_entity_data: ERRO - Acesso negado para empresa %', COALESCE(company_id_param, 'nao especificada');
        RAISE EXCEPTION 'Acesso negado para empresa %', COALESCE(company_id_param, 'nao especificada');
    END IF;
    
    -- Construir clausula WHERE basica
    where_clause := 'WHERE 1=1';
    RAISE NOTICE 'get_entity_data: where_clause inicial=%', where_clause;
    
    -- Adicionar filtro de company_id apenas se a tabela tiver essa coluna E se company_id_param foi fornecido
    IF company_id_param IS NOT NULL THEN
        IF has_company_id_column THEN
            -- Tabela tem company_id diretamente
            company_filter_condition := 't.company_id = ''' || company_id_param || '''::uuid';
            RAISE NOTICE 'get_entity_data: Tabela tem company_id - usando filtro direto';
        ELSIF schema_name = 'compras' AND table_name = 'cotacoes' THEN
            -- Tabela compras.cotacoes se relaciona via requisicao_id -> requisicoes_compra.company_id
            join_clause := 'LEFT JOIN compras.requisicoes_compra rc ON rc.id = t.requisicao_id';
            company_filter_condition := 'rc.company_id = ''' || company_id_param || '''::uuid';
            RAISE NOTICE 'get_entity_data: Tabela compras.cotacoes - usando JOIN com requisicoes_compra';
        ELSE
            -- Tabela nao tem company_id e nao tem relacao conhecida - ignorar filtro
            RAISE NOTICE 'get_entity_data: Tabela nao tem company_id e nao tem relacao conhecida - ignorando filtro de company_id';
        END IF;
        
        IF company_filter_condition != '' THEN
            where_clause := where_clause || ' AND ' || company_filter_condition;
            RAISE NOTICE 'get_entity_data: where_clause com company_id=%', where_clause;
        END IF;
    END IF;
    
    -- Extrair e processar filtro "search" separadamente (se existir)
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        search_value := filters->>'search';
        
        IF search_value IS NOT NULL AND search_value != '' AND search_value != 'all' THEN
            RAISE NOTICE 'get_entity_data: Processando filtro search com valor: %', search_value;
            
            -- Definir colunas de busca baseado na tabela
            -- Para rh.employees: buscar em nome, matricula, cpf, email
            IF schema_name = 'rh' AND table_name = 'employees' THEN
                search_columns := ARRAY['nome', 'matricula', 'cpf', 'email'];
            -- Para outras tabelas com employee/funcionario no nome
            ELSIF table_name LIKE '%employee%' OR table_name LIKE '%funcionario%' THEN
                search_columns := ARRAY['nome', 'matricula', 'cpf', 'email'];
            -- Para outras tabelas, usar apenas "nome" (se não existir, a query falhará mas será tratada)
            ELSE
                search_columns := ARRAY['nome'];
            END IF;
            
            -- Construir condição de busca se houver colunas definidas
            IF array_length(search_columns, 1) > 0 THEN
                search_condition := '(';
                FOR i IN 1..array_length(search_columns, 1) LOOP
                    IF i > 1 THEN
                        search_condition := search_condition || ' OR ';
                    END IF;
                    -- Escapar caracteres especiais para evitar SQL injection
                    search_condition := search_condition || 't.' || search_columns[i] || '::text ILIKE ''%' || 
                        replace(replace(search_value, '''', ''''''), '%', '\%') || '%''';
                END LOOP;
                search_condition := search_condition || ')';
                
                where_clause := where_clause || ' AND ' || search_condition;
                RAISE NOTICE 'get_entity_data: Condição de busca adicionada: %', search_condition;
            END IF;
        END IF;
    END IF;
    
    -- Adicionar outros filtros dinamicos do JSON (exceto "search" que já foi processado)
    IF filters IS NOT NULL AND jsonb_typeof(filters) = 'object' THEN
        RAISE NOTICE 'get_entity_data: Processando outros filtros JSON=%', filters;
        
        FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(filters)
        LOOP
            -- Pular o filtro "search" que já foi processado
            IF filter_key = 'search' THEN
                CONTINUE;
            END IF;
            
            RAISE NOTICE 'get_entity_data: Processando filtro - key=%, value=%', filter_key, filter_value;
            
            -- Pular filtros vazios ou com valor "all"
            IF filter_value IS NOT NULL AND filter_value != '' AND filter_value != 'all' THEN
                -- Construir condicao de forma segura
                condition := '';
                
                -- Verificar se e um campo UUID (termina com _id mas nao e ano_vigencia ou mes_vigencia)
                IF filter_key LIKE '%_id' AND filter_key NOT IN ('ano_vigencia', 'mes_vigencia') THEN
                    condition := 't.' || filter_key || ' = ''' || filter_value || '''::uuid';
                -- Verificar se e um campo de data com comparacao >=
                ELSIF filter_key LIKE '%_gte' THEN
                    base_field := replace(filter_key, '_gte', '');
                    condition := 't.' || base_field || ' >= ''' || filter_value || '''::date';
                -- Verificar se e um campo de data com comparacao <=
                ELSIF filter_key LIKE '%_lte' THEN
                    base_field := replace(filter_key, '_lte', '');
                    condition := 't.' || base_field || ' <= ''' || filter_value || '''::date';
                -- Verificar se e um campo de data simples
                ELSIF filter_key LIKE '%_date' OR filter_key LIKE 'data_%' THEN
                    condition := 't.' || filter_key || ' = ''' || filter_value || '''::date';
                -- Verificar se e um campo booleano
                ELSIF filter_value IN ('true', 'false') THEN
                    condition := 't.' || filter_key || ' = ' || filter_value;
                -- Verificar se e um campo numerico (ano_vigencia, mes_vigencia, etc.)
                ELSIF filter_key IN ('ano_vigencia', 'mes_vigencia', 'dias_uteis_mes', 'tolerancia_atraso_minutos') THEN
                    condition := 't.' || filter_key || ' = ' || filter_value;
                -- Outros campos de texto
                ELSE
                    condition := 't.' || filter_key || ' = ''' || replace(filter_value, '''', '''''') || '''';
                END IF;
                
                -- Adicionar condicao se foi construida
                IF condition != '' THEN
                    where_clause := where_clause || ' AND ' || condition;
                    RAISE NOTICE 'get_entity_data: Condicao adicionada: %', condition;
                END IF;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'get_entity_data: where_clause final=%', where_clause;
    END IF;
    
    -- Construir clausula ORDER BY
    order_clause := 'ORDER BY t.' || order_by || ' ' || order_direction;
    RAISE NOTICE 'get_entity_data: order_clause=%', order_clause;
    
    -- Query para contar total de registros
    count_query := format('SELECT COUNT(*) FROM %I.%I t %s %s', 
        schema_name, table_name, join_clause, where_clause);
    RAISE NOTICE 'get_entity_data: count_query=%', count_query;
    
    -- Executar count query
    EXECUTE count_query INTO total_rows;
    
    RAISE NOTICE 'get_entity_data: total_rows=%', total_rows;
    
    -- Query principal para buscar dados
    query_text := format('
        SELECT 
            t.id::text,
            to_jsonb(t.*) as data,
            %s::bigint as total_count
        FROM %I.%I t 
        %s 
        %s 
        %s
        LIMIT %s OFFSET %s
    ', total_rows, schema_name, table_name, join_clause, where_clause, order_clause, limit_param, offset_param);
    
    RAISE NOTICE 'get_entity_data: query_text=%', query_text;
    
    -- Executar query principal
    RETURN QUERY EXECUTE query_text;
    
    RAISE NOTICE 'get_entity_data: FIM - Query executada com sucesso';
END;
$$;

-- Comentário atualizado
COMMENT ON FUNCTION public.get_entity_data IS 
'Função genérica para buscar dados de qualquer entidade com suporte a filtros dinâmicos.
Verifica se a tabela tem company_id antes de filtrar.
Para compras.cotacoes, faz JOIN com requisicoes_compra para filtrar por company_id.
O filtro "search" é tratado especialmente como busca em múltiplas colunas usando ILIKE.';

