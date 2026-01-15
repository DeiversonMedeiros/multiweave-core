-- =====================================================
-- CORREÇÃO: call_schema_rpc para lidar com retorno UUID
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Corrige a função call_schema_rpc para lidar corretamente
--            com funções que retornam UUID (como criar_ferias_fracionadas)

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
    -- IMPORTANTE: Manter ordem dos parâmetros conforme definição da função
    -- Para criar_ferias_fracionadas: p_company_id, p_employee_id, p_ano, p_periodos, p_observacoes
    -- Para aprovar_ferias: p_vacation_id, p_aprovado_por
    -- Para rejeitar_ferias: p_vacation_id, p_aprovado_por, p_motivo_rejeicao
    -- Para is_rest_day: p_employee_id, p_company_id, p_date
    -- Para is_holiday: p_date, p_company_id
    WITH ordered_params AS (
        SELECT 
            key,
            value,
            CASE 
                -- is_rest_day: p_employee_id, p_company_id, p_date
                WHEN p_function_name = 'is_rest_day' THEN
                    CASE key
                        WHEN 'p_employee_id' THEN 1
                        WHEN 'p_company_id' THEN 2
                        WHEN 'p_date' THEN 3
                        ELSE 99
                    END
                -- is_holiday: p_date, p_company_id
                WHEN p_function_name = 'is_holiday' THEN
                    CASE key
                        WHEN 'p_date' THEN 1
                        WHEN 'p_company_id' THEN 2
                        ELSE 99
                    END
                -- criar_ferias_fracionadas: p_company_id, p_employee_id, p_ano, p_periodos, p_observacoes
                WHEN p_function_name = 'criar_ferias_fracionadas' THEN
                    CASE key
                        WHEN 'p_company_id' THEN 1
                        WHEN 'p_employee_id' THEN 2
                        WHEN 'p_ano' THEN 3
                        WHEN 'p_periodos' THEN 4
                        WHEN 'p_observacoes' THEN 5
                        ELSE 99
                    END
                -- aprovar_ferias: p_vacation_id, p_aprovado_por
                WHEN p_function_name = 'aprovar_ferias' THEN
                    CASE key
                        WHEN 'p_vacation_id' THEN 1
                        WHEN 'p_aprovado_por' THEN 2
                        ELSE 99
                    END
                -- rejeitar_ferias: p_vacation_id, p_aprovado_por, p_motivo_rejeicao
                WHEN p_function_name = 'rejeitar_ferias' THEN
                    CASE key
                        WHEN 'p_vacation_id' THEN 1
                        WHEN 'p_aprovado_por' THEN 2
                        WHEN 'p_motivo_rejeicao' THEN 3
                        ELSE 99
                    END
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
                    WHEN key LIKE '%_id' OR key LIKE '%id' THEN 
                        quote_literal(value #>> '{}') || '::UUID'
                    -- DATE: detectar formato de data YYYY-MM-DD
                    WHEN key LIKE '%_date' OR key = 'p_date' OR (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$' THEN
                        quote_literal(value #>> '{}') || '::DATE'
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
                -- Para JSONB, usar quote_literal para garantir que seja uma string JSON válida
                -- e depois converter para JSONB
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
    
    -- Log do SQL gerado (apenas em desenvolvimento - remover em produção)
    -- RAISE NOTICE 'SQL gerado: %', v_sql;
    
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
Suporta retorno de diferentes tipos (UUID, INTEGER, BOOLEAN, TEXT, JSONB).
Parâmetros:
- p_schema_name: Nome do schema (ex: financeiro, rh, core)
- p_function_name: Nome da função RPC
- p_params: JSONB com os parâmetros da função (chaves devem corresponder aos nomes dos parâmetros)';

