-- =====================================================
-- MIGRAÇÃO: Função Genérica para Chamar RPCs de Qualquer Schema
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Cria função genérica no schema public que permite
--            chamar funções RPC de schemas não-públicos via REST API
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- Função Genérica para Chamar RPCs de Outros Schemas
-- =====================================================
CREATE OR REPLACE FUNCTION public.call_schema_rpc(
    p_schema_name TEXT,
    p_function_name TEXT,
    p_params JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sql TEXT;
    v_result JSONB;
    v_param_list TEXT;
    v_uuid_result UUID;
    v_int_result INTEGER;
    v_bool_result BOOLEAN;
    v_text_result TEXT;
BEGIN
    -- Construir lista de parâmetros do JSONB
    -- Os parâmetros devem estar na ordem correta e com tipos corretos
    -- Obter informações da função para determinar tipos dos parâmetros
    -- Por enquanto, vamos usar heurística: se parece UUID, trata como UUID
    SELECT string_agg(
        CASE 
            WHEN value::text = 'null' OR jsonb_typeof(value) = 'null' THEN 
                -- Tentar determinar tipo baseado no nome do parâmetro
                CASE 
                    WHEN key LIKE '%_id' OR key LIKE '%id' THEN 'NULL::UUID'
                    ELSE 'NULL'
                END
            WHEN jsonb_typeof(value) = 'string' THEN 
                CASE 
                    -- Verificar se é UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                    WHEN value::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN quote_literal(value::text) || '::UUID'
                    -- Verificar se o nome do parâmetro sugere UUID
                    WHEN key LIKE '%_id' OR key LIKE '%id' THEN quote_literal(value::text) || '::UUID'
                    ELSE quote_literal(value::text) || '::TEXT'
                END
            WHEN jsonb_typeof(value) = 'number' THEN 
                CASE 
                    WHEN trunc((value::numeric)::numeric) = (value::numeric)::numeric 
                    THEN value::text || '::INTEGER'
                    ELSE value::text || '::NUMERIC'
                END
            WHEN jsonb_typeof(value) = 'boolean' THEN value::text || '::BOOLEAN'
            ELSE quote_literal(value::text) || '::TEXT'
        END,
        ', '
        ORDER BY key
    ) INTO v_param_list
    FROM jsonb_each(p_params);
    
    -- Se não houver parâmetros, usar lista vazia
    IF v_param_list IS NULL THEN
        v_param_list := '';
    END IF;
    
    -- Construir SQL dinâmico para chamar a função do schema especificado
    -- Formato: SELECT schema.function_name(param1, param2, ...)
    v_sql := format(
        'SELECT %I.%I(%s)',
        p_schema_name,
        p_function_name,
        v_param_list
    );
    
    -- Executar e retornar resultado
    -- A função pode retornar diferentes tipos (UUID, INTEGER, BOOLEAN, etc.)
    -- Converter para JSONB de forma apropriada usando CAST dinâmico
    DECLARE
        v_result_text TEXT;
    BEGIN
        -- Executar SQL e converter resultado para texto
        EXECUTE format('SELECT %s', v_sql) INTO v_result_text;
        
        -- Retornar como JSONB com o resultado
        RETURN jsonb_build_object('result', v_result_text);
    EXCEPTION WHEN OTHERS THEN
        -- Se falhar, tentar executar diretamente e converter
        BEGIN
            EXECUTE v_sql INTO v_result;
            RETURN COALESCE(v_result, jsonb_build_object('result', NULL));
        EXCEPTION WHEN OTHERS THEN
            -- Se ainda falhar, retornar erro
            RETURN jsonb_build_object(
                'error', true,
                'message', SQLERRM,
                'sqlstate', SQLSTATE,
                'sql', v_sql
            );
        END;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'sqlstate', SQLSTATE,
            'sql', v_sql
        );
END;
$$;

COMMENT ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) IS 
'Função genérica para chamar funções RPC de qualquer schema via REST API. 
Parâmetros:
- p_schema_name: Nome do schema (ex: financeiro, rh, core)
- p_function_name: Nome da função RPC
- p_params: JSONB com os parâmetros da função (chaves devem corresponder aos nomes dos parâmetros)';

GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO authenticated;

