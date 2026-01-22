-- =====================================================
-- CORREÇÃO: Ordem dos parâmetros para suspender_conta_pagar e reprovar_conta_pagar
-- =====================================================
-- Data: 2026-01-16
-- Descrição: Corrige a ordem dos parâmetros na função call_schema_rpc
--            para as funções suspender_conta_pagar e reprovar_conta_pagar
--            do schema financeiro
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
    v_decimal_result DECIMAL;
BEGIN
    -- Construir lista de parâmetros do JSONB
    -- IMPORTANTE: Manter ordem dos parâmetros conforme definição da função
    WITH ordered_params AS (
        SELECT 
            key,
            value,
            CASE 
                -- Ordem para suspender_conta_pagar e reprovar_conta_pagar
                WHEN key = 'p_conta_pagar_id' AND (p_function_name = 'suspender_conta_pagar' OR p_function_name = 'reprovar_conta_pagar') THEN 1
                WHEN key = 'p_company_id' AND (p_function_name = 'suspender_conta_pagar' OR p_function_name = 'reprovar_conta_pagar') THEN 2
                WHEN key = 'p_suspenso_por' AND p_function_name = 'suspender_conta_pagar' THEN 3
                WHEN key = 'p_reprovado_por' AND p_function_name = 'reprovar_conta_pagar' THEN 3
                WHEN key = 'p_observacoes' AND (p_function_name = 'suspender_conta_pagar' OR p_function_name = 'reprovar_conta_pagar') THEN 4
                -- Ordem para criar_ferias_fracionadas
                WHEN key = 'p_company_id' AND p_function_name = 'criar_ferias_fracionadas' THEN 1
                WHEN key = 'p_employee_id' AND p_function_name = 'criar_ferias_fracionadas' THEN 2
                WHEN key = 'p_ano' AND p_function_name = 'criar_ferias_fracionadas' THEN 3
                WHEN key = 'p_periodos' AND p_function_name = 'criar_ferias_fracionadas' THEN 4
                WHEN key = 'p_observacoes' AND p_function_name = 'criar_ferias_fracionadas' THEN 5
                -- Ordem para aprovar_ferias e rejeitar_ferias
                WHEN key = 'p_vacation_id' AND (p_function_name = 'aprovar_ferias' OR p_function_name = 'rejeitar_ferias') THEN 1
                WHEN key = 'p_aprovado_por' AND (p_function_name = 'aprovar_ferias' OR p_function_name = 'rejeitar_ferias') THEN 2
                WHEN key = 'p_motivo_rejeicao' AND p_function_name = 'rejeitar_ferias' THEN 3
                -- Para outras funções, ordenar alfabeticamente
                ELSE 99
            END as param_order
        FROM jsonb_each(p_params)
    )
    SELECT string_agg(
        CASE 
            -- Tratar p_periodos sempre como JSONB, independente do tipo detectado
            WHEN key = 'p_periodos' THEN quote_literal(value::text) || '::JSONB'
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
        ORDER BY param_order, key
    ) INTO v_param_list
    FROM ordered_params;
    
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
    -- IMPORTANTE: Tentar JSONB primeiro para funções que retornam JSONB
    BEGIN
        EXECUTE v_sql INTO v_result;
        -- Se conseguiu executar, pode ser JSONB ou outro tipo
        -- Verificar se é JSONB válido
        IF jsonb_typeof(v_result) = 'object' OR jsonb_typeof(v_result) = 'array' THEN
            RETURN jsonb_build_object('result', v_result);
        ELSE
            -- Se não é JSONB, retornar como está (pode ser convertido para texto depois)
            RETURN jsonb_build_object('result', v_result);
        END IF;
    EXCEPTION WHEN OTHERS THEN
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
Mantém ordem correta dos parâmetros para funções específicas:
- suspender_conta_pagar: p_conta_pagar_id, p_company_id, p_suspenso_por, p_observacoes
- reprovar_conta_pagar: p_conta_pagar_id, p_company_id, p_reprovado_por, p_observacoes
Parâmetros:
- p_schema_name: Nome do schema (ex: financeiro, rh, core, almoxarifado)
- p_function_name: Nome da função RPC
- p_params: JSONB com os parâmetros da função (chaves devem corresponder aos nomes dos parâmetros)';
