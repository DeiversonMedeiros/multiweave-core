-- =====================================================
-- GARANTIR QUE call_schema_rpc EXISTA E ESTEJA ACESSÍVEL
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Garante que a função call_schema_rpc existe e está acessível via RPC
--            Esta função é usada para chamar funções RPC de schemas não-públicos

-- Recriar função call_schema_rpc se não existir
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
    v_decimal_result DECIMAL;
BEGIN
    -- Construir lista de parâmetros do JSONB
    SELECT string_agg(
        CASE 
            WHEN value::text = 'null' OR jsonb_typeof(value) = 'null' THEN 
                CASE 
                    WHEN key LIKE '%_id' OR key LIKE '%id' THEN 'NULL::UUID'
                    ELSE 'NULL'
                END
            WHEN jsonb_typeof(value) = 'string' THEN 
                CASE 
                    -- UUID: usar #>> '{}' para extrair valor sem aspas JSON
                    WHEN (value #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN quote_literal(value #>> '{}') || '::UUID'
                    WHEN key LIKE '%_id' OR key LIKE '%id' OR key LIKE '%_por' THEN 
                        quote_literal(value #>> '{}') || '::UUID'
                    ELSE quote_literal(value #>> '{}') || '::TEXT'
                END
            WHEN jsonb_typeof(value) = 'number' THEN 
                CASE 
                    WHEN trunc((value::numeric)::numeric) = (value::numeric)::numeric 
                    THEN value::text || '::INTEGER'
                    ELSE value::text || '::NUMERIC'
                END
            WHEN jsonb_typeof(value) = 'boolean' THEN value::text || '::BOOLEAN'
            WHEN jsonb_typeof(value) = 'object' OR jsonb_typeof(value) = 'array' THEN 
                quote_literal(value::text) || '::JSONB'
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
    v_sql := format(
        'SELECT %I.%I(%s)',
        p_schema_name,
        p_function_name,
        v_param_list
    );
    
    -- Executar e retornar resultado
    -- Tentar diferentes tipos de retorno
    BEGIN
        EXECUTE v_sql INTO v_uuid_result;
        RETURN jsonb_build_object('result', v_uuid_result::text);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            EXECUTE v_sql INTO v_int_result;
            RETURN jsonb_build_object('result', v_int_result);
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                EXECUTE v_sql INTO v_bool_result;
                RETURN jsonb_build_object('result', v_bool_result);
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    EXECUTE v_sql INTO v_text_result;
                    RETURN jsonb_build_object('result', v_text_result);
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        EXECUTE v_sql INTO v_decimal_result;
                        RETURN jsonb_build_object('result', v_decimal_result);
                    EXCEPTION WHEN OTHERS THEN
                        BEGIN
                            EXECUTE v_sql INTO v_result;
                            RETURN COALESCE(v_result, jsonb_build_object('result', NULL));
                        EXCEPTION WHEN OTHERS THEN
                            RETURN jsonb_build_object(
                                'error', true,
                                'message', SQLERRM,
                                'sqlstate', SQLSTATE,
                                'sql', v_sql
                            );
                        END;
                    END;
                END;
            END;
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

-- Grant permissões
GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO service_role;

-- Comentário
COMMENT ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) IS 
'Função genérica para chamar funções RPC de qualquer schema via REST API. 
Suporta retorno de diferentes tipos (UUID, INTEGER, BOOLEAN, TEXT, DECIMAL, JSONB).
Parâmetros:
- p_schema_name: Nome do schema (ex: financeiro, rh, core, almoxarifado)
- p_function_name: Nome da função RPC
- p_params: JSONB com os parâmetros da função (chaves devem corresponder aos nomes dos parâmetros)';

